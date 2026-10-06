"""Member passbook: earnings and payout history.

The commission *rate* is intentionally never returned to members — only the
base and earned amounts (admins see appliedRate in their own reports).
"""

import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.enums import PayoutMode, PayoutStatus
from app.models.finance import CommissionLedger, Payout
from app.models.member import Member
from app.schemas.finance import EarningRow, PayoutRow


def get_earnings(
    db: Session,
    member_id: uuid.UUID,
    *,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    level: int | None = None,
    source_member_code: str | None = None,
) -> list[EarningRow]:
    stmt = (
        select(CommissionLedger)
        .options(joinedload(CommissionLedger.source_member))
        .where(CommissionLedger.beneficiary_id == member_id)
        .order_by(CommissionLedger.created_at.desc())
    )
    if from_date:
        stmt = stmt.where(CommissionLedger.created_at >= from_date)
    if to_date:
        stmt = stmt.where(CommissionLedger.created_at <= to_date)
    if level:
        stmt = stmt.where(CommissionLedger.level == level)
    if source_member_code:
        source_id = db.scalar(select(Member.id).where(Member.member_code == source_member_code.upper()))
        # No match -> empty result, never "ignore the filter".
        stmt = stmt.where(CommissionLedger.source_member_id == (source_id or uuid.UUID(int=0)))

    rows = db.scalars(stmt).all()
    return [
        EarningRow(
            s_no=i + 1,
            date=r.created_at,
            source_member_code=r.source_member.member_code,
            source_member_name=r.source_member.full_name,
            level=r.level,
            base_amount=r.base_amount,
            earned_amount=r.earned_amount,
            status=r.status,
        )
        for i, r in enumerate(rows)
    ]


def get_payouts(
    db: Session,
    member_id: uuid.UUID,
    *,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    mode: PayoutMode | None = None,
    status: PayoutStatus | None = None,
) -> list[PayoutRow]:
    stmt = select(Payout).where(Payout.member_id == member_id).order_by(Payout.created_at.desc())
    if from_date:
        stmt = stmt.where(Payout.created_at >= from_date)
    if to_date:
        stmt = stmt.where(Payout.created_at <= to_date)
    if mode:
        stmt = stmt.where(Payout.payment_mode == mode)
    if status:
        stmt = stmt.where(Payout.status == status)

    return [
        PayoutRow(
            s_no=i + 1,
            date=p.created_at,
            reference_no=p.reference_no,
            amount=p.amount,
            payment_mode=p.payment_mode,
            status=p.status,
        )
        for i, p in enumerate(db.scalars(stmt).all())
    ]
