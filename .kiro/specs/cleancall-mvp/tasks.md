# Implementation Plan: CleanCall MVP

## Overview

This plan implements the CleanCall MVP waste management registration platform for Ekiti State, Nigeria. The implementation follows an incremental approach: project scaffolding → shared types/constants/utilities → database schema → public pages (landing, registration forms) → admin authentication → admin dashboard and management → CSV export → testing. Each task builds on previous work, ensuring no orphaned code.

## Tasks

- [x] 1. Set up project structure, dependencies, and shared foundations
  - [x] 1.1 Initialize Next.js 15 project with TypeScript, Tailwind CSS, and install core dependencies
    - Create Next.js 15 App Router project with TypeScript
    - Install dependencies: `@supabase/ssr`, `@supabase/supabase-js`, `zod`, `react-hook-form`, `@hookform/resolvers`
    - Install shadcn/ui and initialize with default config
    - Add shadcn/ui components: Button, Input, Select, Label, Card, Table, Badge, Toast, Dialog
    - Set up project folder structure per design (`src/app`, `src/lib`, `src/components`, `src/types`, `tests/`)
    - Configure `tailwind.config.ts` with custom theme if needed
    - _Requirements: 1.4, 1.5, 10.1_

  - [x] 1.2 Create shared TypeScript types and constants
    - Create `src/types/index.ts` with all interfaces: `CustomerRegistrationInput`, `CollectorRegistrationInput`, `Customer`, `Collector`, `EkitiLGA`, `CustomerCategory`, `DisposalMethod`, `CollectionFrequency`, `PaginatedResponse`, `DashboardStats`, `RecentRegistration`, `LGABreakdownItem`, `ActionResult`
    - Create `src/lib/constants/lgas.ts` with the 16 Ekiti State LGAs array
    - Create `src/lib/constants/categories.ts` with customer categories
    - Create `src/lib/constants/disposal-methods.ts` with disposal methods
    - Create `src/lib/constants/frequencies.ts` with collection frequencies
    - _Requirements: 2.6, 2.7, 2.8, 2.9, 3.7_

  - [x] 1.3 Implement Zod validation schemas for customer and collector registration
    - Create `src/lib/validators/customer.ts` with Zod schema enforcing: full_name (1-100 chars), phone (Nigerian format regex), email (optional, valid format), address (1-255 chars), lga (enum), category (enum), disposal_method (enum), collection_frequency (enum)
    - Create `src/lib/validators/collector.ts` with Zod schema enforcing: business_name (1-150 chars), contact_person (1-100 chars), phone (Nigerian format), email (required, valid format), business_address (1-300 chars), service_areas (1-16 valid LGAs), waste_types (non-empty array), staff_count (1-10000), vehicle_count (1-10000), years_in_operation (0-100), cac_number (optional, max 20 chars)
    - Create `src/lib/validators/auth.ts` with Zod schema for login: email (1-254 chars, valid format), password (8-128 chars)
    - _Requirements: 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3.4, 3.5, 3.6, 3.7, 3.8, 4.1, 4.6_

  - [x] 1.4 Implement utility functions (phone validation, sanitization, CSV generation, rate limiting)
    - Create `src/lib/utils/phone.ts` with Nigerian phone validation function matching `^0[7-9][01]\d{8}$` or `^\+234[7-9][01]\d{8}$`
    - Create `src/lib/utils/sanitize.ts` with input sanitization: strip HTML tags, trim whitespace, normalize phone numbers
    - Create `src/lib/utils/csv.ts` with CSV generation utility: handles commas, double quotes, newlines in values; generates header row; applies proper escaping; formats filename as `{view}_export_{YYYY-MM-DD}.csv`
    - Create `src/lib/utils/rate-limit.ts` with rate limiting logic: check attempts, increment on failure, reset on success, 15-minute lockout after 5 failures
    - _Requirements: 2.5, 3.5, 7.3, 7.4, 8.5, 4.8_

- [x] 2. Database and Supabase setup
  - [x] 2.1 Create Supabase database schema (SQL migration)
    - Create SQL migration file with `customers` table (all columns, constraints, unique phone)
    - Create `collectors` table (all columns, constraints, array types for service_areas/waste_types)
    - Create `login_attempts` table (email PK, attempt_count, locked_until, last_attempt_at)
    - Add all indexes (created_at DESC, lga, phone, category, GIN for arrays, full-text search)
    - Enable RLS on all tables and create policies: anon INSERT for customers/collectors, authenticated SELECT for customers/collectors, service_role ALL for login_attempts
    - _Requirements: 2.2, 3.2, 4.8, 8.1, 8.3_

  - [x] 2.2 Set up Supabase client utilities (browser, server, middleware)
    - Create `src/lib/supabase/client.ts` for browser-side Supabase client using `createBrowserClient`
    - Create `src/lib/supabase/server.ts` for Server Component/Action Supabase client using `createServerClient` with cookie handling
    - Create `src/lib/supabase/middleware.ts` for middleware Supabase client that refreshes session cookies
    - Add environment variable types and validation (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
    - _Requirements: 4.2, 4.4, 8.2_

- [x] 3. Checkpoint - Verify foundations
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Public pages implementation
  - [x] 4.1 Implement the public landing page
    - Create `src/app/page.tsx` as a Server Component
    - Create `src/components/landing/hero.tsx` with headline, subtext, and primary CTA buttons
    - Create `src/components/landing/about.tsx` explaining CleanCall's purpose
    - Create `src/components/landing/reasons.tsx` listing reasons to join
    - Create `src/components/landing/cta-section.tsx` with separate customer and collector CTAs linking to `/register/customer` and `/register/collector`
    - Create `src/components/landing/contact.tsx` displaying phone and email
    - Create `src/components/landing/footer.tsx`
    - Ensure mobile-first responsive layout (320px-1920px), 4.5:1 contrast, 16px min body text
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 10.1, 10.5_

  - [x] 4.2 Implement customer registration form and server action
    - Create `src/components/forms/customer-form.tsx` as Client Component with React Hook Form + Zod resolver
    - Implement all fields: full_name (text), phone (tel), email (email, optional), address (textarea), lga (select), category (select), disposal_method (select), collection_frequency (select)
    - Add inline validation errors with ARIA live regions and proper label associations
    - Preserve form state on validation errors (never clear filled fields)
    - Create `src/lib/actions/register-customer.ts` server action: validate with Zod, sanitize inputs, check duplicate phone, insert into DB
    - Create `src/app/register/customer/page.tsx` rendering the form
    - Create `src/app/register/customer/success/page.tsx` with success confirmation
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.10, 8.4, 8.5, 8.6, 10.3, 10.4, 10.6_

  - [x] 4.3 Implement collector registration form and server action
    - Create `src/components/forms/collector-form.tsx` as Client Component with React Hook Form + Zod resolver
    - Implement all fields: business_name, contact_person, phone, email, business_address, service_areas (multi-select), waste_types (multi-select), staff_count (number), vehicle_count (number), years_in_operation (number), cac_number (optional text)
    - Add inline validation errors with ARIA live regions and proper label associations
    - Preserve form state on validation errors
    - Create `src/lib/actions/register-collector.ts` server action: validate with Zod, sanitize inputs, insert into DB
    - Create `src/app/register/collector/page.tsx` rendering the form
    - Create `src/app/register/collector/success/page.tsx` with success confirmation
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 8.4, 8.5, 8.6, 10.3, 10.4, 10.6_

- [x] 5. Checkpoint - Verify public pages
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Admin authentication
  - [x] 6.1 Implement Next.js middleware for auth protection
    - Create `src/middleware.ts` matching `/admin/*` routes except `/admin/login`
    - Use Supabase middleware client to refresh session on each request
    - Redirect unauthenticated users to `/admin/login`
    - _Requirements: 4.4, 8.2_

  - [x] 6.2 Implement admin login page with rate limiting
    - Create `src/components/forms/login-form.tsx` as Client Component with email/password fields
    - Add validation: email required (max 254 chars, valid format), password required (8-128 chars)
    - Display generic error messages (never reveal which field was wrong)
    - Preserve email on failed attempts
    - Create `src/lib/actions/auth.ts` with `loginAdmin` server action: check rate limit, authenticate via Supabase Auth, increment/reset attempts, redirect on success
    - Add `logoutAdmin` server action to terminate session and redirect
    - Create `src/app/admin/login/page.tsx` rendering the login form
    - Implement rate limiting: 5 failed attempts → 15-minute lockout with informative message
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6, 4.7, 4.8, 10.3_

- [x] 7. Admin dashboard and registration management
  - [x] 7.1 Implement admin dashboard statistics page
    - Create `src/app/api/admin/stats/route.ts` returning: customerCount, collectorCount, recentRegistrations (10 most recent), lgaBreakdown (all 16 LGAs with counts)
    - Validate authenticated session in route handler, return 401 if unauthenticated
    - Create `src/components/admin/stats-cards.tsx` displaying total counts
    - Create `src/components/admin/recent-registrations.tsx` displaying recent entries (name, role, lga, date)
    - Create `src/components/admin/lga-breakdown.tsx` displaying per-LGA counts including zeros
    - Create `src/app/admin/dashboard/page.tsx` composing all dashboard components
    - Create `src/app/admin/layout.tsx` with admin navigation and auth guard
    - Handle empty state (zero registrations)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 8.2_

  - [x] 7.2 Implement admin customer registration management (paginated table, search, filters)
    - Create `src/app/api/admin/customers/route.ts` with query params: page, pageSize (default 20), search, lga, category
    - Implement server-side pagination, case-insensitive search (min 2 chars) on name/phone/email/address, LGA filter, category filter with AND logic
    - Return `PaginatedResponse<Customer>` with total count
    - Create `src/components/admin/registration-table.tsx` reusable table component
    - Create `src/components/admin/search-filter-bar.tsx` with search input, LGA dropdown, category dropdown
    - Create `src/app/admin/registrations/customers/page.tsx` composing table + filters + pagination controls (next, prev, first, last)
    - Handle empty state for no matching records
    - _Requirements: 6.1, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

  - [x] 7.3 Implement admin collector registration management (paginated table, search, filters)
    - Create `src/app/api/admin/collectors/route.ts` with query params: page, pageSize (default 20), search, lga
    - Implement server-side pagination, case-insensitive search on business_name/contact_person/phone/email/address, LGA filter (matches service_areas array) with AND logic
    - Return `PaginatedResponse<Collector>` with total count
    - Create `src/app/admin/registrations/collectors/page.tsx` composing table + filters + pagination controls
    - Handle empty state for no matching records
    - _Requirements: 6.2, 6.3, 6.4, 6.6, 6.7, 6.8_

  - [x] 7.4 Implement admin CSV export functionality
    - Create `src/app/api/admin/export/customers/route.ts` generating CSV with columns: id, full_name, phone, email, address, lga, category, disposal_method, collection_frequency, created_at
    - Create `src/app/api/admin/export/collectors/route.ts` generating CSV with columns: id, business_name, contact_person, phone, email, cac_number, business_address, service_areas, waste_types, staff_count, vehicle_count, years_in_operation, created_at
    - Apply current filters to export query
    - Set Content-Disposition header with filename pattern `{view}_export_{YYYY-MM-DD}.csv`
    - Handle empty results (header-only CSV), 30-second timeout, error response
    - Create `src/components/admin/export-button.tsx` triggering download with loading/error states
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 8. Checkpoint - Verify admin features
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Property-based tests
  - [x]* 9.1 Write property tests for phone validation and enum/required field validation
    - **Property 2: Phone Number Validation Rejects Invalid Formats**
    - **Property 3: Enum Field Validation Rejects Invalid Values**
    - **Property 4: Required Field Validation Identifies All Missing Fields**
    - **Validates: Requirements 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3.4, 3.5, 3.7, 3.8**
    - Set up Vitest + fast-check in `tests/properties/validation.property.test.ts`
    - Generate random invalid phone strings and verify rejection
    - Generate random strings not in enum sets and verify rejection
    - Generate random subsets of required fields left empty and verify exact error reporting

  - [x]* 9.2 Write property test for duplicate phone detection
    - **Property 5: Duplicate Phone Detection**
    - **Validates: Requirements 2.10**
    - Create `tests/properties/duplicate.property.test.ts`
    - Generate valid phone numbers, simulate first insert success, verify second insert rejection

  - [x]* 9.3 Write property test for rate limiting threshold
    - **Property 6: Rate Limiting Threshold**
    - **Validates: Requirements 4.8**
    - Create `tests/properties/rate-limit.property.test.ts`
    - Generate sequences of N failed attempts (N from 1 to 10) and verify lockout occurs at exactly 5

  - [x]* 9.4 Write property tests for search/filter correctness and pagination
    - **Property 8: Combined Search and Filter Correctness**
    - **Property 9: Pagination Correctness**
    - **Validates: Requirements 6.3, 6.4, 6.5, 6.6, 6.8**
    - Create `tests/properties/search-filter.property.test.ts`
    - Generate random datasets with random filter/search combinations, verify all results satisfy all conditions
    - Generate random dataset sizes and verify pagination math and completeness

  - [x]* 9.5 Write property test for CSV serialization round-trip
    - **Property 10: CSV Serialization Round-Trip**
    - **Validates: Requirements 7.1, 7.2, 7.3**
    - Create `tests/properties/csv.property.test.ts`
    - Generate records with special characters (commas, quotes, newlines), serialize to CSV, parse back, verify equality

  - [x]* 9.6 Write property test for input sanitization
    - **Property 11: Input Sanitization Preserves Data Integrity**
    - **Validates: Requirements 8.5**
    - Create `tests/properties/sanitize.property.test.ts`
    - Generate strings containing HTML/script tags, verify dangerous content removed while preserving semantic text

  - [x]* 9.7 Write property test for dashboard statistics accuracy
    - **Property 13: Dashboard Statistics Accuracy**
    - **Validates: Requirements 5.1, 5.2, 5.4, 5.5**
    - Create `tests/properties/stats.property.test.ts`
    - Generate random sets of customer/collector records, verify counts match and LGA breakdown sums equal totals

- [x] 10. Unit and integration tests
  - [x]* 10.1 Write unit tests for form components and utility functions
    - Test customer form renders all fields with proper labels and ARIA attributes
    - Test collector form renders all fields with proper labels and ARIA attributes
    - Test login form renders email/password fields with labels
    - Test LGA constants array has exactly 16 entries
    - Test CSV filename generation matches pattern
    - Test sanitization edge cases (empty string, no HTML, nested tags)
    - Test phone validation edge cases (boundary lengths, prefix variations)
    - _Requirements: 10.3, 2.1, 3.1, 4.1_

  - [x]* 10.2 Write integration tests for registration and admin flows
    - Test full customer registration: submit valid data → verify DB insert → verify success page redirect
    - Test full collector registration: submit valid data → verify DB insert → verify success page redirect
    - Test admin login flow: valid credentials → redirect to dashboard
    - Test admin route protection: unauthenticated request → 401/redirect
    - Test rate limiting end-to-end: 5 failures → lockout → verify locked message
    - Test dashboard stats endpoint returns correct structure
    - Test CSV export with filters returns correct file
    - _Requirements: 2.2, 2.3, 3.2, 3.3, 4.2, 4.4, 4.8, 5.1, 7.1_

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The testing framework (Vitest + fast-check + Testing Library) should be installed during task 1.1
- All Server Actions use Supabase parameterized queries (no raw SQL string concatenation)
- Environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) must be configured before task 2.2

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4"] },
    { "id": 2, "tasks": ["2.1", "2.2"] },
    { "id": 3, "tasks": ["4.1", "6.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "6.2"] },
    { "id": 5, "tasks": ["7.1"] },
    { "id": 6, "tasks": ["7.2", "7.3"] },
    { "id": 7, "tasks": ["7.4"] },
    { "id": 8, "tasks": ["9.1", "9.2", "9.3", "9.5", "9.6"] },
    { "id": 9, "tasks": ["9.4", "9.7", "10.1"] },
    { "id": 10, "tasks": ["10.2"] }
  ]
}
```
