# Implementation Plan: CleanCall Phase 2 — Platform Database & Admin Operations Dashboard

## Overview

This plan extends the **live** CleanCall Phase 1 (Next.js 15 + Supabase) application non-destructively. It is sequenced to keep Phase 1 registration and the existing Phase 1 test suite green at every step, and to keep the production database untouched until an explicit, human-approved gate.

Implementation order: **isolate on a feature branch → pure logic first (constants, types, validators, terminology, pure helpers — all testable without a DB) → author the migration file → build application code (actions, API routes) wired to a staging/branch DB → build UI (charts, detail pages, navigation) → interleave property/unit/integration tests close to the code they cover → regression checkpoint → gated production migration apply (human-approval-only)**.

Language: **TypeScript** (matches the Phase 1 codebase and the design; no pseudocode). Testing stack: existing **vitest + fast-check + @testing-library/react**, tests under `tests/{unit,properties,integration}`. Only one new runtime dependency is added: **Recharts** (pinned).

> SAFETY: The production database MUST NOT be modified without explicit approval. All application code is developed and tested against staging/a Supabase branch DB. The production migration apply is an isolated, approval-gated task near the end (Task 15) and MUST NOT be auto-run.

## Tasks

- [x] 1. Isolate Phase 2 work on a feature branch (HARD SAFETY GATE — do this first)
  - Create the branch `feature/phase-2-admin-dashboard` from the current base and switch to it: `git checkout -b feature/phase-2-admin-dashboard`
  - Confirm the active branch is `feature/phase-2-admin-dashboard` (`git branch --show-current`) and confirm work is NOT on `main`
  - Do NOT commit any Phase 2 code to `main`; all subsequent tasks happen on this branch
  - _Requirements: 1.1, 17.2_

- [x] 2. Add charting dependency and Phase 2 constants (pure, DB-independent)
  - [x] 2.1 Add and pin the Recharts dependency
    - Add `recharts` at a pinned/fixed version to `package.json` and install
    - Confirm it is the only new runtime dependency introduced by Phase 2
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 17.3_

  - [x] 2.2 Create Phase 2 constants files and extend the barrel export
    - Create `src/lib/constants/willingness-to-pay.ts` → `WILLINGNESS_TO_PAY` (`Yes`, `Maybe - Depends on price`, `No`)
    - Create `src/lib/constants/price-ranges.ts` → `PRICE_RANGES` (`Below ₦2,000`, `₦2,000–₦5,000`, `₦5,000–₦10,000`, `Above ₦10,000`, `Not sure`)
    - Create `src/lib/constants/existing-collection.ts` → `EXISTING_COLLECTION_OPTIONS` (`Yes`, `No`, `Sometimes`, `I manage it myself`)
    - Create `src/lib/constants/satisfaction.ts` → `SATISFACTION_OPTIONS` (`Yes`, `No`, `Somewhat`)
    - Create `src/lib/constants/customer-status.ts` → `CUSTOMER_STATUSES` (`New`, `Contacted`, `Interested`, `Converted`, `Inactive`)
    - Create `src/lib/constants/provider-status.ts` → `PROVIDER_STATUSES` (`Pending`, `Contacted`, `Verified`, `Active`, `Inactive`, `Suspended`, `Rejected`)
    - Create `src/lib/constants/wants-more-customers.ts` → `WANTS_MORE_CUSTOMERS` (`Yes`, `Maybe`, `No`)
    - Each uses the `as const` + derived type pattern; re-export each constant and its derived type from `src/lib/constants/index.ts`
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 3.2, 4.2, 4.4_

- [x] 3. Extend types and add the terminology helper (pure)
  - [x] 3.1 Extend TypeScript types in `src/types/index.ts`
    - Add derived types: `WillingnessToPay`, `PriceRange`, `ExistingCollection`, `Satisfaction`, `CustomerStatus`, `ProviderStatus`, `WantsMoreCustomers`
    - Extend `CustomerRegistrationInput` with optional `willingness_to_pay`, `preferred_price_range`, `has_existing_collection`, `satisfaction_with_existing`
    - Extend `CollectorRegistrationInput` with optional `wants_more_customers`
    - Extend `Customer` / `Collector` row types with `status` and `updated_at` (nullable-safe to match DB)
    - Add `ActivityLogEntry` (id, action_type, description, metadata, created_at)
    - Expand `DashboardStats` (totalUsers, customerCount, collectorCount, activeProviders, pendingProviders, newRegistrationsThisWeek, customersInterestedInPaid, customersWithExistingCollection, customersWithoutExistingCollection, recentRegistrations, lgaBreakdown)
    - _Requirements: 6.1, 6.2, 19.1, 19.3_

  - [x] 3.2 Create the terminology display helper `src/lib/utils/terminology.ts`
    - Add `TERMINOLOGY` map and `displayEntity(key)` returning "Waste Manager" / "Waste Managers" (display-only, no identifier or table rename)
    - _Requirements: 1.1, 10.1, 11.1_

  - [x]* 3.3 Write unit test for terminology mapping
    - `tests/unit/terminology.test.ts`: `displayEntity("collector")` → "Waste Manager", `displayEntity("collectors")` → "Waste Managers"
    - _Requirements: 1.1, 10.1, 11.1_

- [x] 4. Extend validators and add status schemas (pure)
  - [x] 4.1 Extend registration schemas with optional Phase 2 fields + satisfaction conditional transform
    - `src/lib/validators/customer.ts`: add `.optional()` `willingness_to_pay`, `preferred_price_range`, `has_existing_collection`, `satisfaction_with_existing` (Zod enums from the new constants); add a `.transform` that nulls out `satisfaction_with_existing` whenever `has_existing_collection !== "Yes"` (do not hard-fail)
    - `src/lib/validators/collector.ts`: add `.optional()` `wants_more_customers`
    - Do not alter any existing Phase 1 fields or required-field behavior
    - _Requirements: 2.1, 2.6, 2.7, 2.8, 4.1, 4.5, 1.5, 16.3_

  - [x] 4.2 Create status-change schemas `src/lib/validators/status.ts`
    - `customerStatusSchema = z.object({ status: z.enum(CUSTOMER_STATUSES) })`
    - `providerStatusSchema = z.object({ status: z.enum(PROVIDER_STATUSES) })`
    - _Requirements: 3.2, 3.4, 4.4, 5.2, 16.3, 16.4_

  - [x]* 4.3 Write property test — backward-compatible registration stores nulls
    - `tests/properties/phase2-registration.property.test.ts`
    - **Property 1: Backward-compatible registration stores nulls** (min 100 iterations)
    - Tag: `Feature: cleancall-phase-2-admin, Property 1`
    - **Validates: Requirements 1.5, 2.8, 4.5**

  - [x]* 4.4 Write property test — satisfaction is conditional on existing collection
    - `tests/properties/satisfaction-conditional.property.test.ts`
    - **Property 2: Satisfaction is conditional on existing collection** (min 100 iterations)
    - Tag: `Feature: cleancall-phase-2-admin, Property 2`
    - **Validates: Requirements 2.6, 2.7**

  - [x]* 4.5 Write property tests — status schemas accept iff in allowed set
    - `tests/properties/status-schemas.property.test.ts`
    - **Property 3: Customer status accepted iff in allowed set** (min 100 iterations)
    - **Property 4: Provider status accepted iff in allowed set** (min 100 iterations)
    - Tags: `Feature: cleancall-phase-2-admin, Property 3` / `Property 4`
    - **Validates: Requirements 3.2, 3.4, 4.4, 5.2, 16.3, 16.4**

  - [x]* 4.6 Write unit tests for validators
    - `tests/unit/validators-phase2.test.ts`: Phase-1-only input still validates; satisfaction conditional transform nulls satisfaction when `has_existing_collection !== "Yes"`; status schemas accept/reject representative values
    - _Requirements: 1.5, 2.6, 2.7, 3.4, 5.2_

- [x] 5. Extract pure helpers for stats, filtering, aggregation, display, lifecycle, and CSV
  - [x] 5.1 Implement stat + aggregation pure helpers `src/lib/utils/stats.ts`
    - `computeStats(customers, collectors)` → expanded `DashboardStats` (totalUsers = customerCount + collectorCount; active/pending provider counts; interested-in-paid = willingness in {Yes, Maybe - Depends on price}; with/without existing collection partition excluding nulls; zero when no matches)
    - `groupByLga(...)`, and chart-grouping helpers (by willingness, by has-existing-collection, by role, by time bucket) returning group counts
    - `locationBreakdown(customers, collectors)` → all 16 canonical LGAs (including zeros); customer count per LGA; waste-manager coverage = collectors whose `service_areas` include the LGA
    - _Requirements: 6.1, 6.2, 6.4, 6.5, 6.6, 6.7, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 12.1, 12.2, 12.3_

  - [x] 5.2 Implement filter + lifecycle + display pure helpers
    - `filterCustomers(rows, filters)` / manager filter: apply all active conditions (search, LGA, category, willingness, has-existing-collection, status, wants-more-customers, date range) with AND logic; a null-valued field is excluded only when the filter specifies a non-null value
    - `mapLifecycleAction(action)` in `src/lib/utils/lifecycle.ts`: approve→Active, suspend→Suspended, verify→Verified, contact→Contacted
    - `displayField(value)` in `src/lib/utils/display.ts`: return value when present, "Not recorded" when null (never throw)
    - _Requirements: 5.3, 5.4, 5.5, 5.6, 8.2, 8.4, 8.5, 8.6, 10.2, 10.5, 13.3, 15.4, 15.5, 9.2, 11.2, 1.4_

  - [x] 5.3 Extend CSV helper for Phase 2 fields
    - Extend `src/lib/utils/csv.ts` generation to append Phase 2 columns (customers: willingness_to_pay, preferred_price_range, has_existing_collection, satisfaction_with_existing, status; collectors: wants_more_customers, status) after existing Phase 1 columns; null Phase 2 values render as empty cells
    - Keep existing Phase 1 column positions unchanged
    - _Requirements: 13.1, 13.2, 13.4_

  - [x]* 5.4 Write property test — lifecycle action mapping
    - `tests/properties/lifecycle.property.test.ts`
    - **Property 5: Lifecycle actions map to fixed statuses** (min 100 iterations)
    - Tag: `Feature: cleancall-phase-2-admin, Property 5`
    - **Validates: Requirements 5.3, 5.4, 5.5, 5.6, 10.5**

  - [x]* 5.5 Write property tests — stat computation exactness
    - `tests/properties/stats-phase2.property.test.ts` (generators include null/zero-match cases)
    - **Property 6: Total users equals customers plus managers** (min 100 iterations)
    - **Property 7: Provider status counts are exact** (min 100 iterations)
    - **Property 8: Interested-in-paid membership is exact** (min 100 iterations)
    - **Property 9: Existing-collection partition is exact and excludes nulls** (min 100 iterations)
    - **Property 10: Chart aggregations sum to their input population** (min 100 iterations)
    - Tags: `Feature: cleancall-phase-2-admin, Property 6`–`Property 10`
    - **Validates: Requirements 6.2, 6.4, 6.5, 6.6, 6.7, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 15.4**

  - [x]* 5.6 Write property tests — filtering, pagination, display, location
    - `tests/properties/filter-display-location.property.test.ts` (generators include null-valued filter fields)
    - **Property 11: Filter soundness across all active conditions** (min 100 iterations)
    - **Property 12: Pagination partitions a sorted result without gaps or overlap** (min 100 iterations)
    - **Property 13: Null field values display as "Not recorded"** (min 100 iterations)
    - **Property 14: Location breakdown covers all 16 LGAs with exact counts** (min 100 iterations)
    - Tags: `Feature: cleancall-phase-2-admin, Property 11`–`Property 14`
    - **Validates: Requirements 8.2, 8.4, 8.5, 8.6, 10.2, 10.4, 13.3, 15.5, 8.3, 1.4, 9.2, 11.2, 12.1, 12.2, 12.3**

  - [x]* 5.7 Write property test — CSV round-trip with null→empty
    - `tests/properties/csv-phase2.property.test.ts`
    - **Property 15: CSV export round-trip preserves fields and maps nulls to empty** (min 100 iterations)
    - Tag: `Feature: cleancall-phase-2-admin, Property 15`
    - **Validates: Requirements 13.1, 13.2, 13.4**

- [x] 6. Checkpoint - pure logic compiles and all pure-logic tests pass
  - Run `npx tsc --noEmit` and `npm run test`; ensure the full existing Phase 1 suite plus new pure-logic tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Author the Phase 2 database migration file (WRITE ONLY — do NOT apply to production here)
  - [x] 7.1 Write `supabase/migrations/002_phase2_admin.sql` (additive-only)
    - Add nullable columns to `customers`: `willingness_to_pay`, `preferred_price_range`, `has_existing_collection`, `satisfaction_with_existing` (each with a CHECK allowing NULL), `status TEXT CHECK(...) DEFAULT 'New'`, `updated_at TIMESTAMPTZ DEFAULT now()` — all via `ADD COLUMN IF NOT EXISTS`
    - Add nullable columns to `collectors`: `wants_more_customers` (CHECK allowing NULL), `status TEXT CHECK(...) DEFAULT 'Pending'`, `updated_at TIMESTAMPTZ DEFAULT now()`
    - Backfill existing (~99) rows: `status` → New/Pending where NULL; documented fallback `updated_at = created_at` for pre-existing rows (idempotent)
    - Create `activity_log` table (id UUID PK, `action_type TEXT NOT NULL` — plain TEXT, not a DB enum, extensible metadata `JSONB`, created_at) + `idx_activity_log_created_at`
    - Create `set_updated_at()` function + `BEFORE UPDATE` triggers on `customers` and `collectors`
    - Add filter/stat indexes: `idx_customers_status`, `idx_customers_willingness_to_pay`, `idx_customers_has_existing_collection`, `idx_collectors_status`
    - Enable RLS on `activity_log`: SELECT to `authenticated`, INSERT to `service_role` only. Do NOT alter existing customers/collectors policies
    - Contains ONLY additive statements — no DROP/RENAME/TRUNCATE/ALTER COLUMN TYPE/DELETE
    - _Requirements: 1.2, 1.3, 1.4, 1.6, 2.1, 3.1, 4.1, 4.3, 14.3, 16.1, 16.5, 19.1, 19.2, 19.3_

  - [x]* 7.2 Write migration schema integration checks (run against staging/branch DB)
    - `tests/integration/migration.test.ts`: `activity_log.action_type` is `TEXT`; no FK couples `customers`↔`collectors`; before/after `count(*)` on customers and collectors is preserved; sample existing field values unchanged
    - _Requirements: 1.6, 19.3, 19.4, 19.5_

- [x] 8. Implement the activity-log helper and wire status/export logging
  - [x] 8.1 Implement `src/lib/utils/activity-log.ts`
    - `recordActivity(client, actionType, description, metadata)` inserts into `activity_log` via a **service-role** client; failures are logged server-side and swallowed (never fail the primary action)
    - `ActivityActionType` union covers admin_login, customer_status_change, provider_approval, provider_suspension, provider_status_change, data_export
    - _Requirements: 14.1, 14.2, 14.3, 16.5_

  - [x]* 8.2 Write property test + unit test for activity entries
    - `tests/properties/activity-log.property.test.ts` — **Property 16: Activity entries are well-formed and ordered** (min 100 iterations); tag `Feature: cleancall-phase-2-admin, Property 16` — **Validates: Requirements 14.3, 14.4**
    - `tests/unit/activity-log.test.ts`: helper builds the correct entry shape per action_type and swallows insert errors
    - _Requirements: 14.1, 14.2, 14.3_

- [x] 9. Extend registration forms and server actions (wired to staging DB)
  - [x] 9.1 Extend registration forms with optional Phase 2 fields
    - `src/components/forms/customer-form.tsx`: add optional selects for willingness_to_pay, preferred_price_range, has_existing_collection, and conditionally-enabled satisfaction_with_existing (enabled only when has_existing_collection === "Yes"); present price range explicitly as a market-research question, not advertised prices
    - `src/components/forms/collector-form.tsx`: add optional wants_more_customers select
    - Reuse existing RHF + zodResolver + ARIA patterns; do not change existing required-field behavior
    - _Requirements: 2.1, 2.6, 2.9, 4.1, 17.1, 17.2_

  - [x] 9.2 Extend register-customer / register-collector server actions
    - Extend `src/lib/actions/register-customer.ts` and `register-collector.ts` to parse/sanitize/persist the new optional fields; omitted fields store null and registration still succeeds
    - _Requirements: 2.8, 4.5, 1.5, 3.1, 4.3_

  - [x]* 9.3 Write unit tests for form rendering
    - `tests/unit/forms-phase2.test.ts`: forms render new optional fields with labels/ARIA; satisfaction field enabled only when has_existing_collection === "Yes"
    - _Requirements: 2.1, 2.6, 4.1_

- [x] 10. Extend and add admin API routes (wired to staging DB)
  - [x] 10.1 Extend GET list routes with Phase 2 filters
    - `src/app/api/admin/customers/route.ts`: add filters willingness_to_pay, has_existing_collection, status, dateFrom, dateTo (applied only when the param is present)
    - `src/app/api/admin/collectors/route.ts`: add filters status, wants_more_customers
    - Preserve existing search/sort/pagination and the `auth.getUser()` → 401 pattern
    - _Requirements: 8.2, 8.4, 8.5, 8.6, 10.2, 15.4, 15.5, 16.2_

  - [x] 10.2 Add customer detail GET + status PATCH route
    - `src/app/api/admin/customers/[id]/route.ts`: GET single (404/not-found for unknown id); PATCH validates with `customerStatusSchema` (invalid → 400 + fieldErrors + no mutation), updates status, records `customer_status_change` activity
    - _Requirements: 3.3, 3.4, 3.5, 9.1, 9.4, 16.2, 16.3, 16.4_

  - [x] 10.3 Add waste-manager detail GET + status/lifecycle PATCH route
    - `src/app/api/admin/collectors/[id]/route.ts`: GET single (unknown id → not-found); PATCH accepts raw `status` (validated via `providerStatusSchema`) or a named `action` (approve/suspend/verify/contact) mapped server-side; records the matching activity entry (approval/suspension/status change)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 10.5, 11.1, 11.4, 16.2, 16.3, 16.4_

  - [x] 10.4 Add dashboard / analytics / locations / activity-log routes
    - `src/app/api/admin/dashboard/route.ts`: expanded stats via `computeStats` (all query-derived, no hardcoded values)
    - `src/app/api/admin/analytics/route.ts`: chart datasets (query-derived)
    - `src/app/api/admin/locations/route.ts`: LGA breakdown for all 16 LGAs including zeros + service-area coverage
    - `src/app/api/admin/activity-log/route.ts`: entries ordered `created_at DESC`
    - All repeat the `auth.getUser()` → 401 guard
    - _Requirements: 6.1, 6.3, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 12.1, 12.2, 12.3, 12.4, 14.4, 16.2, 16.5_

  - [x] 10.5 Extend export routes with Phase 2 fields + export logging
    - `src/app/api/admin/export/customers/route.ts` and `export/collectors/route.ts`: append Phase 2 columns, respect active filters, empty cells for null values, record a `data_export` activity entry
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 16.2_

  - [x]* 10.6 Write integration tests for API routes (against staging/seeded data)
    - `tests/integration/api-phase2.test.ts`: 401 on unauthenticated for each new/extended route; detail GET + not-found; PATCH valid→200 (persisted, updated_at advanced) / invalid→400 (row unchanged); lifecycle actions set status + write activity entry; extended + combined filters return only matching rows; dashboard/analytics numbers match seeded counts (proving query-derived); export includes new fields, respects filters, empties nulls, writes `data_export` entry; activity-log ordered DESC + login writes `admin_login`; unauthenticated `/activity-log`→401 and non-service_role INSERT rejected
    - _Requirements: 3.3, 3.4, 5.1–5.6, 6.3, 7.7, 8.2–8.6, 9.4, 10.2, 11.4, 13.1–13.5, 14.1, 14.2, 14.4, 16.2, 16.5, 19.2_

- [x] 11. Checkpoint - types compile, application code + integration tests pass on staging
  - Run `npx tsc --noEmit` and `npm run test` (staging/branch DB configured); ensure Phase 1 suite still passes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Build chart components (Recharts, ResponsiveContainer)
  - [x] 12.1 Implement chart components in `src/components/admin/charts/`
    - `registrations-over-time.tsx` (line), `customers-vs-managers.tsx` (**bar chart — required, NOT a pie chart**), `by-lga.tsx` (bar), `willingness-to-pay.tsx` (pie), `existing-collection.tsx` (pie)
    - Each wrapped in `ResponsiveContainer`; render from props (query-derived data), never hardcoded
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 17.1, 17.3_

  - [x]* 12.2 Write unit/render tests for chart components
    - `tests/unit/charts.test.ts`: components render given sample datasets; customers-vs-managers renders a bar (not pie) chart
    - _Requirements: 7.2_

- [x] 13. Build and extend admin UI pages, shared controls, and navigation
  - [x] 13.1 Expand the dashboard page
    - Update `src/app/admin/dashboard/page.tsx` to consume `/dashboard`, extend `stats-cards.tsx` props for new counts, and compose the chart components
    - _Requirements: 6.1, 6.3, 7.1–7.7, 17.1, 17.3_

  - [x] 13.2 Build shared status-control component
    - `src/components/admin/status-control.tsx`: dropdown for customers, action buttons for waste managers; PATCHes then calls `router.refresh()`
    - _Requirements: 3.3, 5.1, 5.3, 5.4, 5.5, 5.6, 9.3, 11.3_

  - [x] 13.3 Build customer detail page
    - `src/app/admin/registrations/customers/[id]/page.tsx`: sections for personal info, location, waste info, current collection arrangement, market interest, status; null fields via `displayField` → "Not recorded"; embed status-control; not-found handling
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 13.4 Build waste-manager detail page
    - `src/app/admin/registrations/collectors/[id]/page.tsx`: business/service/status/marketplace sections using "Waste Manager" labels via `terminology.ts`; null fields → "Not recorded"; lifecycle action controls; not-found handling
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 13.5 Build locations and analytics pages
    - `src/app/admin/locations/page.tsx`: table + simple charts for all 16 LGAs (including zeros), customer counts and service-area coverage; no interactive map
    - `src/app/admin/analytics/page.tsx`: chart-focused, reusing chart components
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 7.1–7.7_

  - [x] 13.6 Build activity-log page
    - `src/app/admin/activity-log/page.tsx`: table of entries ordered `created_at DESC`
    - _Requirements: 14.4_

  - [x] 13.7 Extend registration tables, filter bar, and export button props
    - `registration-table.tsx`: add customer columns (willingness_to_pay, has_existing_collection, status) and manager columns (status, wants_more_customers) + per-record view/verify/approve/suspend/contact actions
    - `search-filter-bar.tsx`: add filters (willingness_to_pay, has_existing_collection, customer status, registration date; provider status, wants_more_customers)
    - `export-button.tsx`: pass extended filter query string
    - Preserve existing search/sort/pagination behavior
    - _Requirements: 8.1, 8.2, 8.3, 10.1, 10.3, 10.4, 13.3, 17.2_

  - [x] 13.8 Extend admin navigation
    - `src/app/admin/layout.tsx`: seven top-level areas (Dashboard, Customers, Waste Managers, Locations, Analytics, Exports, Settings); Customers sub-views (All, Interested in Service, Existing Collection, No Collection) and Waste Managers sub-views (All Providers, Pending Verification, Active, Suspended) mapped to query params consumed by the list routes
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 16.1_

  - [x]* 13.9 Write unit tests for navigation and detail rendering
    - `tests/unit/navigation.test.ts`: renders seven top-level areas and required sub-views
    - `tests/unit/detail-pages.test.ts`: null fields render "Not recorded"; waste-manager page uses "Waste Manager" labels
    - _Requirements: 15.1, 15.2, 15.3, 9.2, 11.1, 11.2_

- [x] 14. Regression checkpoint - Phase 1 stays green, full Phase 2 suite passes
  - Run `npx tsc --noEmit` and the full `npm run test` (unit + properties + integration against staging)
  - Confirm the existing Phase 1 test suite passes unchanged and Phase 1 customer/collector registration still works
  - Confirm existing Phase 1 CSV column positions are unchanged (new columns appended only)
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Production migration apply (HARD APPROVAL GATE — HUMAN-APPROVED ONLY, do NOT auto-run)
  - > This task modifies the LIVE production database and MUST NOT be executed automatically. It proceeds only after every gate below passes in order and explicit stakeholder approval is recorded.
  - [~] 15.1 Capture a Supabase recovery point / backup for production and record it as the documented restore target
    - _Requirements: 1.6_
  - [~] 15.2 Apply migration `002_phase2_admin.sql` to staging / a Supabase branch DB first and validate there (never production first)
    - _Requirements: 1.2, 1.3, 1.4, 19.1, 19.2, 19.3_
  - [~] 15.3 Before/after verification on staging: `count(*)` on customers and collectors unchanged; spot-check sample existing field values byte-for-byte unchanged
    - _Requirements: 1.1, 1.6_
  - [~] 15.4 Additive-only reviewer checklist: read the migration and confirm no DROP/RENAME/TRUNCATE/ALTER COLUMN TYPE/DELETE
    - _Requirements: 1.1, 1.2_
  - [~] 15.5 Obtain explicit stakeholder approval, then apply migration 002 to production; re-verify record counts and existing values preserved
    - _Requirements: 1.6, 19.1_

## Notes

- Tasks marked with `*` are optional test sub-tasks and can be skipped for a faster path; core implementation tasks are never marked optional.
- Task 1 (feature branch) and Task 15 (production migration apply) are the two hard safety gates. Task 15 is human-approval-only and MUST NOT be auto-run; it is deliberately isolated from all code tasks and placed at the end.
- Application code (Tasks 8–13) is developed and tested against staging / a Supabase branch DB. Migration authoring (Task 7) only writes the SQL file; it never applies to production.
- Each task references specific granular requirements for traceability. Properties 1–16 from the design are each implemented by a single fast-check property test (min 100 iterations) tagged `Feature: cleancall-phase-2-admin, Property N`.
- Pure logic (constants, types, validators, helpers) comes first so the bulk of the properties/units run without a DB; integration tests run against seeded staging data.
- Recharts is the only new runtime dependency and is pinned. `customers-vs-managers` MUST be a bar chart; pie charts are used only for willingness-to-pay and existing-collection distributions.
- The `SUPABASE_SERVICE_ROLE_KEY` (already in the Phase 1 environment) is required for `recordActivity` writes, since `activity_log` INSERT is `service_role` only.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["3.1", "3.2"] },
    { "id": 3, "tasks": ["3.3", "4.1", "4.2"] },
    { "id": 4, "tasks": ["4.3", "4.4", "4.5", "4.6", "5.1", "5.2", "5.3"] },
    { "id": 5, "tasks": ["5.4", "5.5", "5.6", "5.7", "7.1"] },
    { "id": 6, "tasks": ["7.2", "8.1"] },
    { "id": 7, "tasks": ["8.2", "9.1", "9.2"] },
    { "id": 8, "tasks": ["9.3", "10.1", "10.2", "10.3", "10.4", "10.5"] },
    { "id": 9, "tasks": ["10.6", "12.1"] },
    { "id": 10, "tasks": ["12.2", "13.1", "13.2", "13.3", "13.4", "13.5", "13.6", "13.7", "13.8"] },
    { "id": 11, "tasks": ["13.9"] },
    { "id": 12, "tasks": ["15.1"] },
    { "id": 13, "tasks": ["15.2"] },
    { "id": 14, "tasks": ["15.3"] },
    { "id": 15, "tasks": ["15.4"] },
    { "id": 16, "tasks": ["15.5"] }
  ]
}
```
