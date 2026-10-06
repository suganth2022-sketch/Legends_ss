"""Admin portal queries: member management, cross-member reports, audit log."""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.enums import ActorType, CommissionStatus, MemberStatus, PaymentStatus, PayoutMode, PayoutStatus
from app.models.finance import CommissionLedger, Payment, Payout
from app.models.member import Member
from app.models.system import AuditLog
from app.schemas.admin import AdminMemberRow, AuditLogOut, MemberSummaryRow
from app.schemas.common import Page
from app.schemas.finance import LedgerRowWithMembers, PaymentWithMember, PayoutWithMember
from app.schemas.member import SponsorRef
from app.services import audit_service


def _page(db: Session, stmt: Select, count_stmt: Select, page: int, page_size: int, convert) -> Page:
    total = db.scalar(count_stmt) or 0
    rows = db.scalars(stmt.offset((page - 1) * page_size).limit(page_size)).unique().all()
    return Page(data=[convert(r) for r in rows], total=total, page=page, page_size=page_size)


def _like(term: str) -> str:
    # Escape LIKE wildcards so a search for "%" or "_" is literal.
    escaped = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


def list_members(db: Session, *, search: str | None, member_status: MemberStatus | None, page: int, page_size: int) -> Page:
    stmt = select(Member).options(joinedload(Member.sponsor)).order_by(Member.created_at.desc())
    count = select(func.count()).select_from(Member)
    conditions: list[Any] = []
    if search:
        pat = _like(search)
        conditions.append(
            or_(
                Member.full_name.ilike(pat, escape="\\"),
                Member.email.ilike(pat, escape="\\"),
                Member.member_code.ilike(pat, escape="\\"),
            )
        )
    if member_status:
        conditions.append(Member.status == member_status)
    for c in conditions:
        stmt, count = stmt.where(c), count.where(c)

    def convert(m: Member) -> AdminMemberRow:
        return AdminMemberRow(
            id=m.id,
            member_code=m.member_code,
            full_name=m.full_name,
            email=m.email,
            phone=m.phone,
            status=m.status,
            doj=m.doj,
            sponsor=SponsorRef(member_code=m.sponsor.member_code, full_name=m.sponsor.full_name) if m.sponsor else None,
        )

    return _page(db, stmt, count, page, page_size, convert)


def update_member_status(db: Session, member_id: uuid.UUID, new_status: MemberStatus, admin_id: str, ip: str | None) -> AdminMemberRow:
    member = db.get(Member, member_id)
    if member is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")
    before = member.status
    member.status = new_status
    audit_service.record(
        db,
        actor_type=ActorType.ADMIN,
        actor_id=admin_id,
        action="MEMBER_STATUS_CHANGED",
        entity_name="Member",
        entity_id=str(member_id),
        before={"status": before.value},
        after={"status": new_status.value},
        ip=ip,
    )
    db.commit()
    return AdminMemberRow(
        id=member.id, member_code=member.member_code, full_name=member.full_name, email=member.email,
        phone=member.phone, status=member.status, doj=member.doj, sponsor=None,
    )


def list_members_summary(
    db: Session, *, search: str | None, min_balance: Decimal | None, max_balance: Decimal | None, page: int, page_size: int
) -> Page:
    """One row per member: total payments, commission earned, paid out, live
    balance. Balance filters run in SQL before LIMIT/OFFSET (never post-fetch)."""

    def agg(model, column, *conds):
        return (
            select(func.coalesce(func.sum(column), 0))
            .where(*conds)
            .correlate(Member)
            .scalar_subquery()
        )

    pay = agg(Payment, Payment.amount, Payment.member_id == Member.id, Payment.status == PaymentStatus.SUCCESS)
    earn = agg(
        CommissionLedger, CommissionLedger.earned_amount,
        CommissionLedger.beneficiary_id == Member.id, CommissionLedger.status == CommissionStatus.CREDITED,
    )
    paid = agg(Payout, Payout.amount, Payout.member_id == Member.id, Payout.status != PayoutStatus.REJECTED)
    balance = earn - paid

    base = select(Member.id, Member.member_code, Member.full_name, pay.label("tp"), earn.label("te"), paid.label("tpo"), balance.label("bal"))
    count = select(func.count()).select_from(Member)
    conditions: list[Any] = []
    if search:
        pat = _like(search)
        conditions.append(or_(Member.full_name.ilike(pat, escape="\\"), Member.member_code.ilike(pat, escape="\\")))
    if min_balance is not None:
        conditions.append(balance >= min_balance)
    if max_balance is not None:
        conditions.append(balance <= max_balance)
    for c in conditions:
        base, count = base.where(c), count.where(c)

    total = db.scalar(count) or 0
    rows = db.execute(
        base.order_by(Member.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    ).all()
    data = [
        MemberSummaryRow(
            id=r.id, member_code=r.member_code, full_name=r.full_name,
            total_payment=r.tp, total_earning=r.te, total_paid=r.tpo, balance=r.bal,
        )
        for r in rows
    ]
    return Page(data=data, total=total, page=page, page_size=page_size)


def _date_conds(column, from_date: datetime | None, to_date: datetime | None) -> list[Any]:
    conds = []
    if from_date:
        conds.append(column >= from_date)
    if to_date:
        conds.append(column <= to_date)
    return conds


def list_payments(db: Session, *, pay_status: PaymentStatus | None, from_date, to_date, page: int, page_size: int) -> Page:
    conds = _date_conds(Payment.paid_at, from_date, to_date)
    if pay_status:
        conds.append(Payment.status == pay_status)
    stmt = select(Payment).options(joinedload(Payment.member)).where(*conds).order_by(Payment.created_at.desc())
    count = select(func.count()).select_from(Payment).where(*conds)
    return _page(db, stmt, count, page, page_size, PaymentWithMember.model_validate)


def list_commissions(db: Session, *, level: int | None, from_date, to_date, page: int, page_size: int) -> Page:
    conds = _date_conds(CommissionLedger.created_at, from_date, to_date)
    if level:
        conds.append(CommissionLedger.level == level)
    stmt = (
        select(CommissionLedger)
        .options(joinedload(CommissionLedger.beneficiary), joinedload(CommissionLedger.source_member))
        .where(*conds)
        .order_by(CommissionLedger.created_at.desc())
    )
    count = select(func.count()).select_from(CommissionLedger).where(*conds)
    return _page(db, stmt, count, page, page_size, LedgerRowWithMembers.model_validate)


def list_payouts_report(db: Session, *, pay_status: PayoutStatus | None, mode: PayoutMode | None, from_date, to_date, page: int, page_size: int) -> Page:
    conds = _date_conds(Payout.created_at, from_date, to_date)
    if pay_status:
        conds.append(Payout.status == pay_status)
    if mode:
        conds.append(Payout.payment_mode == mode)
    stmt = select(Payout).options(joinedload(Payout.member)).where(*conds).order_by(Payout.created_at.desc())
    count = select(func.count()).select_from(Payout).where(*conds)
    return _page(db, stmt, count, page, page_size, PayoutWithMember.model_validate)


def list_audit_logs(db: Session, *, actor_id: str | None, action: str | None, entity_name: str | None, from_date, to_date, page: int, page_size: int) -> Page:
    conds = _date_conds(AuditLog.created_at, from_date, to_date)
    if actor_id:
        conds.append(AuditLog.actor_id == actor_id)
    if action:
        conds.append(AuditLog.action == action)
    if entity_name:
        conds.append(AuditLog.entity_name == entity_name)
    stmt = select(AuditLog).where(*conds).order_by(AuditLog.created_at.desc())
    count = select(func.count()).select_from(AuditLog).where(*conds)
    return _page(db, stmt, count, page, page_size, AuditLogOut.model_validate)
