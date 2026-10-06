"""Reset an admin's or member's password from the command line (lost-password recovery).

    python -m scripts.reset_password admin admin
    python -m scripts.reset_password member A000001

The new password is read from the RESET_PASSWORD environment variable, or
prompted for (hidden) if unset. It is never printed. The reset is audit-logged.
"""

import getpass
import os
import sys

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models import AdminUser, Member
from app.models.enums import ActorType
from app.services import audit_service


def main() -> None:
    if len(sys.argv) != 3 or sys.argv[1] not in ("admin", "member"):
        sys.exit("usage: python -m scripts.reset_password (admin <username> | member <member_code>)")
    kind, ident = sys.argv[1], sys.argv[2]

    password = os.environ.get("RESET_PASSWORD") or getpass.getpass("New password: ")
    if len(password) < 12:
        sys.exit("Password must be at least 12 characters")

    with SessionLocal() as db:
        if kind == "admin":
            account = db.scalar(select(AdminUser).where(AdminUser.username == ident))
        else:
            account = db.scalar(select(Member).where(Member.member_code == ident.upper()))
        if account is None:
            sys.exit(f"No {kind} found for '{ident}'")

        account.password_hash = hash_password(password)
        audit_service.record(
            db,
            actor_type=ActorType.SYSTEM,
            actor_id="cli",
            action="PASSWORD_RESET_CLI",
            entity_name="AdminUser" if kind == "admin" else "Member",
            entity_id=str(account.id),
        )
        db.commit()
    print(f"Password updated for {kind} '{ident}'.")


if __name__ == "__main__":
    main()
