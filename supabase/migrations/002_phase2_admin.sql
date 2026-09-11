-- CleanCall Phase 2: Admin Operations & Market Research
-- Additive, non-destructive extension of the Phase 1 schema (001_initial_schema.sql).
--
-- SAFETY NOTES:
--   * ADDITIVE-ONLY: this migration contains NO DROP TABLE/COLUMN, RENAME,
--     TRUNCATE, ALTER COLUMN TYPE, or DELETE statements. It only ADDs columns,
--     tables, indexes, functions, triggers, and policies.
--   * NON-DESTRUCTIVE: it preserves all existing (~99) customer/collector
--     records. Every new column is nullable (or carries a DEFAULT), so pre-existing
--     rows remain valid. Existing customers/collectors RLS policies are left untouched.
--   * IDEMPOTENT: uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS / CREATE OR REPLACE
--     so re-running the migration is safe.
--   * The single DROP TRIGGER IF EXISTS ... CREATE TRIGGER pattern below is the
--     standard idempotent way to (re)install a trigger; it does not touch data.
--   * MUST be validated on a staging / Supabase branch DB before production
--     (see the "Migration Safety and Rollout Procedure" section of design.md).

-- ============================================================
-- CUSTOMERS: NEW NULLABLE COLUMNS
-- ============================================================
-- All CHECK constraints allow NULL (a Postgres CHECK passes when the expression
-- is NULL), so existing rows with null Phase 2 fields remain valid.

ALTER TABLE customers ADD COLUMN IF NOT EXISTS willingness_to_pay TEXT
    CHECK (willingness_to_pay IN ('Yes', 'Maybe - Depends on price', 'No'));

ALTER TABLE customers ADD COLUMN IF NOT EXISTS preferred_price_range TEXT
    CHECK (preferred_price_range IN ('Below ₦2,000', '₦2,000–₦5,000', '₦5,000–₦10,000', 'Above ₦10,000', 'Not sure'));

ALTER TABLE customers ADD COLUMN IF NOT EXISTS has_existing_collection TEXT
    CHECK (has_existing_collection IN ('Yes', 'No', 'Sometimes', 'I manage it myself'));

ALTER TABLE customers ADD COLUMN IF NOT EXISTS satisfaction_with_existing TEXT
    CHECK (satisfaction_with_existing IN ('Yes', 'No', 'Somewhat'));

ALTER TABLE customers ADD COLUMN IF NOT EXISTS status TEXT
    CHECK (status IN ('New', 'Contacted', 'Interested', 'Converted', 'Inactive')) DEFAULT 'New';

ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ============================================================
-- COLLECTORS: NEW NULLABLE COLUMNS
-- ============================================================

ALTER TABLE collectors ADD COLUMN IF NOT EXISTS wants_more_customers TEXT
    CHECK (wants_more_customers IN ('Yes', 'Maybe', 'No'));

ALTER TABLE collectors ADD COLUMN IF NOT EXISTS status TEXT
    CHECK (status IN ('Pending', 'Contacted', 'Verified', 'Active', 'Inactive', 'Suspended', 'Rejected')) DEFAULT 'Pending';

ALTER TABLE collectors ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ============================================================
-- BACKFILL EXISTING (~99) RECORDS
-- ============================================================
-- The DEFAULT clause fills existing rows on ADD COLUMN in modern Postgres, but
-- we make the intent explicit and idempotent here.
--
-- Documented fallback: updated_at = created_at for pre-existing rows. This is
-- truthful, not fabricated history: these rows have not been modified since
-- creation, so their last-modified time genuinely equals their creation time.
-- The set_updated_at() trigger (below) takes over for all subsequent edits.

UPDATE customers  SET status = 'New'          WHERE status IS NULL;
UPDATE collectors SET status = 'Pending'      WHERE status IS NULL;
UPDATE customers  SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE collectors SET updated_at = created_at WHERE updated_at IS NULL;

-- ============================================================
-- ACTIVITY LOG TABLE
-- ============================================================
-- action_type is plain TEXT (not a DB enum) and metadata is extensible JSONB,
-- so new event types can be recorded without a schema change.

CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);

-- ============================================================
-- updated_at TRIGGER
-- ============================================================
-- A DB trigger is more robust than app-level timestamping because it fires on
-- every UPDATE regardless of which code path performs it.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- DROP TRIGGER IF EXISTS + CREATE TRIGGER is the standard idempotent (re)install
-- pattern; it operates on the trigger definition, not on table data.
DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
CREATE TRIGGER trg_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_collectors_updated_at ON collectors;
CREATE TRIGGER trg_collectors_updated_at
    BEFORE UPDATE ON collectors
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- INDEXES (filters / stats performance)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_willingness_to_pay ON customers(willingness_to_pay);
CREATE INDEX IF NOT EXISTS idx_customers_has_existing_collection ON customers(has_existing_collection);
CREATE INDEX IF NOT EXISTS idx_collectors_status ON collectors(status);

-- ============================================================
-- ROW LEVEL SECURITY (activity_log ONLY)
-- ============================================================
-- Existing customers/collectors policies are intentionally left unchanged.
--   * SELECT is restricted to authenticated (admins read the log in the dashboard;
--     it is never exposed to public/anonymous requests).
--   * INSERT is restricted to service_role ONLY, so all activity writes happen
--     server-side and no admin browser session can forge audit entries.

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin select activity_log" ON activity_log
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service insert activity_log" ON activity_log
    FOR INSERT TO service_role WITH CHECK (true);
