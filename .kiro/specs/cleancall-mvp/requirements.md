# Requirements Document

## Introduction

CleanCall MVP is a waste management onboarding and registration platform for Ekiti State, Nigeria. The purpose of this MVP is to build a database of demand (households and businesses needing waste collection) and supply (waste management companies and collectors providing services). The platform validates market demand and supply before developing the full CleanCall marketplace. It does NOT provide waste pickup services.

## Glossary

- **Platform**: The CleanCall MVP web application built with Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Supabase PostgreSQL, and deployed on Vercel.
- **Customer**: A household, landlord, estate, shop, business, school, or religious organization registering interest in waste collection services.
- **Collector**: A private waste operator, waste management company, or environmental contractor registering as a service provider.
- **Admin**: An authenticated administrator who manages registrations via the admin dashboard.
- **LGA**: Local Government Area within Ekiti State, Nigeria.
- **Registration_Form**: A web form that collects structured data from Customers or Collectors.
- **Dashboard**: The admin interface displaying registration statistics and management tools.
- **CSV_Export**: A downloadable file in comma-separated values format containing registration data.
- **Landing_Page**: The public-facing homepage with information about CleanCall and calls-to-action for registration.

## Requirements

### Requirement 1: Public Landing Page Display

**User Story:** As a visitor, I want to see a clear landing page explaining CleanCall, so that I understand the service and can navigate to registration.

#### Acceptance Criteria

1. THE Platform SHALL display a Landing_Page containing, in top-to-bottom order: a hero section, an about section, a reasons-to-join section, a customer registration call-to-action, a collector registration call-to-action, a contact information section displaying at minimum a phone number and email address, and a footer.
2. WHEN a visitor clicks the customer registration call-to-action, THE Platform SHALL navigate the visitor to the Customer Registration_Form page within 2 seconds.
3. WHEN a visitor clicks the collector registration call-to-action, THE Platform SHALL navigate the visitor to the Collector Registration_Form page within 2 seconds.
4. THE Platform SHALL render the Landing_Page using a mobile-first responsive layout that displays all sections without horizontal scrolling at any viewport width from 320px to 1920px.
5. THE Platform SHALL render all Landing_Page text content at a minimum contrast ratio of 4.5:1 against its background and at a minimum font size of 16px for body text.

### Requirement 2: Customer Registration

**User Story:** As a Customer, I want to register my interest in waste collection services, so that my details are captured for future service delivery.

#### Acceptance Criteria

1. THE Platform SHALL display a Customer Registration_Form collecting: full name (maximum 100 characters), phone number, email address (optional), address (maximum 255 characters), LGA, user category, current waste disposal method, and waste collection frequency needed.
2. WHEN a Customer submits a valid Registration_Form, THE Platform SHALL store the registration data in the customers database table with an auto-generated id and created_at timestamp.
3. WHEN a Customer submits a valid Registration_Form, THE Platform SHALL display a success confirmation page.
4. WHEN a Customer submits a Registration_Form with missing required fields, THE Platform SHALL display inline validation errors identifying each invalid field without clearing the already-filled fields.
5. WHEN a Customer submits a Registration_Form with a phone number that does not match a valid Nigerian phone number format (11 digits starting with 0, or 13 digits starting with +234), THE Platform SHALL display a validation error for the phone number field.
6. THE Platform SHALL restrict the user category field to one of: Household, Business, School, Religious Organization, or Other.
7. THE Platform SHALL restrict the LGA field to the 16 valid Local Government Areas within Ekiti State.
8. THE Platform SHALL restrict the current waste disposal method field to one of: Burning, Burying, Roadside Dumping, Private Collector, Government Collector, or Other.
9. THE Platform SHALL restrict the waste collection frequency needed field to one of: Daily, Twice a Week, Weekly, Bi-Weekly, or Monthly.
10. IF a Customer submits a Registration_Form with a phone number that already exists in the customers database table, THEN THE Platform SHALL display a validation error indicating the phone number is already registered.

### Requirement 3: Collector Registration

**User Story:** As a Collector, I want to register as a waste collection service provider, so that my business details are captured for future marketplace participation.

#### Acceptance Criteria

1. THE Platform SHALL display a Collector Registration_Form collecting the following required fields: business name (max 150 characters), contact person name (max 100 characters), phone number, email address, business address (max 300 characters), service areas (multiple LGAs), waste types handled, number of staff, number of vehicles, and years of operation; and the following optional field: CAC registration number (max 20 characters).
2. WHEN a Collector submits a valid Registration_Form, THE Platform SHALL store the registration data in the collectors database table with an auto-generated id and created_at timestamp.
3. WHEN a Collector submits a valid Registration_Form, THE Platform SHALL display a success confirmation page.
4. WHEN a Collector submits a Registration_Form with any required field left empty, THE Platform SHALL display inline validation errors identifying each empty required field.
5. WHEN a Collector submits a Registration_Form with a phone number that does not match a valid Nigerian phone number format (11 digits starting with 0, or 13 digits starting with +234), THE Platform SHALL display a validation error for the phone number field.
6. WHEN a Collector submits a Registration_Form with an email address that does not conform to a valid email format, THE Platform SHALL display a validation error for the email field.
7. THE Platform SHALL allow selection of at least 1 and up to 16 LGAs from the Ekiti State LGA list for the service areas field.
8. WHEN a Collector provides a staff count or vehicle count that is not a positive integer or exceeds 10,000, or a years of operation value that is not an integer between 0 and 100, THE Platform SHALL display a validation error for the respective field.

### Requirement 4: Admin Authentication

**User Story:** As an Admin, I want to log in securely, so that only authorized users can access registration data.

#### Acceptance Criteria

1. THE Platform SHALL provide a login page for Admin users requiring an email field (maximum 254 characters, validated for standard email format) and a password field (minimum 8 characters, maximum 128 characters).
2. WHEN an Admin submits valid credentials, THE Platform SHALL authenticate the Admin using Supabase Auth and redirect to the Dashboard within 5 seconds.
3. IF an Admin submits invalid credentials, THEN THE Platform SHALL display a generic authentication error message without revealing whether the email or password was incorrect.
4. WHILE an Admin is not authenticated, THE Platform SHALL deny access to all Dashboard pages and redirect to the login page.
5. WHEN an Admin clicks a logout action, THE Platform SHALL terminate the session and redirect to the login page.
6. IF an Admin submits the login form with an empty email field or an empty password field, THEN THE Platform SHALL display a validation error indicating the missing field and SHALL NOT submit the request to the authentication service.
7. IF the authentication service is unavailable when an Admin submits credentials, THEN THE Platform SHALL display an error message indicating the service is temporarily unavailable and SHALL preserve the entered email address in the form.
8. IF an Admin fails authentication 5 consecutive times for the same email address, THEN THE Platform SHALL temporarily lock login attempts for that email for 15 minutes and display a message indicating the account is temporarily locked.

### Requirement 5: Admin Dashboard Statistics

**User Story:** As an Admin, I want to see dashboard statistics, so that I can understand the current state of registrations at a glance.

#### Acceptance Criteria

1. WHEN an authenticated Admin navigates to the Dashboard, THE Platform SHALL display the total number of registered Customers.
2. WHEN an authenticated Admin navigates to the Dashboard, THE Platform SHALL display the total number of registered Collectors.
3. WHEN an authenticated Admin navigates to the Dashboard, THE Platform SHALL display the 10 most recent registrations from both Customers and Collectors, showing for each entry the registrant's name, role (Customer or Collector), LGA, and registration date.
4. WHEN an authenticated Admin navigates to the Dashboard, THE Platform SHALL display a breakdown of registrations grouped by LGA, showing the registration count for each of the 16 LGAs including those with zero registrations.
5. WHEN an authenticated Admin navigates to the Dashboard, THE Platform SHALL display statistics reflecting all registrations stored at the time of page load.
6. IF there are no registrations in the system, THEN THE Platform SHALL display zero for all counts and an empty state indication in the recent registrations list.

### Requirement 6: Admin Registration Management

**User Story:** As an Admin, I want to view, search, and filter registrations, so that I can find and review specific registration records.

#### Acceptance Criteria

1. THE Platform SHALL display Customer registrations in a paginated table showing columns: full_name, phone, email, address, lga, category, disposal_method, collection_frequency, and created_at, sorted by created_at descending by default.
2. THE Platform SHALL display Collector registrations in a paginated table showing columns: business_name, contact_person, phone, email, cac_number, business_address, service_areas, waste_types, staff_count, vehicle_count, years_in_operation, and created_at, sorted by created_at descending by default.
3. WHEN an Admin enters a search query of at least 2 characters, THE Platform SHALL filter displayed registrations to show only records containing the query as a case-insensitive partial match against name, phone, email, or address fields.
4. WHEN an Admin selects an LGA filter, THE Platform SHALL display only registrations associated with the selected LGA.
5. WHEN an Admin selects a category filter on the Customers view, THE Platform SHALL display only Customers matching the selected category.
6. THE Platform SHALL display registration tables with a default page size of 20 rows, providing controls to navigate to the next page, previous page, first page, and last page, and displaying the total number of records.
7. IF no registrations match the active search query or filters, THEN THE Platform SHALL display an empty state message indicating that no matching records were found.
8. WHEN an Admin applies both a search query and one or more filters simultaneously, THE Platform SHALL display only registrations satisfying all active conditions combined.

### Requirement 7: Admin CSV Export

**User Story:** As an Admin, I want to export registrations to CSV, so that I can analyze data externally and share reports with stakeholders.

#### Acceptance Criteria

1. WHEN an Admin triggers a CSV export on the Customers view, THE Platform SHALL generate and download a CSV_Export file containing all Customer registration records matching the current filters, with columns in this order: id, full_name, phone, email, address, lga, category, disposal_method, collection_frequency, created_at.
2. WHEN an Admin triggers a CSV export on the Collectors view, THE Platform SHALL generate and download a CSV_Export file containing all Collector registration records matching the current filters, with columns in this order: id, business_name, contact_person, phone, email, cac_number, business_address, service_areas, waste_types, staff_count, vehicle_count, years_in_operation, created_at.
3. THE Platform SHALL include a header row as the first row of the CSV_Export file, using comma as the field delimiter, and enclosing field values that contain commas, double quotes, or newlines in double quotes.
4. THE Platform SHALL encode the CSV_Export file in UTF-8 format and name the file using the pattern `{view}_export_{YYYY-MM-DD}.csv` where {view} is "customers" or "collectors" and {YYYY-MM-DD} is the current date.
5. IF the current filters match zero records, THEN THE Platform SHALL generate and download a CSV_Export file containing only the header row.
6. IF the CSV export generation fails or does not complete within 30 seconds, THEN THE Platform SHALL display an error message indicating that the export failed and allow the Admin to retry.
7. THE Platform SHALL generate the CSV_Export file for up to 10,000 records within 30 seconds.

### Requirement 8: Data Security and API Protection

**User Story:** As a platform operator, I want registration data stored securely and API endpoints protected, so that user data is safe from unauthorized access.

#### Acceptance Criteria

1. THE Platform SHALL store all registration data in Supabase PostgreSQL with row-level security enabled.
2. IF a request to a Dashboard API endpoint lacks a valid Supabase Auth session token, THEN THE Platform SHALL respond with a 401 Unauthorized status and return no registration data.
3. THE Platform SHALL accept Customer and Collector registration submissions from public API endpoints without requiring authentication.
4. THE Platform SHALL validate all incoming registration data on the server side before storing it in the database, verifying that all required fields are present, that field values conform to their expected types and format constraints (e.g., valid email format, phone number pattern, string length within 1–500 characters), and that no unexpected fields are accepted.
5. THE Platform SHALL sanitize all user-provided input to prevent cross-site scripting and SQL injection.
6. IF server-side validation of incoming registration data fails, THEN THE Platform SHALL reject the request with a 400 status, return an error response indicating which fields failed validation, and not persist any data from that request.

### Requirement 9: Performance and Scalability

**User Story:** As a platform operator, I want the platform to perform well under expected load, so that users have a smooth registration experience.

#### Acceptance Criteria

1. THE Platform SHALL load the Landing_Page with a Largest Contentful Paint time of 2.5 seconds or less when measured using a simulated 4G mobile connection (9 Mbps download, 1.5 Mbps upload, 170ms RTT).
2. WHILE the database contains up to 10,000 total registration records, THE Platform SHALL return Dashboard query results (including count-by-LGA aggregations and recent registrations list) within 3 seconds at the 95th percentile.
3. WHEN a Customer or Collector submits a Registration_Form, THE Platform SHALL complete the server-side processing and return a response within 2 seconds at the 95th percentile under a load of up to 50 concurrent users.
4. IF the Platform receives requests exceeding 50 concurrent users, THEN THE Platform SHALL continue to serve requests without returning server errors, though response times may exceed the 2-second threshold.

### Requirement 10: Accessibility

**User Story:** As a user with disabilities, I want the platform to be accessible, so that I can register and interact with the platform independently.

#### Acceptance Criteria

1. THE Platform SHALL conform to WCAG 2.1 Level AA guidelines for all public-facing pages.
2. WHILE a user is navigating via keyboard, THE Platform SHALL display focus indicators with a minimum contrast ratio of 3:1 against adjacent colors on all interactive elements.
3. THE Platform SHALL associate every form input field with a visible text label using explicit HTML label elements or equivalent ARIA attributes such that assistive technologies announce the label when the field receives focus.
4. WHEN a form validation error occurs, THE Platform SHALL programmatically associate the error message with the corresponding input field and announce it to assistive technologies via an ARIA live region within 1 second of the validation event.
5. THE Platform SHALL ensure all interactive elements on public-facing pages are reachable and operable using only a keyboard, following a logical focus order that matches the visual layout, with no keyboard traps.
6. THE Platform SHALL NOT use color as the sole means of conveying information for form validation states, required field indicators, or status messages.
