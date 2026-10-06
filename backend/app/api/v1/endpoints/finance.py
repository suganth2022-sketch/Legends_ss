"""Payments, commission rules, passbook and payouts."""

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.v1.deps import DateRange
from app.core.database import get_db
from app.core.security import (
    FINANCE_ROLES,
    SUPER_ADMIN_ONLY,
    Principal,
    require_admin,
    require_member,
)
from app.models.enums import PayoutMode, PayoutStatus
from app.schemas.finance import (
    BalanceOut,
    CommissionRuleOut,
    EarningRow,
    ManualPaymentOut,
    ManualPaymentRequest,
    ManualPayoutRequest,
    MyPaymentsOut,
    PayoutOut,
    PayoutRow,
    PayoutWithMember,
    RejectPayoutRequest,
    RequestPayoutRequest,
    SetCommissionRateRequest,
)
from app.services import (
    commission_service,
    passbook_service,
    payment_service,
    payout_service,
)

payments_router = APIRouter(prefix="/payments")
commission_router = APIRouter(prefix="/commission")
passbook_router = APIRouter(prefix="/passbook")
payouts_router = APIRouter(prefix="/payouts")


# ---- payments ---------------------------------------------------------------------------


@payments_router.post("/manual", response_model=ManualPaymentOut)
def record_manual_payment(
    dto: ManualPaymentRequest,
    p: Principal = Depends(require_admin(*FINANCE_ROLES)),
    db: Session = Depends(get_db),
):
    """Admin enters a payment by Member Code. The first payment locks the plan amount."""
    return payment_service.record_manual_payment(db, dto, p.id)


@payments_router.get("/me", response_model=MyPaymentsOut)
def my_payments(p: Principal = Depends(require_member), db: Session = Depends(get_db)):
    return payment_service.get_member_payments(db, uuid.UUID(p.id))


# ---- commission rules -------------------------------------------------------------------


@commission_router.get("/rules", response_model=list[CommissionRuleOut])
def list_rules(p: Principal = Depends(require_admin()), db: Session = Depends(get_db)):
    return commission_service.list_active_rates(db)


@commission_router.post("/rules", response_model=CommissionRuleOut)
def set_rule(
    dto: SetCommissionRateRequest,
    p: Principal = Depends(require_admin(*SUPER_ADMIN_ONLY)),
    db: Session = Depends(get_db),
):
    """New versioned rate; closes the previous rule instead of overwriting it."""
    return commission_service.set_rate(db, dto.level, dto.percentage, p.id)


# ---- passbook (member's own) ------------------------------------------------------------


@passbook_router.get("/earnings", response_model=list[EarningRow])
def earnings(
    dates: DateRange = Depends(),
    level: int | None = Query(default=None, ge=2, le=10),
    source_member_code: str | None = Query(default=None, alias="sourceMemberCode"),
    p: Principal = Depends(require_member),
    db: Session = Depends(get_db),
):
    return passbook_service.get_earnings(
        db, uuid.UUID(p.id), from_date=dates.from_date, to_date=dates.to_date,
        level=level, source_member_code=source_member_code,
    )


@passbook_router.get("/payouts", response_model=list[PayoutRow])
def my_payout_history(
    dates: DateRange = Depends(),
    mode: PayoutMode | None = None,
    status: PayoutStatus | None = None,
    p: Principal = Depends(require_member),
    db: Session = Depends(get_db),
):
    return passbook_service.get_payouts(
        db, uuid.UUID(p.id), from_date=dates.from_date, to_date=dates.to_date, mode=mode, status=status
    )


# ---- payouts ----------------------------------------------------------------------------


@payouts_router.get("/balance", response_model=BalanceOut)
def balance(p: Principal = Depends(require_member), db: Session = Depends(get_db)):
    return BalanceOut(available_balance=payout_service.get_available_balance(db, uuid.UUID(p.id)))


@payouts_router.post("/request", response_model=PayoutOut)
def request_payout(dto: RequestPayoutRequest, p: Principal = Depends(require_member), db: Session = Depends(get_db)):
    """Minimum ₹1,000, capped at the available balance."""
    return payout_service.request_payout(db, uuid.UUID(p.id), dto)


@payouts_router.get("/pending", response_model=list[PayoutWithMember])
def pending(p: Principal = Depends(require_admin(*FINANCE_ROLES)), db: Session = Depends(get_db)):
    return payout_service.list_pending(db)


@payouts_router.post("/manual", response_model=PayoutOut)
def manual_payout(
    dto: ManualPayoutRequest, p: Principal = Depends(require_admin(*FINANCE_ROLES)), db: Session = Depends(get_db)
):
    """Record a cash/manual payout already handed over — saved directly as PAID."""
    return payout_service.record_manual_payout(db, dto, p.id)


@payouts_router.post("/{payout_id}/approve", response_model=PayoutOut)
def approve(payout_id: uuid.UUID, p: Principal = Depends(require_admin(*FINANCE_ROLES)), db: Session = Depends(get_db)):
    return payout_service.approve(db, payout_id, p.id)


@payouts_router.post("/{payout_id}/reject", response_model=PayoutOut)
def reject(
    payout_id: uuid.UUID, dto: RejectPayoutRequest,
    p: Principal = Depends(require_admin(*FINANCE_ROLES)), db: Session = Depends(get_db),
):
    return payout_service.reject(db, payout_id, p.id, dto.admin_note)


@payouts_router.post("/{payout_id}/process", response_model=PayoutOut)
def process(payout_id: uuid.UUID, p: Principal = Depends(require_admin(*FINANCE_ROLES)), db: Session = Depends(get_db)):
    return payout_service.process(db, payout_id, p.id)


@payouts_router.post("/{payout_id}/mark-paid", response_model=PayoutOut)
def mark_paid(payout_id: uuid.UUID, p: Principal = Depends(require_admin(*FINANCE_ROLES)), db: Session = Depends(get_db)):
    return payout_service.mark_paid(db, payout_id, p.id)
