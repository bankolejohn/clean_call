import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// Mutable mock backing values so we can vary them per test.
const usePathname = vi.fn<() => string>();
const useSearchParams = vi.fn<() => URLSearchParams>();

// Mock next/navigation (mirrors tests/unit/navigation.test.tsx).
vi.mock("next/navigation", () => ({
  usePathname: () => usePathname(),
  useSearchParams: () => useSearchParams(),
}));

// Mock the logoutAdmin server action to avoid pulling in server-only code.
vi.mock("@/lib/actions/auth", () => ({
  logoutAdmin: vi.fn(),
}));

import AdminLayout from "@/app/admin/layout";

/**
 * Return the accessible names of the FIRST occurrence of each nav link label,
 * preserving DOM order. The desktop and mobile navs both render the same
 * top-level links, so each label appears more than once; we de-duplicate by
 * keeping the first occurrence to reason about ordering deterministically.
 */
function firstOccurrenceLinkOrder(): string[] {
  const links = screen.getAllByRole("link");
  const seen = new Set<string>();
  const order: string[] = [];
  for (const link of links) {
    const name = (link.textContent ?? "").trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    order.push(name);
  }
  return order;
}

describe("AdminLayout Phase 3 navigation", () => {
  beforeEach(() => {
    cleanup();
    useSearchParams.mockReturnValue(new URLSearchParams(""));
  });

  it("renders a 'Collection Requests' nav link (Requirement 15.1/15.2)", () => {
    usePathname.mockReturnValue("/admin/requests");
    render(<AdminLayout>{<div>child</div>}</AdminLayout>);

    // Desktop + mobile navs both render the link; expect at least one.
    const links = screen.getAllByRole("link", { name: "Collection Requests" });
    expect(links.length).toBeGreaterThanOrEqual(1);
  });

  it("orders 'Collection Requests' between 'Waste Managers' and 'Locations'", () => {
    // Ordering is independent of the active path; pick a neutral admin path.
    usePathname.mockReturnValue("/admin/dashboard");
    render(<AdminLayout>{<div>child</div>}</AdminLayout>);

    const order = firstOccurrenceLinkOrder();
    const wasteManagers = order.indexOf("Waste Managers");
    const collectionRequests = order.indexOf("Collection Requests");
    const locations = order.indexOf("Locations");

    expect(wasteManagers).toBeGreaterThanOrEqual(0);
    expect(collectionRequests).toBeGreaterThanOrEqual(0);
    expect(locations).toBeGreaterThanOrEqual(0);

    expect(collectionRequests).toBeGreaterThan(wasteManagers);
    expect(collectionRequests).toBeLessThan(locations);
  });

  it("renders the request sub-views on a requests path (Requirement 15.3)", () => {
    usePathname.mockReturnValue("/admin/requests");
    render(<AdminLayout>{<div>child</div>}</AdminLayout>);

    for (const label of ["All", "Pending", "Assigned", "Completed", "Cancelled"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(1);
    }
  });
});
