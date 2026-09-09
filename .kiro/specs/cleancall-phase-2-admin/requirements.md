# Requirements Document

## Introduction

CleanCall Phase 2 — Platform Database & Admin Operations Dashboard extends the existing, live CleanCall Phase 1 application. Phase 1 already provides public customer and waste-collector registration, admin authentication with rate limiting and lockout, a protected admin area, a dashboard with statistics, management tables with search/filter/pagination, and filtered CSV export. Phase 2 does NOT rebuild any of these.

Phase 2 adds market-validation data capture to the existing registration forms, expands the admin dashboard into an operations console (richer overview stats, simple charts, detail profile pages, lead and verification lifecycles, location views, activity logging, and extended exports), and introduces "Waste Manager" as a display-only term for the existing `collectors` entity.

The overriding principle of Phase 2 is backward compatibility: the existing Phase 1 registration flows MUST keep working, the existing registration data (approximately 99 records) MUST be preserved, all new database columns MUST be nullable with sensible defaults, and Phase 2 MUST reuse existing components, API patterns, the Supabase client, authentication, and styling.

The captured price ranges are market-research questions used to validate willingness to pay. They are NOT validated or advertised prices.

## Glossary

- **Platform**: The CleanCall web application built with Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui, and Supabase (PostgreSQL) using `@supabase/ssr`.
- **Phase_1**: The existing, live CleanCall application whose registration flows, admin authentication, dashboard, management tables, and CSV export already exist and MUST remain functional.
- **Customer**: A household, business, school, religious organization, or other entity registering interest in waste collection, stored in the existing `customers` table.
- **Collector**: The existing database entity and code identifier for a waste service provider, stored in the `collectors` table. The table name, code identifiers, and column names remain unchanged in Phase 2.
- **Waste_Manager**: The display-only term shown in the admin user interface for a Collector. Waste_Manager and Collector refer to the same underlying `collectors` records; no table rename or table-structure data migration occurs.
- **Admin**: An authenticated administrator who uses the admin operations dashboard. Authenticated via the existing Supabase Auth flow.
- **LGA**: A Local Government Area within Ekiti State, Nigeria. There are 16 valid LGAs.
- **Customer_Status**: The lead lifecycle state of a Customer, one of: New, Contacted, Interested, Converted, Inactive.
- **Provider_Status**: The verification/provider lifecycle state of a Waste_Manager, one of: Pending, Contacted, Verified, Active, Inactive, Suspended, Rejected.
- **Registration_Form**: A public web form that collects structured data from Customers or Collectors. Phase 2 extends the existing forms with new optional fields.
- **Dashboard**: The authenticated admin operations interface, expanded in Phase 2.
- **Customer_Profile**: A detail page displaying all recorded information for a single Customer.
- **Waste_Manager_Profile**: A detail page displaying all recorded information for a single Collector, using Waste_Manager display terminology.
- **Activity_Log**: A simple record of notable admin actions (not an enterprise audit trail).
- **CSV_Export**: A downloadable comma-separated-values file containing registration data, extended in Phase 2 to include new fields.
- **Admin_API**: A server-side endpoint under the protected admin area that returns or mutates registration data.
- **Total_Users**: The count of registered platform participants, defined as the total Customer count plus the total Waste_Manager count (count(customers) + count(collectors)). Total_Users excludes administrator and authentication accounts.

## Requirements

### Requirement 1: Backward Compatibility of Existing Registration and Data

**User Story:** As a platform operator, I want the existing Phase 1 registration flows and data to remain fully functional after Phase 2 changes, so that no live functionality breaks and no existing records are lost.

#### Acceptance Criteria

1. THE Platform SHALL retain the existing `collectors` table name, code identifiers, and column names without renaming any table, column, or code identifier.
2. WHEN a Phase 2 database change adds a new column to the `customers` table or the `collectors` table, THE Platform SHALL define that column as nullable.
3. WHEN a Phase 2 database change adds a new status column, THE Platform SHALL assign a default value of New for the Customer_Status column and Pending for the Provider_Status column.
4. WHILE existing Phase 1 registration records contain null values in Phase 2 columns, THE Platform SHALL display and process those records without error.
5. WHEN a Customer or Collector submits the existing Phase 1 required fields without supplying any Phase 2 field, THE Platform SHALL accept and store the submission.
6. THE Platform SHALL preserve all existing Customer and Collector records such that the record count and existing field values are unchanged after Phase 2 database changes are applied.

### Requirement 2: Customer Registration Market-Research Fields

**User Story:** As a Customer, I want to answer optional market-research questions during registration, so that CleanCall can validate demand and willingness to pay.

#### Acceptance Criteria

1. THE Platform SHALL extend the Customer Registration_Form with the following optional fields: willingness to pay, preferred price range, whether the Customer has existing collection, and satisfaction with existing collection.
2. THE Platform SHALL restrict the willingness to pay field to one of: Yes, Maybe - Depends on price, or No.
3. THE Platform SHALL restrict the preferred price range field to one of: Below ₦2,000, ₦2,000–₦5,000, ₦5,000–₦10,000, Above ₦10,000, or Not sure.
4. THE Platform SHALL restrict the has-existing-collection field to one of: Yes, No, Sometimes, or I manage it myself.
5. THE Platform SHALL restrict the satisfaction-with-existing field to one of: Yes, No, or Somewhat.
6. WHERE the has-existing-collection field is set to Yes, THE Platform SHALL enable the satisfaction-with-existing field for input.
7. WHERE the has-existing-collection field is set to a value other than Yes, THE Platform SHALL store the satisfaction-with-existing field as null.
8. WHEN a Customer submits the Registration_Form without selecting any market-research field, THE Platform SHALL store null for each unselected market-research field and complete the registration successfully.
9. THE Platform SHALL present the preferred price range field to the Customer as a market-research question and SHALL NOT present the price ranges as advertised or guaranteed service prices.

### Requirement 3: Customer Lead Status Lifecycle

**User Story:** As an Admin, I want each Customer to carry a lead status, so that I can track the customer through the sales pipeline.

#### Acceptance Criteria

1. THE Platform SHALL assign the Customer_Status value New to every newly registered Customer.
2. THE Platform SHALL restrict the Customer_Status field to one of: New, Contacted, Interested, Converted, or Inactive.
3. WHEN an authenticated Admin submits a request to change a Customer's Customer_Status to a value within the allowed set, THE Platform SHALL update the Customer_Status and persist the change.
4. IF a request attempts to set the Customer_Status to a value outside the allowed set, THEN THE Platform SHALL reject the request with a 400 status and SHALL NOT change the stored Customer_Status.
5. WHEN a Customer's Customer_Status changes, THE Platform SHALL record an Activity_Log entry describing the customer status change.

### Requirement 4: Waste Manager Registration and Verification Fields

**User Story:** As a Collector, I want to indicate whether I want more customers during registration, and as an Admin I want each Waste_Manager to carry a verification status, so that CleanCall can validate supply and manage provider onboarding.

#### Acceptance Criteria

1. THE Platform SHALL extend the Collector Registration_Form with an optional wants-more-customers field.
2. THE Platform SHALL restrict the wants-more-customers field to one of: Yes, Maybe, or No.
3. THE Platform SHALL assign the Provider_Status value Pending to every newly registered Collector.
4. THE Platform SHALL restrict the Provider_Status field to one of: Pending, Contacted, Verified, Active, Inactive, Suspended, or Rejected.
5. WHEN a Collector submits the Registration_Form without selecting the wants-more-customers field, THE Platform SHALL store null for the wants-more-customers field and complete the registration successfully.

### Requirement 5: Waste Manager Verification Status Lifecycle

**User Story:** As an Admin, I want to change a Waste_Manager's verification status through defined actions, so that I can onboard, approve, suspend, or reject providers.

#### Acceptance Criteria

1. WHEN an authenticated Admin submits a request to change a Waste_Manager's Provider_Status to a value within the allowed set, THE Platform SHALL update the Provider_Status and persist the change.
2. IF a request attempts to set the Provider_Status to a value outside the allowed set, THEN THE Platform SHALL reject the request with a 400 status and SHALL NOT change the stored Provider_Status.
3. WHEN an Admin approves a Waste_Manager, THE Platform SHALL set the Provider_Status to Active and record an Activity_Log entry describing the provider approval.
4. WHEN an Admin suspends a Waste_Manager, THE Platform SHALL set the Provider_Status to Suspended and record an Activity_Log entry describing the provider suspension.
5. WHEN an Admin marks a Waste_Manager as verified, THE Platform SHALL set the Provider_Status to Verified.
6. WHEN an Admin records contact with a Waste_Manager, THE Platform SHALL set the Provider_Status to Contacted.

### Requirement 6: Admin Dashboard Overview Statistics

**User Story:** As an Admin, I want an expanded overview with dynamic statistics, so that I can assess platform demand and supply at a glance.

#### Acceptance Criteria

1. WHEN an authenticated Admin navigates to the Dashboard, THE Platform SHALL compute and display each of the following counts from current database data: total users, total Customers, total Waste_Managers, active providers, pending providers, new registrations in the current week, Customers interested in paid services, Customers with existing collection, and Customers without existing collection.
2. THE Platform SHALL compute total users as the sum of the total Customer count and the total Waste_Manager count, and SHALL NOT include administrator or authentication accounts in that total.
3. THE Platform SHALL derive every Dashboard overview statistic from database queries at page load and SHALL NOT display hardcoded statistic values.
4. THE Platform SHALL count active providers as Waste_Managers whose Provider_Status is Active and pending providers as Waste_Managers whose Provider_Status is Pending.
5. THE Platform SHALL count Customers interested in paid services as Customers whose willingness to pay is Yes or Maybe - Depends on price.
6. THE Platform SHALL count Customers with existing collection as Customers whose has-existing-collection value is Yes or Sometimes, and Customers without existing collection as Customers whose has-existing-collection value is No or I manage it myself.
7. WHEN a statistic has no matching records, THE Platform SHALL display a count of zero for that statistic.

### Requirement 7: Admin Dashboard Charts

**User Story:** As an Admin, I want simple charts summarizing registrations, so that I can visualize trends and distributions.

#### Acceptance Criteria

1. WHEN an authenticated Admin views the Dashboard, THE Platform SHALL display a registrations-over-time chart derived from Customer and Collector created_at values.
2. WHEN an authenticated Admin views the Dashboard, THE Platform SHALL display a chart comparing the total count of Customers to the total count of Waste_Managers.
3. WHEN an authenticated Admin views the Dashboard, THE Platform SHALL display a chart of Customer counts grouped by LGA.
4. WHEN an authenticated Admin views the Dashboard, THE Platform SHALL display a chart of Waste_Manager counts grouped by service area LGA.
5. WHEN an authenticated Admin views the Dashboard, THE Platform SHALL display a chart of Customer counts grouped by willingness to pay.
6. WHEN an authenticated Admin views the Dashboard, THE Platform SHALL display a chart of Customer counts grouped by has-existing-collection value.
7. THE Platform SHALL derive every chart from database queries at load time and SHALL NOT render charts from hardcoded values.

### Requirement 8: Customer Management Table Extensions

**User Story:** As an Admin, I want the customer management table to show and filter on the new fields, so that I can segment customers by market interest and status.

#### Acceptance Criteria

1. THE Platform SHALL extend the existing Customer management table with columns for willingness to pay, has-existing-collection, and Customer_Status.
2. THE Platform SHALL provide filters on the Customer management view for willingness to pay, has-existing-collection, Customer_Status, and registration date.
3. THE Platform SHALL retain the existing Customer management search, sort, and pagination behavior after the Phase 2 column and filter additions.
4. WHEN an Admin applies a registration-date filter, THE Platform SHALL display only Customers whose created_at falls within the selected date range.
5. WHEN an Admin applies a Phase 2 filter to a Customer whose corresponding field value is null, THE Platform SHALL exclude that Customer from results only when the filter specifies a non-null value.
6. WHEN an Admin applies a search query together with one or more filters, THE Platform SHALL display only Customers satisfying all active conditions combined.

### Requirement 9: Customer Profile Detail Page

**User Story:** As an Admin, I want to view a single customer's full profile, so that I can review all information about that customer in one place.

#### Acceptance Criteria

1. WHEN an authenticated Admin opens a Customer_Profile, THE Platform SHALL display the Customer's personal information, location, waste information, current collection arrangement, market interest, and Customer_Status in distinct sections.
2. WHERE a Customer field value is null, THE Platform SHALL display a not-recorded indicator for that field rather than an error.
3. THE Platform SHALL provide a control on the Customer_Profile to change the Customer_Status.
4. IF an Admin requests a Customer_Profile for an identifier that does not exist, THEN THE Platform SHALL display a not-found indication.

### Requirement 10: Waste Manager Management Table Extensions

**User Story:** As an Admin, I want the waste manager management table to show verification status and lifecycle actions, so that I can manage providers.

#### Acceptance Criteria

1. THE Platform SHALL extend the existing Collector management table, using Waste_Manager display terminology, with columns for Provider_Status and wants-more-customers.
2. THE Platform SHALL provide filters on the Waste_Manager management view for Provider_Status and wants-more-customers.
3. THE Platform SHALL provide per-record actions on the Waste_Manager management view to view, verify, approve, suspend, and record contact for a Waste_Manager.
4. THE Platform SHALL retain the existing Collector management search, sort, and pagination behavior after the Phase 2 column, filter, and action additions.
5. WHEN an Admin invokes a lifecycle action from the management view, THE Platform SHALL apply the corresponding Provider_Status change defined in Requirement 5.

### Requirement 11: Waste Manager Profile Detail Page

**User Story:** As an Admin, I want to view a single waste manager's full profile, so that I can review business, service, status, and marketplace information in one place.

#### Acceptance Criteria

1. WHEN an authenticated Admin opens a Waste_Manager_Profile, THE Platform SHALL display the provider's business information, service information, business status, and marketplace information in distinct sections, using Waste_Manager display terminology.
2. WHERE a Collector field value is null, THE Platform SHALL display a not-recorded indicator for that field rather than an error.
3. THE Platform SHALL provide controls on the Waste_Manager_Profile to change the Provider_Status via the lifecycle actions defined in Requirement 5.
4. IF an Admin requests a Waste_Manager_Profile for an identifier that does not exist, THEN THE Platform SHALL display a not-found indication.

### Requirement 12: Location and LGA Management View

**User Story:** As an Admin, I want a location view summarizing demand and supply by LGA, so that I can assess coverage across Ekiti State without complex maps.

#### Acceptance Criteria

1. WHEN an authenticated Admin navigates to the location management view, THE Platform SHALL display Customer counts grouped by LGA for all 16 LGAs, including LGAs with a count of zero.
2. WHEN an authenticated Admin navigates to the location management view, THE Platform SHALL display Waste_Manager counts grouped by service area LGA for all 16 LGAs, including LGAs with a count of zero.
3. THE Platform SHALL display service coverage per LGA as the count of Waste_Managers whose service areas include that LGA.
4. THE Platform SHALL present the location management view using tables or simple charts and SHALL NOT require an interactive geographic map.

### Requirement 13: Data Export Extensions

**User Story:** As an Admin, I want CSV exports to include the new Phase 2 fields and respect current filters, so that I can analyze the enriched data externally.

#### Acceptance Criteria

1. WHEN an Admin triggers a Customer CSV_Export, THE Platform SHALL include the Phase 2 Customer fields willingness to pay, preferred price range, has-existing-collection, satisfaction-with-existing, and Customer_Status in addition to the existing Phase 1 Customer columns.
2. WHEN an Admin triggers a Waste_Manager CSV_Export, THE Platform SHALL include the Phase 2 fields wants-more-customers and Provider_Status in addition to the existing Phase 1 Collector columns.
3. WHEN an Admin triggers a CSV_Export while filters are active, THE Platform SHALL include only records matching the active filters.
4. WHERE a Phase 2 field value is null for an exported record, THE Platform SHALL output an empty value for that field in the CSV_Export.
5. WHEN an Admin triggers a CSV_Export, THE Platform SHALL record an Activity_Log entry describing the data export.

### Requirement 14: Activity Log

**User Story:** As an Admin, I want a simple record of notable admin actions, so that I can review recent operational activity.

#### Acceptance Criteria

1. WHEN an Admin logs in successfully, THE Platform SHALL record an Activity_Log entry describing the admin login.
2. WHEN a provider approval, provider suspension, customer status change, or data export occurs, THE Platform SHALL record an Activity_Log entry describing that action.
3. THE Platform SHALL record for each Activity_Log entry the action type and a timestamp.
4. WHEN an authenticated Admin views the Activity_Log, THE Platform SHALL display entries ordered by timestamp descending.

### Requirement 15: Admin Navigation Structure

**User Story:** As an Admin, I want a clear navigation structure, so that I can reach each area of the operations dashboard.

#### Acceptance Criteria

1. THE Platform SHALL present admin navigation with the top-level areas: Dashboard, Customers, Waste Managers, Locations, Analytics, Exports, and Settings.
2. THE Platform SHALL provide Customers navigation sub-views: All, Interested in Service, Existing Collection, and No Collection.
3. THE Platform SHALL provide Waste Managers navigation sub-views: All Providers, Pending Verification, Active, and Suspended.
4. WHEN an Admin selects the Customers "Interested in Service" sub-view, THE Platform SHALL display only Customers whose willingness to pay is Yes or Maybe - Depends on price.
5. WHEN an Admin selects a Waste Managers status sub-view, THE Platform SHALL display only Waste_Managers whose Provider_Status matches the selected sub-view.

### Requirement 16: Security and Authorization

**User Story:** As a platform operator, I want all Phase 2 admin routes and APIs protected and inputs validated, so that user data stays secure.

#### Acceptance Criteria

1. WHILE an Admin is not authenticated, THE Platform SHALL deny access to all Phase 2 admin pages by extending the existing admin route middleware.
2. IF a request to a Phase 2 Admin_API lacks a valid Supabase Auth session, THEN THE Platform SHALL respond with a 401 Unauthorized status and return no registration data.
3. THE Platform SHALL validate all Phase 2 request payloads on the server side using Zod schemas before persisting any data.
4. IF server-side validation of a Phase 2 request fails, THEN THE Platform SHALL respond with a 400 status, identify the fields that failed validation, and SHALL NOT persist any data from that request.
5. THE Platform SHALL restrict Phase 2 Customer and Waste_Manager detail data to authenticated Admin endpoints and SHALL NOT expose that data through public endpoints.
6. THE Platform SHALL read all secrets and service credentials from environment variables and SHALL NOT embed them in source code.
7. THE Platform SHALL rely on Supabase Auth for password handling and SHALL NOT store passwords in plaintext.

### Requirement 17: Design System and Responsiveness

**User Story:** As an Admin, I want the Phase 2 interface to match the existing brand and work across devices, so that the experience is consistent and usable.

#### Acceptance Criteria

1. THE Platform SHALL style Phase 2 interfaces using the existing brand palette: primary green #2E8B57, secondary green #228B22, orange #FF6B35, dark gray #343A40, light gray #F8F9FA, white #FFFFFF, and red #DC3545, with the Inter font family.
2. THE Platform SHALL reuse existing shadcn/ui components, API patterns, the Supabase client, authentication, and styling conventions for Phase 2 features.
3. THE Platform SHALL render Phase 2 admin pages using a responsive layout that displays without horizontal scrolling at viewport widths for desktop, tablet, and mobile from 320px to 1920px.

### Requirement 18: Deferred Enhancements

**User Story:** As a platform operator, I want out-of-scope capabilities explicitly deferred, so that Phase 2 stays focused on database and admin operations.

#### Acceptance Criteria

1. THE Platform SHALL NOT include full marketplace or matching functionality, payment processing or card storage, live GPS tracking, AI waste detection, microservices, or interactive geographic maps in Phase 2.
2. THE Platform SHALL NOT add latitude/longitude capture or estimated waste volume fields to the Registration_Form in Phase 2, and SHALL treat those fields as deferred future enhancements.

### Requirement 19: Future Extensibility of Data Model and Architecture

**User Story:** As a platform operator, I want the Phase 2 data model and code architecture to remain extensible, so that future phases can add service requests, provider matching, scheduling, payments, monitoring, complaints, and authority-level analytics without destructive database redesigns.

#### Acceptance Criteria

1. THE Platform SHALL add an updated_at timestamp column to the `customers` table and the `collectors` table, in addition to the existing created_at column, defaulting to the record creation time.
2. WHEN a Customer record or a Collector record is modified, THE Platform SHALL set that record's updated_at column to the modification time.
3. THE Platform SHALL model the Activity_Log with a generic action-type structure such that new event types can be recorded without schema changes to the Activity_Log table.
4. THE Platform SHALL model Customer and Collector as distinct entities and SHALL NOT introduce a data model constraint that permanently associates a Customer with exactly one Collector, so that future many-to-many provider matching remains possible.
5. THE Platform SHALL keep Customer and Collector as distinct extensible entities such that future related tables for service requests, schedules, payments, and complaints can reference them via foreign keys without restructuring existing columns.
6. THE Platform SHALL NOT implement service requests, provider matching, collection scheduling, payments, service monitoring, complaints, reporting, or authority-level analytics in Phase 2, and SHALL treat those capabilities as deferred to future phases.
