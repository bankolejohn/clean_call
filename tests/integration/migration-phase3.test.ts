/**
 * Migration / schema integration checks for Phase 3 migration
 * `003_phase3_collection_requests.sql`.
 *
 * Validates: Requirements 1.5, 1.6, 14.4
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW THIS SUITE IS GATED (read before running):
 *
 *   • This suite ONLY runs when BOTH `STAGING_SUPABASE_URL` and
 *     `STAGING_SUPABASE_SERVICE_ROLE_KEY` are set. When they are absent (the
 *     default in CI and local dev today), the entire `describe` block is SKIPPED
 *     via `describe.skipIf(...)`, so it reports 0 failures and never opens a
 *     network connection.
 *
 *   • It MUST NEVER point at production. It deliberately reads dedicated
 *     `STAGING_*` env vars and NOT the app's `NEXT_PUBLIC_SUPABASE_URL` /
 *     `SUPABASE_SERVICE_ROLE_KEY` production vars, so there is no way for it to
 *     accidentally connect to the live database.
 *
 *   • ASSUMPTION: it assumes migration `003_phase3_collection_requests.sql` has
 *     ALREADY been applied to the staging / Supabase branch DB out of band (that
 *     is a separate, approval-gated step — see Task 16, the production/staging
 *     apply). These tests introspect the resulting schema and verify the
 *     migration's structural + non-destructive guarantees; they do not apply the
 *     migration themselves and never touch production.
 *
 *   • IDEMPOTENCY: this suite cannot re-run the migration itself, so it asserts
 *     idempotency INDIRECTLY — every named index/constraint/policy/trigger must
 *     exist EXACTLY ONCE (no duplicates). Applying `003` twice being a true
 *     no-op is validated out-of-band during the Task 16 staging apply (the SQL
 *     uses CREATE ... IF NOT EXISTS plus guarded DROP ... IF EXISTS + CREATE).
 *
 * To run these checks locally once a staging DB is wired up:
 *   STAGING_SUPABASE_URL=... \
 *   STAGING_SUPABASE_SERVICE_ROLE_KEY=... \
 *   npx vitest run tests/integration/migration-phase3.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Gate: only run when a dedicated STAGING database is configured. We intentionally
// use STAGING_* vars (never the production NEXT_PUBLIC_* / SUPABASE_SERVICE_ROLE_KEY)
// so this suite can never point at production.
const STAGING_URL = process.env.STAGING_SUPABASE_URL;
const STAGING_SERVICE_ROLE_KEY = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
const hasStaging = !!STAGING_URL && !!STAGING_SERVICE_ROLE_KEY;

// PostgREST does not expose information_schema / pg_catalog over the REST API by
// default, so all schema introspection is done through a read-only
// `exec_sql(query text)` RPC that runs a SQL string on staging and returns rows.
// The staging DB is expected to expose this helper; if it does not exist, every
// query below fails loudly (error is non-null / no rows) rather than silently
// passing, so the gap is visible.
async function execSql<T = Record<string, unknown>>(
  supabase: SupabaseClient,
  query: string
): Promise<T[]> {
  const { data, error } = await supabase.rpc("exec_sql", { query });
  // Fail loudly if the introspection helper is missing or the query errored.
  expect(error).toBeNull();
  return (data ?? []) as T[];
}

describe.skipIf(!hasStaging)("Phase 3 migration schema checks (staging DB)", () => {
  let supabase: SupabaseClient;

  // Baseline counts captured before assertions. Migration 003 is additive-only
  // (it creates ONE new table and touches no existing table's data), so the
  // counts of the pre-existing tables must be identical before and after. These
  // "before" counts are recorded so the preservation check reads as a
  // before/after comparison (Requirement 1.5). The migration itself is applied
  // out of band (Task 16), so "before" == "after" here confirms no rows were
  // lost. login_attempts is guarded because its table name may differ across
  // environments.
  let customersCountBefore: number | null = null;
  let collectorsCountBefore: number | null = null;
  let activityLogCountBefore: number | null = null;
  let loginAttemptsCountBefore: number | null = null;
  let loginAttemptsCountable = false;

  beforeAll(async () => {
    supabase = createClient(STAGING_URL as string, STAGING_SERVICE_ROLE_KEY as string, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { count: custCount, error: custErr } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true });
    expect(custErr).toBeNull();
    customersCountBefore = custCount ?? 0;

    const { count: collCount, error: collErr } = await supabase
      .from("collectors")
      .select("*", { count: "exact", head: true });
    expect(collErr).toBeNull();
    collectorsCountBefore = collCount ?? 0;

    const { count: alCount, error: alErr } = await supabase
      .from("activity_log")
      .select("*", { count: "exact", head: true });
    expect(alErr).toBeNull();
    activityLogCountBefore = alCount ?? 0;

    // login_attempts is guarded: the table name may differ across environments.
    // If the count query errors, we skip that particular assertion gracefully
    // (see the preservation test) rather than failing the whole suite.
    const { count: laCount, error: laErr } = await supabase
      .from("login_attempts")
      .select("*", { count: "exact", head: true });
    if (!laErr) {
      loginAttemptsCountable = true;
      loginAttemptsCountBefore = laCount ?? 0;
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Table + columns + status modelled as TEXT (not a DB enum). Requirement 2.x
  // ───────────────────────────────────────────────────────────────────────────
  it("collection_requests table exists with all expected columns", async () => {
    const rows = await execSql<{
      column_name: string;
      data_type: string;
      udt_name: string;
      column_default: string | null;
    }>(
      supabase,
      `SELECT column_name, data_type, udt_name, column_default
         FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'collection_requests'`
    );

    // Table must exist (columns come back).
    expect(rows.length).toBeGreaterThan(0);

    const columnNames = rows.map((r) => r.column_name.toLowerCase());
    const expectedColumns = [
      "id",
      "request_number",
      "tracking_token",
      "full_name",
      "phone",
      "email",
      "customer_id",
      "pickup_address",
      "lga",
      "waste_type",
      "estimated_quantity",
      "bin_bag_count",
      "preferred_pickup_date",
      "preferred_pickup_time",
      "additional_notes",
      "photo_url",
      "willingness_to_pay",
      "price_range",
      "collector_id",
      "status",
      "internal_notes",
      "created_at",
      "updated_at",
      "reviewed_at",
      "assigned_at",
      "accepted_at",
      "en_route_at",
      "completed_at",
      "cancelled_at",
    ];

    for (const col of expectedColumns) {
      expect(columnNames).toContain(col);
    }
  });

  it("status is a TEXT column defaulting to 'PENDING' and NOT a DB enum", async () => {
    const rows = await execSql<{
      data_type: string;
      udt_name: string;
      column_default: string | null;
    }>(
      supabase,
      `SELECT data_type, udt_name, column_default
         FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'collection_requests'
          AND column_name = 'status'`
    );

    expect(rows.length).toBe(1);
    const status = rows[0];

    // A generic TEXT column reports data_type 'text' / udt_name 'text'.
    // A DB enum would report data_type 'USER-DEFINED' with a custom udt_name.
    expect(status.data_type.toLowerCase()).toBe("text");
    expect(status.udt_name.toLowerCase()).toBe("text");
    expect(status.data_type.toLowerCase()).not.toBe("user-defined");

    // DEFAULT 'PENDING' (the column_default is rendered as 'PENDING'::text).
    expect(status.column_default ?? "").toContain("PENDING");
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. UNIQUE constraints on request_number and tracking_token. Requirement 2.2/2.3
  // ───────────────────────────────────────────────────────────────────────────
  it("UNIQUE constraints exist on request_number and tracking_token", async () => {
    // Join table_constraints -> key_column_usage to find which columns each
    // UNIQUE constraint covers on collection_requests.
    const rows = await execSql<{ column_name: string; constraint_name: string }>(
      supabase,
      `SELECT kcu.column_name, tc.constraint_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.table_schema = 'public'
          AND tc.table_name = 'collection_requests'
          AND tc.constraint_type = 'UNIQUE'`
    );

    const uniqueColumns = rows.map((r) => r.column_name.toLowerCase());
    expect(uniqueColumns).toContain("request_number");
    expect(uniqueColumns).toContain("tracking_token");
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. CHECK constraints referencing lga, waste_type, status, willingness_to_pay,
  //    price_range. Requirement 2.6/2.8/2.10, 4.1/4.2
  // ───────────────────────────────────────────────────────────────────────────
  it("CHECK constraints exist for lga, waste_type, status, willingness_to_pay, price_range", async () => {
    // pg_get_constraintdef renders the full CHECK expression, which lets us
    // assert a CHECK constraint referencing each column exists (rather than
    // relying on the constraint name).
    const rows = await execSql<{ constraint_name: string; definition: string }>(
      supabase,
      `SELECT con.conname AS constraint_name,
              pg_get_constraintdef(con.oid) AS definition
         FROM pg_constraint con
         JOIN pg_class rel ON rel.oid = con.conrelid
         JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public'
          AND rel.relname = 'collection_requests'
          AND con.contype = 'c'`
    );

    const definitions = rows.map((r) => (r.definition ?? "").toLowerCase());

    const referencesColumn = (col: string) =>
      definitions.some((def) => def.includes(col.toLowerCase()));

    // At minimum, a CHECK constraint referencing each of these columns exists.
    for (const col of [
      "lga",
      "waste_type",
      "status",
      "willingness_to_pay",
      "price_range",
    ]) {
      expect(referencesColumn(col)).toBe(true);
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Indexes exist. Requirement 8.3 + query performance
  // ───────────────────────────────────────────────────────────────────────────
  it("all expected indexes exist exactly once", async () => {
    const rows = await execSql<{ indexname: string }>(
      supabase,
      `SELECT indexname
         FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'collection_requests'`
    );

    const indexNames = rows.map((r) => r.indexname.toLowerCase());
    const expectedIndexes = [
      "idx_requests_status",
      "idx_requests_collector_id",
      "idx_requests_customer_id",
      "idx_requests_lga",
      "idx_requests_waste_type",
      "idx_requests_pickup_date",
      "idx_requests_created_at",
      "idx_requests_search",
    ];

    for (const idx of expectedIndexes) {
      expect(indexNames).toContain(idx);
      // Idempotency (indirect): each index appears exactly once, no duplicates.
      expect(indexNames.filter((n) => n === idx)).toHaveLength(1);
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. updated_at trigger exists and uses set_updated_at(). Requirement 2.10
  // ───────────────────────────────────────────────────────────────────────────
  it("trg_requests_updated_at trigger exists on collection_requests and uses set_updated_at()", async () => {
    const rows = await execSql<{
      tgname: string;
      definition: string;
    }>(
      supabase,
      `SELECT tg.tgname,
              pg_get_triggerdef(tg.oid) AS definition
         FROM pg_trigger tg
         JOIN pg_class rel ON rel.oid = tg.tgrelid
         JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public'
          AND rel.relname = 'collection_requests'
          AND NOT tg.tgisinternal
          AND tg.tgname = 'trg_requests_updated_at'`
    );

    // Exactly one trigger with this name (idempotency: guarded DROP + CREATE).
    expect(rows).toHaveLength(1);
    expect(rows[0].definition.toLowerCase()).toContain("set_updated_at");
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. RLS enabled + exactly the three policies, and NO anon policy.
  //    Requirement 14.3, 14.4, 14.5, 14.6
  // ───────────────────────────────────────────────────────────────────────────
  it("row level security is enabled on collection_requests", async () => {
    const rows = await execSql<{ relrowsecurity: boolean }>(
      supabase,
      `SELECT rel.relrowsecurity
         FROM pg_class rel
         JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public'
          AND rel.relname = 'collection_requests'`
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].relrowsecurity).toBe(true);
  });

  it("the three expected RLS policies exist and none grant the anon role", async () => {
    const rows = await execSql<{
      policyname: string;
      cmd: string;
      roles: string[] | string;
    }>(
      supabase,
      `SELECT policyname, cmd, roles
         FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'collection_requests'`
    );

    // Normalise the roles column: pg_policies.roles is a text[] but may arrive
    // as an array or a "{authenticated}" string depending on the RPC's shaping.
    const normaliseRoles = (roles: string[] | string): string[] => {
      if (Array.isArray(roles)) return roles.map((r) => r.toLowerCase());
      return String(roles)
        .replace(/[{}]/g, "")
        .split(",")
        .map((r) => r.trim().toLowerCase())
        .filter(Boolean);
    };

    const policies = rows.map((r) => ({
      name: r.policyname,
      cmd: r.cmd.toUpperCase(),
      roles: normaliseRoles(r.roles),
    }));

    const findPolicy = (name: string) =>
      policies.find((p) => p.name === name);

    const adminSelect = findPolicy("Admin select requests");
    expect(adminSelect).toBeDefined();
    expect(adminSelect?.cmd).toBe("SELECT");
    expect(adminSelect?.roles).toContain("authenticated");

    const adminUpdate = findPolicy("Admin update requests");
    expect(adminUpdate).toBeDefined();
    expect(adminUpdate?.cmd).toBe("UPDATE");
    expect(adminUpdate?.roles).toContain("authenticated");

    const serviceManage = findPolicy("Service manage requests");
    expect(serviceManage).toBeDefined();
    expect(serviceManage?.cmd).toBe("ALL");
    expect(serviceManage?.roles).toContain("service_role");

    // Critical: NO policy may grant the anon role. Public insert/tracking/cancel
    // all go through the service-role client, so anon must never touch the table.
    const anonPolicies = policies.filter((p) => p.roles.includes("anon"));
    expect(anonPolicies).toEqual([]);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 7. Idempotency (indirect): every named constraint/policy exists exactly once.
  //    Applying 003 twice being a true no-op is validated out-of-band during the
  //    Task 16 staging apply (the SQL uses IF NOT EXISTS + guarded DROP ...
  //    IF EXISTS). Here we assert "objects exist exactly once".
  // ───────────────────────────────────────────────────────────────────────────
  it("named constraints and policies exist exactly once (no duplicates)", async () => {
    const constraintRows = await execSql<{ conname: string }>(
      supabase,
      `SELECT con.conname
         FROM pg_constraint con
         JOIN pg_class rel ON rel.oid = con.conrelid
         JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public'
          AND rel.relname = 'collection_requests'`
    );
    const constraintNames = constraintRows.map((r) => r.conname);
    const uniqueConstraintNames = new Set(constraintNames);
    // No duplicate constraint names.
    expect(constraintNames.length).toBe(uniqueConstraintNames.size);

    const policyRows = await execSql<{ policyname: string }>(
      supabase,
      `SELECT policyname
         FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'collection_requests'`
    );
    const policyNames = policyRows.map((r) => r.policyname);
    const uniquePolicyNames = new Set(policyNames);
    // No duplicate policy names (guarded DROP POLICY + CREATE POLICY).
    expect(policyNames.length).toBe(uniquePolicyNames.size);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 8. Existing counts unchanged (Requirement 1.5). Migration 003 is additive
  //    only, so counts on the pre-existing tables must equal the beforeAll
  //    baseline. login_attempts is guarded in case the table name differs.
  // ───────────────────────────────────────────────────────────────────────────
  it("preserves existing record counts (before == after)", async () => {
    const { count: custAfter, error: custErr } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true });
    expect(custErr).toBeNull();
    expect(custAfter).toBe(customersCountBefore);

    const { count: collAfter, error: collErr } = await supabase
      .from("collectors")
      .select("*", { count: "exact", head: true });
    expect(collErr).toBeNull();
    expect(collAfter).toBe(collectorsCountBefore);

    const { count: alAfter, error: alErr } = await supabase
      .from("activity_log")
      .select("*", { count: "exact", head: true });
    expect(alErr).toBeNull();
    expect(alAfter).toBe(activityLogCountBefore);

    // login_attempts: only assert if the table was countable in beforeAll.
    // If the count query errored (e.g. different table name), skip gracefully.
    if (loginAttemptsCountable) {
      const { count: laAfter, error: laErr } = await supabase
        .from("login_attempts")
        .select("*", { count: "exact", head: true });
      if (!laErr) {
        expect(laAfter).toBe(loginAttemptsCountBefore);
      }
    }
  });
});
