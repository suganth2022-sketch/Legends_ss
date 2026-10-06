"""Members and everything hanging off one member (profile, KYC, bank, nominee).

`members.sponsor_id` is a self-referencing FK: the whole sponsor network is
derived from it (unlimited direct referrals, no fixed matrix).
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import (
    created_at_col,
    pg_enum,
    updated_at_col,
    utcnow,
    uuid_pk,
)
from app.models.enums import KycStatus, MemberStatus


class Member(Base):
    __tablename__ = "members"
    __table_args__ = (Index("ix_members_sponsor_id", "sponsor_id"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    member_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)  # A000001
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    sponsor_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("members.id", ondelete="RESTRICT"), nullable=True
    )
    status: Mapped[MemberStatus] = mapped_column(
        pg_enum(MemberStatus, "member_status"), default=MemberStatus.ACTIVE, nullable=False
    )
    doj: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    created_at: Mapped[datetime] = created_at_col()
    updated_at: Mapped[datetime] = updated_at_col()

    sponsor: Mapped["Member | None"] = relationship(remote_side="Member.id")


class MemberProfile(Base):
    __tablename__ = "member_profiles"

    id: Mapped[uuid.UUID] = uuid_pk()
    member_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("members.id", ondelete="CASCADE"), unique=True
    )
    dob: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    address: Mapped[str | None] = mapped_column(String(500))
    city: Mapped[str | None] = mapped_column(String(100))
    state: Mapped[str | None] = mapped_column(String(100))
    pincode: Mapped[str | None] = mapped_column(String(10))
    photo_url: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = created_at_col()
    updated_at: Mapped[datetime] = updated_at_col()


class MemberKyc(Base):
    __tablename__ = "member_kyc"

    id: Mapped[uuid.UUID] = uuid_pk()
    member_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("members.id", ondelete="CASCADE"), unique=True
    )
    aadhaar_encrypted: Mapped[str | None] = mapped_column(String(500))
    pan_encrypted: Mapped[str | None] = mapped_column(String(500))
    status: Mapped[KycStatus] = mapped_column(
        pg_enum(KycStatus, "kyc_status"), default=KycStatus.NOT_SUBMITTED, nullable=False
    )
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = created_at_col()
    updated_at: Mapped[datetime] = updated_at_col()


class MemberBankDetails(Base):
    __tablename__ = "member_bank_details"

    id: Mapped[uuid.UUID] = uuid_pk()
    member_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("members.id", ondelete="CASCADE"), unique=True
    )
    bank_name: Mapped[str] = mapped_column(String(200), nullable=False)
    branch: Mapped[str | None] = mapped_column(String(200))
    account_number_encrypted: Mapped[str] = mapped_column(String(500), nullable=False)
    ifsc_code: Mapped[str] = mapped_column(String(20), nullable=False)
    upi_id: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = created_at_col()
    updated_at: Mapped[datetime] = updated_at_col()


class Nominee(Base):
    __tablename__ = "nominees"

    id: Mapped[uuid.UUID] = uuid_pk()
    member_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("members.id", ondelete="CASCADE"), unique=True
    )
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    relationship_: Mapped[str] = mapped_column("relationship", String(100), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = created_at_col()
    updated_at: Mapped[datetime] = updated_at_col()
