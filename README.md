# Legends MLM

Jewellery-savings platform with a 10-level sponsor commission network.

Monorepo: **FastAPI + SQLAlchemy** API in `backend/` on **Supabase Postgres**, **Next.js 15 (App Router)** web app in `frontend/`.

## How the pieces talk

```
Browser ──► Next.js (/api/proxy/*, /api/auth/*) ──► NestJS API ──► PostgreSQL
            httpOnly session cookies                 JWT + RBAC
```

The browser never sees JWTs or the backend URL. Login happens in a Next route handler that stores the
tokens in `httpOnly` cookies; `/api/proxy/*` attaches them server-side and refreshes them when they expire.
The NestJS API must stay on a private network (only the Next server should reach it).

## First-time setup

```bash
# 1. Backend  (needs a Supabase project: copy its two connection strings into .env)
cd backend
python -m venv .venv && .venv\Scriptsctivate     # source .venv/bin/activate on macOS/Linux
pip install -r requirements-dev.txt
copy .env.example .env                              # fill DATABASE_URL, DIRECT_URL + generate the secrets
alembic upgrade head                                # create tables
python -m scripts.seed                              # roles, rates, admin, root member (prints passwords once)
uvicorn app.main:app --reload --port 3000           # http://localhost:3000/docs (dev only)

# 2. Frontend (new terminal)
cd frontend
copy .env.example .env                              # BACKEND_URL=http://localhost:3000/api/v1
npm install
npm run dev                                         # http://localhost:3001
```

Production: `NODE_ENV=production` / `ENVIRONMENT=production`, real secrets from your secret manager,
`alembic upgrade head`, then `npm run build && npm start` for the frontend and
`uvicorn app.main:app --host 0.0.0.0 --port 3000 --proxy-headers --forwarded-allow-ips=<frontend ip>` for the API.
See `backend/README.md` for details.

## Working together

- `main` is the stable branch. Never push directly to it.
- Create a branch per task: `git checkout -b feature/<name>`; open a PR for review.
- Run `alembic upgrade head` (in `backend/`) whenever someone adds a new migration.
- Business rules live in `docs/business-rules.md`.
