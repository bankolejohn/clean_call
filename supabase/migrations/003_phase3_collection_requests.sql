-- CleanCall Phase 3: Collection Request Operational Workflow
-- Additive, non-destructive extension of the Phase 1 + Phase 2 schema
-- (001_initial_schema.sql, 002_phase2_admin.sql).
--
-- SAFETY NOTES:
--   * ADDITIVE-ONLY: this migration contains NO DROP TABLE/COLUMN, RENAME,
--     TRUNCATE, ALTER COLUMN TYPE, or DELETE statements. It only ADDs a table,
--     indexes, a trigger, and policies. The only DROPs are the guarded
--     DROP TRIGGER IF EXISTS and DROP POLICY IF EXISTS idempotency guards
--     below; they operate on definitions, never on table data.
--   * NON-DESTRUCTIVE: it creates one new table (collection_requests) and
--     touches no existing table's data. Existing customers/collectors/
--     login_attempts/activity_log rows and policies are left untouched.
--   * IDEMPOTENT: uses CREATE TABLE/INDEX/POLICY IF NOT EXISTS and the guarded
--     DROP ... IF EXISTS + CREATE patterns, so re-running the migration is safe.
--   * REUSES existing objects: the Phase 2 activity_log table (via loose
--     metadata->>request_id linkage) and the Phase 2 set_updated_at() trigger
--     function. set_updated_at() already exists from migration 002 and is NOT
--     redefined here.
--   * MUST be validated on a staging / Supabase branch DB before production
--     (see the "Migration Safety and Rollout Procedure" section of design.md).

-- ============================================================
-- TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS collection_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identity
    request_number TEXT NOT NULL UNIQUE,          -- CR-YYYYMMDD-XXXX (Req 2.2)
    tracking_token TEXT NOT NULL UNIQUE,          -- unguessable (Req 2.3)

    -- Contact (captured on the request itself; Req 2.4)
    full_name TEXT NOT NULL CHECK (char_length(full_name) BETWEEN 1 AND 100),
    phone TEXT NOT NULL CHECK (phone ~ '^(0[7-9][01]\d{8}|\+234[7-9][01]\d{8})$'),
    email TEXT CHECK (email IS NULL OR email ~ '^[^@]+@[^@]+\.[^@]+$'),

    -- Optional link to an existing customer (Req 2.5, 17.1)
    customer_id UUID NULL REFERENCES customers(id),

    -- Pickup (Req 2.6)
    pickup_address TEXT NOT NULL CHECK (char_length(pickup_address) BETWEEN 1 AND 255),
    lga TEXT NOT NULL CHECK (lga IN (
        'Ado-Ekiti', 'Ikere', 'Oye', 'Ikole', 'Ekiti East',
        'Ekiti West', 'Emure', 'Ise/Orun', 'Irepodun/Ifelodun',
        'Ijero', 'Efon', 'Ekiti South-West', 'Gbonyin',
        'Ido-Osi', 'Moba', 'Ilejemeje'
    )),
    waste_type TEXT NOT NULL CHECK (waste_type IN (
        'HOUSEHOLD', 'COMMERCIAL', 'RECYCLABLE', 'CONSTRUCTION', 'MEDICAL'
    )),
    estimated_quantity TEXT NOT NULL CHECK (char_length(estimated_quantity) BETWEEN 1 AND 200),
    bin_bag_count INTEGER NULL CHECK (bin_bag_count IS NULL OR bin_bag_count >= 0),

    -- Scheduling (Req 2.7)
    preferred_pickup_date DATE NOT NULL,
    preferred_pickup_time TEXT NOT NULL CHECK (char_length(preferred_pickup_time) BETWEEN 1 AND 100),

    -- Optional details (Req 2.8, 15.1)
    additional_notes TEXT NULL,
    photo_url TEXT NULL,
    willingness_to_pay TEXT NULL
        CHECK (willingness_to_pay IN ('Yes', 'Maybe - Depends on price', 'No')),
    price_range TEXT NULL
        CHECK (price_range IN ('Below ₦2,000', '₦2,000–₦5,000', '₦5,000–₦10,000', 'Above ₦10,000', 'Not sure')),

    -- Assignment (Req 2.9) — set only on assignment
    collector_id UUID NULL REFERENCES collectors(id),

    -- Lifecycle (Req 2.10, 4.1, 4.2)
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
        'PENDING', 'UNDER_REVIEW', 'ASSIGNED', 'ACCEPTED',
        'EN_ROUTE', 'COMPLETED', 'CANCELLED', 'DISPUTED'
    )),
    internal_notes TEXT NULL,                     -- Admin-only (Req 2.11, 9.6)

    -- Timestamps (Req 2.10) — set only when the transition occurs
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at  TIMESTAMPTZ NULL,
    assigned_at  TIMESTAMPTZ NULL,
    accepted_at  TIMESTAMPTZ NULL,
    en_route_at  TIMESTAMPTZ NULL,
    completed_at TIMESTAMPTZ NULL,
    cancelled_at TIMESTAMPTZ NULL
);

-- ============================================================
-- INDEXES (idempotent)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_requests_status         ON collection_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_collector_id   ON collection_requests(collector_id);
CREATE INDEX IF NOT EXISTS idx_requests_customer_id    ON collection_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_requests_lga            ON collection_requests(lga);
CREATE INDEX IF NOT EXISTS idx_requests_waste_type     ON collection_requests(waste_type);
CREATE INDEX IF NOT EXISTS idx_requests_pickup_date    ON collection_requests(preferred_pickup_date);
CREATE INDEX IF NOT EXISTS idx_requests_created_at     ON collection_requests(created_at DESC);
-- request_number and tracking_token UNIQUE constraints already create indexes.

-- Search over the admin-searchable text columns (Req 8.3).
CREATE INDEX IF NOT EXISTS idx_requests_search ON collection_requests USING GIN(
    to_tsvector('english', request_number || ' ' || full_name || ' ' || phone)
);

-- ============================================================
-- updated_at TRIGGER (reuses the Phase 2 set_updated_at() function; Req 2.10)
-- ============================================================
-- set_updated_at() already exists from migration 002; do not redefine it.
DROP TRIGGER IF EXISTS trg_requests_updated_at ON collection_requests;
CREATE TRIGGER trg_requests_updated_at
    BEFORE UPDATE ON collection_requests
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (Req 14.3, 14.4, 14.5, 14.6)
-- ============================================================
ALTER TABLE collection_requests ENABLE ROW LEVEL SECURITY;

-- Postgres CREATE POLICY has no IF NOT EXISTS; each policy is preceded by a
-- guarded DROP POLICY IF EXISTS so re-applying this migration is a no-op.

-- Admins (any authenticated session) may read and update any row.
DROP POLICY IF EXISTS "Admin select requests" ON collection_requests;
CREATE POLICY "Admin select requests" ON collection_requests
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin update requests" ON collection_requests;
CREATE POLICY "Admin update requests" ON collection_requests
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- All privileged reads/writes (public submission insert, token-keyed tracking
-- reads, token-keyed cancel updates, and admin mutations) run server-side via
-- the SERVICE-ROLE client, which bypasses RLS.
DROP POLICY IF EXISTS "Service manage requests" ON collection_requests;
CREATE POLICY "Service manage requests" ON collection_requests
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Intentionally NO anon policy: the anon role cannot touch collection_requests.
-- Public insert / tracking / cancel all go through the service-role client per
-- the design decision (see design.md "RLS decision — insert via service role").
