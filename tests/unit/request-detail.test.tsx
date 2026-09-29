import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";

// --- next/navigation mock -------------------------------------------------
// The detail page reads useParams().id and fetches on mount. useRouter is not
// used by the page but is mocked defensively in case that changes.
const useParams = vi.fn<() => { id: string }>();

vi.mock("next/navigation", () => ({
  useParams: () => useParams(),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

import RequestDetailPage from "@/app/admin/requests/[id]/page";
import type { CollectionRequest } from "@/types";

// --- Radix Select needs a few DOM APIs jsdom does not implement -----------
beforeEach(() => {
  useParams.mockReturnValue({ id: "req-1" });

  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {};
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Build a full CollectionRequest detail payload with sensible defaults. */
function makeDetail(
  overrides: Partial<CollectionRequest> = {}
): CollectionRequest & { activity: unknown[] } {
  return {
    id: "req-1",
    request_number: "CR-20260101-0001",
    tracking_token: "tok-abc",
    full_name: "Ada Obi",
    phone: "08012345678",
    email: null,
    customer_id: null,
    pickup_address: "12 Market Road",
    lga: "Ado-Ekiti",
    waste_type: "HOUSEHOLD",
    estimated_quantity: "3 bags",
    bin_bag_count: null,
    preferred_pickup_date: "2999-01-01",
    preferred_pickup_time: "Morning",
    additional_notes: null,
    photo_url: null,
    willingness_to_pay: null,
    price_range: null,
    collector_id: null,
    status: "PENDING",
    internal_notes: null,
    created_at: "2026-01-01T09:00:00.000Z",
    updated_at: "2026-01-01T09:00:00.000Z",
    reviewed_at: null,
    assigned_at: null,
    accepted_at: null,
    en_route_at: null,
    completed_at: null,
    cancelled_at: null,
    activity: [],
    ...overrides,
  } as CollectionRequest & { activity: unknown[] };
}

/** Stub global fetch so the detail route resolves the given payload. */
function stubFetch(payload: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => payload,
    })) as unknown as typeof fetch
  );
}

describe("RequestDetailPage", () => {
  it("A: renders 'Not recorded' for null fields (Requirement 9.3)", async () => {
    stubFetch(
      makeDetail({
        email: null,
        bin_bag_count: null,
        willingness_to_pay: null,
        price_range: null,
        additional_notes: null,
        status: "PENDING",
      })
    );

    render(<RequestDetailPage />);

    // The component sets state after the async fetch resolves.
    const notRecorded = await screen.findAllByText("Not recorded");
    expect(notRecorded.length).toBeGreaterThanOrEqual(1);
  });

  it("B: status control offers only valid transitions from PENDING", async () => {
    // PENDING → UNDER_REVIEW / CANCELLED / DISPUTED (never ASSIGNED/COMPLETED).
    stubFetch(makeDetail({ status: "PENDING" }));

    render(<RequestDetailPage />);

    // Wait for the request to load — the status control renders afterward.
    const trigger = await screen.findByRole("combobox", { name: /new status/i });

    // Open the shadcn/Radix Select to render its options into the DOM.
    fireEvent.pointerDown(
      trigger,
      new MouseEvent("pointerdown", { bubbles: true, button: 0 } as MouseEventInit)
    );
    fireEvent.click(trigger);

    const options = await screen.findAllByRole("option");
    const optionText = options.map((o) => (o.textContent ?? "").trim());

    // Valid generic transition targets are present.
    expect(optionText).toContain("UNDER_REVIEW");
    expect(optionText).toContain("CANCELLED");
    expect(optionText).toContain("DISPUTED");

    // ASSIGNED and COMPLETED are NOT selectable generic targets from PENDING.
    expect(optionText).not.toContain("ASSIGNED");
    expect(optionText).not.toContain("COMPLETED");
  });

  it("C: shows 'Awaiting assignment' when no collector is assigned", async () => {
    stubFetch(makeDetail({ collector_id: null }));

    render(<RequestDetailPage />);

    expect(await screen.findByText("Awaiting assignment")).toBeInTheDocument();
  });

  it("C2: shows the assigned collector when collector_id is set", async () => {
    stubFetch(
      makeDetail({ collector_id: "collector-xyz", status: "ASSIGNED" })
    );

    render(<RequestDetailPage />);

    // The assignment card renders "Assigned to Waste Manager:" plus the id.
    expect(await screen.findByText(/Assigned to Waste Manager/i)).toBeInTheDocument();
    expect(screen.getByText("collector-xyz")).toBeInTheDocument();
  });
});
