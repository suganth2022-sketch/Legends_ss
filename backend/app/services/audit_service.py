"""Append-only audit trail. Rows are added to the caller's session, so an
audit entry commits (or rolls back) together with the action it records —
a sensitive action can never succeed without its audit row."""

from typing import Any

from sqlalchemy.orm import Session

from app.models.enums import ActorType
from app.models.system import AuditLog


def record(
    db: Session,
    *,
    actor_type: ActorType,
    actor_id: str,
    action: str,
    entity_name: str,
    entity_id: str,
    before: dict[str, Any] | None = None,
    after: dict[str, Any] | None = None,
    ip: str | None = None,
) -> None:
    db.add(
        AuditLog(
            actor_type=actor_type,
            actor_id=actor_id,
            action=action,
            entity_name=entity_name,
            entity_id=entity_id,
            before_snapshot=before,
            after_snapshot=after,
            ip_address=ip,
        )
    )
