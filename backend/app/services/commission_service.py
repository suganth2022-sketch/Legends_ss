"""Commission engine. Rules: docs/business-rules.md.

Levels are counted from the PAYER: level 1 = the payer (never earns from their
own payment), level 2 = direct sponsor ... level 10 = 9th-line upline. Rates
live in `commission_rules` (versioned), never hard-coded here.
"""

import calendar
import uuid
from datetime import datetime, timezone
from decimal import ROUND_HALF_UP, Decimal

from fastapi import HTTPException, status
from sqlalchemy import or_, select, update
from sqlalchemy.orm import Session

from app.models.enums import ActorType, CommissionStatus, PaymentStatus
from app.models.finance import CommissionLedger, CommissionRule, Payment
from app.models.member import Member
from app.services import audit_service

MAX_LEVEL = 10
_CENT = Decimal("0.01")


def get_due_date(doj: datetime, year: int, month: int) -> datetime:
    """Fixed per member from their date of joining: the 20th if they joined on/
    before the 20th, else the 30th — clamped to the last day of short months.
    `month` is 1-12. Due date is inclusive through 23:59:59.999999 UTC."""
    due_day = 20 if doj.astimezone(timezone.utc).day <= 20 else 30
    last_day = calendar.monthrange(year, month)[1]
    return datetime(year, month, min(due_day, last_day), 23, 59, 59, 999999, tzinfo=timezone.utc)


def is_eligible_for_month(db: Session, member_id: uuid.UUID, as_of: datetime) -> bool:
    """A beneficiary only receives overrides for a month if THEY paid their own
    instalment in that month on/before their own due date."""
    member = db.get(Member, member_id)
    if member is None:
        return False
    as_of = as_of.astimezone(timezone.utc)
    due = get_due_date(member.doj, as_of.year, as_of.month)
    month_start = datetime(as_of.year, as_of.month, 1, tzinfo=timezone.utc)
    qualifying = db.scalar(
        select(Payment.id)
        .where(
            Payment.member_id == member_id,
            Payment.status == PaymentStatus.SUCCESS,
            Payment.paid_at >= month_start,
            Payment.paid_at <= due,
        )
        .limit(1)
    )
    return qualifying is not None


def _active_rate(db: Session, level: int, as_of: datetime) -> Decimal:
    """Rate active at the payment's own timestamp, so later changes never
    recalculate history."""
    rule = db.scalar(
        select(CommissionRule)
        .where(
            CommissionRule.level == level,
            CommissionRule.effective_from <= as_of,
            or_(CommissionRule.effective_to.is_(None), CommissionRule.effective_to > as_of),
        )
        .order_by(CommissionRule.effective_from.desc())
        .limit(1)
    )
    if rule is None:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            f"No active commission rule configured for level {level}",
        )
    return rule.percentage


def generate_for_payment(db: Session, payment_id: uuid.UUID) -> list[CommissionLedger]:
    """Walk the sponsor chain for a SUCCESS payment, writing one ledger row per
    eligible beneficiary. Idempotent. Does NOT commit — the caller commits so the
    payment and its commissions land in one transaction.

    Ineligible beneficiaries are skipped (not redistributed) and the walk
    continues upward; eligibility is evaluated per beneficiary, independently.
    """
    existing = list(db.scalars(select(CommissionLedger).where(CommissionLedger.payment_id == payment_id)))
    if existing:
        return existing

    payment = db.get(Payment, payment_id)
    if payment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Payment not found")
    if payment.status != PaymentStatus.SUCCESS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Commission can only be generated for a SUCCESS payment")
    if payment.paid_at is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Payment has no paid_at timestamp")

    paid_at = payment.paid_at
    if paid_at.tzinfo is None:  # SQLite (tests) drops tzinfo; Postgres keeps it
        paid_at = paid_at.replace(tzinfo=timezone.utc)

    created: list[CommissionLedger] = []
    payer = db.get(Member, payment.member_id)
    sponsor_id = payer.sponsor_id if payer else None
    level = 2
    visited = {payment.member_id}

    while sponsor_id and level <= MAX_LEVEL and sponsor_id not in visited:
        visited.add(sponsor_id)
        beneficiary = db.get(Member, sponsor_id)
        if beneficiary is None:
            break

        if is_eligible_for_month(db, beneficiary.id, paid_at):
            rate = _active_rate(db, level, paid_at)
            earned = (payment.amount * rate / Decimal(100)).quantize(_CENT, rounding=ROUND_HALF_UP)
            row = CommissionLedger(
                payment_id=payment.id,
                beneficiary_id=beneficiary.id,
                source_member_id=payment.member_id,
                level=level,
                applied_rate=rate,
                base_amount=payment.amount,
                earned_amount=earned,
                status=CommissionStatus.CREDITED,
            )
            db.add(row)
            created.append(row)

        sponsor_id = beneficiary.sponsor_id
        level += 1

    db.flush()
    return created


def list_active_rates(db: Session) -> list[CommissionRule]:
    return list(
        db.scalars(
            select(CommissionRule).where(CommissionRule.effective_to.is_(None)).order_by(CommissionRule.level)
        )
    )


def set_rate(db: Session, level: int, percentage: Decimal, admin_id: str) -> CommissionRule:
    """Close the current rule and open a new one — history is never overwritten."""
    now = datetime.now(timezone.utc)
    db.execute(
        update(CommissionRule)
        .where(CommissionRule.level == level, CommissionRule.effective_to.is_(None))
        .values(effective_to=now)
    )
    rule = CommissionRule(level=level, percentage=percentage, effective_from=now)
    db.add(rule)
    db.flush()
    audit_service.record(
        db,
        actor_type=ActorType.ADMIN,
        actor_id=admin_id,
        action="RULE_CHANGE",
        entity_name="CommissionRule",
        entity_id=str(rule.id),
        after={"level": level, "percentage": str(percentage)},
    )
    db.commit()
    return rule
