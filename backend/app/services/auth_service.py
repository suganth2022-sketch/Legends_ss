"""Login, token refresh and password change for members and admins."""

import uuid

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    create_token,
    decode_token,
    hash_password,
    load_principal,
    verify_password,
)
from app.models.enums import MemberStatus
from app.models.member import Member
from app.models.system import AdminUser
from app.schemas.auth import (
    AdminLoginRequest,
    ChangePasswordRequest,
    LoginResponse,
    MemberLoginRequest,
    TokenResponse,
)


def _tokens(subject: str, user_type: str, role_name: str) -> dict:
    kwargs = {"subject": subject, "user_type": user_type, "role_name": role_name}
    return {
        "access_token": create_token(**kwargs, token_type="access"),
        "refresh_token": create_token(**kwargs, token_type="refresh"),
        "expires_in": settings.ACCESS_TOKEN_EXPIRES_IN,
    }


def login_member(db: Session, dto: MemberLoginRequest) -> LoginResponse:
    ident = dto.identifier.strip()
    member = db.scalar(
        select(Member).where(
            or_(
                Member.member_code == ident.upper(),
                Member.email == ident.lower(),
                Member.phone == ident,
            )
        )
    )
    # Always run a hash verification, even for unknown identifiers (timing).
    ok = verify_password(member.password_hash if member else None, dto.password)
    if member is None or not ok:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid Member credentials")
    if member.status == MemberStatus.SUSPENDED:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Member account is suspended")

    return LoginResponse(
        user={
            "id": str(member.id),
            "memberCode": member.member_code,
            "fullName": member.full_name,
            "email": member.email,
            "phone": member.phone,
            "status": member.status.value,
            "roleName": "Member",
        },
        **_tokens(str(member.id), "MEMBER", "Member"),
    )


def login_admin(db: Session, dto: AdminLoginRequest) -> LoginResponse:
    admin = db.scalar(select(AdminUser).where(AdminUser.username == dto.username.strip()))
    ok = verify_password(admin.password_hash if admin else None, dto.password)
    if admin is None or not ok:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid Admin credentials")

    return LoginResponse(
        user={
            "id": str(admin.id),
            "username": admin.username,
            "fullName": admin.full_name,
            "email": admin.email,
            "roleName": admin.role.name,
        },
        **_tokens(str(admin.id), "ADMIN", admin.role.name),
    )


def refresh(db: Session, refresh_token: str) -> TokenResponse:
    try:
        payload = decode_token(refresh_token, "refresh")
        # Re-checks the account: a suspended member / removed admin can't keep
        # minting tokens from an old refresh token. Also picks up role changes.
        principal = load_principal(db, payload)
    except HTTPException:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired refresh token")
    return TokenResponse(**_tokens(principal.id, principal.user_type, principal.role_name))


def change_password(db: Session, user_id: str, user_type: str, dto: ChangePasswordRequest) -> dict:
    uid = uuid.UUID(user_id)
    account = db.get(Member, uid) if user_type == "MEMBER" else db.get(AdminUser, uid)
    if account is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Account not found")
    if not verify_password(account.password_hash, dto.old_password):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Current password is incorrect")
    account.password_hash = hash_password(dto.new_password)
    db.commit()
    return {"message": "Password updated successfully"}
