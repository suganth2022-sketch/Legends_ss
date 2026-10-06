"""Admin portal: member management, drill-downs, reports, audit log.

Reads of a single member's data are themselves audit-logged.
"""

import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.api.v1.deps import DateRange, client_ip
from app.core.database import get_db
from app.core.security import SUPPORT_ROLES, Principal, require_admin
from app.models.enums import ActorType, MemberStatus, PaymentStatus, PayoutMode, PayoutStatus
from app.schemas.admin import AdminMemberRow, UpdateMemberStatusRequest
from app.schemas.common import PaginationQuery
from app.schemas.finance import EarningRow, MyPaymentsOut, PayoutRow
from app.schemas.member import FullProfileOut
from app.services import admin_service, audit_service, passbook_service, payment_service, profile_service

router = APIRouter(prefix="/admin")


def _pagination(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100, alias="pageSize"),
) -> PaginationQuery:
    return PaginationQuery(page=page, pageSize=page_size)


def _log_view(db: Session, request: Request, p: Principal, action: str, member_id: uuid.UUID) -> None:
    audit_service.record(
        db, actor_type=ActorType.ADMIN, actor_id=p.id, action=action,
        entity_name="Member", entity_id=str(member_id), ip=client_ip(request),
    )
    db.commit()


@router.get("/members")
def list_members(
    search: str | None = None,
    status: MemberStatus | None = None,
    pg: PaginationQuery = Depends(_pagination),
    p: Principal = Depends(require_admin()),
    db: Session = Depends(get_db),
):
    return admin_service.list_members(db, search=search, member_status=status, page=pg.page, page_size=pg.page_size)


@router.patch("/members/{member_id}/status", response_model=AdminMemberRow)
def update_member_status(
    request: Request, member_id: uuid.UUID, dto: UpdateMemberStatusRequest,
    p: Principal = Depends(require_admin(*SUPPORT_ROLES)), db: Session = Depends(get_db),
):
    return admin_service.update_member_status(db, member_id, dto.status, p.id, client_ip(request))


@router.get("/members/{member_id}/earnings", response_model=list[EarningRow])
def member_earnings(
    request: Request, member_id: uuid.UUID,
    dates: DateRange = Depends(),
    level: int | None = Query(default=None, ge=2, le=10),
    source_member_code: str | None = Query(default=None, alias="sourceMemberCode"),
    p: Principal = Depends(require_admin()), db: Session = Depends(get_db),
):
    _log_view(db, request, p, "ADMIN_VIEWED_MEMBER_EARNINGS", member_id)
    return passbook_service.get_earnings(
        db, member_id, from_date=dates.from_date, to_date=dates.to_date,
        level=level, source_member_code=source_member_code,
    )


@router.get("/members/{member_id}/payouts", response_model=list[PayoutRow])
def member_payouts(
    request: Request, member_id: uuid.UUID,
    dates: DateRange = Depends(),
    mode: PayoutMode | None = None,
    status: PayoutStatus | None = None,
    p: Principal = Depends(require_admin()), db: Session = Depends(get_db),
):
    _log_view(db, request, p, "ADMIN_VIEWED_MEMBER_PAYOUTS", member_id)
    return passbook_service.get_payouts(
        db, member_id, from_date=dates.from_date, to_date=dates.to_date, mode=mode, status=status
    )


@router.get("/members/{member_id}/payments", response_model=MyPaymentsOut)
def member_payments(
    request: Request, member_id: uuid.UUID,
    p: Principal = Depends(require_admin()), db: Session = Depends(get_db),
):
    _log_view(db, request, p, "ADMIN_VIEWED_MEMBER_PAYMENTS", member_id)
    return payment_service.get_member_payments(db, member_id)


@router.get("/members/{member_id}/full-profile", response_model=FullProfileOut)
def member_full_profile(
    request: Request, member_id: uuid.UUID,
    p: Principal = Depends(require_admin()), db: Session = Depends(get_db),
):
    """Personal details, KYC/bank (masked — admins never get a reveal action) and nominee."""
    _log_view(db, request, p, "ADMIN_VIEWED_MEMBER_PROFILE", member_id)
    return profile_service.get_full_profile(db, member_id)


@router.get("/members-summary")
def members_summary(
    search: str | None = None,
    min_balance: Decimal | None = Query(default=None, alias="minBalance"),
    max_balance: Decimal | None = Query(default=None, alias="maxBalance"),
    pg: PaginationQuery = Depends(_pagination),
    p: Principal = Depends(require_admin()), db: Session = Depends(get_db),
):
    return admin_service.list_members_summary(
        db, search=search, min_balance=min_balance, max_balance=max_balance, page=pg.page, page_size=pg.page_size
    )


@router.get("/reports/payments")
def report_payments(
    status: PaymentStatus | None = None,
    dates: DateRange = Depends(),
    pg: PaginationQuery = Depends(_pagination),
    p: Principal = Depends(require_admin()), db: Session = Depends(get_db),
):
    return admin_service.list_payments(
        db, pay_status=status, from_date=dates.from_date, to_date=dates.to_date, page=pg.page, page_size=pg.page_size
    )


@router.get("/reports/commissions")
def report_commissions(
    level: int | None = Query(default=None, ge=2, le=10),
    dates: DateRange = Depends(),
    pg: PaginationQuery = Depends(_pagination),
    p: Principal = Depends(require_admin()), db: Session = Depends(get_db),
):
    """Includes appliedRate (members never see it)."""
    return admin_service.list_commissions(
        db, level=level, from_date=dates.from_date, to_date=dates.to_date, page=pg.page, page_size=pg.page_size
    )


@router.get("/reports/payouts")
def report_payouts(
    status: PayoutStatus | None = None,
    mode: PayoutMode | None = None,
    dates: DateRange = Depends(),
    pg: PaginationQuery = Depends(_pagination),
    p: Principal = Depends(require_admin()), db: Session = Depends(get_db),
):
    return admin_service.list_payouts_report(
        db, pay_status=status, mode=mode, from_date=dates.from_date, to_date=dates.to_date,
        page=pg.page, page_size=pg.page_size,
    )


@router.get("/audit-logs")
def audit_logs(
    actor_id: str | None = Query(default=None, alias="actorId"),
    action: str | None = None,
    entity_name: str | None = Query(default=None, alias="entityName"),
    dates: DateRange = Depends(),
    pg: PaginationQuery = Depends(_pagination),
    p: Principal = Depends(require_admin()), db: Session = Depends(get_db),
):
    return admin_service.list_audit_logs(
        db, actor_id=actor_id, action=action, entity_name=entity_name,
        from_date=dates.from_date, to_date=dates.to_date, page=pg.page, page_size=pg.page_size,
    )
