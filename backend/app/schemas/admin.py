from datetime import datetime
from decimal import Decimal
from uuid import UUID

from app.models.enums import ActorType, MemberStatus
from app.schemas.common import CamelModel
from app.schemas.member import SponsorRef


class UpdateMemberStatusRequest(CamelModel):
    status: MemberStatus


class AdminMemberRow(CamelModel):
    id: UUID
    member_code: str
    full_name: str
    email: str
    phone: str
    status: MemberStatus
    doj: datetime
    sponsor: SponsorRef | None


class MemberSummaryRow(CamelModel):
    id: UUID
    member_code: str
    full_name: str
    total_payment: Decimal
    total_earning: Decimal
    total_paid: Decimal
    balance: Decimal


class AuditLogOut(CamelModel):
    id: UUID
    actor_type: ActorType
    actor_id: str
    action: str
    entity_name: str
    entity_id: str
    before_snapshot: dict | None
    after_snapshot: dict | None
    ip_address: str | None
    created_at: datetime
