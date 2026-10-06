"""Money tables: payment plans, payments, commission rules + ledger, payouts.

Balances are never stored — they are always derived:
    available = SUM(commission_ledger CREDITED) - SUM(payouts not REJECTED)
"""

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    JSON,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import created_at_col, pg_enum, updated_at_col, utcnow, uuid_pk
from app.models.enums import (
    CommissionStatus,
    PaymentMode,
    PaymentStatus,
    PayoutMode,
    PayoutStatus,
    PlanStatus,
)
from app.models.member import Member

Money = Numeric(12, 2)
Rate = Numeric(5, 2)


class PaymentPlan(Base):
    __tablename__ = "payment_plans"
    __table_args__ = (Index("ix_payment_plans_member_id", "member_id"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    member_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("members.id", ondelete="CASCADE"), nullable=False
    )
    committed_amount: Mapped[Decimal] = mapped_column(Money, nullable=False)
    effective_from: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    status: Mapped[PlanStatus] = mapped_column(
        pg_enum(PlanStatus, "plan_status"), default=PlanStatus.ACTIVE, nullable=False
    )
    created_at: Mapped[datetime] = created_at_col()


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (
        Index("ix_payments_member_id", "member_id"),
        CheckConstraint("amount > 0", name="ck_payments_amount_positive"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    member_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("members.id", ondelete="CASCADE"), nullable=False
    )
    amount: Mapped[Decimal] = mapped_column(Money, nullable=False)
    status: Mapped[PaymentStatus] = mapped_column(
        pg_enum(PaymentStatus, "payment_status"), default=PaymentStatus.INITIATED, nullable=False
    )
    mode: Mapped[PaymentMode] = mapped_column(
        pg_enum(PaymentMode, "payment_mode"), default=PaymentMode.ONLINE_RAZORPAY, nullable=False
    )
    transaction_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = created_at_col()

    member: Mapped[Member] = relationship()


class PaymentGatewayTransaction(Base):
    __tablename__ = "payment_gateway_transactions"

    id: Mapped[uuid.UUID] = uuid_pk()
    payment_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("payments.id", ondelete="CASCADE"), unique=True
    )
    gateway_status: Mapped[str] = mapped_column(String(50), nullable=False)
    raw_payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = created_at_col()


class CommissionRule(Base):
    """Versioned override rate per level (2–10). Level 1 is the payer; no rule exists for it."""

    __tablename__ = "commission_rules"
    __table_args__ = (Index("ix_commission_rules_level", "level"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    level: Mapped[int] = mapped_column(Integer, nullable=False)
    percentage: Mapped[Decimal] = mapped_column(Rate, nullable=False)
    effective_from: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    effective_to: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = created_at_col()


class CommissionLedger(Base):
    """One immutable row per beneficiary per payment."""

    __tablename__ = "commission_ledger"
    __table_args__ = (
        Index("ix_commission_ledger_beneficiary_id", "beneficiary_id"),
        Index("ix_commission_ledger_source_member_id", "source_member_id"),
        Index("ix_commission_ledger_payment_id", "payment_id"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    payment_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("payments.id", ondelete="CASCADE"), nullable=False
    )
    beneficiary_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("members.id", ondelete="CASCADE"), nullable=False
    )
    source_member_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("members.id", ondelete="CASCADE"), nullable=False
    )
    level: Mapped[int] = mapped_column(Integer, nullable=False)
    applied_rate: Mapped[Decimal] = mapped_column(Rate, nullable=False)
    base_amount: Mapped[Decimal] = mapped_column(Money, nullable=False)
    earned_amount: Mapped[Decimal] = mapped_column(Money, nullable=False)
    status: Mapped[CommissionStatus] = mapped_column(
        pg_enum(CommissionStatus, "commission_status"),
        default=CommissionStatus.CREDITED,
        nullable=False,
    )
    created_at: Mapped[datetime] = created_at_col()

    beneficiary: Mapped[Member] = relationship(foreign_keys=[beneficiary_id])
    source_member: Mapped[Member] = relationship(foreign_keys=[source_member_id])


class Payout(Base):
    __tablename__ = "payouts"
    __table_args__ = (
        Index("ix_payouts_member_id", "member_id"),
        CheckConstraint("amount > 0", name="ck_payouts_amount_positive"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    member_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("members.id", ondelete="CASCADE"), nullable=False
    )
    reference_no: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Money, nullable=False)
    payment_mode: Mapped[PayoutMode] = mapped_column(
        pg_enum(PayoutMode, "payout_mode"), default=PayoutMode.UPI, nullable=False
    )
    account_details_masked: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[PayoutStatus] = mapped_column(
        pg_enum(PayoutStatus, "payout_status"), default=PayoutStatus.PENDING, nullable=False
    )
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    admin_note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = created_at_col()
    updated_at: Mapped[datetime] = updated_at_col()

    member: Mapped[Member] = relationship()
