# Requirements Document

## Introduction

CleanCall Phase 3 — Collection Request Operational Workflow extends the existing, live CleanCall Phase 1 and Phase 2 application. Phase 1 provides public customer and waste-collector registration, admin authentication, and a protected admin dashboard. Phase 2 adds market-research capture, an expanded admin operations console, lead/verification lifecycles, an Activity_Log, and introduces "Waste Manager" as a display-only term for the existing `collectors` entity. Phase 3 does NOT rebuild any of these.

Phase 3 builds the first operational layer of CleanCall: an admin-mediated collection request workflow. A Public_Customer submits a waste Collection_Request through a public form (no login). The Platform records the request, an Admin reviews it, the Admin assigns it to a suitable Waste_Manager, and the Admin drives the request through a controlled status lifecycle to completion. The Public_Customer tracks progress through a secure token link without any account. This proves the operational loop: CUSTOMER SUBMITS → CLEANCALL RECEIVES → ADMIN REVIEWS → ADMIN ASSIGNS → FULFILLED → COMPLETED.

Phase 3 is deliberately **admin-mediated** (the stakeholder-chosen option): there is no customer authentication and no collector authentication in Phase 3. The only authenticated user is the single existing Admin (Supabase Auth) protecting `/admin/*`. Collectors do not log in; the Admin performs assignment and every status transition on the Waste_Manager's behalf, representing real-world collection progress.

The overriding principle of Phase 3, consistent with Phase 2, is **backward compatibility**: existing Phase 1 registration and Phase 2 admin dashboard flows MUST keep working, existing records and existing automated tests MUST keep passing, every new database column MUST be nullable where not required, the new migration MUST be additive and idempotent, and Phase 3 MUST reuse existing components, API patterns, the Supabase client, authentication, Zod validation, Activity_Log helper, constants pattern, and styling conventions.

Any price-related fields carried on a Collection_Request are reused Phase 2 market-research values. They are NOT validated, advertised, or charged prices. Phase 3 processes no payments.

## Glossary

- **Platform**: The CleanCall web application built with Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui, and Supabase (PostgreSQL) using `@supabase/ssr`, on Node 22.
- **Phase_1**: The existing, live CleanCall registration flows, admin authentication, and dashboard that MUST remain functional.
- **Phase_2**: The existing admin operations console, market-research fields, `status`/`updated_at` columns, `activity_log` table, and "Waste Manager" display terminology that MUST remain functional.
- **Admin**: The single authenticated administrator who operates the admin dashboard, authenticated via the existing Supabase Auth flow. In Phase 3, any authenticated Supabase session is treated as the Admin (no non-admin login path exists).
- **Public_Customer**: A member of the public who submits or tracks a Collection_Request through a public (anonymous) route without logging in. A Public_Customer has no account and no authenticated session.
- **Customer**: The existing `customers` database entity created via Phase 1 registration. A Collection_Request MAY optionally reference a Customer but does not require one.
- **Collector**: The existing `collectors` database entity and code identifier for a waste service provider. The table name, code identifiers, and column names remain unchanged in Phase 3.
- **Waste_Manager**: The display-only term shown in the user interface for a Collector, consistent with Phase 2. Waste_Manager and Collector refer to the same underlying `collectors` records; no table rename or table-structure data migration occurs in Phase 3.
- **Collection_Request**: A single request by a Public_Customer for waste to be collected, stored in the new `collection_requests` table. A Collection_Request stands alone and carries its own captured contact details, independent of whether it links to a Customer.
- **Request_Number**: A unique, human-friendly identifier for a Collection_Request, formatted as `CR-YYYYMMDD-XXXX`, used for display and Admin search. The Request_Number alone is NOT sufficient to authorize public tracking.
- **Tracking_Token**: A secure, unguessable token generated per Collection_Request and used as the sole key for public status tracking through a token link. The Tracking_Token is not derivable from the Request_Number.
- **Waste_Type**: The canonical waste classification for a Collection_Request, one of: HOUSEHOLD, COMMERCIAL, RECYCLABLE, CONSTRUCTION, MEDICAL.
- **Waste_Type_Compatibility_Layer**: A documented mapping/matching capability that relates a Collector's existing free-text `waste_types` values to the canonical Waste_Type set, without rewriting existing Collector data.
- **Request_Status**: The lifecycle state of a Collection_Request, one of: PENDING, UNDER_REVIEW, ASSIGNED, ACCEPTED, EN_ROUTE, COMPLETED, CANCELLED, DISPUTED.
- **Allowed_Transition**: A permitted change from one Request_Status to another, as defined in the Request_Status transition table (Requirement 4).
- **Terminal_Status**: A Request_Status from which no further transition is allowed: COMPLETED and CANCELLED. DISPUTED is NOT a Terminal_Status; an Admin can resolve a DISPUTED Collection_Request to CANCELLED or COMPLETED (see Requirement 4).
- **Cancellable_Status**: A Request_Status from which a Collection_Request may be cancelled: PENDING, UNDER_REVIEW, ASSIGNED, and ACCEPTED.
- **Assignable_Status**: A Request_Status in which a Collection_Request may be assigned to a Waste_Manager: PENDING and UNDER_REVIEW.
- **LGA**: A Local Government Area within Ekiti State, Nigeria. There are 16 valid LGAs (EKITI_LGAS).
- **Activity_Log**: The existing `activity_log` table (columns: id, action_type, description, metadata, created_at) whose INSERT is restricted to `service_role` and SELECT to `authenticated`, written via the existing `recordActivity(client, actionType, description, metadata)` helper.
- **Service_Client**: A server-side Supabase client with service-role privileges (`createServiceClient`) used for privileged reads and for Activity_Log inserts.
- **Admin_API**: A server-side endpoint under the protected admin area that returns or mutates Collection_Request data.
- **PaginatedResponse**: The existing admin list response shape `{ data, total, page, pageSize }`.
- **Tracking_Link**: A public URL containing a Tracking_Token that lets a Public_Customer view (and, where allowed, cancel) a Collection_Request.

## Requirements

### Requirement 1: Backward Compatibility and Non-Destructive Change

**User Story:** As a platform operator, I want Phase 3 to be additive and non-destructive, so that existing registration, admin operations, data, and tests continue to work unchanged.

#### Acceptance Criteria

1. THE Platform SHALL retain all existing table names, column names, and code identifiers for the `customers`, `collectors`, `login_attempts`, and `activity_log` tables without renaming or dropping any table, column, or code identifier.
2. WHEN a Phase 3 database change adds a new column to an existing table, THE Platform SHALL define that column as nullable or provide a default value, so that existing rows remain valid.
3. THE Platform SHALL keep the existing Phase 1 registration flows for Customers and Collectors functional after Phase 3 changes are applied.
4. THE Platform SHALL keep the existing Phase 2 admin dashboard, management tables, profiles, lifecycle actions, analytics, exports, and Activity_Log functional after Phase 3 changes are applied.
5. THE Platform SHALL preserve all existing Customer, Collector, `login_attempts`, and `activity_log` records such that their record counts and existing field values are unchanged after Phase 3 database changes are applied.
6. WHEN the Phase 3 database migration is applied more than once, THE Platform SHALL produce the same resulting schema without error, using idempotent statements such as `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, and `CREATE INDEX IF NOT EXISTS`.
7. THE Platform SHALL keep the existing automated test suite passing after Phase 3 changes are applied.
8. THE Platform SHALL reuse the existing Supabase client, `@supabase/ssr` authentication, Zod validation pattern, `recordActivity` Activity_Log helper, `as const` constants pattern with a barrel `index.ts`, shadcn/ui components, and brand styling conventions for Phase 3 features.

### Requirement 2: Collection Request Entity

**User Story:** As a platform operator, I want a dedicated collection request record that captures its own contact and pickup details, so that a request stands alone and drives the operational workflow independently of customer or collector accounts.

#### Acceptance Criteria

1. THE Platform SHALL create a new `collection_requests` table with a primary key `id` of type uuid defaulting to a generated uuid.
2. THE Platform SHALL store on each Collection_Request a unique Request_Number formatted as `CR-YYYYMMDD-XXXX`.
3. THE Platform SHALL store on each Collection_Request a Tracking_Token that is unique and unguessable.
4. THE Platform SHALL capture the following contact fields directly on each Collection_Request: full name (required), phone (required), and email (optional).
5. THE Platform SHALL store on each Collection_Request an optional nullable `customer_id` foreign key referencing the `customers` table, such that a Collection_Request without a linked Customer remains valid.
6. THE Platform SHALL store on each Collection_Request the pickup fields: pickup address (required), LGA (required, one of the 16 EKITI_LGAS), Waste_Type (required, one of the canonical Waste_Type values), estimated quantity as a text description (required), and bin/bag count as an optional nullable integer.
7. THE Platform SHALL store on each Collection_Request the scheduling fields: preferred pickup date (required) and preferred pickup time or time window (required).
8. THE Platform SHALL store on each Collection_Request the optional nullable fields: additional notes, photo URL, willingness to pay (reusing the Phase 2 willingness-to-pay values), and price range (reusing the Phase 2 PRICE_RANGES values).
9. THE Platform SHALL store on each Collection_Request an optional nullable `collector_id` foreign key referencing the `collectors` table, set only when the Collection_Request is assigned to a Waste_Manager.
10. THE Platform SHALL store on each Collection_Request a Request_Status, and SHALL store nullable lifecycle timestamps `created_at`, `updated_at`, `reviewed_at`, `assigned_at`, `accepted_at`, `en_route_at`, `completed_at`, and `cancelled_at`, populating each timestamp only when its corresponding transition occurs, except `created_at` which is set at creation.
11. THE Platform SHALL store on each Collection_Request an optional nullable Admin internal notes field.
12. THE Platform SHALL define every Collection_Request column that is not required as nullable.
13. THE Platform SHALL model the `customer_id` and `collector_id` foreign keys such that neither key permanently couples a Customer to a single Collector, so that one Customer MAY be referenced by many Collection_Requests and one Collector MAY be referenced by many Collection_Requests.

### Requirement 3: Canonical Waste Type and Compatibility Layer

**User Story:** As an Admin, I want requests classified by a canonical waste type while existing provider data stays intact, so that matching is consistent without rewriting historical records.

#### Acceptance Criteria

1. THE Platform SHALL restrict the Collection_Request Waste_Type field to one of: HOUSEHOLD, COMMERCIAL, RECYCLABLE, CONSTRUCTION, or MEDICAL.
2. THE Platform SHALL define the canonical Waste_Type values using the existing `as const` constants pattern with a derived type and barrel export.
3. THE Platform SHALL NOT modify, rewrite, or migrate the existing free-text `waste_types` values stored on Collector records.
4. THE Platform SHALL provide a Waste_Type_Compatibility_Layer that relates a Collector's existing free-text `waste_types` values to the canonical Waste_Type set using a documented mapping strategy, such as case-insensitive comparison, substring matching, or an explicit mapping table.
5. WHEN the Platform evaluates whether a Collector is compatible with a Collection_Request's Waste_Type, THE Platform SHALL apply the Waste_Type_Compatibility_Layer rather than requiring an exact string match against the Collector's free-text values.

### Requirement 4: Request Status Lifecycle and Transition Table

**User Story:** As a platform operator, I want a precisely defined status lifecycle with validated transitions, so that requests move through controlled states and invalid changes are rejected.

#### Acceptance Criteria

1. THE Platform SHALL assign the Request_Status value PENDING to every newly created Collection_Request.
2. THE Platform SHALL restrict the Request_Status field to one of: PENDING, UNDER_REVIEW, ASSIGNED, ACCEPTED, EN_ROUTE, COMPLETED, CANCELLED, or DISPUTED.
3. THE Platform SHALL permit exactly the following Allowed_Transitions and no others:
   - PENDING → UNDER_REVIEW
   - PENDING → CANCELLED
   - PENDING → DISPUTED
   - UNDER_REVIEW → ASSIGNED
   - UNDER_REVIEW → CANCELLED
   - UNDER_REVIEW → DISPUTED
   - ASSIGNED → ACCEPTED
   - ASSIGNED → CANCELLED
   - ASSIGNED → DISPUTED
   - ACCEPTED → EN_ROUTE
   - ACCEPTED → CANCELLED
   - ACCEPTED → DISPUTED
   - EN_ROUTE → COMPLETED
   - EN_ROUTE → DISPUTED
   - DISPUTED → CANCELLED
   - DISPUTED → COMPLETED
4. THE Platform SHALL treat COMPLETED and CANCELLED as Terminal_Status values from which no further transition is allowed, and SHALL treat DISPUTED as a non-terminal status from which an Admin may resolve the Collection_Request to CANCELLED or COMPLETED.
5. THE Platform SHALL reach the ASSIGNED status only through the assignment operation defined in Requirement 10, and SHALL NOT allow a generic status-change operation to set a Collection_Request to ASSIGNED.
6. WHEN a request to change a Collection_Request's Request_Status specifies an Allowed_Transition, THE Platform SHALL validate the transition on the server side before persisting, apply the new Request_Status, and set the corresponding lifecycle timestamp.
7. IF a request to change a Collection_Request's Request_Status specifies a transition that is not an Allowed_Transition, THEN THE Platform SHALL reject the request with a 400 status and SHALL NOT change the stored Request_Status.
8. IF a status-change request specifies a new Request_Status equal to the Collection_Request's current Request_Status, THEN THE Platform SHALL reject the request with a 400 status as a non-permitted transition and SHALL NOT change the stored Request_Status or any lifecycle timestamp.
9. WHEN a Collection_Request's Request_Status changes, THE Platform SHALL record an Activity_Log entry describing the change and including the previous status and the new status.
10. THE Platform SHALL permit a transition to DISPUTED only from a non-Terminal_Status and only when initiated by an authenticated Admin.
11. IF a status-change operation is requested without a valid authenticated Admin session for an Admin-only transition, THEN THE Platform SHALL respond with a 401 Unauthorized status and SHALL NOT change the stored Request_Status.

### Requirement 5: Public Collection Request Submission

**User Story:** As a Public_Customer, I want to submit a waste collection request from a mobile-friendly public form without logging in, so that I can request a pickup and receive a confirmation with a tracking link.

#### Acceptance Criteria

1. THE Platform SHALL provide a public request submission route at `/request-pickup` that requires no authentication.
2. THE Platform SHALL present on the submission form the fields defined in Requirement 2, including the optional willingness-to-pay, price-range, and photo fields.
3. WHEN a Public_Customer submits the form, THE Platform SHALL validate the submission on the server side using a Zod schema, requiring the required fields, a valid Nigerian phone format consistent with existing registration validation, a valid LGA, a valid canonical Waste_Type, a preferred pickup date that is not in the past, and field lengths within reasonable bounds.
4. IF server-side validation of a submission fails, THEN THE Platform SHALL reject the submission with a 400 status, identify the fields that failed validation, and SHALL NOT store any Collection_Request from that submission.
5. WHEN a submission passes validation, THE Platform SHALL store a new Collection_Request, generate a unique Request_Number, generate a Tracking_Token, and set the Request_Status to PENDING.
6. WHEN a Collection_Request is created, THE Platform SHALL record an Activity_Log entry of action type REQUEST_CREATED including the request id and Request_Number.
7. WHEN a Collection_Request is created successfully, THE Platform SHALL display a confirmation page showing the Request_Number, a summary of the submitted request, the current Request_Status, and the Tracking_Link.
8. THE Platform SHALL NOT collect or process any payment during submission, and SHALL communicate that pricing and payment are future capabilities.

### Requirement 6: Public Request Tracking

**User Story:** As a Public_Customer, I want to track my request status through a secure link without an account, so that I can see progress without exposing anyone else's data.

#### Acceptance Criteria

1. THE Platform SHALL provide a public tracking route keyed by Tracking_Token, such as `/request/track/[token]`, that requires no authentication.
2. WHEN a Public_Customer opens a Tracking_Link with a valid Tracking_Token, THE Platform SHALL display the current Request_Status, a status timeline covering Submitted, Under Review, Assigned, Accepted, En Route, and Completed or Cancelled, and a minimal summary of the Collection_Request.
3. THE Platform SHALL perform the tracking lookup on the server side using the Service_Client keyed by the Tracking_Token, and SHALL NOT expose arbitrary Collection_Request rows to anonymous requests.
4. THE Platform SHALL NOT expose on the tracking view any other Public_Customer's data or any Admin internal notes.
5. IF a tracking request supplies a Tracking_Token that does not match any Collection_Request, THEN THE Platform SHALL display a not-found indication and SHALL NOT reveal whether a Request_Number exists.
6. THE Platform SHALL NOT accept a Request_Number alone as sufficient authorization to view tracking details.

### Requirement 7: Public Request Cancellation

**User Story:** As a Public_Customer, I want to cancel my request through my tracking link while it is still cancellable, so that I can withdraw a pickup I no longer need.

#### Acceptance Criteria

1. WHILE a Collection_Request is in a Cancellable_Status, THE Platform SHALL allow the holder of a valid Tracking_Token to cancel that Collection_Request.
2. IF a cancellation is requested for a Collection_Request whose Request_Status is EN_ROUTE, COMPLETED, CANCELLED, or DISPUTED, THEN THE Platform SHALL reject the cancellation with a 400 status and SHALL NOT change the stored Request_Status.
3. WHEN a Public_Customer initiates a cancellation through a Tracking_Link, THE Platform SHALL require a confirmation step before applying the cancellation.
4. WHEN a cancellation is confirmed and permitted, THE Platform SHALL set the Request_Status to CANCELLED, set the `cancelled_at` timestamp, and record an Activity_Log entry of action type REQUEST_CANCELLED including the request id, Request_Number, and previous status.
5. THE Platform SHALL perform cancellation authorization solely by validating the Tracking_Token on the server side, and SHALL NOT rely on the Request_Number or any front-end control for authorization.

### Requirement 8: Admin Collection Requests Management List

**User Story:** As an Admin, I want a Collection Requests management section with search, filters, and pagination, so that I can find and triage incoming requests.

#### Acceptance Criteria

1. THE Platform SHALL provide a new admin Collection Requests section within the existing admin dashboard.
2. WHEN an authenticated Admin views the Collection Requests list, THE Platform SHALL return results using the existing PaginatedResponse shape `{ data, total, page, pageSize }`.
3. THE Platform SHALL provide search on the Collection Requests list by Request_Number, contact full name, and contact phone.
4. THE Platform SHALL provide filters on the Collection Requests list for Request_Status, LGA, Waste_Type, registration date range, and assigned Waste_Manager.
5. WHEN an Admin applies a search query together with one or more filters, THE Platform SHALL return only Collection_Requests satisfying all active conditions combined.
6. IF a request to the Collection Requests list Admin_API lacks a valid Supabase Auth session, THEN THE Platform SHALL respond with a 401 Unauthorized status and return no Collection_Request data.

### Requirement 9: Admin Request Detail Page

**User Story:** As an Admin, I want a full detail view of a single request, so that I can review everything about it and its history in one place.

#### Acceptance Criteria

1. WHEN an authenticated Admin opens a Collection_Request detail page, THE Platform SHALL display the Request_Number, captured contact information, pickup address, LGA, Waste_Type, estimated quantity, bin/bag count, preferred pickup date and time, additional notes, willingness to pay, price range, and current Request_Status.
2. WHEN an authenticated Admin opens a Collection_Request detail page, THE Platform SHALL display the assigned Waste_Manager, or an "Awaiting assignment" indication when no Collector is assigned.
3. WHERE a Collection_Request field value is null, THE Platform SHALL display a not-recorded indicator for that field rather than an error.
4. WHERE a photo URL is present on the Collection_Request, THE Platform SHALL display the associated photo.
5. WHEN an authenticated Admin opens a Collection_Request detail page, THE Platform SHALL display the created and updated timestamps, the status history derived from lifecycle timestamps, and the related Activity_Log history for the Collection_Request.
6. THE Platform SHALL display the Admin internal notes on the Collection_Request detail page.
7. IF an Admin requests a Collection_Request detail page for an identifier that does not exist, THEN THE Platform SHALL display a not-found indication.

### Requirement 10: Admin Assignment to a Waste Manager

**User Story:** As an Admin, I want to assign a request to a suitable waste manager with suggested candidates, so that I control assignment while getting help identifying good matches.

#### Acceptance Criteria

1. WHEN an authenticated Admin opens the assignment control for a Collection_Request, THE Platform SHALL suggest candidate Waste_Managers filtered to those whose Provider_Status is Active, whose `service_areas` include the Collection_Request's LGA, and whose `waste_types` are compatible with the Collection_Request's Waste_Type via the Waste_Type_Compatibility_Layer.
2. WHEN the Platform presents suggested candidate Waste_Managers, THE Platform SHALL return at most 50 candidates and SHALL present an empty candidate list when no Waste_Manager satisfies all filter conditions.
3. THE Platform SHALL allow the Admin to select any Collector for assignment, including a Collector not present in the suggested candidates, so that the Admin makes the final choice.
4. WHERE the Assignable_Status set is defined as the values PENDING and UNDER_REVIEW, THE Platform SHALL permit assignment of a Collection_Request only when its Request_Status is a member of the Assignable_Status set.
5. WHEN an Admin assigns a Collection_Request to a Waste_Manager, THE Platform SHALL perform a single guarded atomic update that sets `collector_id` to the selected Collector, sets Request_Status to ASSIGNED, and sets `assigned_at` to the current timestamp, succeeding only when the stored `collector_id` is null and the stored Request_Status is a member of the Assignable_Status set.
6. WHEN a guarded assignment update succeeds, THE Platform SHALL record an Activity_Log entry of action type REQUEST_ASSIGNED including the request id, Request_Number, and `collector_id`.
7. IF an assignment request targets a Collection_Request whose stored `collector_id` is already non-null or whose Request_Status is not a member of the Assignable_Status set, causing the guarded update to affect zero rows, THEN THE Platform SHALL reject the assignment with a 400 status, SHALL return an error indicating the request is already assigned or not in an assignable state, and SHALL leave the stored `collector_id` and Request_Status unchanged.
8. IF an assignment request targets a Collector whose Provider_Status is not Active or whose Collector record does not exist, THEN THE Platform SHALL reject the assignment with a 400 status, SHALL return an error indicating the selected Collector is invalid, and SHALL leave the stored `collector_id` and Request_Status unchanged.

### Requirement 11: Admin Status Management Through the Lifecycle

**User Story:** As an Admin, I want to drive a request through its lifecycle on the waste manager's behalf, so that the request reflects real-world collection progress even though collectors do not log in.

#### Acceptance Criteria

1. WHEN an authenticated Admin submits a Request_Status change that specifies an Allowed_Transition, THE Platform SHALL apply the transition, set the corresponding lifecycle timestamp, and record an Activity_Log entry for the change.
2. THE Platform SHALL allow an Admin to transition a Collection_Request to UNDER_REVIEW, ACCEPTED, EN_ROUTE, COMPLETED, CANCELLED, and DISPUTED, subject to the Allowed_Transitions in Requirement 4.
2a. WHEN a Collection_Request's Request_Status is DISPUTED, THE Platform SHALL allow an Admin to resolve the Collection_Request by transitioning it to CANCELLED or COMPLETED, consistent with the Allowed_Transitions in Requirement 4.
3. WHEN an Admin transitions a Collection_Request to UNDER_REVIEW, THE Platform SHALL set the `reviewed_at` timestamp and record an Activity_Log entry of action type REQUEST_REVIEWED.
4. WHEN an Admin transitions a Collection_Request to ACCEPTED, THE Platform SHALL set the `accepted_at` timestamp and record an Activity_Log entry of action type REQUEST_ACCEPTED.
5. WHEN an Admin transitions a Collection_Request to EN_ROUTE, THE Platform SHALL set the `en_route_at` timestamp and record an Activity_Log entry of action type REQUEST_EN_ROUTE.
6. WHEN an Admin transitions a Collection_Request to COMPLETED, THE Platform SHALL set the `completed_at` timestamp and record an Activity_Log entry of action type REQUEST_COMPLETED.
7. WHEN an Admin transitions a Collection_Request to DISPUTED, THE Platform SHALL record an Activity_Log entry of action type REQUEST_DISPUTED.
8. THE Platform SHALL perform every Request_Status transition on the collector's behalf without requiring any Collector authentication.

### Requirement 12: Minimum-Viable Admin Notifications

**User Story:** As an Admin, I want clear in-app visibility of new incoming requests, so that I notice pending work without external notification infrastructure.

#### Acceptance Criteria

1. WHEN an authenticated Admin views the admin dashboard, THE Platform SHALL display a count of Collection_Requests whose Request_Status is PENDING.
2. THE Platform SHALL derive the pending-requests visibility from current Collection_Request or Activity_Log data at load time and SHALL NOT display a hardcoded value.
3. THE Platform SHALL provide in-app Admin visibility of recent Collection_Request events derived from the Collection_Requests data or the Activity_Log.
4. THE Platform SHALL NOT add any third-party notification, email, or push infrastructure in Phase 3.

### Requirement 13: Activity Logging for Request Events

**User Story:** As an Admin, I want request lifecycle events recorded in the existing activity log, so that I can audit operational activity.

#### Acceptance Criteria

1. THE Platform SHALL record Activity_Log entries for the following Collection_Request events, using the existing `activity_log` table and the `recordActivity` helper: REQUEST_CREATED, REQUEST_REVIEWED, REQUEST_ASSIGNED, REQUEST_ACCEPTED, REQUEST_STATUS_CHANGED, REQUEST_EN_ROUTE, REQUEST_COMPLETED, REQUEST_CANCELLED, and REQUEST_DISPUTED.
2. THE Platform SHALL include in each request-related Activity_Log entry's metadata the request id, the Request_Number, and, when relevant, the customer reference, the `collector_id`, the previous status, and the new status.
3. THE Platform SHALL write every request-related Activity_Log entry through the Service_Client, consistent with the Activity_Log INSERT policy that permits `service_role` only.
4. IF an Activity_Log write fails, THEN THE Platform SHALL NOT fail the underlying Collection_Request operation, and SHALL surface the primary operation result to the caller.

### Requirement 14: Security and Authorization

**User Story:** As a platform operator, I want Phase 3 endpoints protected and inputs validated, so that request data stays secure and public routes cannot be abused.

#### Acceptance Criteria

1. WHILE an Admin is not authenticated, THE Platform SHALL deny access to all Phase 3 admin Collection_Request pages by extending the existing admin route middleware, and SHALL redirect the request to the admin login page.
2. IF a request to a Phase 3 admin Collection_Request Admin_API lacks a valid Supabase Auth session, THEN THE Platform SHALL respond with a 401 Unauthorized status, SHALL return no Collection_Request data, and SHALL include an error indicating that authentication is required.
3. THE Platform SHALL allow public Collection_Request submission through an anonymous INSERT governed by a row-level security policy on `collection_requests`, consistent with the existing registration insert policy.
4. THE Platform SHALL restrict the `collection_requests` row-level security policy so that anonymous requests MAY insert but SHALL NOT select any rows, and so that authenticated Admin sessions MAY select and update any rows.
5. WHEN an anonymous Collection_Request INSERT is submitted, THE Platform SHALL reject any client-supplied value for the privileged columns `status`, `collector_id`, and `internal_notes`, and SHALL set those columns to their server-controlled default values rather than accepting client input.
6. THE Platform SHALL perform public tracking and public cancellation reads and writes on the server side via the Service_Client keyed by the Tracking_Token, and SHALL NOT expose any `collection_requests` row to anonymous requests except the single row matching the supplied Tracking_Token.
7. WHEN a Tracking_Token is supplied for a public tracking or cancellation operation, THE Platform SHALL compare the supplied token against the stored token using a constant-time comparison, and IF the token does not match exactly THEN THE Platform SHALL return no Collection_Request data and SHALL respond with a not-found result.
8. THE Platform SHALL validate every Phase 3 write payload on the server side using Zod schemas before persisting any data, and IF validation fails THEN THE Platform SHALL respond with a 400 status, SHALL NOT persist data, and SHALL return an error indicating which validation constraint failed.
9. IF a database error occurs during a Phase 3 operation, THEN THE Platform SHALL return a generic error indicating the operation failed and SHALL NOT expose raw database error details, stack traces, or SQL to the caller.
10. THE Platform SHALL NOT rely on any front-end control for authorization of Phase 3 operations.
11. THE Platform SHALL read all secrets and service credentials from environment variables and SHALL NOT embed them in source code.
12. THE Platform SHALL defer submission rate limiting and other anti-abuse throttling for the public Collection_Request submission endpoint to a later phase, and SHALL NOT be required to enforce a per-caller submission limit in Phase 3.

### Requirement 15: Optional Waste Photo Foundation

**User Story:** As a platform operator, I want the request model ready to hold a photo, so that photo capture can be added later without a schema change.

#### Acceptance Criteria

1. THE Platform SHALL include a nullable `photo_url` column on the `collection_requests` table so that a photo reference CAN be stored later.
2. WHERE a photo URL is absent on a Collection_Request, THE Platform SHALL treat the Collection_Request as valid and complete.
3. THE Platform MAY defer the actual photo upload implementation to a later phase, because no Supabase Storage bucket is currently configured, and SHALL treat implementing upload as optional for Phase 3.
4. THE Platform SHALL NOT add any AI-based waste detection or image analysis in Phase 3.

### Requirement 16: Design System and Responsiveness

**User Story:** As a Public_Customer and Admin, I want the Phase 3 interfaces to match the brand and work on mobile, so that the request flow is consistent and usable on any device.

#### Acceptance Criteria

1. THE Platform SHALL style Phase 3 interfaces using the existing brand palette: primary green #2E8B57, secondary green #228B22, orange #FF6B35, dark gray #343A40, light gray #F8F9FA, white #FFFFFF, and red #DC3545, with the Inter font family.
2. THE Platform SHALL reuse existing shadcn/ui components, API patterns, the Supabase client, authentication, and styling conventions for Phase 3 features.
3. THE Platform SHALL render the public request submission form using a mobile-first responsive layout that is usable without horizontal scrolling at viewport widths from 320px upward.

### Requirement 17: Future-Phase Compatibility

**User Story:** As a platform operator, I want the Phase 3 data model and code to avoid blocking future phases, so that customer auth, collector auth, automated matching, payments, and real-time tracking can be added without destructive redesigns.

#### Acceptance Criteria

1. THE Platform SHALL model the `customer_id` and `collector_id` foreign keys on `collection_requests` as nullable, so that future Customer authentication and Collector authentication can attach identities without restructuring existing columns.
2. THE Platform SHALL express the Customer-to-Collector relationship exclusively through Collection_Requests, and SHALL NOT introduce a data model constraint that permanently associates a Customer with exactly one Collector.
3. THE Platform SHALL store explicit Request_Status and explicit lifecycle timestamps on each Collection_Request, so that future automated matching, notifications, payments, and real-time tracking can extend the workflow without altering existing status semantics.
4. THE Platform SHALL model the Activity_Log event types for Phase 3 as plain text action types within the existing generic Activity_Log structure, so that future event types can be recorded without a schema change.
5. THE Platform SHALL retain "Waste Manager" as a display-only term for the `collectors` entity, consistent with Phase 2, and SHALL NOT rename the `collectors` table or its columns.

### Requirement 18: Deferred and Out-of-Scope Capabilities

**User Story:** As a platform operator, I want out-of-scope capabilities explicitly deferred, so that Phase 3 stays bounded to the admin-mediated operational loop.

#### Acceptance Criteria

1. THE Platform SHALL NOT implement full Customer authentication or a logged-in customer dashboard in Phase 3, and SHALL treat those as deferred to a later phase.
2. THE Platform SHALL NOT implement full Collector authentication or a Collector dashboard in Phase 3, and SHALL treat those as deferred to a later phase.
3. THE Platform SHALL NOT implement Collector-initiated accept or decline through a Collector login in Phase 3, and SHALL treat assignment and status progression as Admin-controlled.
4. THE Platform SHALL NOT implement online payments, subscriptions, real-time GPS tracking, complex or automated provider matching, a mobile application, microservices, or AI capabilities in Phase 3, and SHALL treat those as deferred to later phases.
