"""Member registration and identity lookups."""

import secrets
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.member import Member
from app.models.system import SystemCounter
from app.schemas.member import (
    MemberIdentity,
    RegisterMemberRequest,
    RegisterMemberResponse,
    SponsorRef,
)
from app.services import referral_service


def _initial_password() -> str:
    # 12 URL-safe chars. Stands in for SMS/e-mail delivery (not built yet): the
    # plaintext is returned once in the registration response and never logged
    # or stored.
    return secrets.token_urlsafe(9)


def register(db: Session, dto: RegisterMemberRequest) -> RegisterMemberResponse:
    sponsor = referral_service.validate_sponsor(db, dto.sponsor_code)
    email = dto.email.lower()

    if db.scalar(select(Member.id).where((Member.email == email) | (Member.phone == dto.phone))):
        raise HTTPException(status.HTTP_409_CONFLICT, "A member with this email or phone already exists")

    password = _initial_password()
    try:
        # Atomic increment: concurrent registrations never get the same code.
        value = db.execute(
            update(SystemCounter)
            .where(SystemCounter.key == "member_code")
            .values(value=SystemCounter.value + 1)
            .returning(SystemCounter.value)
        ).scalar_one()
        member = Member(
            member_code=f"A{value:06d}",
            full_name=dto.full_name.strip(),
            email=email,
            phone=dto.phone,
            password_hash=hash_password(password),
            sponsor_id=sponsor.id,
        )
        db.add(member)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "A member with this email or phone already exists")

    return RegisterMemberResponse(
        member_code=member.member_code,
        full_name=member.full_name,
        sponsor_code=sponsor.member_code,
        initial_password=password,
    )


def get_identity(db: Session, member_id: uuid.UUID) -> MemberIdentity:
    member = db.get(Member, member_id)
    if member is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")
    sponsor = (
        SponsorRef(member_code=member.sponsor.member_code, full_name=member.sponsor.full_name)
        if member.sponsor
        else None
    )
    return MemberIdentity(
        id=member.id,
        member_code=member.member_code,
        full_name=member.full_name,
        email=member.email,
        phone=member.phone,
        status=member.status,
        doj=member.doj,
        sponsor=sponsor,
    )
