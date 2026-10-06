"""Test fixtures. Tests run against an in-memory SQLite database built from the
models (never the real Supabase DB), with rate limiting off. The environment is
set BEFORE the app is imported because settings are read at import time."""

import os

os.environ.update(
    ENVIRONMENT="test",
    # Set TEST_DATABASE_URL to a THROWAWAY Postgres to also exercise locking; tables are dropped!
    DATABASE_URL=os.environ.get("TEST_DATABASE_URL", "sqlite://"),
    JWT_SECRET="t" * 40,
    JWT_REFRESH_SECRET="r" * 40,
    ENCRYPTION_KEY="ab" * 32,
    RATE_LIMIT_ENABLED="false",
)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.core.database import Base, SessionLocal, engine  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.main import app  # noqa: E402
from app.models import AdminUser, CommissionRule, Member, Role, SystemCounter  # noqa: E402
from app.models.base import utcnow  # noqa: E402

RATES = {2: "10.0", 3: "6.6", 4: "3.3", 5: "2.3", 6: "2.3", 7: "2.0", 8: "2.0", 9: "1.6", 10: "1.3"}
PAST = utcnow().replace(year=2020, month=1, day=1)


@pytest.fixture(autouse=True)
def db_reset():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        roles = {n: Role(name=n) for n in ("Super Admin", "Finance Admin", "Support Admin")}
        db.add_all(roles.values())
        db.flush()
        for name, role in roles.items():
            user = name.split()[0].lower()
            db.add(AdminUser(username=user, email=f"{user}@x.com", full_name=name,
                             password_hash=hash_password("Admin-pass-123"), role_id=role.id))
        for level, pct in RATES.items():
            db.add(CommissionRule(level=level, percentage=pct, effective_from=PAST))
        db.add(SystemCounter(key="member_code", value=1))
        db.add(Member(member_code="A000001", full_name="Root", email="root@x.com", phone="+919999999999",
                      password_hash=hash_password("Root-pass-123"), doj=PAST))
        db.commit()
    yield


@pytest.fixture
def client():
    return TestClient(app)


def _login_admin(client, user):
    r = client.post("/api/v1/auth/admin/login", json={"username": user, "password": "Admin-pass-123"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['accessToken']}"}


@pytest.fixture
def super_headers(client):
    return _login_admin(client, "super")


@pytest.fixture
def finance_headers(client):
    return _login_admin(client, "finance")


@pytest.fixture
def support_headers(client):
    return _login_admin(client, "support")


@pytest.fixture
def register(client):
    """register(sponsor_code) -> (member_code, auth_headers)"""
    counter = {"n": 0}

    def _register(sponsor_code: str = "A000001"):
        counter["n"] += 1
        n = counter["n"]
        r = client.post("/api/v1/members/register", json={
            "fullName": f"Member {n}", "email": f"m{n}@x.com", "phone": f"+9188000000{n:02d}",
            "sponsorCode": sponsor_code})
        assert r.status_code == 201, r.text
        body = r.json()
        login = client.post("/api/v1/auth/login", json={"identifier": body["memberCode"], "password": body["initialPassword"]})
        assert login.status_code == 200, login.text
        return body["memberCode"], {"Authorization": f"Bearer {login.json()['accessToken']}"}

    return _register
