# Legends MLM

Monorepo: NestJS + Prisma (PostgreSQL) backend, React + Vite frontend.

## Stack

- **Backend:** NestJS, Prisma ORM, PostgreSQL, Redis, JWT auth
- **Frontend:** React, Vite, Redux, React Router
- **Infra:** Docker Compose (Postgres 15, Redis 7)

## First-time setup

```bash
# 1. Start the database + redis
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env          # then edit secrets
npm install
npx prisma migrate dev        # apply migrations
npm run start:dev             # http://localhost:3000

# 3. Frontend (new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev                   # http://localhost:5173
```

## Working together

- `main` is the stable branch. Never push directly to it.
- Create a branch per task: `git checkout -b feature/<name>`
- Open a Pull Request on GitHub for review before merging.
- After a PR merges: `git checkout main && git pull`
- Run `npx prisma migrate dev` whenever someone adds a new migration.
