-- CleanCall MVP Initial Schema
-- Creates customers, collectors, and login_attempts tables
-- with all constraints, indexes, and RLS policies.

-- ============================================================
-- TABLES
-- ============================================================

-- Customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL CHECK (char_length(full_name) BETWEEN 1 AND 100),
    phone TEXT NOT NULL UNIQUE CHECK (phone ~ '^(0[7-9][01]\d{8}|\+234[7-9][01]\d{8})$'),
    email TEXT CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$'),
    address TEXT NOT NULL CHECK (char_length(address) BETWEEN 1 AND 255),
    lga TEXT NOT NULL CHECK (lga IN (
        'Ado-Ekiti', 'Ikere', 'Oye', 'Ikole', 'Ekiti East',
        'Ekiti West', 'Emure', 'Ise/Orun', 'Irepodun/Ifelodun',
        'Ijero', 'Efon', 'Ekiti South-West', 'Gbonyin',
        'Ido-Osi', 'Moba', 'Ilejemeje'
    )),
    category TEXT NOT NULL CHECK (category IN (
        'Household', 'Business', 'School', 'Religious Organization', 'Other'
    )),
    disposal_method TEXT NOT NULL CHECK (disposal_method IN (
        'Burning', 'Burying', 'Roadside Dumping',
        'Private Collector', 'Government Collector', 'Other'
    )),
    collection_frequency TEXT NOT NULL CHECK (collection_frequency IN (
        'Daily', 'Twice a Week', 'Weekly', 'Bi-Weekly', 'Monthly'
    )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Collectors table
CREATE TABLE collectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name TEXT NOT NULL CHECK (char_length(business_name) BETWEEN 1 AND 150),
    contact_person TEXT NOT NULL CHECK (char_length(contact_person) BETWEEN 1 AND 100),
    phone TEXT NOT NULL CHECK (phone ~ '^(0[7-9][01]\d{8}|\+234[7-9][01]\d{8})$'),
    email TEXT NOT NULL CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$'),
    business_address TEXT NOT NULL CHECK (char_length(business_address) BETWEEN 1 AND 300),
    service_areas TEXT[] NOT NULL CHECK (array_length(service_areas, 1) BETWEEN 1 AND 16),
    waste_types TEXT[] NOT NULL,
    staff_count INTEGER NOT NULL CHECK (staff_count BETWEEN 1 AND 10000),
    vehicle_count INTEGER NOT NULL CHECK (vehicle_count BETWEEN 1 AND 10000),
    years_in_operation INTEGER NOT NULL CHECK (years_in_operation BETWEEN 0 AND 100),
    cac_number TEXT CHECK (cac_number IS NULL OR char_length(cac_number) <= 20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Login attempts tracking for rate limiting
CREATE TABLE login_attempts (
    email TEXT PRIMARY KEY,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Customers indexes
CREATE INDEX idx_customers_created_at ON customers(created_at DESC);
CREATE INDEX idx_customers_lga ON customers(lga);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_category ON customers(category);

-- Collectors indexes
CREATE INDEX idx_collectors_created_at ON collectors(created_at DESC);
CREATE INDEX idx_collectors_service_areas ON collectors USING GIN(service_areas);

-- Full-text search indexes for admin search
CREATE INDEX idx_customers_search ON customers USING GIN(
    to_tsvector('english', full_name || ' ' || phone || ' ' || COALESCE(email, '') || ' ' || address)
);
CREATE INDEX idx_collectors_search ON collectors USING GIN(
    to_tsvector('english', business_name || ' ' || contact_person || ' ' || phone || ' ' || email || ' ' || business_address)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE collectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- Public can INSERT into customers and collectors (registration)
CREATE POLICY "Allow public insert" ON customers
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow public insert" ON collectors
    FOR INSERT TO anon WITH CHECK (true);

-- Only authenticated admins can SELECT from customers and collectors
CREATE POLICY "Admin select customers" ON customers
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin select collectors" ON collectors
    FOR SELECT TO authenticated USING (true);

-- Login attempts managed by service role only (server-side)
CREATE POLICY "Service role only" ON login_attempts
    FOR ALL TO service_role USING (true);
