"""Re-exports every SQLAlchemy model so Alembic's autogenerate can discover
them via Base.metadata just by importing this package. Add new models here."""

from app.models.finance import (
    CommissionLedger,
    CommissionRule,
    Payment,
    PaymentGatewayTransaction,
    PaymentPlan,
    Payout,
)
from app.models.member import Member, MemberBankDetails, MemberKyc, MemberProfile, Nominee
from app.models.system import (
    AdminUser,
    Announcement,
    AuditLog,
    Notification,
    Permission,
    Role,
    RolePermission,
    SystemCounter,
)

__all__ = [
    "AdminUser",
    "Announcement",
    "AuditLog",
    "CommissionLedger",
    "CommissionRule",
    "Member",
    "MemberBankDetails",
    "MemberKyc",
    "MemberProfile",
    "Nominee",
    "Notification",
    "Payment",
    "PaymentGatewayTransaction",
    "PaymentPlan",
    "Payout",
    "Permission",
    "Role",
    "RolePermission",
    "SystemCounter",
]
