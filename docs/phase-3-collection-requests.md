# CleanCall Phase 3 — Collection Request Operational Workflow

> A learning-and-reproducibility guide. The goal is that **anyone can tag along** — read this top to bottom and you'll understand *what* Phase 3 is, *how* it was built, *why* it was built that way, and be able to *reproduce* the production database migration step by step. Phase 3's production migration has **not been applied yet**, so the migration runbook below is written as a forward-looking, approval-gated procedure.

- **Project:** `clean_call`
- **Branch:** `feature/phase-3-collection-workflow`
- **Stack:** Next.js 15 (App Router) · TypeScript · Tailwind · shadcn/ui · Supabase / Postgres — **no new runtime dependency** (token generation uses the built-in Node `crypto` module)
- **Spec docs:** [`.kiro/specs/cleancall-phase-3-collection-requests/`](../.kiro/specs/cleancall-phase-3-collection-requests/) → [requirements.md](../.kiro/specs/cleancall-phase-3-collection-requests/requirements.md) · [design.md](../.kiro/specs/cleancall-phase-3-collection-requests/design.md) · [tasks.md](../.kiro/specs/cleancall-phase-3-collection-requests/tasks.md)

---

## Table of contents

1. [WHAT: What Phase 3 is](#what-phase-3-is)
2. [WHY: The product thinking](#why-the-product-thinking)
3. [WHAT was built (features)](#what-was-built-features)
4. [HOW it was built (architecture)](#how-it-was-built-architecture)
5. [Testing](#testing)
6. [Production migration runbook](#production-migration-runbook)
7. [Rollback](#rollback)
8. [How to run locally / tests](#how-to-run-locally--tests)
9. [Deploying Phase 3](#deploying-phase-3)

---

## WHAT Phase 3 is

Phase 3 is the **first operational workflow** layered on top of the already-live Phase 1 + Phase 2 CleanCall app. Where Phase 1 collected registrations and Phase 2 turned that data into an operations console, Phase 3 makes the platform *do something*: it runs an actual collection job from request to completion.

The loop is:

- A **public customer** submits a **Collection Request** from a public form — **no account, no login**.
- An **admin** reviews it.
- The admin **assigns** it to a **Waste Manager** (a `collectors` record).
- The admin drives it through a **controlled status lifecycle** to completion.
- The customer **tracks** progress — and can **cancel** while still cancellable — through a **secure token link**, again with no account.

Phase 3 is deliberately **admin-mediated** (the stakeholder-chosen "Option B"): the only authenticated user is the single existing admin. **Collectors do not log in.** The admin performs the `ACCEPTED` / `EN_ROUTE` / `COMPLETED` transitions on the collector's behalf, representing real-world collection progress.

Deliberately **deferred** to later phases: customer authentication, collector authentication, payments, automated matching, SMS/WhatsApp notifications, and photo storage. (`photo_url` exists as a nullable column only — there's a placeholder in the form, no upload pipeline.)

---

## WHY the product thinking

CleanCall is building **digital infrastructure for waste management in Ekiti State, Nigeria**. Phase 3 sits on the same MVP validation ladder as Phase 2 — the next rung is proving the core loop end-to-end before investing in a full marketplace:

> **CUSTOMER SUBMITS → CLEANCALL RECEIVES → ADMIN REVIEWS → ADMIN ASSIGNS → FULFILLED → COMPLETED**

The point is to prove that loop works with real requests and real admin operators *before* expanding. If the admin-mediated loop holds up, the platform has validated demand, supply matching, and fulfilment mechanics with minimal moving parts.

Crucially, Phase 3 is designed so later phases attach **without a schema redesign**:

- **Phase 4** (customer auth + customer dashboard) attaches to the existing nullable `customer_id` foreign key.
- **Phase 5** (collector auth + collector dashboard) attaches to the existing nullable `collector_id` foreign key.

Both `customer_id` and `collector_id` are **real, nullable FKs** today. A request stands alone with its own captured contact details, so it works with no linked account — but the seams for identity are already in place.

---

## WHAT was built (features)

### Public submission — `/request-pickup`

A **mobile-first** (usable from 320px) public form with all the request fields — contact, pickup address, LGA, canonical waste type, estimated quantity, bin/bag count, preferred date and time, and the **optional** `willingness_to_pay` / `price_range` market-research values reused from Phase 2. The **photo upload is a placeholder** (deferred). On success, a **confirmation page** shows the **Request Number** and the **tracking link**. The form also communicates that pricing and payment are future capabilities.

### Public tracking + cancel — `/request/track/[token]`

A **status timeline** plus a **cancel** action (with a **confirmation step**). The token is an **unguessable base64url of 32 random bytes** — a `request_number` alone can **never** view a request.

### Canonical waste types + compatibility layer

A canonical `WASTE_TYPES` set — `HOUSEHOLD` · `COMMERCIAL` · `RECYCLABLE` · `CONSTRUCTION` · `MEDICAL` — plus a **compatibility layer** that maps a collector's existing free-text `waste_types` onto those canonical values. The layer **never rewrites collector data**; it only matches for the purpose of suggesting candidates.

### Status lifecycle

The controlled request lifecycle:

```
PENDING → UNDER_REVIEW → ASSIGNED → ACCEPTED → EN_ROUTE → COMPLETED
```

| From | Allowed → to |
| --- | --- |
| `PENDING` | `UNDER_REVIEW` · `CANCELLED` · `DISPUTED` |
| `UNDER_REVIEW` | `ASSIGNED` *(assign op only)* · `CANCELLED` · `DISPUTED` |
| `ASSIGNED` | `ACCEPTED` · `CANCELLED` · `DISPUTED` |
| `ACCEPTED` | `EN_ROUTE` · `CANCELLED` · `DISPUTED` |
| `EN_ROUTE` | `COMPLETED` · `DISPUTED` |
| `DISPUTED` | `CANCELLED` · `COMPLETED` *(resolution)* |
| `COMPLETED` | — *(terminal)* |
| `CANCELLED` | — *(terminal)* |

- `COMPLETED` and `CANCELLED` are **terminal**.
- `DISPUTED` is **not** terminal — an admin resolves it to `CANCELLED` or `COMPLETED`.
- `ASSIGNED` is reachable **only** via the assign operation — the generic status-change operation never sets it.
- A **self-transition** (to the current status) is **rejected**.

### Admin Collection Requests area

- **List** with search (request number / name / phone) and filters for status, LGA, waste type, date range, and assigned collector.
- **Detail page**: contact, pickup, scheduling, and market fields; the photo when present; a status timeline; an **assign** control with **candidate suggestions**; a **status-change** control that offers **only valid transitions**; an **internal-notes** editor; and the request's **activity history**. Null fields render as **"Not recorded"**.
- **Navigation entry** — "Collection Requests" sits **between "Waste Managers" and "Locations"**, with sub-views: All · Pending · Assigned · Completed · Cancelled.
- **Dashboard**: a **pending-requests count card**.

### Activity log

Nine new `request_*` action types — `request_created`, `request_reviewed`, `request_assigned`, `request_accepted`, `request_status_change`, `request_en_route`, `request_completed`, `request_cancelled`, `request_disputed` — reuse the Phase 2 `activity_log` table. Because `action_type` is plain `TEXT`, adding them required **no schema change**.

---

## HOW it was built (architecture)

The guiding principle, exactly as in Phase 2: **extend, don't disrupt.** Phase 3 reuses the Supabase clients, the admin API `auth.getUser()` → **401** pattern, the server-action + Zod + `ActionResult` shape, the `as const` constants + barrel pattern, the `recordActivity` helper, the `displayField` null-safe display helper, the `PaginatedResponse` list shape, and shadcn/ui + brand styling. **No new runtime dependency** was added.

### KEY SECURITY DECISION — no anon RLS policy

`collection_requests` has **no anon RLS policy at all**. Public submission, tracking, and cancellation all run **server-side through the SERVICE-role client** inside server actions. Because the service client owns the whole payload, a client can **never** set privileged columns (`status`, `collector_id`, `internal_notes`, `tracking_token`, `request_number`). This is **tighter** than the Phase 1 anon-insert pattern.

> **Tradeoff & fallback.** The cost is that request features are entirely dependent on `SUPABASE_SERVICE_ROLE_KEY` being present server-side. If a future need arises for direct anon inserts, the fallback is an `anon`-insert policy paired with a `BEFORE INSERT` trigger that forces the privileged columns to safe server-set values — but the service-role approach was chosen because it keeps privileged columns unreachable from the client by construction.

### Concurrency-safe assignment

Assignment is a **single guarded atomic `UPDATE`**:

```ts
.update({ collector_id, status: 'ASSIGNED', assigned_at: now })
.eq('id', id)
.is('collector_id', null)                 // guard: not already assigned
.in('status', ['PENDING', 'UNDER_REVIEW']) // guard: assignable state
.select();                                 // [] when zero rows matched
```

Because the guard predicate lives in the `WHERE` clause of one statement, two concurrent assigns **race at the database**: exactly one wins, the loser matches **0 rows** and gets a **400**. This is covered by an **explicit double-assign integration test**.

### Pure, DB-free modules

Business logic lives in small modules with no Supabase and no I/O, so they're fully unit- and property-testable:

- `src/lib/utils/request-status.ts` — the transition table + guards
- `src/lib/utils/waste-type-match.ts` — the compatibility layer
- `src/lib/utils/request-id.ts` — `CR-YYYYMMDD-XXXX` numbers + base64url tokens
- `src/lib/utils/request-filter.ts` — admin list filtering
- `src/lib/utils/public-view.ts` — the privileged-field-omitting public projection
- the Zod validators

### Migration 003 — additive-only + idempotent

`supabase/migrations/003_phase3_collection_requests.sql` uses `CREATE ... IF NOT EXISTS` throughout, and guards its trigger and policies with `DROP TRIGGER / POLICY IF EXISTS` so re-applying it is a no-op. It:

- creates `collection_requests` with CHECK constraints (the **16 LGAs**, the **5 waste types**, the **8 statuses**, and the **exact Phase 2 `₦` / en-dash** willingness-to-pay and price-range strings so the constraints match);
- adds nullable FKs `customer_id → customers` and `collector_id → collectors`;
- adds the lifecycle timestamps;
- **reuses** `set_updated_at()` from migration `002` (only a new trigger is created — the function is not redefined);
- creates **8 indexes**, including a **GIN search index** over request number / name / phone;
- enables RLS with `authenticated` **SELECT + UPDATE**, `service_role` **ALL**, and **no anon** policy.

It contains **no** `DROP TABLE/COLUMN`, `RENAME`, `TRUNCATE`, `ALTER COLUMN TYPE`, or `DELETE`.

### Gotchas carried forward from Phase 2

- **Node 22** (see `.nvmrc`) — **Node 16 breaks Vitest**.
- Pages that use `useSearchParams` (the requests list) are **wrapped in `<Suspense>`** to avoid the Next.js prerender / CSR-bailout error.

---

## Testing

Testing uses the existing stack: **vitest + fast-check + @testing-library/react**.

- **12 correctness properties** (Properties 1–12) implemented as property-based tests (minimum **100 iterations** each) over the pure modules.
- **Unit tests** for the pure helpers (status transitions, waste-type matching, id/token generation, validators, null-field display).
- **Integration tests** (mocked Supabase) for the server actions and admin API routes — 401s, submission validation, tracking/cancel, status transitions, assignment, candidates, and the **required double-assign concurrency race** (two concurrent assigns, exactly one succeeds).
- A **staging-gated migration schema test** (`tests/integration/migration-phase3.test.ts`) that is **skipped** until the `STAGING_*` env vars are set.

**Final result:** **379 passing / 15 skipped**, `tsc` clean, and `next build` succeeds. The **15 skipped** are staging-gated DB tests — **10 new Phase 3 migration checks** plus **5 pre-existing** ones.

---

## Production migration runbook

> ⚠️ **NOT YET DONE.** Migration `003` is **authored but UNAPPLIED**. Nothing in Phase 3 has changed the production database yet. This section is a **forward-looking, approval-gated** procedure — everything below is what you'll do **when you're ready**, not a record of something that happened.

### Constraints that shape the approach (same as Phase 2)

- The Supabase **free plan has no branching** (that's a Pro feature).
- The account is already at the **2-project free-tier limit**, so there is **no dedicated staging database**.

The staging-gated schema test `tests/integration/migration-phase3.test.ts` exists but stays **skipped** until `STAGING_*` env vars point at a real staging DB. On the free plan there isn't one, so the realistic path is:

> **backup → apply `003` directly to production behind the safety gate → verify.**

Migration `003` is **additive-only** (one new table, one trigger, indexes, RLS — it touches no existing table's data), which is what makes direct-to-production a reasonable — but still carefully verified — choice, exactly mirroring the Phase 2 rationale.

### Steps (to run when approved)

**1. Baseline counts.** Before touching anything, capture the current counts so you can prove nothing changed:

```sql
select
  (select count(*) from customers)       as customers,
  (select count(*) from collectors)      as collectors,
  (select count(*) from login_attempts)  as login_attempts,
  (select count(*) from activity_log)    as activity_log;
```

**2. Additive-only reviewer checklist.** Read `003_phase3_collection_requests.sql` and confirm it contains **only** `CREATE TABLE/INDEX/POLICY/TRIGGER IF NOT EXISTS` + `ENABLE ROW LEVEL SECURITY` — **no** `DROP` (except the guarded `DROP TRIGGER/POLICY IF EXISTS`), `RENAME`, `TRUNCATE`, `ALTER COLUMN TYPE`, or `DELETE`.

**3. Get the production DB connection string.**

> ⚠️ Use the **SESSION POOLER** URI:
> host `aws-0-<region>.pooler.supabase.com:5432`, user `postgres.<ref>`.
> The direct `db.<ref>.supabase.co` host **does not resolve**.

Store it in a **gitignored** `.db.local` file as `PROD_DB_URL`.

**4. Back up production first.** Dump using the official `postgres:17` Docker image (matching the server's Postgres version, as in Phase 2):

```bash
docker run --rm -e PGURL="$PROD_DB_URL" postgres:17 \
  sh -c 'pg_dump "$PGURL" --no-owner --no-privileges' \
  > backups/prod_backup_<ts>.dump.sql
```

**5. Apply the migration inside a transaction.**

```bash
psql "$PROD_DB_URL" -v ON_ERROR_STOP=1 --single-transaction \
  -f supabase/migrations/003_phase3_collection_requests.sql
```

**6. Verify.**

- `collection_requests` **exists** with the expected columns, CHECK constraints, and the `UNIQUE` constraints on `request_number` / `tracking_token`.
- The baseline counts (customers / collectors / login_attempts / activity_log) are **unchanged**.
- The **RLS policies are present**: `authenticated` SELECT + UPDATE and `service_role` ALL.
- There is **NO anon policy** on `collection_requests`.

**7. Idempotency check.** Apply `003` a **second** time — it should succeed with no error and produce the same schema (a no-op).

> **Deploy-environment note.** `SUPABASE_SERVICE_ROLE_KEY` **must** be present in the deploy environment. Public submission, tracking, cancellation, and every request activity log run through the **service client** — without the key, request features won't work.

---

## Rollback

Because the migration is **additive**, rollback is straightforward, and there's a safety net: **nothing in Phase 1 or Phase 2 depends on `collection_requests`.**

**A) Reverse SQL** — inside a transaction, drop the three policies and the trigger, then drop the table (which cascades its indexes and constraints):

```sql
BEGIN;

-- drop the RLS policies (optional — DROP TABLE removes them too, but explicit is clearer)
DROP POLICY IF EXISTS "Admin select requests"  ON collection_requests;
DROP POLICY IF EXISTS "Admin update requests"  ON collection_requests;
DROP POLICY IF EXISTS "Service manage requests" ON collection_requests;

-- drop the updated_at trigger (the table's own trigger, by name)
DROP TRIGGER IF EXISTS trg_requests_updated_at ON collection_requests;

-- drop the table — this cascades its indexes and constraints
DROP TABLE IF EXISTS collection_requests;

COMMIT;
```

> **Do NOT drop `set_updated_at()`** — it is **shared** with the Phase 2 triggers on `customers` and `collectors`. Removing it would break Phase 2.

**B) Restore from the `pg_dump`** taken in step 4 of the runbook.

Either way, Phase 1 and Phase 2 are unaffected — nothing in them references `collection_requests`.

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
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key — **required** for request inserts, tracking, cancel, and all request activity logs |
| `STAGING_SUPABASE_URL` | *(optional)* staging URL to un-skip the migration schema test |
| `STAGING_SUPABASE_SERVICE_ROLE_KEY` | *(optional)* staging service-role key to un-skip the migration schema test |

---

## Deploying Phase 3

Unlike Phase 2, the database migration is **not yet applied**. The order matters:

1. **Apply migration `003` to production FIRST** — behind the approval gate in the runbook above.
2. **THEN deploy the code** via **Vercel**.

Until `003` is applied, the request features won't work against production — but **Phase 1 and Phase 2 keep running unaffected** (the migration is additive and adds only a new table). Do **not** merge `feature/phase-3-collection-workflow` to `main` automatically.

### Security reminders

- **Rotate the Supabase DB password and clear `.db.local`.** A live credential was used during the **Phase 2** migration and this is **still outstanding** — carry it forward.
- The **"authenticated == admin"** RLS posture continues in Phase 3. Before any future **non-admin** login path exists, tighten the `authenticated USING(true)` policies — **including the new `collection_requests` ones** — to **role/claim-scoped** policies **first**, or regular users would gain admin-level data access.

---

*For the authoritative spec, see [`.kiro/specs/cleancall-phase-3-collection-requests/`](../.kiro/specs/cleancall-phase-3-collection-requests/): [requirements.md](../.kiro/specs/cleancall-phase-3-collection-requests/requirements.md) · [design.md](../.kiro/specs/cleancall-phase-3-collection-requests/design.md) · [tasks.md](../.kiro/specs/cleancall-phase-3-collection-requests/tasks.md).*
