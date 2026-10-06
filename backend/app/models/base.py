"""Column helpers shared by every model."""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, Uuid
from sqlalchemy.orm import Mapped, mapped_column


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def pg_enum(enum_cls: type[enum.Enum], name: str) -> Enum:
    """Native Postgres enum storing the member *values* (e.g. 'ACTIVE')."""
    return Enum(enum_cls, name=name, values_callable=lambda e: [m.value for m in e])


def uuid_pk() -> Mapped[uuid.UUID]:
    return mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)


def created_at_col() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)


def updated_at_col() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
