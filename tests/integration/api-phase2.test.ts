/**
 * Integration tests for the Phase 2 admin API route handlers.
 *
 * Follows the same harness style as tests/integration/admin.test.ts and
 * registration.test.ts: the Supabase server/service clients and next/headers
 * are mocked with vi.mock, so these run in CI under Node 22 with NO database.
 *
 * Route handlers are imported dynamically (so they pick up the mocks) and their
 * GET/PATCH functions are invoked directly with mock NextRequest objects.
 *
 * Validates: Requirements 3.3, 3.4, 5.1-5.6, 6.3, 9.4, 10.5, 13.1, 13.5, 14.4, 16.2, 16.5
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Module mocks (hoisted by vitest)
// ---------------------------------------------------------------------------

vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      getAll: vi.fn(() => []),
      set: vi.fn(),
    })
  ),
}));

// Auth state is driven per-test via mockGetUser.
const mockGetUser = vi.fn();

// A per-test hook that maps a table name to the terminal result the chainable
// query builder should resolve with. Reset in beforeEach.
let tableResults: Record<string, unknown> = {};

// Captures the last `.update(payload)` argument per table so tests can assert
// on the mutation payload (e.g. the status value written).
let lastUpdatePayload: Record<string, Record<string, unknown> | undefined> = {};

// Tracks whether `.update(...)` was invoked for a table (to assert NOT called
// on validation-400 paths).
let updateCalled: Record<string, boolean> = {};

// Captures `.order(column, opts)` calls per table for ordering assertions.
let orderCalls: Record<string, Array<[string, unknown]>> = {};

/**
 * Builds a flexible chainable query-builder mock.
 *
 * Non-terminal methods (select/eq/or/in/gte/lte/contains/range/limit/update/
 * order) return the same builder so any call order works. Terminal methods
 * (maybeSingle/single) and awaiting the builder itself resolve with the
 * configured result for that table.
 *
 * `select("*", { count })` and awaiting the builder both resolve with the
 * table result (which may include `count`).
 */
function makeQueryBuilder(table: string) {
  const result = (tableResults[table] ?? { data: null, error: null }) as {
    data?: unknown;
    count?: number;
    error?: unknown;
  };

  const builder: Record<string, unknown> = {};

  const chain = (..._args: unknown[]) => builder;

  builder.select = vi.fn(chain);
  builder.eq = vi.fn(chain);
  builder.or = vi.fn(chain);
  builder.in = vi.fn(chain);
  builder.gte = vi.fn(chain);
  builder.lte = vi.fn(chain);
  builder.contains = vi.fn(chain);
  builder.range = vi.fn(chain);
  builder.limit = vi.fn(chain);

  builder.order = vi.fn((column: string, opts: unknown) => {
    (orderCalls[table] ??= []).push([column, opts]);
    return builder;
  });

  builder.update = vi.fn((payload: Record<string, unknown>) => {
    updateCalled[table] = true;
    lastUpdatePayload[table] = payload;
    return builder;
  });

  // Terminal resolvers
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  builder.single = vi.fn(() => Promise.resolve(result));

  // Make the builder awaitable (routes that await the chain directly, e.g. the
  // list/dashboard/activity-log/export routes).
  builder.then = (onFulfilled: (value: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled);

  return builder;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: vi.fn((table: string) => makeQueryBuilder(table)),
    })
  ),
}));

// Service client: capture insert calls so activity logging can be asserted.
const mockServiceInsert = vi.fn((_row: Record<string, unknown>) => Promise.resolve({ error: null }));
const mockServiceFrom = vi.fn(() => ({ insert: mockServiceInsert }));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => ({ from: mockServiceFrom })),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function authed() {
  mockGetUser.mockResolvedValue({ data: { user: { id: "admin-id" } } });
}

function unauthed() {
  mockGetUser.mockResolvedValue({ data: { user: null } });
}

/** Mock NextRequest for handlers that only read searchParams. */
function reqWithParams(params: Record<string, string> = {}) {
  return {
    nextUrl: { searchParams: new URLSearchParams(params) },
  } as never;
}

/** Mock NextRequest for PATCH handlers that call request.json(). */
function reqWithJson(body: unknown) {
  return {
    json: () => Promise.resolve(body),
    nextUrl: { searchParams: new URLSearchParams() },
  } as never;
}

/** params factory for dynamic routes. */
function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  tableResults = {};
  lastUpdatePayload = {};
  updateCalled = {};
  orderCalls = {};
  mockServiceInsert.mockResolvedValue({ error: null });
  mockServiceFrom.mockReturnValue({ insert: mockServiceInsert });
});

// ---------------------------------------------------------------------------
// 1. Auth 401 for every new route (Req 16.2)
// ---------------------------------------------------------------------------

describe("Phase 2 routes reject unauthenticated requests (401)", () => {
  beforeEach(() => unauthed());

  it("customer detail GET returns 401", async () => {
    const { GET } = await import("@/app/api/admin/customers/[id]/route");
    const res = await GET(reqWithParams(), ctx("c1"));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Unauthorized");
  });

  it("customer detail PATCH returns 401 and never mutates", async () => {
    const { PATCH } = await import("@/app/api/admin/customers/[id]/route");
    const res = await PATCH(reqWithJson({ status: "Contacted" }), ctx("c1"));
    expect(res.status).toBe(401);
    expect(updateCalled.customers).toBeUndefined();
  });

  it("collector detail GET returns 401", async () => {
    const { GET } = await import("@/app/api/admin/collectors/[id]/route");
    const res = await GET(reqWithParams(), ctx("m1"));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Unauthorized");
  });

  it("collector detail PATCH returns 401 and never mutates", async () => {
    const { PATCH } = await import("@/app/api/admin/collectors/[id]/route");
    const res = await PATCH(reqWithJson({ action: "approve" }), ctx("m1"));
    expect(res.status).toBe(401);
    expect(updateCalled.collectors).toBeUndefined();
  });

  it("dashboard GET returns 401", async () => {
    const { GET } = await import("@/app/api/admin/dashboard/route");
    const res = await GET();
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Unauthorized");
  });

  it("analytics GET returns 401", async () => {
    const { GET } = await import("@/app/api/admin/analytics/route");
    const res = await GET();
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Unauthorized");
  });

  it("locations GET returns 401", async () => {
    const { GET } = await import("@/app/api/admin/locations/route");
    const res = await GET();
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Unauthorized");
  });

  it("activity-log GET returns 401", async () => {
    const { GET } = await import("@/app/api/admin/activity-log/route");
    const res = await GET();
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Unauthorized");
  });
});

// ---------------------------------------------------------------------------
// 2. Customer detail GET (Req 9.4)
// ---------------------------------------------------------------------------

describe("Customer detail GET", () => {
  it("returns 200 with the row when found", async () => {
    authed();
    const row = { id: "c1", full_name: "Ade Johnson", status: "New" };
    tableResults.customers = { data: row, error: null };

    const { GET } = await import("@/app/api/admin/customers/[id]/route");
    const res = await GET(reqWithParams(), ctx("c1"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(row);
  });

  it("returns 404 when the row is null", async () => {
    authed();
    tableResults.customers = { data: null, error: null };

    const { GET } = await import("@/app/api/admin/customers/[id]/route");
    const res = await GET(reqWithParams(), ctx("missing"));

    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("Not found");
  });
});

// ---------------------------------------------------------------------------
// 3. Customer PATCH (Req 3.3, 3.4)
// ---------------------------------------------------------------------------

describe("Customer PATCH status change", () => {
  it("valid status updates the row, returns 200, and records activity", async () => {
    authed();
    const updated = { id: "c1", full_name: "Ade", status: "Contacted" };
    tableResults.customers = { data: updated, error: null };

    const { PATCH } = await import("@/app/api/admin/customers/[id]/route");
    const res = await PATCH(reqWithJson({ status: "Contacted" }), ctx("c1"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(updated);

    // update called with the new status
    expect(updateCalled.customers).toBe(true);
    expect(lastUpdatePayload.customers).toEqual({ status: "Contacted" });

    // activity logged via the service-role client insert
    expect(mockServiceFrom).toHaveBeenCalledWith("activity_log");
    expect(mockServiceInsert).toHaveBeenCalledTimes(1);
    const inserted = mockServiceInsert.mock.calls[0][0] as Record<string, unknown>;
    expect(inserted.action_type).toBe("customer_status_change");
  });

  it("invalid status returns 400 with fieldErrors and does NOT update", async () => {
    authed();

    const { PATCH } = await import("@/app/api/admin/customers/[id]/route");
    const res = await PATCH(reqWithJson({ status: "Nope" }), ctx("c1"));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.fieldErrors).toBeDefined();
    expect(body.fieldErrors.status).toBeDefined();

    expect(updateCalled.customers).toBeUndefined();
    expect(mockServiceInsert).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 4. Collector PATCH lifecycle (Req 5.2, 5.3, 5.4, 10.5)
// ---------------------------------------------------------------------------

describe("Collector PATCH lifecycle", () => {
  it("action 'approve' sets status to Active and returns 200", async () => {
    authed();
    tableResults.collectors = { data: { id: "m1", status: "Active" }, error: null };

    const { PATCH } = await import("@/app/api/admin/collectors/[id]/route");
    const res = await PATCH(reqWithJson({ action: "approve" }), ctx("m1"));

    expect(res.status).toBe(200);
    expect(lastUpdatePayload.collectors).toEqual({ status: "Active" });
    expect(mockServiceInsert).toHaveBeenCalledTimes(1);
    const inserted = mockServiceInsert.mock.calls[0][0] as Record<string, unknown>;
    expect(inserted.action_type).toBe("provider_approval");
  });

  it("action 'suspend' sets status to Suspended", async () => {
    authed();
    tableResults.collectors = { data: { id: "m1", status: "Suspended" }, error: null };

    const { PATCH } = await import("@/app/api/admin/collectors/[id]/route");
    const res = await PATCH(reqWithJson({ action: "suspend" }), ctx("m1"));

    expect(res.status).toBe(200);
    expect(lastUpdatePayload.collectors).toEqual({ status: "Suspended" });
    const inserted = mockServiceInsert.mock.calls[0][0] as Record<string, unknown>;
    expect(inserted.action_type).toBe("provider_suspension");
  });

  it("invalid action returns 400 and does NOT update", async () => {
    authed();

    const { PATCH } = await import("@/app/api/admin/collectors/[id]/route");
    const res = await PATCH(reqWithJson({ action: "explode" }), ctx("m1"));

    expect(res.status).toBe(400);
    expect(updateCalled.collectors).toBeUndefined();
    expect(mockServiceInsert).not.toHaveBeenCalled();
  });

  it("raw invalid status returns 400 and does NOT update", async () => {
    authed();

    const { PATCH } = await import("@/app/api/admin/collectors/[id]/route");
    const res = await PATCH(reqWithJson({ status: "NotAStatus" }), ctx("m1"));

    expect(res.status).toBe(400);
    expect(updateCalled.collectors).toBeUndefined();
    expect(mockServiceInsert).not.toHaveBeenCalled();
  });

  it("raw valid status updates and returns 200", async () => {
    authed();
    tableResults.collectors = { data: { id: "m1", status: "Verified" }, error: null };

    const { PATCH } = await import("@/app/api/admin/collectors/[id]/route");
    const res = await PATCH(reqWithJson({ status: "Verified" }), ctx("m1"));

    expect(res.status).toBe(200);
    expect(lastUpdatePayload.collectors).toEqual({ status: "Verified" });
    const inserted = mockServiceInsert.mock.calls[0][0] as Record<string, unknown>;
    expect(inserted.action_type).toBe("provider_status_change");
  });
});

// ---------------------------------------------------------------------------
// 5. Dashboard (Req 6.3)
// ---------------------------------------------------------------------------

describe("Dashboard stats", () => {
  it("returns 200 with the DashboardStats shape", async () => {
    authed();
    tableResults.customers = {
      data: [
        {
          id: "c1",
          full_name: "Ade",
          lga: "Ado-Ekiti",
          created_at: "2024-01-15T10:00:00Z",
          willingness_to_pay: "Yes",
          has_existing_collection: "No",
          status: "New",
        },
      ],
      error: null,
    };
    tableResults.collectors = {
      data: [
        {
          id: "m1",
          contact_person: "Bayo",
          service_areas: ["Ado-Ekiti"],
          created_at: "2024-01-14T09:00:00Z",
          status: "Active",
        },
      ],
      error: null,
    };

    const { GET } = await import("@/app/api/admin/dashboard/route");
    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty("totalUsers");
    expect(body).toHaveProperty("customerCount");
    expect(body).toHaveProperty("collectorCount");
    expect(body).toHaveProperty("activeProviders");
    expect(body).toHaveProperty("recentRegistrations");
    expect(body).toHaveProperty("lgaBreakdown");

    expect(body.customerCount).toBe(1);
    expect(body.collectorCount).toBe(1);
    expect(body.totalUsers).toBe(2);
    expect(body.activeProviders).toBe(1);
    expect(Array.isArray(body.recentRegistrations)).toBe(true);
    expect(Array.isArray(body.lgaBreakdown)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 6. Activity-log (Req 14.4)
// ---------------------------------------------------------------------------

describe("Activity log", () => {
  it("returns 200 with the rows and queries created_at descending", async () => {
    authed();
    const rows = [
      { id: "a2", action_type: "data_export", description: "x", metadata: {}, created_at: "2024-02-01T00:00:00Z" },
      { id: "a1", action_type: "admin_login", description: "y", metadata: {}, created_at: "2024-01-01T00:00:00Z" },
    ];
    tableResults.activity_log = { data: rows, error: null };

    const { GET } = await import("@/app/api/admin/activity-log/route");
    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(rows);

    // The query ordered by created_at descending.
    const orders = orderCalls.activity_log ?? [];
    expect(orders).toContainEqual(["created_at", { ascending: false }]);
  });
});

// ---------------------------------------------------------------------------
// 7. Export (Req 13.1, 13.5)
// ---------------------------------------------------------------------------

describe("Customer CSV export", () => {
  it("includes Phase 2 headers and records a data_export activity", async () => {
    authed();
    tableResults.customers = {
      data: [
        {
          id: "c1",
          full_name: "Ade Johnson",
          phone: "08012345678",
          email: "ade@example.com",
          address: "15 Fajuyi Road",
          lga: "Ado-Ekiti",
          category: "Household",
          disposal_method: "Burning",
          collection_frequency: "Weekly",
          created_at: "2024-01-15T10:00:00Z",
          willingness_to_pay: "Yes",
          preferred_price_range: "1000-2000",
          has_existing_collection: "No",
          satisfaction_with_existing: null,
          status: "New",
          updated_at: "2024-01-15T10:00:00Z",
        },
      ],
      error: null,
    };

    const { GET } = await import("@/app/api/admin/export/customers/route");
    const res = await GET(reqWithParams());

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");

    const csv = await res.text();
    const headerLine = csv.split("\n")[0];

    // Phase 2 columns present in the header.
    expect(headerLine).toContain("willingness_to_pay");
    expect(headerLine).toContain("preferred_price_range");
    expect(headerLine).toContain("has_existing_collection");
    expect(headerLine).toContain("status");
    expect(headerLine).toContain("updated_at");

    // Data row populated.
    expect(csv).toContain("Ade Johnson");

    // data_export activity recorded via service-role client.
    expect(mockServiceFrom).toHaveBeenCalledWith("activity_log");
    const inserted = mockServiceInsert.mock.calls[0][0] as Record<string, unknown>;
    expect(inserted.action_type).toBe("data_export");
  });
});
