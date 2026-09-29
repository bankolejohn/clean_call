/**
 * Integration tests for the Phase 3 collection-request workflow.
 *
 * Follows the same harness style as tests/integration/api-phase2.test.ts: the
 * Supabase server/service clients and next/headers are mocked with vi.mock, so
 * these run in CI under Node 22 with NO database. Server actions and route
 * handlers are imported dynamically (after the mocks are registered) so they
 * pick up the mocks.
 *
 * Covers Tasks 9.3 (public submission), 10.3 (tracking + cancel), and 11.8
 * (admin API routes incl. the double-assign concurrency race).
 *
 * Validates: Requirements 5.4, 5.5, 5.6, 6.2, 6.4, 6.5, 7.2, 7.4, 8.5, 8.6,
 * 9.5, 9.6, 9.7, 4.6, 4.7, 4.8, 10.1, 10.2, 10.7, 10.8, 11.3-11.7, 13.1-13.3, 14.2
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

// ---------------------------------------------------------------------------
// Per-test state (reset in beforeEach)
// ---------------------------------------------------------------------------

// Terminal result for the AUTHED server client, keyed by table. Used by the
// list route, the detail route, and the candidates route's request lookup.
let tableResults: Record<string, unknown> = {};

/**
 * Terminal results for the SERVICE client, keyed by table. Each table may
 * supply, per terminal kind, either a single value or a QUEUE of values (values
 * are popped in order; the last value repeats once the queue is exhausted).
 *
 *   single      → resolved by `.single()`
 *   maybeSingle → resolved by `.maybeSingle()`
 *   list        → resolved by awaiting the builder or `.select()` terminally
 *
 * A `list` entry may be an array `[...]` (rows) or a `{ data, error, count }`
 * object. Arrays are wrapped as `{ data, error: null }`.
 */
type TerminalKind = "single" | "maybeSingle" | "list";
type ServiceTableConfig = Partial<Record<TerminalKind, unknown>>;
let serviceTableResults: Record<string, ServiceTableConfig> = {};

// Captures `.update(payload)` per client+table.
let lastServiceUpdatePayload: Record<string, Record<string, unknown> | undefined> = {};
let serviceUpdateCalled: Record<string, boolean> = {};

// Captures `.order(column, opts)` per table on the authed client.
let orderCalls: Record<string, Array<[string, unknown]>> = {};

// ---------------------------------------------------------------------------
// Queue helper: pop next value; the final value repeats once exhausted.
// ---------------------------------------------------------------------------
/** A queue of terminal values, popped in order (last value repeats). */
interface ValueQueue {
  __isQueue: true;
  values: unknown[];
}

function isQueue(x: unknown): x is ValueQueue {
  return typeof x === "object" && x !== null && (x as { __isQueue?: unknown }).__isQueue === true;
}

function nextValue(store: Record<string, ServiceTableConfig>, table: string, kind: TerminalKind): unknown {
  const entry = store[table]?.[kind];
  if (isQueue(entry)) {
    return entry.values.length > 1 ? entry.values.shift() : entry.values[0];
  }
  return entry;
}

/** Marks a set of values as a QUEUE (values popped in order) rather than a plain list result. */
function queue(...values: unknown[]): ValueQueue {
  return { __isQueue: true, values: values.slice() };
}

// ---------------------------------------------------------------------------
// Authed server client builder (mirrors phase2 makeQueryBuilder)
// ---------------------------------------------------------------------------
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
  builder.is = vi.fn(chain);
  builder.gte = vi.fn(chain);
  builder.lte = vi.fn(chain);
  builder.contains = vi.fn(chain);
  builder.range = vi.fn(chain);
  builder.limit = vi.fn(chain);

  builder.order = vi.fn((column: string, opts: unknown) => {
    (orderCalls[table] ??= []).push([column, opts]);
    return builder;
  });

  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  builder.single = vi.fn(() => Promise.resolve(result));

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

// ---------------------------------------------------------------------------
// Service client builder
//
// Supports BOTH a chainable query builder (collection_requests / collectors
// select/update) AND `.from('activity_log').insert(...)`. `.insert(...)` is a
// spy so activity logging (and the create insert) can be asserted. The insert
// itself is awaitable and resolves via the `list`/`single` terminals, and is
// also chainable so `.insert(...).select(...).single()` works for the create
// action.
// ---------------------------------------------------------------------------
const mockServiceInsert = vi.fn();

function makeServiceBuilder(table: string) {
  const builder: Record<string, unknown> = {};
  const chain = (..._args: unknown[]) => builder;

  builder.select = vi.fn(chain);
  builder.eq = vi.fn(chain);
  builder.or = vi.fn(chain);
  builder.in = vi.fn(chain);
  builder.is = vi.fn(chain);
  builder.gte = vi.fn(chain);
  builder.lte = vi.fn(chain);
  builder.contains = vi.fn(chain);
  builder.range = vi.fn(chain);
  builder.limit = vi.fn(chain);
  builder.order = vi.fn(chain);

  builder.update = vi.fn((payload: Record<string, unknown>) => {
    serviceUpdateCalled[table] = true;
    lastServiceUpdatePayload[table] = payload;
    return builder;
  });

  // `.insert(...)` records the call (for activity assertions) and returns a
  // chainable/awaitable builder so both `insert(...).select().single()` (create)
  // and a bare awaited `insert(...)` (recordActivity) work.
  builder.insert = vi.fn((row: Record<string, unknown>) => {
    mockServiceInsert(table, row);
    return builder;
  });

  const listResult = () => {
    const entry = nextValue(serviceTableResults, table, "list");
    if (entry === undefined) return { data: null, error: null };
    if (Array.isArray(entry)) return { data: entry, error: null };
    return entry as { data?: unknown; error?: unknown; count?: number };
  };

  builder.maybeSingle = vi.fn(() =>
    Promise.resolve(nextValue(serviceTableResults, table, "maybeSingle") ?? { data: null, error: null })
  );
  builder.single = vi.fn(() =>
    Promise.resolve(nextValue(serviceTableResults, table, "single") ?? { data: null, error: null })
  );

  // Awaiting the builder directly (e.g. assign update `.select()`, candidates
  // collectors select, and recordActivity's bare insert) resolves the `list`
  // terminal. For activity_log inserts the default is `{ error: null }`.
  builder.then = (onFulfilled: (value: unknown) => unknown) => {
    if (table === "activity_log" && serviceTableResults[table]?.list === undefined) {
      return Promise.resolve({ error: null }).then(onFulfilled);
    }
    return Promise.resolve(listResult()).then(onFulfilled);
  };

  return builder;
}

const mockServiceFrom = vi.fn((table: string) => makeServiceBuilder(table));

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

function reqWithParams(params: Record<string, string> = {}) {
  return { nextUrl: { searchParams: new URLSearchParams(params) } } as never;
}
function reqWithJson(body: unknown) {
  return {
    json: () => Promise.resolve(body),
    nextUrl: { searchParams: new URLSearchParams() },
  } as never;
}
function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

/** Returns the activity_log inserts recorded through the service client. */
function activityInserts(): Array<Record<string, unknown>> {
  return mockServiceInsert.mock.calls
    .filter(([table]) => table === "activity_log")
    .map(([, row]) => row as Record<string, unknown>);
}
/** Returns the inserts recorded for a given table through the service client. */
function insertsFor(table: string): Array<Record<string, unknown>> {
  return mockServiceInsert.mock.calls
    .filter(([t]) => t === table)
    .map(([, row]) => row as Record<string, unknown>);
}

/** A fully-valid public submission FormData (future pickup date). */
function validSubmission(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  const fields: Record<string, string> = {
    full_name: "Ade Johnson",
    phone: "08012345678",
    email: "ade@example.com",
    pickup_address: "15 Fajuyi Road",
    lga: "Ado-Ekiti",
    waste_type: "RECYCLABLE",
    estimated_quantity: "3 bags",
    preferred_pickup_date: "2099-01-15",
    preferred_pickup_time: "Morning",
    ...overrides,
  };
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  tableResults = {};
  serviceTableResults = {};
  lastServiceUpdatePayload = {};
  serviceUpdateCalled = {};
  orderCalls = {};
  mockServiceInsert.mockReset();
  mockServiceFrom.mockImplementation((table: string) => makeServiceBuilder(table));
});

// ===========================================================================
// Task 9.3 — Public submission (createCollectionRequest)
// ===========================================================================

describe("9.3 Public submission (createCollectionRequest)", () => {
  it("happy path stores PENDING request with server-generated number/token and logs request_created", async () => {
    // create: insert(...).select(...).single() resolves the stored row.
    serviceTableResults.collection_requests = {
      single: {
        data: {
          id: "req-1",
          request_number: "CR-20990115-1234",
          tracking_token: "tok-abc",
        },
        error: null,
      },
    };

    const { createCollectionRequest } = await import(
      "@/lib/actions/create-collection-request"
    );
    const result = await createCollectionRequest(validSubmission());

    expect(result.success).toBe(true);
    expect(result.request_number).toBe("CR-20990115-1234");
    expect(result.tracking_token).toBe("tok-abc");

    // The insert into collection_requests carried the server-owned fields.
    const reqInserts = insertsFor("collection_requests");
    expect(reqInserts).toHaveLength(1);
    const inserted = reqInserts[0];
    expect(inserted.status).toBe("PENDING");
    expect(inserted.request_number).toMatch(/^CR-\d{8}-\d{4}$/);
    expect(typeof inserted.tracking_token).toBe("string");
    expect((inserted.tracking_token as string).length).toBeGreaterThan(0);

    // request_created activity recorded via the service-role client.
    const acts = activityInserts();
    expect(acts).toHaveLength(1);
    expect(acts[0].action_type).toBe("request_created");
  });

  it("invalid payload (bad phone) returns fieldErrors.phone and stores nothing", async () => {
    const { createCollectionRequest } = await import(
      "@/lib/actions/create-collection-request"
    );
    const result = await createCollectionRequest(
      validSubmission({ phone: "12345" })
    );

    expect(result.success).toBe(false);
    expect(result.fieldErrors?.phone).toBeDefined();

    // No collection_requests insert, no activity.
    expect(insertsFor("collection_requests")).toHaveLength(0);
    expect(activityInserts()).toHaveLength(0);
  });
});

// ===========================================================================
// Task 10.3 — Tracking + cancel (cancelCollectionRequest)
// ===========================================================================

describe("10.3 Tracking + cancel (cancelCollectionRequest)", () => {
  it("cancel on a cancellable status flips to CANCELLED and logs request_cancelled", async () => {
    serviceTableResults.collection_requests = {
      // by-token select
      maybeSingle: queue(
        { data: { id: "req-1", request_number: "CR-20990115-0001", status: "PENDING" }, error: null },
        // guarded update .select().maybeSingle() returns the cancelled row
        { data: { id: "req-1", request_number: "CR-20990115-0001", status: "CANCELLED" }, error: null }
      ),
    };

    const { cancelCollectionRequest } = await import(
      "@/lib/actions/cancel-collection-request"
    );
    const result = await cancelCollectionRequest("tok-abc");

    expect(result.success).toBe(true);
    expect(result.request_number).toBe("CR-20990115-0001");

    // Update payload carried CANCELLED + cancelled_at.
    expect(serviceUpdateCalled.collection_requests).toBe(true);
    expect(lastServiceUpdatePayload.collection_requests?.status).toBe("CANCELLED");
    expect(lastServiceUpdatePayload.collection_requests?.cancelled_at).toBeDefined();

    const acts = activityInserts();
    expect(acts).toHaveLength(1);
    expect(acts[0].action_type).toBe("request_cancelled");
  });

  it("cancel on a non-cancellable status (EN_ROUTE) fails and logs nothing / never updates", async () => {
    serviceTableResults.collection_requests = {
      maybeSingle: { data: { id: "req-1", request_number: "CR-1", status: "EN_ROUTE" }, error: null },
    };

    const { cancelCollectionRequest } = await import(
      "@/lib/actions/cancel-collection-request"
    );
    const result = await cancelCollectionRequest("tok-abc");

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no longer be cancelled/i);
    expect(serviceUpdateCalled.collection_requests).toBeUndefined();

    // No request_cancelled activity was logged.
    expect(activityInserts().some((a) => a.action_type === "request_cancelled")).toBe(false);
  });

  it("unknown token returns a generic not-found result", async () => {
    serviceTableResults.collection_requests = {
      maybeSingle: { data: null, error: null },
    };

    const { cancelCollectionRequest } = await import(
      "@/lib/actions/cancel-collection-request"
    );
    const result = await cancelCollectionRequest("does-not-exist");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Request not found.");
    expect(serviceUpdateCalled.collection_requests).toBeUndefined();
    expect(activityInserts()).toHaveLength(0);
  });
});

// ===========================================================================
// Task 11.8 — Admin API routes
// ===========================================================================

describe("11.8 Admin routes reject unauthenticated requests (401)", () => {
  beforeEach(() => unauthed());

  it("list GET returns 401 and no data", async () => {
    const { GET } = await import("@/app/api/admin/requests/route");
    const res = await GET(reqWithParams());
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Unauthorized");
  });

  it("detail GET returns 401", async () => {
    const { GET } = await import("@/app/api/admin/requests/[id]/route");
    const res = await GET(reqWithParams(), ctx("req-1"));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Unauthorized");
  });

  it("status PATCH returns 401 and never updates", async () => {
    const { PATCH } = await import("@/app/api/admin/requests/[id]/status/route");
    const res = await PATCH(reqWithJson({ status: "UNDER_REVIEW", fromExpected: "PENDING" }), ctx("req-1"));
    expect(res.status).toBe(401);
    expect(serviceUpdateCalled.collection_requests).toBeUndefined();
  });

  it("assign POST returns 401 and never updates", async () => {
    const { POST } = await import("@/app/api/admin/requests/[id]/assign/route");
    const res = await POST(
      reqWithJson({ collector_id: "00000000-0000-0000-0000-000000000001" }),
      ctx("req-1")
    );
    expect(res.status).toBe(401);
    expect(serviceUpdateCalled.collection_requests).toBeUndefined();
  });

  it("candidates GET returns 401", async () => {
    const { GET } = await import("@/app/api/admin/requests/[id]/candidates/route");
    const res = await GET(reqWithParams(), ctx("req-1"));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Unauthorized");
  });
});

describe("11.8 List GET", () => {
  it("returns 200 PaginatedResponse and orders created_at descending", async () => {
    authed();
    const rows = [
      { id: "req-2", request_number: "CR-2", status: "PENDING", created_at: "2024-02-01T00:00:00Z" },
      { id: "req-1", request_number: "CR-1", status: "ASSIGNED", created_at: "2024-01-01T00:00:00Z" },
    ];
    tableResults.collection_requests = { data: rows, count: 2, error: null };

    const { GET } = await import("@/app/api/admin/requests/route");
    const res = await GET(reqWithParams());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(rows);
    expect(body.total).toBe(2);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(20);

    const orders = orderCalls.collection_requests ?? [];
    expect(orders).toContainEqual(["created_at", { ascending: false }]);
  });
});

describe("11.8 Detail GET", () => {
  it("returns 200 with the row incl. internal_notes and an activity array when found", async () => {
    authed();
    const row = {
      id: "req-1",
      request_number: "CR-1",
      status: "PENDING",
      internal_notes: "call the customer first",
    };
    const activity = [
      { id: "a1", action_type: "request_created", metadata: { request_id: "req-1" }, created_at: "2024-01-01T00:00:00Z" },
    ];
    // Two authed .from() calls: collection_requests (maybeSingle) then activity_log (awaited).
    tableResults.collection_requests = { data: row, error: null };
    tableResults.activity_log = { data: activity, error: null };

    const { GET } = await import("@/app/api/admin/requests/[id]/route");
    const res = await GET(reqWithParams(), ctx("req-1"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.internal_notes).toBe("call the customer first");
    expect(Array.isArray(body.activity)).toBe(true);
    expect(body.activity).toEqual(activity);
  });

  it("returns 404 for an unknown id", async () => {
    authed();
    tableResults.collection_requests = { data: null, error: null };

    const { GET } = await import("@/app/api/admin/requests/[id]/route");
    const res = await GET(reqWithParams(), ctx("missing"));

    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("Not found");
  });
});

describe("11.8 Status PATCH", () => {
  it("valid transition updates status + reviewed_at, returns 200, logs request_reviewed", async () => {
    authed();
    // fromExpected provided → service loads request_number only, then guarded update.
    serviceTableResults.collection_requests = {
      maybeSingle: queue(
        { data: { request_number: "CR-1" }, error: null }, // load
        { data: { id: "req-1", request_number: "CR-1", status: "UNDER_REVIEW" }, error: null } // update .select().maybeSingle()
      ),
    };

    const { PATCH } = await import("@/app/api/admin/requests/[id]/status/route");
    const res = await PATCH(
      reqWithJson({ status: "UNDER_REVIEW", fromExpected: "PENDING" }),
      ctx("req-1")
    );

    expect(res.status).toBe(200);
    expect(serviceUpdateCalled.collection_requests).toBe(true);
    expect(lastServiceUpdatePayload.collection_requests?.status).toBe("UNDER_REVIEW");
    expect(lastServiceUpdatePayload.collection_requests?.reviewed_at).toBeDefined();

    const acts = activityInserts();
    expect(acts.some((a) => a.action_type === "request_reviewed")).toBe(true);
  });

  it("invalid transition (PENDING → COMPLETED) returns 400 and never updates", async () => {
    authed();
    serviceTableResults.collection_requests = {
      maybeSingle: { data: { request_number: "CR-1" }, error: null }, // load (fromExpected provided)
    };

    const { PATCH } = await import("@/app/api/admin/requests/[id]/status/route");
    const res = await PATCH(
      reqWithJson({ status: "COMPLETED", fromExpected: "PENDING" }),
      ctx("req-1")
    );

    expect(res.status).toBe(400);
    expect(serviceUpdateCalled.collection_requests).toBeUndefined();
  });

  it("self-transition (PENDING → PENDING) returns 400 and never updates", async () => {
    authed();
    serviceTableResults.collection_requests = {
      maybeSingle: { data: { request_number: "CR-1" }, error: null },
    };

    const { PATCH } = await import("@/app/api/admin/requests/[id]/status/route");
    const res = await PATCH(
      reqWithJson({ status: "PENDING", fromExpected: "PENDING" }),
      ctx("req-1")
    );

    expect(res.status).toBe(400);
    expect(serviceUpdateCalled.collection_requests).toBeUndefined();
  });

  it("to === 'ASSIGNED' returns 400 and never updates", async () => {
    authed();
    serviceTableResults.collection_requests = {
      maybeSingle: { data: { request_number: "CR-1" }, error: null },
    };

    const { PATCH } = await import("@/app/api/admin/requests/[id]/status/route");
    const res = await PATCH(
      reqWithJson({ status: "ASSIGNED", fromExpected: "PENDING" }),
      ctx("req-1")
    );

    expect(res.status).toBe(400);
    expect(serviceUpdateCalled.collection_requests).toBeUndefined();
  });
});

describe("11.8 Assign POST", () => {
  const COLLECTOR_ID = "00000000-0000-0000-0000-000000000001";

  it("success sets ASSIGNED + assigned_at + collector_id, returns 200, logs request_assigned", async () => {
    authed();
    serviceTableResults.collectors = {
      maybeSingle: { data: { id: COLLECTOR_ID, status: "Active" }, error: null },
    };
    serviceTableResults.collection_requests = {
      // guarded update .select() awaited → array of updated rows
      list: { data: [{ id: "req-1", request_number: "CR-1", status: "ASSIGNED", collector_id: COLLECTOR_ID }], error: null },
    };

    const { POST } = await import("@/app/api/admin/requests/[id]/assign/route");
    const res = await POST(reqWithJson({ collector_id: COLLECTOR_ID }), ctx("req-1"));

    expect(res.status).toBe(200);
    expect(lastServiceUpdatePayload.collection_requests?.status).toBe("ASSIGNED");
    expect(lastServiceUpdatePayload.collection_requests?.assigned_at).toBeDefined();
    expect(lastServiceUpdatePayload.collection_requests?.collector_id).toBe(COLLECTOR_ID);

    const acts = activityInserts();
    expect(acts.some((a) => a.action_type === "request_assigned")).toBe(true);
  });

  it("inactive/invalid collector returns 400 and never updates", async () => {
    authed();
    serviceTableResults.collectors = {
      maybeSingle: { data: { id: COLLECTOR_ID, status: "Inactive" }, error: null },
    };

    const { POST } = await import("@/app/api/admin/requests/[id]/assign/route");
    const res = await POST(reqWithJson({ collector_id: COLLECTOR_ID }), ctx("req-1"));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid/i);
    expect(serviceUpdateCalled.collection_requests).toBeUndefined();
  });

  it("DOUBLE-ASSIGN concurrency race: exactly one 200 and one 400", async () => {
    authed();
    // Both concurrent calls pass the collector-active check.
    serviceTableResults.collectors = {
      maybeSingle: { data: { id: COLLECTOR_ID, status: "Active" }, error: null },
    };
    // The guarded update returns a NON-EMPTY array to the first caller and an
    // EMPTY array to the second — the DB-level optimistic guard modelled as a
    // queue that yields [row] once, then [] thereafter.
    serviceTableResults.collection_requests = {
      list: queue(
        { data: [{ id: "req-1", request_number: "CR-1", status: "ASSIGNED", collector_id: COLLECTOR_ID }], error: null },
        { data: [], error: null }
      ),
    };

    const { POST } = await import("@/app/api/admin/requests/[id]/assign/route");

    const [a, b] = await Promise.all([
      POST(reqWithJson({ collector_id: COLLECTOR_ID }), ctx("req-1")),
      POST(reqWithJson({ collector_id: COLLECTOR_ID }), ctx("req-1")),
    ]);

    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([200, 400]);

    const winner = a.status === 200 ? a : b;
    const loser = a.status === 400 ? a : b;
    expect(winner.status).toBe(200);
    expect(loser.status).toBe(400);
    expect((await loser.json()).error).toMatch(/already assigned or not in an assignable state/i);

    // Exactly one request_assigned log for the single winner.
    expect(activityInserts().filter((x) => x.action_type === "request_assigned")).toHaveLength(1);
  });
});

describe("11.8 Candidates GET", () => {
  const REQ_LGA = "Ado-Ekiti";

  it("returns only Active + service-area + waste-compatible collectors, capped at 50", async () => {
    authed();
    // Request lookup goes through the AUTHED client.
    tableResults.collection_requests = {
      data: { lga: REQ_LGA, waste_type: "RECYCLABLE" },
      error: null,
    };
    // Collectors query goes through the SERVICE client. The route already filters
    // status=Active + service-area at the query level; we return that pre-filtered
    // set and assert the in-memory waste-compatibility filter + cap.
    const many = Array.from({ length: 60 }, (_, i) => ({
      id: `c-${i}`,
      business_name: `Recycler ${i}`,
      service_areas: [REQ_LGA],
      waste_types: ["Recyclables"], // compatible with RECYCLABLE
      status: "Active",
    }));
    const incompatible = {
      id: "c-med",
      business_name: "Medico",
      service_areas: [REQ_LGA],
      waste_types: ["Medical waste"], // NOT compatible with RECYCLABLE
      status: "Active",
    };
    serviceTableResults.collectors = { list: { data: [...many, incompatible], error: null } };

    const { GET } = await import("@/app/api/admin/requests/[id]/candidates/route");
    const res = await GET(reqWithParams(), ctx("req-1"));

    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ id: string }>;
    expect(body).toHaveLength(50); // capped
    expect(body.every((c) => c.id.startsWith("c-") && c.id !== "c-med")).toBe(true);
  });

  it("returns an empty list when no collector is waste-compatible", async () => {
    authed();
    tableResults.collection_requests = {
      data: { lga: REQ_LGA, waste_type: "RECYCLABLE" },
      error: null,
    };
    serviceTableResults.collectors = {
      list: {
        data: [
          { id: "c-med", business_name: "Medico", service_areas: [REQ_LGA], waste_types: ["Medical"], status: "Active" },
        ],
        error: null,
      },
    };

    const { GET } = await import("@/app/api/admin/requests/[id]/candidates/route");
    const res = await GET(reqWithParams(), ctx("req-1"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});
