"""Seed roles, default commission rates, the first admin, and root member A000001.

    python -m scripts.seed

Credentials come from the environment (SEED_ADMIN_PASSWORD,
SEED_ROOT_MEMBER_PASSWORD) - never from source. In production they are
mandatory; in development a random password is generated and printed once.
Re-running is safe: existing rows are left untouched (passwords are NOT reset).
"""

import os
import secrets
import sys
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models import (
    AdminUser,
    CommissionRule,
    Member,
    MemberKyc,
    MemberProfile,
    PaymentPlan,
    Role,
    SystemCounter,
)
from app.models.enums import KycStatus, MemberStatus

# docs/business-rules.md section 1: level 2 = direct sponsor ... level 10 = 9th-line upline.
DEFAULT_RATES = {2: "10.0", 3: "6.6", 4: "3.3", 5: "2.3", 6: "2.3", 7: "2.0", 8: "2.0", 9: "1.6", 10: "1.3"}

ROLES = {
    "Super Admin": "Full system access and security administration",
    "Finance Admin": "Payout processing, manual payment entry, tax reports",
    "Support Admin": "Member support, genealogy view, notification sending",
}


def _secret(env_name: str) -> tuple[str, bool]:
    value = os.environ.get(env_name)
    if value:
        if len(value) < 12:
            sys.exit(f"{env_name} must be at least 12 characters")
        return value, False
    if os.environ.get("ENVIRONMENT") == "production":
        sys.exit(f"{env_name} is required when seeding in production")
    return secrets.token_urlsafe(12), True


def main() -> None:
    admin_pw, admin_generated = _secret("SEED_ADMIN_PASSWORD")
    member_pw, member_generated = _secret("SEED_ROOT_MEMBER_PASSWORD")
    start = datetime(2026, 1, 1, tzinfo=timezone.utc)

    with SessionLocal() as db:
        roles = {}
        for name, description in ROLES.items():
            role = db.scalar(select(Role).where(Role.name == name))
            if role is None:
                role = Role(name=name, description=description)
                db.add(role)
            roles[name] = role
        db.flush()

        for level, pct in DEFAULT_RATES.items():
            exists = db.scalar(
                select(CommissionRule.id).where(CommissionRule.level == level, CommissionRule.effective_to.is_(None))
            )
            if exists is None:
                db.add(CommissionRule(level=level, percentage=Decimal(pct), effective_from=start))

        if db.scalar(select(AdminUser.id).where(AdminUser.username == "admin")) is None:
            db.add(
                AdminUser(
                    username="admin",
                    email=os.environ.get("SEED_ADMIN_EMAIL", "admin@legends-mlm.com"),
                    full_name="Legends Super Administrator",
                    password_hash=hash_password(admin_pw),
                    role_id=roles["Super Admin"].id,
                )
            )

        if db.get(SystemCounter, "member_code") is None:
            db.add(SystemCounter(key="member_code", value=1))  # next registration -> A000002

        root = db.scalar(select(Member).where(Member.member_code == "A000001"))
        if root is None:
            root = Member(
                member_code="A000001",
                full_name="Legends Corporate Root",
                email="root@legends-mlm.com",
                phone="+919999999999",
                password_hash=hash_password(member_pw),
                status=MemberStatus.ACTIVE,
                doj=start,
            )
            db.add(root)
            db.flush()
            db.add(MemberProfile(member_id=root.id, city="Hyderabad", state="Telangana", pincode="500001"))
            db.add(MemberKyc(member_id=root.id, status=KycStatus.VERIFIED, verified_at=datetime.now(timezone.utc)))
            db.add(PaymentPlan(member_id=root.id, committed_amount=Decimal(2000), effective_from=start))
        db.commit()

    print("Seeding complete.")
    if admin_generated:
        print(f"  Generated admin password (shown once): {admin_pw}")
    if member_generated:
        print(f"  Generated root member password (shown once): {member_pw}")
    print("  Existing seed users keep their current passwords.")


if __name__ == "__main__":
    main()
