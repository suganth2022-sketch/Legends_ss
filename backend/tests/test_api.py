"""End-to-end API tests: auth, RBAC, commission rules, payouts, privacy.

paid_at is pinned to the start of the current month so every payment is on time
(due date is the 20th or 30th) and never in the future, whatever day tests run.
"""

from datetime import datetime, timezone
from decimal import Decimal

API = "/api/v1"


def month_start() -> str:
    now = datetime.now(timezone.utc)
    return datetime(now.year, now.month, 1, 0, 1, tzinfo=timezone.utc).isoformat()


def pay(client, headers, code, amount=2000, paid_at=None):
    body = {"memberCode": code, "amount": amount, "paidAt": paid_at or month_start()}
    return client.post(f"{API}/payments/manual", json=body, headers=headers)


# ---- auth -----------------------------------------------------------------------------


def test_member_and_admin_login_shapes(client, register):
    code, _ = register()
    r = client.post(f"{API}/auth/login", json={"identifier": code.lower(), "password": "wrong"})
    assert r.status_code == 401 and "message" in r.json()

    r = client.post(f"{API}/auth/admin/login", json={"username": "super", "password": "Admin-pass-123"})
    body = r.json()
    assert r.status_code == 200
    assert {"accessToken", "refreshToken", "expiresIn", "user"} <= body.keys()
    assert body["user"]["roleName"] == "Super Admin"


def test_access_token_cannot_be_used_as_refresh_and_vice_versa(client, super_headers):
    r = client.post(f"{API}/auth/admin/login", json={"username": "super", "password": "Admin-pass-123"}).json()
    assert client.post(f"{API}/auth/refresh", json={"refreshToken": r["accessToken"]}).status_code == 401
    bad = {"Authorization": f"Bearer {r['refreshToken']}"}
    assert client.get(f"{API}/auth/me", headers=bad).status_code == 401
    ok = client.post(f"{API}/auth/refresh", json={"refreshToken": r["refreshToken"]})
    assert ok.status_code == 200 and ok.json()["accessToken"]


def test_suspended_member_loses_access_immediately(client, register, support_headers):
    code, headers = register()
    assert client.get(f"{API}/members/me", headers=headers).status_code == 200
    member_id = client.get(f"{API}/members/me", headers=headers).json()["id"]
    r = client.patch(f"{API}/admin/members/{member_id}/status", json={"status": "SUSPENDED"}, headers=support_headers)
    assert r.status_code == 200
    assert client.get(f"{API}/members/me", headers=headers).status_code == 401


def test_validation_errors_use_message_key(client):
    r = client.post(f"{API}/members/register", json={"fullName": "x"})
    assert r.status_code == 400
    assert isinstance(r.json()["message"], list)


def test_duplicate_registration_is_409(client, register):
    register()
    r = client.post(f"{API}/members/register", json={
        "fullName": "Dup", "email": "m1@x.com", "phone": "+919876543210", "sponsorCode": "A000001"})
    assert r.status_code == 409


# ---- RBAC -----------------------------------------------------------------------------


def test_roles_are_enforced(client, register, super_headers, finance_headers, support_headers):
    code, member_headers = register()
    # members never reach admin routes
    assert client.get(f"{API}/admin/members", headers=member_headers).status_code == 403
    # support cannot enter payments or change rates; finance cannot change rates
    assert pay(client, support_headers, code).status_code == 403
    rule = {"level": 2, "percentage": 11}
    assert client.post(f"{API}/commission/rules", json=rule, headers=finance_headers).status_code == 403
    assert client.post(f"{API}/commission/rules", json=rule, headers=support_headers).status_code == 403
    assert client.post(f"{API}/commission/rules", json=rule, headers=super_headers).status_code == 200
    # finance cannot suspend members
    mid = client.get(f"{API}/members/me", headers=member_headers).json()["id"]
    assert client.patch(f"{API}/admin/members/{mid}/status", json={"status": "SUSPENDED"}, headers=finance_headers).status_code == 403
    # rate change was audit-logged
    logs = client.get(f"{API}/admin/audit-logs", params={"action": "RULE_CHANGE"}, headers=super_headers).json()
    assert logs["total"] == 1


# ---- payments & commission ------------------------------------------------------------


def test_plan_locking_rules(client, register, finance_headers):
    code, _ = register()
    assert pay(client, finance_headers, code, 1500).status_code == 400  # not a multiple of 1000
    assert pay(client, finance_headers, code, 2000).status_code == 200
    r = pay(client, finance_headers, code, 3000)
    assert r.status_code == 400 and "locked monthly plan" in r.json()["message"]
    future = datetime(2999, 1, 1, tzinfo=timezone.utc).isoformat()
    assert pay(client, finance_headers, code, 2000, paid_at=future).status_code == 400


def test_commission_chain_pays_levels_2_to_4(client, register, finance_headers):
    m1, _ = register("A000001")
    m2, _ = register(m1)
    m3, _ = register(m2)
    for code in ("A000001", m1, m2):
        assert pay(client, finance_headers, code).status_code == 200
    r = pay(client, finance_headers, m3)
    assert r.status_code == 200
    rows = {row["level"]: Decimal(row["earnedAmount"]) for row in r.json()["commissions"]}
    assert rows == {2: Decimal("200"), 3: Decimal("132"), 4: Decimal("66")}  # 10% / 6.6% / 3.3% of 2000


def test_unpaid_sponsor_is_skipped_not_redistributed(client, register, finance_headers):
    a, _ = register("A000001")
    b, _ = register(a)
    assert pay(client, finance_headers, "A000001").status_code == 200  # root paid, A did NOT
    r = pay(client, finance_headers, b)
    levels = {row["level"]: Decimal(row["earnedAmount"]) for row in r.json()["commissions"]}
    assert levels == {3: Decimal("132")}  # only root (level 3, 6.6%); A's 10% is forfeited


# ---- payouts --------------------------------------------------------------------------


def _fund(client, register, finance_headers):
    """Gives the root member a commission balance of 200 + 132... via a downline payment."""
    a, _ = register("A000001")
    assert pay(client, finance_headers, "A000001").status_code == 200
    assert pay(client, finance_headers, a).status_code == 200  # root earns 10% = 200 (level 2)


def root_headers(client):
    r = client.post(f"{API}/auth/login", json={"identifier": "A000001", "password": "Root-pass-123"})
    return {"Authorization": f"Bearer {r.json()['accessToken']}"}


def test_payout_cannot_exceed_balance_and_workflow(client, register, finance_headers, support_headers):
    _fund(client, register, finance_headers)
    me = root_headers(client)
    assert Decimal(client.get(f"{API}/payouts/balance", headers=me).json()["availableBalance"]) == Decimal("200")

    over = client.post(f"{API}/payouts/request", json={"amount": 1000, "paymentMode": "UPI", "accountDetails": "a@upi"}, headers=me)
    assert over.status_code == 400  # min 1000 but balance only 200 (and amount >= 1000 passes DTO)

    # top up with a second downline payment so balance >= 1000: use several members
    for _ in range(5):
        c, _ = register("A000001")
        assert pay(client, finance_headers, c).status_code == 200
    balance = Decimal(client.get(f"{API}/payouts/balance", headers=me).json()["availableBalance"])
    assert balance == Decimal("1200")

    ok = client.post(f"{API}/payouts/request", json={"amount": 1000, "paymentMode": "UPI", "accountDetails": "a@upi"}, headers=me)
    assert ok.status_code == 200 and ok.json()["status"] == "PENDING"
    second = client.post(f"{API}/payouts/request", json={"amount": 1000, "paymentMode": "UPI", "accountDetails": "a@upi"}, headers=me)
    assert second.status_code == 400  # pending request already reserved the balance

    pid = ok.json()["id"]
    assert client.post(f"{API}/payouts/{pid}/approve", headers=support_headers).status_code == 403
    assert client.post(f"{API}/payouts/{pid}/process", headers=finance_headers).status_code == 400  # not approved yet
    assert client.post(f"{API}/payouts/{pid}/approve", headers=finance_headers).json()["status"] == "APPROVED"
    assert client.post(f"{API}/payouts/{pid}/approve", headers=finance_headers).status_code == 400  # no double approve
    assert client.post(f"{API}/payouts/{pid}/process", headers=finance_headers).json()["status"] == "PROCESSING"
    paid = client.post(f"{API}/payouts/{pid}/mark-paid", headers=finance_headers).json()
    assert paid["status"] == "PAID" and paid["processedAt"]


# ---- privacy --------------------------------------------------------------------------


def test_kyc_is_masked_encrypted_and_reveal_is_audited(client, register, super_headers):
    code, headers = register()
    r = client.patch(f"{API}/members/me/kyc", json={"aadhaarNumber": "123412341234", "pan": "ABCDE1234F"}, headers=headers)
    assert r.status_code == 200
    assert r.json() == {"aadhaarMasked": "XXXX XXXX 1234", "panMasked": "XXXXX1234F", "status": "PENDING"}

    from app.core.database import SessionLocal
    from app.models import MemberKyc
    with SessionLocal() as db:
        stored = db.query(MemberKyc).one()
        assert "123412341234" not in stored.aadhaar_encrypted and stored.aadhaar_encrypted.count(":") == 2

    assert client.post(f"{API}/members/me/kyc/reveal", headers=headers).json()["aadhaarNumber"] == "123412341234"
    logs = client.get(f"{API}/admin/audit-logs", params={"action": "KYC_SELF_REVEAL"}, headers=super_headers).json()
    assert logs["total"] == 1

    # admin view never reveals
    mid = client.get(f"{API}/members/me", headers=headers).json()["id"]
    full = client.get(f"{API}/admin/members/{mid}/full-profile", headers=super_headers).json()
    assert full["kyc"]["aadhaarMasked"] == "XXXX XXXX 1234"


def test_bank_account_masked_and_invalid_input_rejected(client, register):
    _, headers = register()
    bad = client.patch(f"{API}/members/me/bank", json={"accountNumber": "12ab"}, headers=headers)
    assert bad.status_code == 400
    ok = client.patch(f"{API}/members/me/bank", json={
        "bankName": "HDFC", "accountNumber": "123456789012", "ifscCode": "HDFC0001234"}, headers=headers)
    assert ok.json()["accountNumberMasked"] == "********9012"
    assert client.post(f"{API}/members/me/bank/reveal", headers=headers).json()["accountNumber"] == "123456789012"


def test_members_only_see_their_own_network(client, register):
    a, ha = register("A000001")
    b, hb = register(a)
    a_id = client.get(f"{API}/members/me", headers=ha).json()["id"]
    b_id = client.get(f"{API}/members/me", headers=hb).json()["id"]
    assert client.get(f"{API}/referral/genealogy/{a_id}", headers=hb).status_code == 403
    rows = client.get(f"{API}/referral/genealogy/{a_id}", headers=ha).json()
    assert [r["memberCode"] for r in rows] == [b] and rows[0]["level"] == 1
    assert client.get(f"{API}/referral/genealogy/{b_id}", headers=hb).json() == []


def test_member_passbook_hides_rate(client, register, finance_headers, super_headers):
    _fund(client, register, finance_headers)
    rows = client.get(f"{API}/passbook/earnings", headers=root_headers(client)).json()
    assert rows and "appliedRate" not in rows[0] and rows[0]["level"] == 2
    admin_rows = client.get(f"{API}/admin/reports/commissions", headers=super_headers).json()
    assert "appliedRate" in admin_rows["data"][0]


def test_members_summary_balance_filter(client, register, finance_headers, super_headers):
    _fund(client, register, finance_headers)
    r = client.get(f"{API}/admin/members-summary", params={"minBalance": 100}, headers=super_headers).json()
    assert r["total"] == 1 and r["data"][0]["memberCode"] == "A000001"
    assert Decimal(r["data"][0]["balance"]) == Decimal("200")


def test_concurrent_payout_requests_cannot_overdraw(client, register, finance_headers):
    """Needs Postgres (advisory locks): run with TEST_DATABASE_URL pointing at a throwaway DB."""
    import os
    import threading

    import pytest

    if "postgres" not in os.environ.get("TEST_DATABASE_URL", ""):
        pytest.skip("requires Postgres")

    for _ in range(10):  # root earns 10 x 200 = 2000
        c, _ = register("A000001")
        assert pay(client, finance_headers, "A000001").status_code in (200, 400)
        assert pay(client, finance_headers, c).status_code == 200
    me = root_headers(client)
    body = {"amount": 1500, "paymentMode": "UPI", "accountDetails": "a@upi"}
    results = []

    def go():
        results.append(client.post(f"{API}/payouts/request", json=body, headers=me).status_code)

    threads = [threading.Thread(target=go) for _ in range(6)]
    [t.start() for t in threads]
    [t.join() for t in threads]
    assert sorted(results) == [200, 400, 400, 400, 400, 400]
