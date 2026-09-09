# LEGENDS MLM SOFTWARE
## Development Roadmap, Architecture & Build Guide
**Companion to SRS v1.0 — Unlimited Direct Referral • 10-Level Network • Jewellery Savings Model**

| Item | Value |
|---|---|
| Document | Development Guide v1.0 |
| Based on | Legends MLM SRS v1.0 |
| Recommended Stack | Node.js (NestJS) + PostgreSQL + React + Redis |
| Team Size | Solo developer |
| Estimated Duration | ≈ 20–21 weeks (full-time, solo) |
| Payment Gateway | Razorpay (recommended for INR / UPI) |

---

## 0. How to Use This Guide
This document turns the Legends MLM SRS v1.0 into an executable build plan. It is organized so you can work top to bottom: confirm the open business decisions, set up the architecture and database, then build modules in the sequence given. Each module section lists what to build, the SRS clauses it satisfies, and a definition of done you can check off.

---

## 1. Open Business Decisions — Resolve Before Coding Financial Logic
Section 29 of the SRS lists items that need your final business sign-off. These affect the commission engine, payment engine and payout workflow directly, so resolving them now avoids expensive rework later. You do not need to block the whole project on these — Phases 1–6 below do not depend on them — but Phases 7–13 (payments, commission, payouts) do.

1. **Jewellery Redemption**: Is jewellery purchase/redemption a separate workflow from the monthly savings payment, or does the savings balance simply convert to jewellery value at redemption?
2. **Late / Partial Payments**: If a member pays late or partially, what exactly counts as “a completed monthly payment” for that month?
3. **Plan Upgrade**: Can a member increase their committed monthly amount later? If yes, what is the approval/versioning process?
4. **Consecutive Missed Payments**: What happens to member status after N consecutive missed payments (suspended? terminated? frozen network position?)
5. **Retroactive Commission Eligibility**: If a missed payment is paid late, does it retroactively restore that month's commission eligibility?
6. **Payout Approval Authority**: Who has payout approval authority, and can a member self-request a payout from the portal?
7. **Refund & Clawback Policy**: What is the refund/cancellation policy, and how are already-paid commissions clawed back?
8. **Tax / TDS / GST**: What tax/TDS/GST treatment applies to commissions and payouts?
9. **Legal / Compliance Review**: Has the compensation structure had a legal/compliance (Prize Chit & Money Circulation Schemes Banning Act, Direct Selling Guidelines) review?

*Recommendation: draft short written answers to these nine questions and store them as a versioned “Business Rules v1.0” document alongside the SRS — the commission and payout engines should read these rules from configuration, never hard-code them.*

---

## 2. Recommended Technology Stack
The SRS is technology-neutral but explicitly calls for a relational database, ledger integrity, and role-based access control (Sections 18, 19, 22, 30). The stack below satisfies those constraints while staying within a single language (TypeScript) end-to-end, which matters for a solo developer maintaining both frontend and backend.

| Layer | Choice | Why |
|---|---|---|
| **Backend framework** | NestJS (Node.js + TypeScript) | Enforces the modular structure the SRS architecture diagram already implies (Auth / MLM Engine / Payment Engine / Notification Engine as separate modules). Built-in DI, guards and interceptors map directly to RBAC and audit logging. |
| **Database** | PostgreSQL 15+ | ACID transactions for ledger integrity (Section 22); recursive CTEs make 10-level genealogy traversal a single indexed query instead of application-side loops; mature encryption/backup tooling. |
| **ORM / migrations** | Prisma | Type-safe queries, first-class migration history (Section 27 — migration/versioning strategy), readable schema file that doubles as documentation. |
| **Cache / queue** | Redis + BullMQ | Backs the monthly reminder scheduler (Section 7.1), webhook retry queue, and rate-limited notification sending. |
| **Frontend** | React + TypeScript + Vite | Single codebase serves both Member Portal and Admin Portal via role-gated routing; Vite gives fast local iteration for a solo dev. |
| **UI kit** | Tailwind CSS + shadcn/ui | Fast to build a responsive, consistent UI (Section 26 usability requirement) without hand-rolling components. |
| **State/data fetching** | TanStack Query + Zustand | Handles server-state caching (dashboards, genealogy, passbook) and small client state (filters, auth) cleanly. |
| **Auth** | JWT (access + httpOnly refresh cookie) + Argon2 password hashing | Matches Section 19: secure salted hashing, secure session cookies, CSRF-safe when combined with SameSite cookies. |
| **Payment gateway** | Razorpay | Strong INR/UPI support, signed webhooks (satisfies Section 8 verification + idempotency requirements), good Node SDK. |
| **Notifications** | MSG91 or Twilio (SMS) + Amazon SES (email) | Delivers welcome/OTP/reminder messages per Section 17 without storing plaintext passwords. |
| **File storage** | AWS S3 / Cloudflare R2 | Profile photos and KYC document uploads (Section 5), signed URLs keep sensitive files access-controlled. |
| **Hosting (MVP)** | Single VPS via Docker Compose + managed Postgres | Cost-effective for launch; migrate to managed containers (ECS/Cloud Run) once traffic justifies it. |
| **Monitoring** | Sentry + UptimeRobot + pg_dump automated backups | Meets Section 27 operational requirements without a dedicated ops team. |
| **CI/CD** | GitHub Actions | Lint → test → build → deploy pipeline; free for a solo dev on a private repo up to generous limits. |

---

## 3. System Architecture
The architecture mirrors Section 30 of the SRS, made concrete for the chosen stack. Both portals are one React application; the backend is one NestJS application internally split into the modules below, all talking to one PostgreSQL database.

| Component | Responsibility |
|---|---|
| **Member Web App (React)** | Registration, profile, genealogy tree, monthly payment, passbook (earnings/payouts), dashboard, notifications. |
| **Admin Web App (React, same codebase)** | Member management, manual payment entry, commission rules, payout approval, announcements, reports, audit logs — gated by role. |
| **API Gateway / NestJS App** | Single REST API; every route protected by JWT auth guard + RBAC guard; validates all input server-side (Section 19). |
| **Auth Module** | Login, logout, password change/reset, session/token issuance, RBAC (roles_permissions). |
| **Referral / Genealogy Module** | Sponsor validation, circular-reference prevention, recursive 10-level tree derivation from the self-referencing members table. |
| **Payment Module** | Payment-plan rules, Razorpay order creation, webhook verification, manual payment entry, idempotency enforcement. |
| **Commission Engine Module** | Walks the sponsor chain on each verified payment, writes immutable `commission_ledger` rows for Levels 2–10 using versioned `commission_rules`. |
| **Payout Module** | Available-balance calculation from the ledger, payout request/approval workflow, payout ledger entries. |
| **Notification Module** | Scheduled reminder jobs (BullMQ), transactional messages (SMS/email), in-app notifications and announcements. |
| **Audit Module** | Cross-cutting interceptor that logs every sensitive read/write (KYC/bank view, admin edits, payouts) to `audit_logs`. |
| **PostgreSQL** | Single source of truth: members/sponsors, payments, commission ledger, payouts, audit logs — all in one ACID-transactional store. |
| **Redis** | Job queue for reminders/webhook retries + short-lived cache for dashboard aggregates. |

### 3.1 Request Flow Example — Online Payment to Commission
1. Member submits a payment amount from an authenticated session (server reads Member ID from the JWT, never from the request body).
2. Backend validates the amount against the member's stored `payment_plans` row and creates a Razorpay order.
3. Razorpay redirects/webhooks back; backend verifies the webhook signature and checks the transaction ID has not been processed before (idempotency).
4. On verified success, a row is written to `payments` (status = SUCCESS) inside a database transaction.
5. The Commission Engine is triggered (synchronously in the same transaction, or via an outbox event) and walks the sponsor chain up to Level 10, inserting one `commission_ledger` row per eligible beneficiary level.
6. Notification Module enqueues a payment-confirmation message to the payer and commission-credited messages to beneficiaries.
7. Passbook and dashboard reads are pure aggregations over `payments` / `commission_ledger` / `payouts` — no balance field is ever written directly.

---

## 4. Database Design
Summary of tables implemented in the PostgreSQL relational schema:

| Table | Purpose & Key Design Notes |
|---|---|
| `members` | Identity + sponsor relationship + status. `sponsor_id` is a self-referencing FK to `members.id`; `member_code` (A000001…) is unique and generated. |
| `member_profiles` | DOB, address, photo (1:1 with `members`). |
| `member_kyc` | Aadhaar/PAN + verification state. Stored encrypted (AES-256); display layer masks by default. |
| `member_bank_details` | Bank/branch/account/IFSC. Account number encrypted; masked in list views. |
| `nominees` | Nominee details (1:1 or 1:many with `members`). |
| `payment_plans` | Committed monthly amount + history. Append-only history table with `effective_from`. |
| `payments` | Every payment attempt/result. Status enum; unique constraint on gateway `transaction_id`. |
| `payment_gateway_transactions` | Raw gateway/webhook payloads (1:1 with `payments`). |
| `commission_rules` | Versioned Level 2–10 rates (`effective_from`/`effective_to`). |
| `commission_ledger` | One immutable row per beneficiary per payment. Reversal rows reference original row instead of mutating. |
| `payouts` | Payout requests/transactions workflow (Pending → Approved → Processing → Paid / Rejected / Cancelled). |
| `notifications` | Per-member notification log with channel and delivery status. |
| `announcements` | Admin broadcasts with `publish_date`/`expiry_date`. |
| `admin_users` | Staff accounts (separate table from `members`). |
| `roles` / `permissions` / `role_permissions` | Normalized RBAC. |
| `audit_logs` | Append-only log of every sensitive action (actor, action, entity, before/after snapshot, IP, timestamp). |

### 4.1 Recursive CTE for Downline Traversal
Because the SRS forbids a fixed matrix and requires unlimited direct referrals (Sections 2, 6, 21), the genealogy is derived, not stored. A recursive Common Table Expression starting from a member's id and following `sponsor_id` up to 10 levels deep gives the full downline in one indexed query. An index on `(sponsor_id)` plus a depth cap (`WHERE level <= 10`) keeps this fast.

---

## 5. Repository & Folder Structure
```text
legends-mlm/
├─ backend/                 NestJS API
│  ├─ src/
│  │  ├─ auth/            login, tokens, guards, RBAC
│  │  ├─ members/         registration, profile, KYC, bank
│  │  ├─ referral/        sponsor validation, genealogy
│  │  ├─ payments/        plans, gateway, manual entry
│  │  ├─ commission/      engine, rules, ledger
│  │  ├─ payouts/         balance, workflow
│  │  ├─ notifications/   templates, scheduler, channels
│  │  ├─ announcements/
│  │  ├─ admin/           reports, audit, exports
│  │  ├─ audit/           cross-cutting logging interceptor
│  │  └─ common/          guards, pipes, decorators, filters
│  └─ prisma/             schema.prisma, migrations/
├─ frontend/                React + Vite
│  └─ src/
│     ├─ portals/member/
│     ├─ portals/admin/
│     ├─ components/         shared UI
│     └─ lib/                api client, auth store
├─ docs/                    development-guide.md, schema.sql, business-rules.md
└─ docker-compose.yml       postgres + redis + api + web (local dev)
```

---

## 6. Development Roadmap
| Phase | Weeks | Deliverable |
|---|---|---|
| **0. Business rules sign-off** | 1 | Answers to Section 1 of this guide, written down and versioned. |
| **1. Project setup** | 1–2 | Repo, Docker Compose (Postgres+Redis), NestJS + React skeletons, CI pipeline, env config. |
| **2. Database schema & migrations** | 2–3 | `schema.sql` / Prisma schema applied; seed script for an initial root member. |
| **3. Auth & RBAC** | 3–4 | Login, JWT + refresh cookies, password hashing, role/permission guards. |
| **4. Registration & sponsor validation** | 4–5 | Referral link → sponsor lookup → registration → Member ID generation → credential delivery. |
| **5. Member profile & sensitive data** | 5–6 | Profile, KYC, bank, nominee CRUD; masking + encryption + access logging. |
| **6. Genealogy engine** | 6–7 | Recursive sponsor-chain query, expandable tree UI, circular-reference prevention. |
| **7. Payment plan & monthly logic** | 7–8 | Plan creation on first payment, ₹1,000-multiple validation, recurring-amount lock. |
| **8. Online payment gateway** | 8–9 | Razorpay order + webhook verification, idempotent success recording, receipts. |
| **9. Manual payment (admin)** | 9–10 | Admin entry by Member ID, appears in history + Advance Paid. |
| **10. Commission engine & ledger** | 10–12 | Sponsor-chain walk, Level 2–10 calculation, immutable ledger, reversal support. |
| **11. Passbook** | 12–13 | Earnings/Payouts sub-pages with date/level/source/status filters. |
| **12. Payout workflow** | 13–14 | Balance calc, request → approve → process states, min ₹1,000, ledger-based deduction. |
| **13. Notifications & scheduler** | 14–15 | Cron/BullMQ reminders (start of month, 15th, 20th), event-triggered messages. |
| **14. Admin portal & reports** | 15–17 | Member management, earnings/payout admin, announcements, Excel exports, 12 report types. |
| **15. Audit, security hardening, ops** | 17–18 | Audit log coverage, rate limiting, secure headers, backups, monitoring. |
| **16. Testing** | 18–20 | Full suite from Section 28 — business rules, security, financial edge cases. |
| **17. UAT & deployment** | 20–21 | Staging rehearsal, production deploy, go-live checklist. |

---

## 7. Module-by-Module Build Notes
- **7.1 Auth & RBAC** (SRS §4.3, §19, §20): Login by Member ID/Admin username + password; Argon2/bcrypt; JWT + httpOnly cookie; Access Control Matrix.
- **7.2 Registration & Sponsor Validation** (SRS §4): Referral link sponsor lookup, transactional Member ID generator (`A000001...`), initial credentials via SMS/email.
- **7.3 Member Profile & Sensitive Data** (SRS §5, §15.2, §19): Encrypted Aadhaar/PAN/bank at rest, default masked display, audit-logged reveal.
- **7.4 Genealogy Engine** (SRS §6): Recursive CTE up to 10 levels, cycle prevention, Table 5 view & tree visualizer.
- **7.5 Payment Plan & Monthly Payment** (SRS §7): Plan creation (≥ ₹1,000 & multiple of ₹1,000), 20th cutoff logic, reminder scheduling.
- **7.6 Online Payment** (SRS §8): Server-side Razorpay order & webhook signature validation, transaction idempotency, instant receipt generation.
- **7.7 Manual Payment Entry** (SRS §9): Admin manual entry, validation against plan rules, audit attribution, reversal entries instead of deletes.
- **7.8 Commission Engine** (SRS §10): Triggered on verified payment, 20th-cutoff eligibility check, walks sponsor chain Levels 2–10, immutable ledger rows.
- **7.9 Passbook** (SRS §11): Earnings tab (rates hidden), Payouts tab, date/level/source/status filters.
- **7.10 Payout Workflow** (SRS §12, §13): Balance computed as `SUM(commission) - SUM(payouts)`, min ₹1,000 validation, multi-step approval workflow.
- **7.11 Notifications & Scheduler** (SRS §7.1, §17): BullMQ/cron reminder jobs, event-triggered notifications.
- **7.12 Admin Portal, Reports & Exports** (SRS §15, §24): Member/earnings/payout admin, all 12 SRS §24 report views, role-gated Excel exports.
- **7.13 Audit, Security & Operations** (SRS §19, §22, §27): Cross-cutting audit interceptor, Helmet, DTO validation, secrets management, automated encrypted backups.

---

## 8. API Surface Overview
- **Auth**: `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`, `POST /auth/password/change`
- **Members**: `POST /members/register`, `GET /members/me`, `PATCH /members/me`, `GET /members/:id`
- **Referral**: `GET /referral/validate/:sponsorId`, `GET /referral/genealogy/:memberId`
- **Payments**: `POST /payments/order`, `POST /payments/webhook`, `GET /payments/history`, `POST /admin/payments/manual`
- **Commission**: `GET /passbook/earnings`, `GET /commission/rules`, `POST /commission/rules`
- **Payouts**: `GET /passbook/payouts`, `POST /payouts/request`, `POST /admin/payouts/:id/approve`, `POST /admin/payouts/:id/process`
- **Notifications**: `GET /notifications`, `POST /notifications/:id/read`
- **Announcements**: `GET /announcements`, `POST /admin/announcements`
- **Reports & Audit**: `GET /admin/reports/:type`, `GET /admin/audit-logs`, `GET /admin/export/:type`

---

## 9. Immediate Next Steps
1. Write down answers to the nine open business decisions in Section 1.
2. Setup Docker Compose for PostgreSQL + Redis locally.
3. Create NestJS backend scaffold with Prisma ORM and seed root member `A000001`.
4. Implement Auth & RBAC module.
5. Enable Swagger documentation (`/api/docs`).
