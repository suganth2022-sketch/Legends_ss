from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import Field

from app.models.enums import (
    CommissionStatus,
    PaymentMode,
    PaymentStatus,
    PayoutMode,
    PayoutStatus,
)
from app.schemas.common import CamelModel, MemberRef

# ---- payments -------------------------------------------------------------------------


class ManualPaymentRequest(CamelModel):
    member_code: str = Field(min_length=1, max_length=20)
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    paid_at: datetime | None = None


class PaymentOut(CamelModel):
    id: UUID
    member_id: UUID
    amount: Decimal
    status: PaymentStatus
    mode: PaymentMode
    transaction_id: str
    paid_at: datetime | None
    created_at: datetime


class PaymentWithMember(PaymentOut):
    member: MemberRef


class MyPaymentsOut(CamelModel):
    committed_amount: Decimal | None
    payments: list[PaymentOut]


class LedgerRowOut(CamelModel):
    id: UUID
    payment_id: UUID
    beneficiary_id: UUID
    source_member_id: UUID
    level: int
    applied_rate: Decimal
    base_amount: Decimal
    earned_amount: Decimal
    status: CommissionStatus
    created_at: datetime


class ManualPaymentOut(CamelModel):
    payment: PaymentOut
    commissions: list[LedgerRowOut]


class LedgerRowWithMembers(LedgerRowOut):
    beneficiary: MemberRef
    source_member: MemberRef


# ---- commission rules ---------------------------------------------------------------


class SetCommissionRateRequest(CamelModel):
    level: int = Field(ge=2, le=10)
    percentage: Decimal = Field(ge=0, le=100, max_digits=5, decimal_places=2)


class CommissionRuleOut(CamelModel):
    id: UUID
    level: int
    percentage: Decimal
    effective_from: datetime
    effective_to: datetime | None
    created_at: datetime


# ---- payouts --------------------------------------------------------------------------


class RequestPayoutRequest(CamelModel):
    amount: Decimal = Field(ge=1000, max_digits=12, decimal_places=2)
    payment_mode: PayoutMode
    account_details: str = Field(min_length=1, max_length=255)


class ManualPayoutRequest(RequestPayoutRequest):
    member_code: str = Field(min_length=1, max_length=20)


class RejectPayoutRequest(CamelModel):
    admin_note: str = Field(min_length=1, max_length=1000)


class PayoutOut(CamelModel):
    id: UUID
    member_id: UUID
    reference_no: str
    amount: Decimal
    payment_mode: PayoutMode
    account_details_masked: str
    status: PayoutStatus
    processed_at: datetime | None
    admin_note: str | None
    created_at: datetime
    updated_at: datetime


class PayoutWithMember(PayoutOut):
    member: MemberRef


class BalanceOut(CamelModel):
    available_balance: Decimal


# ---- passbook -------------------------------------------------------------------------


class EarningRow(CamelModel):
    s_no: int
    date: datetime
    source_member_code: str
    source_member_name: str
    level: int
    base_amount: Decimal
    earned_amount: Decimal
    status: CommissionStatus


class PayoutRow(CamelModel):
    s_no: int
    date: datetime
    reference_no: str
    amount: Decimal
    payment_mode: PayoutMode
    status: PayoutStatus


# ---- genealogy ------------------------------------------------------------------------


class GenealogyRow(CamelModel):
    id: UUID
    member_code: str
    full_name: str
    doj: datetime
    status: str
    sponsor_code: str | None
    level: int
    committed_amount: str | None
    direct_referrals_count: int
    total_team_count: int
