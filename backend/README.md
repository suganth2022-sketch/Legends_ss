# Legends MLM — Backend (FastAPI + Supabase Postgres)

REST API for the member portal and admin portal: members and sponsor network,
monthly payments, 10-level commission engine, payouts, KYC/bank (encrypted),
RBAC and audit log. Business rules: `../docs/business-rules.md`.

## Setup

```bash
python -m venv .venv
.venv\Scripts\activate            # Windows   (source .venv/bin/activate on macOS/Linux)
pip install -r requirements-dev.txt
copy .env.example .env            # then fill in — see comments in the file
```

## Database (Supabase)

```bash
alembic upgrade head              # creates all tables (+ enables row-level security)
python -m scripts.seed            # roles, commission rates, admin user, root member A000001
```

* App connects through the **transaction pooler** (`DATABASE_URL`, port 6543); migrations use `DIRECT_URL` (port 5432).
* Migrations use their own version table (`alembic_version_legends_mlm`), so this app can share a Supabase
  project with another Alembic-managed app. A **separate Supabase project per environment** is still recommended.
* Row-level security is enabled on every table with no policies: Supabase's public REST API can't read anything,
  only this API (database owner connection) can. Don't add policies unless you intend to expose data that way.

## Run

```bash
uvicorn app.main:app --reload --port 3000                       # dev; docs at /docs
uvicorn app.main:app --host 0.0.0.0 --port 3000 \
        --proxy-headers --forwarded-allow-ips="<frontend ip>"   # production (docs disabled)
```

Keep the API on a private network; only the Next.js server should reach it.
`--forwarded-allow-ips` makes rate limiting see real client IPs.

## Tests

```bash
pytest          # in-memory SQLite, never touches Supabase
```

## Structure

```
app/
  main.py            app, CORS, rate limiting, error shapes
  core/              config (env), database, security (JWT/roles), encryption, rate_limit
  models/            SQLAlchemy tables (member, finance, system)
  schemas/           Pydantic request/response shapes (camelCase JSON)
  services/          all business logic (commission, payments, payouts, profile, admin ...)
  api/v1/endpoints/  thin routers: auth, members, referral, finance, admin, health
alembic/             migrations
scripts/seed.py      first-run data
tests/
```

## Roles

`Super Admin` (everything, incl. commission rates) · `Finance Admin` (manual payments, payout workflow) ·
`Support Admin` (member status). Any admin can read members, reports and the audit log.
