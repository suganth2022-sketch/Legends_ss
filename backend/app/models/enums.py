"""Enumerations shared by models and schemas. Values are upper-case strings so
the JSON the API returns matches what the frontend already expects."""

import enum


class MemberStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    PENDING = "PENDING"
    SUSPENDED = "SUSPENDED"


class KycStatus(str, enum.Enum):
    NOT_SUBMITTED = "NOT_SUBMITTED"
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"


class PlanStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    SUPERSEDED = "SUPERSEDED"


class PaymentStatus(str, enum.Enum):
    INITIATED = "INITIATED"
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    REFUNDED = "REFUNDED"


class PaymentMode(str, enum.Enum):
    ONLINE_RAZORPAY = "ONLINE_RAZORPAY"
    MANUAL_ADMIN = "MANUAL_ADMIN"


class CommissionStatus(str, enum.Enum):
    CREDITED = "CREDITED"
    REVERSED = "REVERSED"


class PayoutStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    PROCESSING = "PROCESSING"
    PAID = "PAID"
    REJECTED = "REJECTED"


class PayoutMode(str, enum.Enum):
    UPI = "UPI"
    BANK_TRANSFER = "BANK_TRANSFER"


class NotificationChannel(str, enum.Enum):
    IN_APP = "IN_APP"
    SMS = "SMS"
    EMAIL = "EMAIL"


class NotificationStatus(str, enum.Enum):
    QUEUED = "QUEUED"
    SENT = "SENT"
    FAILED = "FAILED"


class ActorType(str, enum.Enum):
    MEMBER = "MEMBER"
    ADMIN = "ADMIN"
    SYSTEM = "SYSTEM"
