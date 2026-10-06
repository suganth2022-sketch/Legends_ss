import re
from datetime import datetime
from uuid import UUID

from pydantic import EmailStr, Field, field_validator

from app.models.enums import KycStatus, MemberStatus
from app.schemas.common import CamelModel

_PHONE_RE = re.compile(r"^\+?[0-9]{8,15}$")


class RegisterMemberRequest(CamelModel):
    full_name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    phone: str = Field(min_length=1, max_length=20)
    # Sponsor's Member Code, carried by the referral link.
    sponsor_code: str = Field(pattern=r"^A\d{6}$")

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        v = v.replace(" ", "")
        if not _PHONE_RE.match(v):
            raise ValueError("phone must be 8-15 digits, optionally starting with +")
        return v


class RegisterMemberResponse(CamelModel):
    member_code: str
    full_name: str
    sponsor_code: str
    initial_password: str


class SponsorRef(CamelModel):
    member_code: str
    full_name: str


class MemberIdentity(CamelModel):
    id: UUID
    member_code: str
    full_name: str
    email: str
    phone: str
    status: MemberStatus
    doj: datetime
    sponsor: SponsorRef | None


class SponsorValidation(CamelModel):
    valid: bool
    member_code: str
    full_name: str


# ---- profile / KYC / bank / nominee --------------------------------------------------


class UpdateProfileRequest(CamelModel):
    first_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    dob: datetime | None = None
    address: str | None = Field(default=None, max_length=500)
    city: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    pincode: str | None = Field(default=None, pattern=r"^\d{6}$")


class ProfileOut(CamelModel):
    first_name: str
    last_name: str
    dob: datetime | None
    address: str | None
    city: str | None
    state: str | None
    pincode: str | None


class UpdateKycRequest(CamelModel):
    aadhaar_number: str | None = Field(default=None, pattern=r"^\d{12}$")
    pan: str | None = Field(default=None, pattern=r"^[A-Z]{5}[0-9]{4}[A-Z]$")


class KycOut(CamelModel):
    aadhaar_masked: str | None
    pan_masked: str | None
    status: KycStatus


class KycRevealOut(CamelModel):
    aadhaar_number: str | None
    pan: str | None


class UpdateBankRequest(CamelModel):
    bank_name: str | None = Field(default=None, max_length=200)
    branch: str | None = Field(default=None, max_length=200)
    account_number: str | None = Field(default=None, pattern=r"^\d{6,20}$")
    ifsc_code: str | None = Field(default=None, pattern=r"^[A-Z]{4}0[A-Z0-9]{6}$")
    upi_id: str | None = Field(default=None, max_length=100)


class BankOut(CamelModel):
    bank_name: str | None
    branch: str | None
    account_number_masked: str | None
    ifsc_code: str | None
    upi_id: str | None


class BankRevealOut(CamelModel):
    account_number: str | None


class UpdateNomineeRequest(CamelModel):
    full_name: str | None = Field(default=None, max_length=200)
    relationship: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=20)
    email: EmailStr | None = None


class NomineeOut(CamelModel):
    full_name: str | None
    relationship: str | None
    phone: str | None
    email: str | None


class FullProfileOut(CamelModel):
    profile: ProfileOut
    kyc: KycOut
    bank: BankOut
    nominee: NomineeOut
