"""Manual (admin-entered) payments and a member's own payment history.

The first payment for a member locks their recurring monthly plan amount
(a positive multiple of Rs 1,000); every later payment must match it exactly.
"""

import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import ActorType, PaymentMode, PaymentStatus, PlanStatus
from app.models.finance import Payment, PaymentPlan
from app.models.member import Member
from app.schemas.finance import (
    LedgerRowOut,
    ManualPaymentOut,
    ManualPaymentRequest,
    MyPaymentsOut,
    PaymentOut,
)
from app.services import audit_service, commission_service

_THOUSAND = Decimal(1000)
_CLOCK_SKEW = timedelta(minutes=5)


def _active_plan(db: Session, member_id: uuid.UUID) -> PaymentPlan | None:
    return db.scalar(
        select(PaymentPlan)
        .where(PaymentPlan.member_id == member_id, PaymentPlan.status == PlanStatus.ACTIVE)
        .order_by(PaymentPlan.effective_from.desc())
        .limit(1)
    )


def record_manual_payment(db: Session, dto: ManualPaymentRequest, admin_id: str) -> ManualPaymentOut:
    member = db.scalar(select(Member).where(Member.member_code == dto.member_code.upper()))
    if member is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")

    paid_at = dto.paid_at or datetime.now(timezone.utc)
    if paid_at.tzinfo is None:
        paid_at = paid_at.replace(tzinfo=timezone.utc)
    if paid_at > datetime.now(timezone.utc) + _CLOCK_SKEW:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "paidAt cannot be in the future")

    plan = _active_plan(db, member.id)
    if plan is None:
        if dto.amount < _THOUSAND or dto.amount % _THOUSAND != 0:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "First payment must be at least ₹1,000 and a multiple of ₹1,000",
            )
        db.add(PaymentPlan(member_id=member.id, committed_amount=dto.amount))
    elif plan.committed_amount != dto.amount:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Amount must match the locked monthly plan amount of ₹{plan.committed_amount}",
        )

    payment = Payment(
        member_id=member.id,
        amount=dto.amount,
        status=PaymentStatus.SUCCESS,
        mode=PaymentMode.MANUAL_ADMIN,
        transaction_id=f"MANUAL-{uuid.uuid4()}",
        paid_at=paid_at,
    )
    db.add(payment)
    db.flush()

    audit_service.record(
        db,
        actor_type=ActorType.ADMIN,
        actor_id=admin_id,
        action="MANUAL_PAYMENT_ENTRY",
        entity_name="Payment",
        entity_id=str(payment.id),
        after={
            "memberId": str(member.id),
            "amount": str(dto.amount),
            "transactionId": payment.transaction_id,
            "paidAt": paid_at.isoformat(),
        },
    )

    # Same transaction: a payment can never be saved without its commissions.
    commissions = commission_service.generate_for_payment(db, payment.id)
    db.commit()

    return ManualPaymentOut(
        payment=PaymentOut.model_validate(payment),
        commissions=[LedgerRowOut.model_validate(c) for c in commissions],
    )


def get_member_payments(db: Session, member_id: uuid.UUID) -> MyPaymentsOut:
    plan = _active_plan(db, member_id)
    payments = db.scalars(
        select(Payment).where(Payment.member_id == member_id).order_by(Payment.paid_at.desc())
    ).all()
    return MyPaymentsOut(
        committed_amount=plan.committed_amount if plan else None,
        payments=[PaymentOut.model_validate(p) for p in payments],
    )
