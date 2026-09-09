# Legends MLM — Business Rules v1.1

Companion to `development-guide.md` and the SRS. This document resolves the open
business decisions in `development-guide.md` §1 that gate the commission,
payment, and payout engines. It is the source of truth for those engines —
implementations must read these values/rules, not hard-code them.

Supersedes v1.0 (the original seeded rate table). Changed in this revision:
commission rate table (all levels), and resolution of Open Decisions #2 and #5.

---

## 1. Level Numbering & Commission Rates

Levels are counted from the **paying member themselves**, not from their direct
sponsor:

| Level | Who | Rate |
|---|---|---|
| 1 | The paying member (self) | — (not a beneficiary of their own payment; no ledger row is ever created for Level 1) |
| 2 | Direct sponsor | 10.0% |
| 3 | Sponsor's sponsor | 6.6% |
| 4 | | 3.3% |
| 5 | | 2.3% |
| 6 | | 2.3% |
| 7 | | 2.0% |
| 8 | | 2.0% |
| 9 | | 1.6% |
| 10 | 9th-line upline | 1.3% |

**Total override paid out per payment (Levels 2–10 combined): 31.4%** of the
payment amount, split across up to 9 upline members — assuming every one of
them is eligible that month (see §3). This total is a useful sanity check for
the commission engine: `SUM(commission_ledger.earnedAmount WHERE paymentId = X)
<= 0.314 * payments.amount`, with equality only when no upline member in the
chain was flushed that month.

Rates are stored in `commission_rules` with `effectiveFrom`/`effectiveTo` so a
future rate change never recalculates historical ledger rows (SRS §10.2) —
seeded in `backend/prisma/seed.ts`.

---

## 2. Monthly Payment Due Date (resolves Open Decision #2)

Each member has a **fixed due day for every month going forward**, set once at
registration from their Date of Joining (DOJ) and never recalculated:

- **DOJ on or before the 20th of a month** → due day = **20th** of each
  subsequent month.
- **DOJ after the 20th of a month** → due day = **30th** of each subsequent
  month (for months with fewer than 30 days, i.e. February, the due day is the
  last calendar day of that month).

A payment counts as "a completed monthly payment" for a given month only if it
is received on or before the member's due day for that month. A payment made
after the due day is late for that month, regardless of whether it's later
accepted/recorded in the system.

---

## 3. Missed Payment → Commission Eligibility (resolves Open Decision #5)

If a member does **not** make their own installment payment by their due day
for a given month:

- That member's incoming override commissions **from their downline for that
  specific month are flushed** — no `commission_ledger` rows are generated
  crediting them for any downline payment that occurred in that month.
- This is a **per-beneficiary check, not a chain-wide gate**: every other
  member in the same sponsor chain who *did* pay on time that month is
  unaffected and still receives their normal share from the same payment.
- The flushed amount is **not redistributed** to anyone else — it's simply not
  paid out.
- **No retroactive restoration.** If the member later pays their overdue
  installment, it does not reopen or backfill the commissions they missed for
  that month. This is explicit and final — confirmed as-is, not an engine bug
  to "fix" later.

### Worked example
Member D pays their ₹3,000 installment on time. Chain: D → C → B → A → …
(C = D's direct sponsor = Level 2, B = Level 3, A = Level 4).

- C missed C's own due date this month → C is skipped; C earns ₹0 from D's
  payment this month (forfeited, not paid to B or A instead).
- B and A both paid on time this month → both receive their normal share
  (6.6% and 3.3% of ₹3,000 respectively) from D's payment.

Implementation note: the commission engine should evaluate each beneficiary's
own-payment eligibility for the calendar month **independently** while walking
the sponsor chain — skip-and-continue per level, not abort-on-first-failure.

---

## 4. Still Open (from `development-guide.md` §1 — unresolved)

Items #1 (jewellery redemption workflow), #3 (plan upgrade process), #4
(consecutive-missed-payment status change), #6 (payout approval authority),
#7 (refund/clawback policy), #8 (tax/TDS/GST treatment), and #9 (legal/
compliance review) remain open and are not addressed by this revision.
