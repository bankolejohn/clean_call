# CleanCall Phase 2 — Admin / Operations Dashboard

> A learning-and-reproducibility guide. The goal is that **anyone can tag along** — read this top to bottom and you'll understand *what* Phase 2 is, *how* it was built, *why* it was built that way, and be able to *reproduce* the production database migration step by step.

- **Project:** `clean_call`
- **Branch:** `feature/phase-2-admin-dashboard`
- **Stack:** Next.js 15 (App Router) · TypeScript · Tailwind · shadcn/ui · Supabase / Postgres · Recharts
- **Spec docs:** [`.kiro/specs/cleancall-phase-2-admin/`](../.kiro/specs/cleancall-phase-2-admin/) → [requirements.md](../.kiro/specs/cleancall-phase-2-admin/requirements.md) · [design.md](../.kiro/specs/cleancall-phase-2-admin/design.md) · [tasks.md](../.kiro/specs/cleancall-phase-2-admin/tasks.md)

---

## Table of contents

1. [WHAT: What Phase 2 is](#what-phase-2-is)
2. [WHY: The product thinking](#why-the-product-thinking)
3. [WHAT was built (features)](#what-was-built-features)
4. [HOW it was built (architecture)](#how-it-was-built-architecture)
5. [Testing](#testing)
6. [Production migration runbook](#production-migration-runbook)
7. [Rollback](#rollback)
8. [How to run locally / tests](#how-to-run-locally--tests)
9. [Deploying Phase 2](#deploying-phase-2)

---

## WHAT Phase 2 is

Phase 2 is an **internal Admin / Operations Dashboard** that extends the existing, already-live Phase 1 CleanCall app.

- **Phase 1** was the public side: a landing page plus registration forms for customers and collectors. It collects data.
- **Phase 2** turns that collected data into an **operations console** the team uses for market validation — seeing who signed up, where they are, whether they already have waste collection, and whether they'd pay.

Phase 2 deliberately does **not** build a marketplace, payments, GPS/live tracking, or AI. Those are deferred to later phases. This keeps the scope tight: learn from the data first, build the marketplace later.

---

## WHY the product thinking

CleanCall is building **digital infrastructure for waste management in Ekiti State, Nigeria**.

The reality on the ground shapes everything:

- Many **households** self-manage waste today (burning, burying, or dumping) and may not currently pay for collection.
- Many **businesses** already have a collector they work with.

So before investing in a marketplace, Phase 2 follows a simple validation ladder:

> **DATABASE → VISIBILITY → VALIDATION → OPERATIONS**

| Stage | Question it answers |
| --- | --- |
| Database | Who are the customers and providers? |
| Visibility | Where are they (which LGA)? Do they already have collection? |
| Validation | Would they pay? At what price? |
| Operations | Can the team act on leads and manage providers? |

The point: **understand demand and supply before building the marketplace.**

### Terminology note: "Waste Manager"

In the admin UI, providers are labelled **"Waste Manager"**. This is a **display-only** term.

The underlying `collectors` table, its columns, and all code identifiers were **intentionally NOT renamed**. Renaming a live table is a risky data migration for a purely cosmetic change, so the decision was: **rename the label, keep the schema.** When you see "Waste Manager" in the UI, that's the `collectors` table underneath.

---

## WHAT was built (features)

### New market-research fields (customer form)

These are **market-research questions**, not advertised prices. All are **optional**.

| Field | Options |
| --- | --- |
| `willingness_to_pay` | Yes · Maybe - Depends on price · No |
| `preferred_price_range` | Below ₦2,000 · ₦2,000–₦5,000 · ₦5,000–₦10,000 · Above ₦10,000 · Not sure |
| `has_existing_collection` | Yes · No · Sometimes · I manage it myself |
| `satisfaction_with_existing` | Yes · No · Somewhat *(shown only when `has_existing_collection = Yes`)* |

### New field (collector form)

| Field | Options |
| --- | --- |
| `wants_more_customers` | Yes · Maybe · No |

### Status lifecycles

**Customer lead status**

```
New → Contacted → Interested → Converted → Inactive
```

**Waste Manager verification status**

```
Pending → Contacted → Verified → Active → Inactive → Suspended → Rejected
```

### Admin dashboard

- **Dynamic stats:** total users (customers + collectors), active/pending providers, new this week, interested in paid, and with/without existing collection.
- **Charts (Recharts):**
  - Registrations over time — **line**
  - Customers vs Waste Managers — **bar**
  - Registrations by LGA — **bar**
  - Willingness to pay — **pie**
  - Existing collection — **pie**

### Management tables

Customer and Waste Manager tables were **extended** with the new columns and filters, while preserving the existing search, sort, and pagination:

- Customers: willingness, existing collection, status, date range.
- Waste Managers: provider status, wants-more-customers.

### Detail / profile pages

- Per-record detail pages for customers and Waste Managers.
- A **status control** to move a record through its lifecycle.
- Null fields display as **"Not recorded"** so empty data reads cleanly.

### Locations view

- Per-LGA **customer counts** and Waste Manager **service-area coverage**.
- Shows **all 16 Ekiti LGAs**, including those with zero (so gaps are visible).
- Table + chart. **No interactive map.**

### Analytics & Activity Log

- A dedicated **Analytics** page.
- A basic **Activity Log** page.

### CSV exports

- Customer and Waste Manager exports were **extended with the new fields**.
- Exports **respect the currently active filters**.
- Each export **logs a `data_export` activity**.

### Activity logging

A generic, extensible `activity_log` table (`action_type TEXT`, `metadata JSONB`) captures:

`admin_login` · `customer_status_change` · `provider_approval` · `provider_suspension` · `provider_status_change` · `data_export`

Because `action_type` is free text and details live in a JSONB `metadata` column, new activity types can be added **without schema changes**.

### Admin navigation

- **Dashboard**
- **Customers** — All · Interested in Service · Existing Collection · No Collection
- **Waste Managers** — All · Pending Verification · Active · Suspended
- **Locations**
- **Analytics**
- **Exports**
- **Settings**

---

## HOW it was built (architecture)

The guiding principle: **extend, don't disrupt.** Phase 1 is live, so Phase 2 reuses its patterns and adds only additive changes.

### Reused Phase 1 patterns

- Supabase clients
- Zod validators
- Server actions
- The admin API route auth pattern: `createClient()` → `auth.getUser()` → return **401** if no user
- shadcn/ui components
- The `as const` constants pattern

### Database migration — additive only

`supabase/migrations/002_phase2_admin.sql` is **additive only**:

- `ADD COLUMN IF NOT EXISTS` for the new fields
- `CREATE TABLE IF NOT EXISTS` for `activity_log`
- New indexes
- A `set_updated_at` trigger on both `customers` and `collectors`
- RLS on `activity_log`: authenticated **SELECT** + service_role **INSERT**

It contains **no** `DROP`, `RENAME`, `TRUNCATE`, `ALTER TYPE`, or `DELETE`. All new columns are **nullable**; status columns default to `New` / `Pending`; an `updated_at` column was added to both tables.

### Pure helper functions

Business logic lives in small, DB-free helper modules so it can be unit- and property-tested easily:

- `src/lib/utils/stats.ts`
- `src/lib/utils/filter.ts`
- `src/lib/utils/lifecycle.ts`
- `src/lib/utils/display.ts`
- `src/lib/utils/csv.ts`

### Types & constants

- A new constants file per enum.
- Extended types in `src/types/index.ts`.

### API routes

New/extended routes under `src/app/api/admin/`:

- `customers` & `collectors` list (with new filters)
- `customers/[id]` & `collectors/[id]` (GET + PATCH for status/lifecycle)
- `dashboard`, `analytics`, `locations`, `activity-log`
- `export/customers`, `export/collectors`

### Activity writes use a service-role client

Because `activity_log` INSERT is **service_role only**, activity writes go through a service-role Supabase client. Activity logging is **best-effort** — it never fails the primary action. If logging fails, the customer status change (or export, etc.) still succeeds.

### Charts

**Recharts** is the only new runtime dependency, and it's **pinned**.

### Security

- All admin routes and APIs require an authenticated Supabase session (**401** otherwise).
- Zod validation on PATCH payloads (**400** on invalid input).
- Secrets live in environment variables.
- Passwords are handled by Supabase Auth.

> ⚠️ **Important documented caveat.** The current RLS treats **any** authenticated user as an admin, because there is currently no non-admin login path. If a future phase adds non-admin logins, the `USING(true)` policies **must** be replaced with role/claim-scoped policies **first** — otherwise regular users would gain admin data access.

---

## Testing

Testing uses the existing stack: **vitest + fast-check + @testing-library/react**.

- **16 correctness properties** implemented as property-based tests (minimum **100 iterations** each).
- **Unit tests** for the pure helpers.
- **Integration tests** (mocked Supabase) for API routes: 401s, PATCH validation, lifecycle → status + activity, stats derivation, export, and activity ordering.
- **Phase 1 regression** suite kept green.

**Final result:** **290 passing / 5 skipped**, `tsc` clean, and `next build` succeeds. The 5 skipped tests are staging-gated migration schema checks.

### Gotchas worth remembering

- **Build-time gotcha:** `useSearchParams` in the admin layout/pages had to be wrapped in `<Suspense>` to avoid a Next.js prerender / CSR-bailout error.
- **Node version:** tests run on **Node 22** (see `.nvmrc`). **Node 16 breaks Vitest.**

---

## Production migration runbook

This is the **exact** sequence performed against production, written so it's reproducible.

### Constraints we hit (and why the approach looks the way it does)

- The Supabase **free plan has no branching** (that's a Pro feature).
- The account already had **2 free projects** (the free-tier limit), so spinning up a dedicated staging database wasn't possible.

**Chosen approach:** manual logical backup → apply directly to production → verify.

> The migration is additive-only, which is what makes "apply directly to production" a reasonable (still carefully verified) choice.

### Steps

**1. Baseline counts.** In the Supabase SQL Editor:

```sql
select
  (select count(*) from customers)  as customers,
  (select count(*) from collectors) as collectors;
-- → 12 customers, 0 collectors
```

**2. Reviewer checklist.** Confirmed migration `002` is **additive-only** — no `DROP`, `RENAME`, `TRUNCATE`, `ALTER COLUMN TYPE`, or `DELETE`.

**3. Get the production DB connection string.**

> ⚠️ Use the **SESSION POOLER** URI:
> host `aws-0-<region>.pooler.supabase.com:5432`, user `postgres.<ref>`.
> Do **not** use the direct `db.<ref>.supabase.co` host — it failed to resolve.

Store it in a **gitignored** `.db.local` file as `PROD_DB_URL`.
(`.db.local`, `*.dump.sql`, and `backups/` were added to `.gitignore`.)

**4. Backup.** The local `pg_dump` was **v14** but the server runs **Postgres 17.6** → version mismatch. Solution: dump using the official `postgres:17` Docker image:

```bash
docker run --rm -e PGURL="$PROD_DB_URL" postgres:17 \
  sh -c 'pg_dump "$PGURL" --no-owner --no-privileges' \
  > backups/prod_backup_<ts>.dump.sql
```

Verified the dump contained the **3 public tables** and **12 customer rows**.

**5. Apply the migration inside a transaction.**

```bash
psql "$PROD_DB_URL" -v ON_ERROR_STOP=1 --single-transaction \
  -f supabase/migrations/002_phase2_admin.sql
```

> The 4 backfill `UPDATE`s reported `UPDATE 0`. That's **expected, not an error** — Postgres had already applied the column `DEFAULT`s to existing rows, so there was nothing left to backfill.

**6. Verify.**

- Counts still **12 / 0**.
- **+6** customer columns, **+3** collector columns.
- `activity_log` exists with `action_type TEXT`.
- No `customers` ↔ `collectors` foreign key.
- Existing values intact.
- Final column counts: customers **16**, collectors **16**, `activity_log` **5**.
- RLS policies correct.

**7. `updated_at` correction gotcha.** Existing rows' `updated_at` had been set to *migration time*, not `created_at`. The first correction `UPDATE` **didn't stick** — the `BEFORE UPDATE` `set_updated_at()` trigger overwrote it back to `now()`.

Fix, inside a transaction: **disable** the triggers → run the correction → **re-enable** the triggers.

```sql
BEGIN;
ALTER TABLE customers  DISABLE TRIGGER trg_customers_updated_at;
ALTER TABLE collectors DISABLE TRIGGER trg_collectors_updated_at;

UPDATE customers  SET updated_at = created_at WHERE updated_at <> created_at;
UPDATE collectors SET updated_at = created_at WHERE updated_at <> created_at;

ALTER TABLE customers  ENABLE TRIGGER trg_customers_updated_at;
ALTER TABLE collectors ENABLE TRIGGER trg_collectors_updated_at;
COMMIT;
```

Confirmed all 12 rows now have `updated_at = created_at` and triggers are enabled again.

**8. Post-migration security reminder.**

- **Rotate the DB password** — a live credential was used during the migration.
- **Delete / clear `.db.local`.**
- The backup file stays **local and gitignored**.

---

## Rollback

Because the migration is **additive**, rollback is straightforward and there's a safety net: **nothing in Phase 1 depends on the new columns.**

Two options:

**A) Reverse SQL** — drop what was added. Example:

```sql
BEGIN;

-- drop the activity_log RLS policies, then the table
-- (DROP TABLE cascades and removes these policies too, so the two DROP POLICY
--  lines are optional — they just make the teardown explicit)
DROP POLICY IF EXISTS "Admin select activity_log" ON activity_log;
DROP POLICY IF EXISTS "Service insert activity_log" ON activity_log;
DROP TABLE IF EXISTS activity_log;

-- drop the updated_at triggers (trigger names), then the shared function
DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
DROP TRIGGER IF EXISTS trg_collectors_updated_at ON collectors;
DROP FUNCTION IF EXISTS set_updated_at();

-- drop the new customer columns
ALTER TABLE customers
  DROP COLUMN IF EXISTS willingness_to_pay,
  DROP COLUMN IF EXISTS preferred_price_range,
  DROP COLUMN IF EXISTS has_existing_collection,
  DROP COLUMN IF EXISTS satisfaction_with_existing,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS updated_at;

-- drop the new collector columns
ALTER TABLE collectors
  DROP COLUMN IF EXISTS wants_more_customers,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS updated_at;

COMMIT;
```

> No explicit `DROP INDEX` lines are needed — dropping the columns (and the `activity_log` table) automatically removes the associated indexes.

> Confirm the exact trigger/function/column names against `supabase/migrations/002_phase2_admin.sql` before running — the list above mirrors the documented additions.

**B) Restore from the `pg_dump`** taken in step 4 of the runbook.

---

## How to run locally / tests

```bash
nvm use          # use Node 22 (see .nvmrc — Node 16 breaks Vitest)
npm install
npm run test     # unit + property + integration tests
npm run build    # production build
```

Environment variables in `.env.local`:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key (server-side, used for activity_log inserts) |

---

## Deploying Phase 2

The database migration is **already applied to production**. What's left is the code:

1. Merge `feature/phase-2-admin-dashboard` → `main`.
2. Deploy via **Vercel** to activate the dashboard.

Until the code is deployed, **Phase 1 keeps running unaffected** against the (now Phase-2-ready) database. The additive migration means the live app doesn't notice the new columns.

---

*For the authoritative spec, see [`.kiro/specs/cleancall-phase-2-admin/`](../.kiro/specs/cleancall-phase-2-admin/): [requirements.md](../.kiro/specs/cleancall-phase-2-admin/requirements.md) · [design.md](../.kiro/specs/cleancall-phase-2-admin/design.md) · [tasks.md](../.kiro/specs/cleancall-phase-2-admin/tasks.md).*
