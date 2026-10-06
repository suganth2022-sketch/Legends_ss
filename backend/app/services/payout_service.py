"""Payout balance, request and approval workflow.

PENDING -> APPROVED -> PROCESSING -> PAID, with REJECTED reachable from
PENDING/APPROVED. Admin-recorded cash payouts are created directly as PAID.
"""

import secrets
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, select, text, update
from sqlalchemy.orm import Session

from app.models.enums import ActorType, CommissionStatus, PayoutStatus
from app.models.finance import CommissionLedger, Payout
from app.models.member import Member
from app.schemas.finance import ManualPayoutRequest, RequestPayoutRequest
from app.services import audit_service

ZERO = Decimal(0)


def get_available_balance(db: Session, member_id: uuid.UUID) -> Decimal:
    """SUM(commission) - SUM(payouts), never stored. A PENDING payout already
    counts (only REJECTED is excluded), so requests can't be stacked past the
    real balance."""
    earned = db.scalar(
        select(func.coalesce(func.sum(CommissionLedger.earned_amount), 0)).where(
            CommissionLedger.beneficiary_id == member_id,
            CommissionLedger.status == CommissionStatus.CREDITED,
        )
    )
    paid_out = db.scalar(
        select(func.coalesce(func.sum(Payout.amount), 0)).where(
            Payout.member_id == member_id, Payout.status != PayoutStatus.REJECTED
        )
    )
    return Decimal(earned or 0) - Decimal(paid_out or 0)


def _lock_member(db: Session, member_id: uuid.UUID) -> None:
    """Serialise balance-check-then-insert per member. Without this two
    concurrent requests both read the same balance and both succeed. Works in
    Supabase's transaction-mode pooler because the lock is transaction-scoped."""
    if db.get_bind().dialect.name == "postgresql":
        db.execute(text("SELECT pg_advisory_xact_lock(hashtext(:k))"), {"k": str(member_id)})


def _reference_no(db: Session) -> str:
    date_part = datetime.now(timezone.utc).strftime("%Y%m%d")
    for _ in range(5):
        candidate = f"PAY-{date_part}-{secrets.randbelow(9000) + 1000}"
        if db.scalar(select(Payout.id).where(Payout.reference_no == candidate)) is None:
            return candidate
    raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Could not generate a payout reference")


def _create(
    db: Session,
    *,
    member_id: uuid.UUID,
    dto: RequestPayoutRequest,
    payout_status: PayoutStatus,
    actor_type: ActorType,
    actor_id: str,
    action: str,
    over_balance_message: str,
) -> Payout:
    _lock_member(db, member_id)
    balance = get_available_balance(db, member_id)
    if dto.amount > balance:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"{over_balance_message} ₹{balance}")

    payout = Payout(
        member_id=member_id,
        reference_no=_reference_no(db),
        amount=dto.amount,
        payment_mode=dto.payment_mode,
        account_details_masked=dto.account_details,
        status=payout_status,
        processed_at=datetime.now(timezone.utc) if payout_status == PayoutStatus.PAID else None,
    )
    db.add(payout)
    db.flush()
    audit_service.record(
        db,
        actor_type=actor_type,
        actor_id=actor_id,
        action=action,
        entity_name="Payout",
        entity_id=str(payout.id),
        after={
            "memberId": str(member_id),
            "amount": str(dto.amount),
            "paymentMode": dto.payment_mode.value,
            "referenceNo": payout.reference_no,
        },
    )
    db.commit()
    return payout


def request_payout(db: Session, member_id: uuid.UUID, dto: RequestPayoutRequest) -> Payout:
    return _create(
        db,
        member_id=member_id,
        dto=dto,
        payout_status=PayoutStatus.PENDING,
        actor_type=ActorType.MEMBER,
        actor_id=str(member_id),
        action="PAYOUT_REQUEST_SUBMITTED",
        over_balance_message="Requested amount exceeds your available balance of",
    )


def record_manual_payout(db: Session, dto: ManualPayoutRequest, admin_id: str) -> Payout:
    member = db.scalar(select(Member).where(Member.member_code == dto.member_code.upper()))
    if member is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")
    return _create(
        db,
        member_id=member.id,
        dto=dto,
        payout_status=PayoutStatus.PAID,
        actor_type=ActorType.ADMIN,
        actor_id=admin_id,
        action="MANUAL_PAYOUT_ENTRY",
        over_balance_message="Amount exceeds this member's available balance of",
    )


def _transition(
    db: Session,
    payout_id: uuid.UUID,
    allowed_from: tuple[PayoutStatus, ...],
    next_status: PayoutStatus,
    admin_id: str,
    action: str,
    **extra,
) -> Payout:
    payout = db.get(Payout, payout_id)
    if payout is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Payout not found")
    if payout.status not in allowed_from:
        expected = " or ".join(s.value for s in allowed_from)
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Payout is {payout.status.value}; expected {expected} to perform this action",
        )

    before = payout.status
    # Compare-and-set: two admins acting at once can't both pass the check above.
    result = db.execute(
        update(Payout)
        .where(Payout.id == payout_id, Payout.status == before)
        .values(status=next_status, updated_at=datetime.now(timezone.utc), **extra)
    )
    if result.rowcount != 1:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Payout status changed; reload and try again")

    audit_service.record(
        db,
        actor_type=ActorType.ADMIN,
        actor_id=admin_id,
        action=action,
        entity_name="Payout",
        entity_id=str(payout_id),
        before={"status": before.value},
        after={"status": next_status.value},
    )
    db.commit()
    db.refresh(payout)
    return payout


def approve(db: Session, payout_id: uuid.UUID, admin_id: str) -> Payout:
    return _transition(db, payout_id, (PayoutStatus.PENDING,), PayoutStatus.APPROVED, admin_id, "PAYOUT_APPROVED")


def reject(db: Session, payout_id: uuid.UUID, admin_id: str, note: str) -> Payout:
    return _transition(
        db, payout_id, (PayoutStatus.PENDING, PayoutStatus.APPROVED), PayoutStatus.REJECTED,
        admin_id, "PAYOUT_REJECTED", admin_note=note,
    )


def process(db: Session, payout_id: uuid.UUID, admin_id: str) -> Payout:
    return _transition(db, payout_id, (PayoutStatus.APPROVED,), PayoutStatus.PROCESSING, admin_id, "PAYOUT_PROCESSING")


def mark_paid(db: Session, payout_id: uuid.UUID, admin_id: str) -> Payout:
    return _transition(
        db, payout_id, (PayoutStatus.PROCESSING,), PayoutStatus.PAID, admin_id, "PAYOUT_PAID",
        processed_at=datetime.now(timezone.utc),
    )


def list_pending(db: Session) -> list[Payout]:
    return list(
        db.scalars(select(Payout).where(Payout.status == PayoutStatus.PENDING).order_by(Payout.created_at))
    )
