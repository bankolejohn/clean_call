# Implementation Plan: CleanCall Phase 3 — Collection Request Operational Workflow

## Overview

This plan extends the **live** CleanCall Phase 1 + Phase 2 (Next.js 15 + Supabase, TypeScript, Node 22) application non-destructively. It layers the first operational loop — public Collection_Request submission → Admin review → Admin assignment to a Waste_Manager → Admin-driven status lifecycle → completion, with token-keyed public tracking/cancellation — on top of the existing foundation.

Implementation order is safest-first, grounded in the design: **isolate on a feature branch → pure logic first (constants, activity-log union, types, transition module, waste-type matcher, id/token generators, validators, filter + public-view helpers — all testable without a DB) → author the additive migration file (write only) → build public submission/tracking/cancel → build admin API routes → build admin + public UI → interleave property/unit/integration tests close to the code they cover → regression checkpoint (`tsc` + full `npm run test` + `next build`) → gated production migration apply (human-approval-only)**.

Language: **TypeScript** (the design uses TypeScript throughout — no pseudocode). Testing stack: existing **vitest + fast-check + @testing-library/react**, tests under `tests/{unit,properties,integration}`. **No new runtime dependency** is added — token generation uses the built-in Node `crypto` module.

> SAFETY: The production database MUST NOT be modified without explicit approval. Application code is pure logic plus service-role Supabase access developed and tested with mocked Supabase (and staging for schema checks). The production migration apply is an isolated, approval-gated task at the very end (Task 16) and MUST NOT be auto-run. Migration `003` is purely additive (one new `collection_requests` table + one trigger + indexes + RLS) — it touches no existing table's data.

## Tasks

- [ ] 1. Isolate Phase 3 work on a feature branch (HARD SAFETY GATE — do this first)
  - Confirm the working tree is clean (`git status`) before branching
  - Create and switch to the branch: `git checkout -b feature/phase-3-collection-workflow`
  - Confirm the active branch is `feature/phase-3-collection-workflow` (`git branch --show-current`) and confirm work is NOT on `main`
  - Do NOT commit any Phase 3 code to `main`; all subsequent tasks happen on this branch
  - _Requirements: 1.1, 1.7_

- [ ] 2. Add Phase 3 constants and extend the activity-log action union (pure, DB-independent)
  - [ ] 2.1 Create Phase 3 constants files and extend the barrel export
    - Create `src/lib/constants/waste-types.ts` → `WASTE_TYPES` (`HOUSEHOLD`, `COMMERCIAL`, `RECYCLABLE`, `CONSTRUCTION`, `MEDICAL`) using the `as const` + derived `WasteType` type pattern
    - Create `src/lib/constants/request-status.ts` → `REQUEST_STATUSES` (`PENDING`, `UNDER_REVIEW`, `ASSIGNED`, `ACCEPTED`, `EN_ROUTE`, `COMPLETED`, `CANCELLED`, `DISPUTED`) with derived `RequestStatus` type
    - Re-export both constants and their derived types from `src/lib/constants/index.ts`
    - Do NOT alter the existing Phase 2 `WILLINGNESS_TO_PAY` / `PRICE_RANGES` constants — they are reused verbatim (exact `₦` and en-dash strings)
    - _Requirements: 3.1, 3.2, 1.8_

  - [ ] 2.2 Extend the `ActivityActionType` union in `src/lib/utils/activity-log.ts`
    - Add the nine Phase 3 request events to the existing union (keeping existing snake_case style): `request_created`, `request_reviewed`, `request_assigned`, `request_accepted`, `request_status_change`, `request_en_route`, `request_completed`, `request_cancelled`, `request_disputed`
    - Do NOT change the `recordActivity` signature or its best-effort/error-swallowing behavior; `action_type` stays plain `TEXT` (no schema change)
    - _Requirements: 13.1, 17.4_

- [ ] 3. Add Phase 3 TypeScript types (pure)
  - [ ] 3.1 Add Phase 3 types to `src/types/index.ts`
    - Add `CollectionRequest` (full DB row per design, all columns nullable-safe), `CollectionRequestInput` (validated public submission, no privileged columns), `CandidateCollector` (id, business_name, service_areas, waste_types, status), and `PublicRequestView` (public projection omitting `internal_notes`/`tracking_token`/`collector_id`)
    - Re-export `WasteType` and `RequestStatus`; reuse existing `WillingnessToPay` / `PriceRange`
    - Extend `ActionResult` usage to optionally carry `request_number` + `tracking_token` on success (confirmation page)
    - _Requirements: 2.1, 2.4, 2.6, 2.8, 6.4, 10.1_

- [ ] 4. Implement pure status, waste-match, and id/token modules
  - [ ] 4.1 Implement the status transition module `src/lib/utils/request-status.ts`
    - `ALLOWED_TRANSITIONS` encoding the exact 16-transition table (incl. `DISPUTED → CANCELLED`/`COMPLETED`; `COMPLETED`/`CANCELLED` terminal); `ASSIGNED` is NEVER a generic transition target
    - `isAllowedTransition(from, to)` rejecting self-transition and any pair not in the table
    - `timestampFieldForStatus(status)` → correct lifecycle timestamp column or null
    - `ASSIGNABLE_STATUSES` / `CANCELLABLE_STATUSES` plus `isAssignable` / `isCancellable`
    - _Requirements: 4.3, 4.4, 4.5, 4.7, 4.8, 2.10, 7.1, 7.2, 10.4_

  - [ ] 4.2 Implement the waste-type compatibility layer `src/lib/utils/waste-type-match.ts`
    - `isCollectorWasteTypeCompatible(collectorWasteTypes, canonical)` using the documented case-insensitive keyword/substring mapping table (from design); matches direct canonical name too; does NOT rewrite collector data
    - _Requirements: 3.3, 3.4, 3.5, 10.1_

  - [ ] 4.3 Implement the id/token generators `src/lib/utils/request-id.ts`
    - `generateRequestNumber(now = new Date())` → `CR-YYYYMMDD-XXXX` (UTC date + 4-digit suffix)
    - `generateTrackingToken()` → unguessable URL-safe base64url token from 32 random bytes via `node:crypto` (no new dependency)
    - _Requirements: 2.2, 2.3, 5.5, 6.5_

  - [ ]* 4.4 Write property tests for the status transition module
    - `tests/properties/request-status.property.test.ts` (generators over `REQUEST_STATUSES`, incl. terminal/DISPUTED cases; min 100 iterations)
    - **Property 1: Allowed transitions match the exact table** — Tag `Feature: cleancall-phase-3-collection-requests, Property 1` — **Validates: Requirements 4.3, 4.4, 4.7**
    - **Property 2: Self-transition is never allowed** — Tag `... Property 2` — **Validates: Requirements 4.8**
    - **Property 3: Lifecycle timestamp mapping is exact** — Tag `... Property 3` — **Validates: Requirements 4.5, 4.6, 2.10**
    - **Property 7: Assignable guard is exact** — Tag `... Property 7` — **Validates: Requirements 10.4, 10.5, 10.7**
    - **Property 8: Cancellable guard is exact** — Tag `... Property 8` — **Validates: Requirements 7.1, 7.2**

  - [ ]* 4.5 Write property test for the waste-type compatibility layer
    - `tests/properties/waste-type-match.property.test.ts` (generators include exact-canonical, keyword, and no-match cases; min 100 iterations)
    - **Property 4: Waste-type compatibility is sound** — Tag `Feature: cleancall-phase-3-collection-requests, Property 4` — **Validates: Requirements 3.4, 3.5, 10.1**

  - [ ]* 4.6 Write property tests for the id/token generators
    - `tests/properties/request-id.property.test.ts` (generators over `fc.date`; token collision set; min 100 iterations)
    - **Property 5: Request_Number format encodes the date** — Tag `... Property 5` — **Validates: Requirements 2.2, 5.5**
    - **Property 6: Tracking_Token is URL-safe and collision-free** — Tag `... Property 6` — **Validates: Requirements 2.3, 6.5**

  - [ ]* 4.7 Write unit tests for status/waste-match/id modules
    - `tests/unit/request-status.test.ts`: `ALLOWED_TRANSITIONS` snapshot; representative allowed/blocked transitions; `to === 'ASSIGNED'` rejection
    - `tests/unit/waste-type-match.test.ts`: `General Waste` → HOUSEHOLD & COMMERCIAL, `Recyclables` → RECYCLABLE, `Medical/Clinical` → MEDICAL, clearly-incompatible example
    - `tests/unit/request-id.test.ts`: number for a fixed date; token charset/length
    - _Requirements: 4.5, 4.7, 3.4, 2.2, 2.3_

- [ ] 5. Implement Phase 3 validators (pure)
  - [ ] 5.1 Create the public submission schema `src/lib/validators/collection-request.ts`
    - `collectionRequestSchema` reusing the Phase 1 Nigerian phone regex, `EKITI_LGAS`, canonical `WASTE_TYPES`, and Phase 2 `WILLINGNESS_TO_PAY` / `PRICE_RANGES`; enforce required/optional fields, length bounds, and past-date rejection on `preferred_pickup_date`
    - MUST NOT include `status`, `collector_id`, `internal_notes`, `request_number`, `tracking_token`, `photo_url`, or `customer_id` (never accepted from the client)
    - Export the inferred `CollectionRequestInput` type
    - _Requirements: 5.3, 5.4, 14.5, 14.8_

  - [ ] 5.2 Create the admin request schemas `src/lib/validators/request-status.ts`
    - `requestStatusChangeSchema` (`status` enum + optional `fromExpected` optimistic-concurrency guard) and `assignRequestSchema` (`collector_id` uuid)
    - _Requirements: 4.6, 4.7, 10.5, 14.8_

  - [ ]* 5.3 Write property tests for the submission schema
    - `tests/properties/collection-request.property.test.ts` (min 100 iterations)
    - **Property 10: Canonical Waste_Type validation is exact** — Tag `Feature: cleancall-phase-3-collection-requests, Property 10` — **Validates: Requirements 3.1, 5.3**
    - **Property 12: Preferred pickup date rejects the past** — Tag `... Property 12` — **Validates: Requirements 5.3, 5.4**

  - [ ]* 5.4 Write unit tests for validators
    - `tests/unit/validators-phase3.test.ts`: fully-valid submission passes; bad phone, invalid LGA, invalid waste type, empty required fields, past pickup date each fail with correct `fieldErrors`; status/assign schemas accept/reject representative values
    - _Requirements: 5.3, 5.4, 4.7, 10.5_

- [ ] 6. Implement pure helpers for the admin list and the public view
  - [ ] 6.1 Implement `filterRequests` and `toPublicView` pure helpers
    - `filterRequests(rows, filters)` in `src/lib/utils/request-filter.ts`: AND logic over search (request_number/full_name/phone), status, LGA, Waste_Type, assigned collector_id, and preferred/created date range; a null-valued field is excluded only when the filter specifies a non-null value
    - `toPublicView(row)` in `src/lib/utils/public-view.ts`: project a `CollectionRequest` to `PublicRequestView`, omitting `internal_notes`, `tracking_token`, and `collector_id`; never throw on nulls
    - _Requirements: 8.2, 8.4, 8.5, 6.4, 9.6_

  - [ ]* 6.2 Write property tests for filter + public view
    - `tests/properties/request-filter-view.property.test.ts` (generators include null-valued filter fields and null request fields; min 100 iterations)
    - **Property 9: Admin list filter soundness** — Tag `Feature: cleancall-phase-3-collection-requests, Property 9` — **Validates: Requirements 8.2, 8.4, 8.5**
    - **Property 11: Public view never exposes privileged fields** — Tag `... Property 11` — **Validates: Requirements 6.4, 9.6**

  - [ ]* 6.3 Write unit test for null-field display reuse
    - `tests/unit/display-phase3.test.ts`: existing `displayField` returns "Not recorded" for null request fields (bin_bag_count, email, additional_notes, willingness_to_pay, price_range)
    - _Requirements: 9.3_

- [ ] 7. Checkpoint - pure logic compiles and all pure-logic tests pass
  - Run `npx tsc --noEmit` and `npm run test`; ensure the full existing Phase 1 + Phase 2 suites plus new Phase 3 pure-logic tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Author the Phase 3 database migration file (WRITE ONLY — do NOT apply to production here)
  - [ ] 8.1 Write `supabase/migrations/003_phase3_collection_requests.sql` (additive-only, idempotent)
    - `CREATE TABLE IF NOT EXISTS collection_requests` with all columns per design: identity (`request_number`, `tracking_token` UNIQUE), contact (full_name/phone/email with CHECKs), nullable `customer_id → customers(id)`, pickup (pickup_address, `lga` CHECK over the 16 EKITI_LGAS, `waste_type` CHECK over the 5 canonical types, estimated_quantity, nullable bin_bag_count), scheduling (preferred_pickup_date, preferred_pickup_time), optional details (additional_notes, `photo_url`, `willingness_to_pay` + `price_range` CHECKs reusing exact Phase 2 `₦`/en-dash strings), nullable `collector_id → collectors(id)`, `status` CHECK over the 8 statuses DEFAULT `'PENDING'`, `internal_notes`, and lifecycle timestamps (created_at, updated_at, reviewed_at, assigned_at, accepted_at, en_route_at, completed_at, cancelled_at)
    - Create indexes `IF NOT EXISTS`: status, collector_id, customer_id, lga, waste_type, preferred_pickup_date, created_at DESC, and the GIN search index over request_number/full_name/phone
    - Reuse the existing Phase 2 `set_updated_at()` function (do NOT redefine it) — only `CREATE TRIGGER trg_requests_updated_at` (guarded by `DROP TRIGGER IF EXISTS`)
    - Enable RLS; create policies: `authenticated` SELECT + UPDATE, `service_role` ALL; NO anon policy (public insert/tracking/cancel go through the service client per the design decision)
    - Contains ONLY additive statements — no DROP (except the guarded trigger drop) / RENAME / TRUNCATE / ALTER COLUMN TYPE / DELETE
    - Do NOT apply this migration to any database in this task
    - _Requirements: 1.1, 1.2, 1.6, 2.1, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13, 3.1, 4.1, 4.2, 8.3, 14.3, 14.4, 15.1, 17.1_

  - [ ]* 8.2 Write migration schema integration checks (run against staging / a Supabase branch DB)
    - `tests/integration/migration-phase3.test.ts`: `collection_requests` exists with expected columns, CHECK constraints, UNIQUE on request_number/tracking_token, indexes, the `updated_at` trigger, and the three RLS policies (authenticated SELECT/UPDATE, service_role ALL, no anon); applying `003` twice is a no-op (idempotency); `count(*)` on customers/collectors/login_attempts/activity_log unchanged across the migration
    - _Requirements: 1.5, 1.6, 14.4_

- [ ] 9. Implement public submission (server action + form + confirmation)
  - [ ] 9.1 Implement the `create-collection-request` server action
    - `src/lib/actions/create-collection-request.ts` (`"use server"`): parse `FormData`, `collectionRequestSchema.safeParse` → `fieldErrors` on failure; generate `request_number` + `tracking_token` server-side; set `status = 'PENDING'`; insert via the SERVICE client; on `23505` unique violation for `request_number`, regenerate + retry (bounded); `recordActivity(service, 'request_created', ..., { request_id, request_number })`; return `ActionResult` with `request_number` + `tracking_token`
    - Never reads `status`, `collector_id`, or `internal_notes` from the form
    - _Requirements: 5.4, 5.5, 5.6, 13.1, 13.2, 13.3, 14.5, 14.8_

  - [ ] 9.2 Build the public submission form + confirmation pages
    - `src/app/request-pickup/page.tsx`: mobile-first (usable from 320px) RHF + `zodResolver(collectionRequestSchema)` form with all Requirement 2/5.2 fields incl. optional willingness-to-pay, price-range, and photo placeholder; ARIA + brand palette + Inter; calls the server action; communicates that pricing/payment are future capabilities
    - Confirmation page showing `Request_Number`, a summary, current status (`PENDING`), and the `Tracking_Link` (`/request/track/{token}`)
    - _Requirements: 5.1, 5.2, 5.7, 5.8, 16.1, 16.3, 16.2_

  - [ ]* 9.3 Write integration tests for public submission
    - `tests/integration/api-phase3.test.ts` (mocked Supabase, mirroring `tests/integration/api-phase2.test.ts`): happy path stores a request with server-generated number/token and `status = PENDING` and logs `request_created`; invalid payload → `400` + `fieldErrors`, nothing stored
    - _Requirements: 5.4, 5.5, 5.6, 13.1_

- [ ] 10. Implement public tracking + cancellation
  - [ ] 10.1 Build the public tracking route
    - `src/app/request/track/[token]/page.tsx` (server component): look up the request via the SERVICE client keyed by token; `notFound()` when missing (never revealing whether a Request_Number exists); render the status timeline (Submitted → Under Review → Assigned → Accepted → En Route → Completed/Cancelled) and a minimal summary via `toPublicView`; never render `internal_notes` or any other row
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 14.7_

  - [ ] 10.2 Implement the `cancel-collection-request` server action + confirmation UI
    - `src/lib/actions/cancel-collection-request.ts` (`"use server"`): keyed solely by `token`; load the row by token via the SERVICE client; if `isCancellable(status)` is false → blocked result (route responds `400`); otherwise guarded update `set status='CANCELLED', cancelled_at=now() where tracking_token=? and status in CANCELLABLE_STATUSES`; `recordActivity(service, 'request_cancelled', ..., { request_id, request_number, from })`
    - Cancel control on the tracking view requires a confirmation step before applying
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 13.1, 13.2, 13.3, 14.10_

  - [ ]* 10.3 Write integration tests for tracking + cancel
    - Extend `tests/integration/api-phase3.test.ts`: tracking found → public view (no `internal_notes`); unknown token → generic not-found; cancel on cancellable status → `CANCELLED` + `cancelled_at` + `request_cancelled` log; cancel on non-cancellable (EN_ROUTE/COMPLETED/CANCELLED/DISPUTED) → `400`, unchanged
    - _Requirements: 6.2, 6.4, 6.5, 7.2, 7.4_

- [ ] 11. Implement admin API routes (auth.getUser → 401 pattern)
  - [ ] 11.1 Add the list route `GET /api/admin/requests`
    - `src/app/api/admin/requests/route.ts`: `auth.getUser()` → `401`; search (request_number/full_name/phone) + filters (status, lga, waste_type, date range, collector_id) applied only when present; `.order('created_at', { ascending: false })`; `.range(...)`; returns `PaginatedResponse<CollectionRequest>`; combined search+filters = AND of active conditions
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 14.2_

  - [ ] 11.2 Add the detail route `GET /api/admin/requests/[id]`
    - `src/app/api/admin/requests/[id]/route.ts`: `auth.getUser()` → `401`; `.maybeSingle()` → `404` for unknown id; include `internal_notes` for the Admin; second query fetches related `activity_log` entries by `metadata->>request_id = id` ordered `created_at DESC`
    - _Requirements: 9.1, 9.5, 9.6, 9.7, 14.2_

  - [ ] 11.3 Add the status PATCH route `PATCH /api/admin/requests/[id]/status`
    - `src/app/api/admin/requests/[id]/status/route.ts`: `auth.getUser()` → `401`; validate via `requestStatusChangeSchema`; reject `to === 'ASSIGNED'` and non-`isAllowedTransition` and self-transition → `400` unchanged; optimistic guarded update `.eq('status', from)`; set the `timestampFieldForStatus` timestamp; `recordActivity` the specific event (`request_reviewed`/`request_accepted`/`request_en_route`/`request_completed`/`request_cancelled`/`request_disputed`) plus `request_status_change` metadata `{ from, to }`
    - _Requirements: 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 11.1, 11.2, 11.2a, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 13.1, 13.2, 13.3, 14.2_

  - [ ] 11.4 Add the assign route `POST /api/admin/requests/[id]/assign`
    - `src/app/api/admin/requests/[id]/assign/route.ts`: `auth.getUser()` → `401`; validate via `assignRequestSchema`; verify the collector exists and `status === 'Active'` else `400` invalid-collector; single guarded atomic update `.is('collector_id', null).in('status', ['PENDING','UNDER_REVIEW'])` setting `ASSIGNED` + `assigned_at`; zero rows → `400` already-assigned/not-assignable, unchanged; on success `recordActivity(service, 'request_assigned', ..., { request_id, request_number, collector_id })`
    - _Requirements: 10.4, 10.5, 10.6, 10.7, 10.8, 13.1, 13.2, 13.3, 14.2_

  - [ ] 11.5 Add the candidates route `GET /api/admin/requests/[id]/candidates`
    - `src/app/api/admin/requests/[id]/candidates/route.ts`: `auth.getUser()` → `401`; load `Active` collectors whose `service_areas` contains the request LGA (`.contains('service_areas', [lga])`), filter in memory by `isCollectorWasteTypeCompatible`, cap at 50; empty list when none
    - _Requirements: 10.1, 10.2, 10.3, 14.2_

  - [ ] 11.6 Extend the admin dashboard route with pending count + recent events
    - `src/app/api/admin/dashboard/route.ts`: add `pendingRequests` (count of `status = 'PENDING'`, `count: 'exact', head: true`) and `recentRequestEvents` (recent request events, query-derived, never hardcoded); preserve existing Phase 2 stats and `auth.getUser()` guard
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 14.2_

  - [ ] 11.7 Extend the admin route middleware to cover `/admin/requests/*`
    - `src/lib/supabase/middleware.ts`: ensure unauthenticated navigation to Phase 3 admin request pages redirects to the admin login page
    - _Requirements: 14.1_

  - [ ]* 11.8 Write integration tests for admin API routes (mocked Supabase)
    - Extend `tests/integration/api-phase3.test.ts`: `401` unauthenticated on each route + no data; list returns only rows matching each filter and combined search+filter; detail returns record incl. internal notes + related activity, unknown id → `404`; status PATCH valid → `200` (status + timestamp set, correct activity type), invalid/self/`ASSIGNED` → `400` unchanged; assign success sets collector_id + ASSIGNED + assigned_at + `request_assigned` log; invalid/inactive collector → `400`; **double-assign concurrency race — two concurrent assigns, exactly one succeeds and the other gets `400` already-assigned (explicit, required)**; candidates returns only Active + service-area-matching + waste-compatible, capped 50, empty when none; each operation calls `recordActivity` with the correct `action_type`/metadata through the service client; public view hides `internal_notes`
    - _Requirements: 8.5, 8.6, 9.5, 9.6, 9.7, 4.6, 4.7, 4.8, 10.1, 10.2, 10.7, 10.8, 11.3, 11.4, 11.5, 11.6, 11.7, 13.1, 13.2, 13.3, 14.2_

- [ ] 12. Checkpoint - types compile, app code + integration tests pass
  - Run `npx tsc --noEmit` and `npm run test` (mocked Supabase); ensure Phase 1 + Phase 2 suites still pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Build the admin UI (list, detail, nav, dashboard card)
  - [ ] 13.1 Build the Collection Requests list page
    - `src/app/admin/requests/page.tsx` (client): reuse `registration-table.tsx`, `search-filter-bar.tsx`, and the pagination pattern; read `?status=`, `?lga=`, `?waste_type=`, `?collector_id=`, `?dateFrom/dateTo`, `?search=` and fetch `/api/admin/requests`; MUST be wrapped in `<Suspense>` because it uses `useSearchParams` (carried-forward Phase 2 build gotcha); columns: Request_Number, name, phone, LGA, Waste_Type, status badge, assigned Waste_Manager, created_at
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 15.2_

  - [ ] 13.2 Build the request detail page
    - `src/app/admin/requests/[id]/page.tsx`: detail sections (contact, pickup, scheduling, market fields, photo when present), a status timeline from lifecycle timestamps, an assign control loading `/candidates` and allowing arbitrary collector selection, a status-change control offering only `isAllowedTransition`-valid targets, Activity_Log history for the request, and an internal-notes editor; null fields render via `displayField` → "Not recorded"; not-found handling
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 10.1, 10.3, 11.1, 11.2, 11.2a_

  - [ ] 13.3 Extend admin navigation and the dashboard card
    - `src/app/admin/layout.tsx`: add a "Collection Requests" top-level entry BETWEEN "Waste Managers" and "Locations" with sub-views mapping to `?status=` (All, Pending, Assigned, Completed, Cancelled); update the `isSubViewActive` "no-query = All" branch to ignore request filter params for the requests area
    - Add a pending-requests count card to `src/app/admin/dashboard/page.tsx` wired to the dashboard route's `pendingRequests` value
    - _Requirements: 12.1, 12.3, 8.1, 14.1_

  - [ ] 13.4 Add an optional minimal landing CTA to `/request-pickup`
    - `src/app/page.tsx`: add a minimal "Request a Pickup" link to `/request-pickup`
    - _Requirements: 5.1_

  - [ ]* 13.5 Write unit tests for nav, list, and detail rendering
    - `tests/unit/navigation-phase3.test.ts`: nav renders "Collection Requests" between "Waste Managers" and "Locations" with the required sub-views
    - `tests/unit/request-detail.test.ts`: null request fields render "Not recorded"; the status-change control offers only valid transition targets; assigned-vs-"Awaiting assignment" indication
    - _Requirements: 15.1, 15.2, 15.3, 9.2, 9.3, 11.1_

- [ ] 14. Regression checkpoint - Phase 1 + Phase 2 stay green, full Phase 3 suite passes, build succeeds
  - Run `npx tsc --noEmit`, the full `npm run test` (unit + properties + integration), and `npm run build`
  - Confirm the existing Phase 1 + Phase 2 test suites pass unchanged; Phase 1 registration and Phase 2 admin dashboard still work
  - Confirm `next build` succeeds (the `useSearchParams` list page is `<Suspense>`-wrapped)
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Run the staging-gated migration schema checks
  - [ ]* 15.1 Apply migration `003` to staging / a Supabase branch DB and run `tests/integration/migration-phase3.test.ts`
    - Confirm table/columns/constraints/indexes/trigger/RLS exist, idempotency (apply twice) holds, and existing counts on customers/collectors/login_attempts/activity_log are unchanged — never against production
    - _Requirements: 1.5, 1.6, 14.4_

- [ ] 16. Production migration apply (HARD APPROVAL GATE — HUMAN-APPROVED ONLY, do NOT auto-run)
  - > This task modifies the LIVE production database and MUST NOT be executed automatically. It proceeds only after every gate below passes in order and explicit stakeholder approval is recorded. All application code (Tasks 9–13) is built and tested without touching production (pure logic + mocked-Supabase integration tests).
  - [ ] 16.1 Capture a `pg_dump` backup of production (via the `postgres:17` docker image, matching the Phase 2 approach) and record it as the documented restore target
    - _Requirements: 1.5_
  - [ ] 16.2 Apply migration `003_phase3_collection_requests.sql` to staging / a Supabase branch DB first and validate there (never production first)
    - _Requirements: 1.2, 1.6, 2.1_
  - [ ] 16.3 Before/after verification on staging: `count(*)` on customers, collectors, login_attempts, and activity_log unchanged; spot-check sample existing values byte-for-byte unchanged
    - _Requirements: 1.1, 1.5_
  - [ ] 16.4 Additive-only reviewer checklist: read `003` and confirm only `CREATE TABLE/INDEX/POLICY/TRIGGER IF NOT EXISTS` + `ENABLE ROW LEVEL SECURITY` — no DROP (except the guarded trigger drop)/RENAME/TRUNCATE/ALTER COLUMN TYPE/DELETE
    - _Requirements: 1.1, 1.2_
  - [ ] 16.5 Idempotency check on staging: apply `003` twice; the second apply succeeds with no error and the same resulting schema
    - _Requirements: 1.6_
  - [ ] 16.6 Obtain explicit stakeholder approval, then apply migration `003` to production within a transaction (`psql --single-transaction`); re-verify record counts and existing values preserved
    - _Requirements: 1.5, 1.6_

## Notes

- Tasks marked with `*` are optional test sub-tasks and can be skipped for a faster path; core implementation tasks are never marked optional.
- Task 1 (feature branch) and Task 16 (production migration apply) are the two hard safety gates. Task 16 is human-approval-only and MUST NOT be auto-run; it is deliberately isolated from all code tasks and placed at the end. Migration authoring (Task 8) only writes the SQL file; it never applies to any database.
- Application code (Tasks 9–13) is pure logic plus service-role Supabase access, developed and tested with mocked Supabase; the schema checks (Task 15) run against staging / a Supabase branch DB only.
- Phase 1 + Phase 2 MUST keep working, existing tests stay green, and `next build` MUST pass. The requests list page uses `useSearchParams` and MUST be `<Suspense>`-wrapped (carried-forward Phase 2 build gotcha).
- No new runtime dependency is added — token generation uses the built-in Node `crypto` module (Node 22).
- Each task references specific granular requirements for traceability. Properties 1–12 from the design are each implemented by a single fast-check property test (min 100 iterations) tagged `Feature: cleancall-phase-3-collection-requests, Property N`. Behavior that depends on Supabase, `401`s, RLS, the `updated_at` trigger, activity-log inserts, and the concurrent-assignment race is covered by integration tests, not by properties.
- The `SUPABASE_SERVICE_ROLE_KEY` (already in the environment) is required: public submission/tracking/cancel and all request activity logs run through the service client, since `collection_requests` has no anon policy and `activity_log` INSERT is `service_role` only.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["4.1", "4.2", "4.3"] },
    { "id": 4, "tasks": ["4.4", "4.5", "4.6", "4.7", "5.1", "5.2", "6.1"] },
    { "id": 5, "tasks": ["5.3", "5.4", "6.2", "6.3", "8.1"] },
    { "id": 6, "tasks": ["8.2", "9.1", "11.7"] },
    { "id": 7, "tasks": ["9.2", "10.1", "10.2", "11.1", "11.2", "11.3", "11.4", "11.5", "11.6"] },
    { "id": 8, "tasks": ["9.3", "10.3", "11.8", "13.1", "13.2", "13.3", "13.4"] },
    { "id": 9, "tasks": ["13.5", "15.1"] },
    { "id": 10, "tasks": ["16.1"] },
    { "id": 11, "tasks": ["16.2"] },
    { "id": 12, "tasks": ["16.3"] },
    { "id": 13, "tasks": ["16.4"] },
    { "id": 14, "tasks": ["16.5"] },
    { "id": 15, "tasks": ["16.6"] }
  ]
}
```
