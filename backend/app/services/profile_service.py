"""Member profile, KYC, bank details and nominee.

Aadhaar / PAN / bank account numbers are AES-256-GCM encrypted at rest and
returned masked by default. Revealing the plaintext is self-service only and
is audit-logged in the same transaction (no reveal without a log row).
"""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.encryption import (
    decrypt,
    encrypt,
    mask_aadhaar,
    mask_account_number,
    mask_pan,
)
from app.models.enums import ActorType, KycStatus
from app.models.member import Member, MemberBankDetails, MemberKyc, MemberProfile, Nominee
from app.schemas.member import (
    BankOut,
    BankRevealOut,
    FullProfileOut,
    KycOut,
    KycRevealOut,
    NomineeOut,
    ProfileOut,
    UpdateBankRequest,
    UpdateKycRequest,
    UpdateNomineeRequest,
    UpdateProfileRequest,
)
from app.services import audit_service


def _audit(db: Session, member_id: uuid.UUID, action: str, snapshot: dict, ip: str | None = None) -> None:
    audit_service.record(
        db,
        actor_type=ActorType.MEMBER,
        actor_id=str(member_id),
        action=action,
        entity_name="Member",
        entity_id=str(member_id),
        after=snapshot,
        ip=ip,
    )


# ---- profile --------------------------------------------------------------------------


def get_profile(db: Session, member_id: uuid.UUID) -> ProfileOut:
    member = db.get(Member, member_id)
    profile = db.scalar(select(MemberProfile).where(MemberProfile.member_id == member_id))
    first, _, rest = (member.full_name if member else "").partition(" ")
    return ProfileOut(
        first_name=first,
        last_name=rest,
        dob=profile.dob if profile else None,
        address=profile.address if profile else None,
        city=profile.city if profile else None,
        state=profile.state if profile else None,
        pincode=profile.pincode if profile else None,
    )


def update_profile(db: Session, member_id: uuid.UUID, dto: UpdateProfileRequest, ip: str | None) -> ProfileOut:
    fields = dto.model_dump(exclude_unset=True)

    if fields.get("first_name") or fields.get("last_name"):
        member = db.get(Member, member_id)
        cur_first, _, cur_rest = member.full_name.partition(" ")
        first = fields.get("first_name") or cur_first
        last = fields["last_name"] if "last_name" in fields and fields["last_name"] is not None else cur_rest
        member.full_name = " ".join(p for p in (first, last) if p)

    profile_fields = {
        k: v for k, v in fields.items() if k in ("dob", "address", "city", "state", "pincode")
    }
    if profile_fields:
        profile = db.scalar(select(MemberProfile).where(MemberProfile.member_id == member_id))
        if profile is None:
            profile = MemberProfile(member_id=member_id)
            db.add(profile)
        for key, value in profile_fields.items():
            setattr(profile, key, value)

    _audit(db, member_id, "PROFILE_UPDATED", {"fieldsChanged": sorted(fields)}, ip)
    db.commit()
    return get_profile(db, member_id)


# ---- KYC ------------------------------------------------------------------------------


def get_kyc(db: Session, member_id: uuid.UUID) -> KycOut:
    kyc = db.scalar(select(MemberKyc).where(MemberKyc.member_id == member_id))
    return KycOut(
        aadhaar_masked=mask_aadhaar(decrypt(kyc.aadhaar_encrypted)) if kyc and kyc.aadhaar_encrypted else None,
        pan_masked=mask_pan(decrypt(kyc.pan_encrypted)) if kyc and kyc.pan_encrypted else None,
        status=kyc.status if kyc else KycStatus.NOT_SUBMITTED,
    )


def update_kyc(db: Session, member_id: uuid.UUID, dto: UpdateKycRequest, ip: str | None) -> KycOut:
    kyc = db.scalar(select(MemberKyc).where(MemberKyc.member_id == member_id))
    if kyc is None:
        kyc = MemberKyc(member_id=member_id)
        db.add(kyc)
    if dto.aadhaar_number:
        kyc.aadhaar_encrypted = encrypt(dto.aadhaar_number)
    if dto.pan:
        kyc.pan_encrypted = encrypt(dto.pan)
    kyc.status = KycStatus.PENDING  # any change must be re-verified
    kyc.verified_at = None

    _audit(db, member_id, "KYC_UPDATED", {"fieldsChanged": sorted(dto.model_dump(exclude_unset=True))}, ip)
    db.commit()
    return get_kyc(db, member_id)


def reveal_kyc(db: Session, member_id: uuid.UUID, ip: str | None) -> KycRevealOut:
    kyc = db.scalar(select(MemberKyc).where(MemberKyc.member_id == member_id))
    _audit(db, member_id, "KYC_SELF_REVEAL", {}, ip)
    db.commit()  # log first: no reveal without a committed audit row
    return KycRevealOut(
        aadhaar_number=decrypt(kyc.aadhaar_encrypted) if kyc and kyc.aadhaar_encrypted else None,
        pan=decrypt(kyc.pan_encrypted) if kyc and kyc.pan_encrypted else None,
    )


# ---- bank -----------------------------------------------------------------------------


def get_bank(db: Session, member_id: uuid.UUID) -> BankOut:
    bank = db.scalar(select(MemberBankDetails).where(MemberBankDetails.member_id == member_id))
    return BankOut(
        bank_name=bank.bank_name if bank else None,
        branch=bank.branch if bank else None,
        account_number_masked=(
            mask_account_number(decrypt(bank.account_number_encrypted)) if bank else None
        ),
        ifsc_code=bank.ifsc_code if bank else None,
        upi_id=bank.upi_id if bank else None,
    )


def update_bank(db: Session, member_id: uuid.UUID, dto: UpdateBankRequest, ip: str | None) -> BankOut:
    bank = db.scalar(select(MemberBankDetails).where(MemberBankDetails.member_id == member_id))
    if bank is None:
        bank = MemberBankDetails(
            member_id=member_id,
            bank_name=dto.bank_name or "",
            ifsc_code=dto.ifsc_code or "",
            account_number_encrypted=encrypt(dto.account_number or ""),
        )
        db.add(bank)
    else:
        if dto.bank_name is not None:
            bank.bank_name = dto.bank_name
        if dto.ifsc_code is not None:
            bank.ifsc_code = dto.ifsc_code
        if dto.account_number is not None:
            bank.account_number_encrypted = encrypt(dto.account_number)
    if dto.branch is not None:
        bank.branch = dto.branch
    if dto.upi_id is not None:
        bank.upi_id = dto.upi_id

    _audit(db, member_id, "BANK_UPDATED", {"fieldsChanged": sorted(dto.model_dump(exclude_unset=True))}, ip)
    db.commit()
    return get_bank(db, member_id)


def reveal_bank(db: Session, member_id: uuid.UUID, ip: str | None) -> BankRevealOut:
    bank = db.scalar(select(MemberBankDetails).where(MemberBankDetails.member_id == member_id))
    _audit(db, member_id, "BANK_SELF_REVEAL", {}, ip)
    db.commit()
    return BankRevealOut(account_number=decrypt(bank.account_number_encrypted) if bank else None)


# ---- nominee --------------------------------------------------------------------------


def get_nominee(db: Session, member_id: uuid.UUID) -> NomineeOut:
    nominee = db.scalar(select(Nominee).where(Nominee.member_id == member_id))
    return NomineeOut(
        full_name=nominee.full_name if nominee else None,
        relationship=nominee.relationship_ if nominee else None,
        phone=nominee.phone if nominee else None,
        email=nominee.email if nominee else None,
    )


def update_nominee(db: Session, member_id: uuid.UUID, dto: UpdateNomineeRequest, ip: str | None) -> NomineeOut:
    nominee = db.scalar(select(Nominee).where(Nominee.member_id == member_id))
    if nominee is None:
        nominee = Nominee(member_id=member_id, full_name="", relationship_="")
        db.add(nominee)
    fields = dto.model_dump(exclude_unset=True)
    if fields.get("full_name") is not None:
        nominee.full_name = fields["full_name"]
    if fields.get("relationship") is not None:
        nominee.relationship_ = fields["relationship"]
    if fields.get("phone") is not None:
        nominee.phone = fields["phone"]
    if fields.get("email") is not None:
        nominee.email = fields["email"]

    _audit(db, member_id, "NOMINEE_UPDATED", {"fieldsChanged": sorted(fields)}, ip)
    db.commit()
    return get_nominee(db, member_id)


def get_full_profile(db: Session, member_id: uuid.UUID) -> FullProfileOut:
    """Admin view: everything masked — admins never get a reveal action."""
    return FullProfileOut(
        profile=get_profile(db, member_id),
        kyc=get_kyc(db, member_id),
        bank=get_bank(db, member_id),
        nominee=get_nominee(db, member_id),
    )
