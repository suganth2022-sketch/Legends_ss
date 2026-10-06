"""Password hashing, JWT issuing/verification, and the "who is calling?"
FastAPI dependencies. This module is the real enforcement point for
authentication and roles — frontend route guards are only UX.

Roles (seeded by scripts/seed.py): "Super Admin", "Finance Admin",
"Support Admin" for staff, and "Member" for members.
"""

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.enums import MemberStatus
from app.models.member import Member
from app.models.system import AdminUser

UserType = Literal["MEMBER", "ADMIN"]
TokenType = Literal["access", "refresh"]

FINANCE_ROLES = ("Super Admin", "Finance Admin")
SUPPORT_ROLES = ("Super Admin", "Support Admin")
SUPER_ADMIN_ONLY = ("Super Admin",)

_hasher = PasswordHasher()
# Verified against when the account doesn't exist, so response time doesn't
# reveal whether an identifier is registered.
_DUMMY_HASH = _hasher.hash("not-a-real-password")

_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str | None, password: str) -> bool:
    try:
        return _hasher.verify(password_hash or _DUMMY_HASH, password) and password_hash is not None
    except (VerificationError, InvalidHashError):
        return False


def create_token(
    *, subject: str, user_type: UserType, role_name: str, token_type: TokenType
) -> str:
    now = datetime.now(timezone.utc)
    if token_type == "access":
        secret, ttl = settings.JWT_SECRET, settings.ACCESS_TOKEN_EXPIRES_IN
    else:
        secret, ttl = settings.JWT_REFRESH_SECRET, settings.REFRESH_TOKEN_EXPIRES_IN
    payload = {
        "sub": subject,
        "userType": user_type,
        "roleName": role_name,
        "typ": token_type,
        "iat": now,
        "exp": now + timedelta(seconds=ttl),
    }
    return jwt.encode(payload, secret, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str, token_type: TokenType) -> dict[str, Any]:
    secret = settings.JWT_SECRET if token_type == "access" else settings.JWT_REFRESH_SECRET
    try:
        payload = jwt.decode(token, secret, algorithms=[settings.JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired, please log in again")
    except jwt.InvalidTokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid authentication token")
    if payload.get("typ") != token_type:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid authentication token")
    return payload


@dataclass
class Principal:
    id: str
    user_type: UserType
    role_name: str
    # What GET /auth/me returns for this principal.
    profile: dict[str, Any] = field(default_factory=dict)


def load_principal(db: Session, payload: dict[str, Any]) -> Principal:
    """Re-check the account on every request so suspension / removal takes
    effect immediately, not when the token expires."""
    try:
        subject = uuid.UUID(str(payload["sub"]))
    except (KeyError, ValueError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid user token payload")

    if payload.get("userType") == "MEMBER":
        member = db.get(Member, subject)
        if member is None or member.status == MemberStatus.SUSPENDED:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Member account is inactive or suspended")
        return Principal(
            id=str(member.id),
            user_type="MEMBER",
            role_name="Member",
            profile={
                "id": str(member.id),
                "memberCode": member.member_code,
                "fullName": member.full_name,
                "email": member.email,
                "phone": member.phone,
                "status": member.status.value,
                "userType": "MEMBER",
                "roleName": "Member",
            },
        )

    if payload.get("userType") == "ADMIN":
        admin = db.scalar(select(AdminUser).where(AdminUser.id == subject))
        if admin is None:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Admin account not found")
        return Principal(
            id=str(admin.id),
            user_type="ADMIN",
            role_name=admin.role.name,
            profile={
                "id": str(admin.id),
                "username": admin.username,
                "email": admin.email,
                "fullName": admin.full_name,
                "userType": "ADMIN",
                "roleName": admin.role.name,
            },
        )

    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid user token payload")


def get_principal(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> Principal:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    return load_principal(db, decode_token(credentials.credentials, "access"))


def require_member(principal: Principal = Depends(get_principal)) -> Principal:
    if principal.user_type != "MEMBER":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This endpoint is for Members")
    return principal


def require_admin(*roles: str):
    """Dependency factory: any admin, or only admins holding one of `roles`."""

    def dependency(principal: Principal = Depends(get_principal)) -> Principal:
        if principal.user_type != "ADMIN":
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access required")
        if roles and principal.role_name not in roles:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"Insufficient privileges. Required role: {', '.join(roles)}",
            )
        return principal

    return dependency
