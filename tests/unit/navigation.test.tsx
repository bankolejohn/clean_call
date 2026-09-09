import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// Mutable mock backing values so we can vary them per test.
const usePathname = vi.fn<() => string>();
const useSearchParams = vi.fn<() => URLSearchParams>();

// Mock next/navigation (see components.test.tsx for the mock style).
vi.mock("next/navigation", () => ({
  usePathname: () => usePathname(),
  useSearchParams: () => useSearchParams(),
}));

// Mock the logoutAdmin server action to avoid pulling in server-only code.
vi.mock("@/lib/actions/auth", () => ({
  logoutAdmin: vi.fn(),
}));

import AdminLayout from "@/app/admin/layout";

// The seven top-level areas (Requirement 15.1).
const TOP_LEVEL = [
  "Dashboard",
  "Customers",
  "Waste Managers",
  "Locations",
  "Analytics",
  "Exports",
  "Settings",
];

describe("AdminLayout navigation", () => {
  beforeEach(() => {
    cleanup();
    // Default: no query string.
    useSearchParams.mockReturnValue(new URLSearchParams(""));
  });

  it("renders all seven top-level nav areas (Requirement 15.1)", () => {
    usePathname.mockReturnValue("/admin/registrations/customers");
    render(<AdminLayout>{<div>child</div>}</AdminLayout>);

    for (const label of TOP_LEVEL) {
      // Desktop + mobile nav may both render the link; expect at least one.
      const links = screen.getAllByRole("link", { name: label });
      expect(links.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("renders the customers sub-views on a customers path (Requirement 15.2)", () => {
    usePathname.mockReturnValue("/admin/registrations/customers");
    render(<AdminLayout>{<div>child</div>}</AdminLayout>);

    for (const label of [
      "All",
      "Interested in Service",
      "Existing Collection",
      "No Collection",
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(1);
    }
  });

  it("renders the waste-manager sub-views on a collectors path (Requirement 15.3)", () => {
    usePathname.mockReturnValue("/admin/registrations/collectors");
    render(<AdminLayout>{<div>child</div>}</AdminLayout>);

    for (const label of [
      "All Providers",
      "Pending Verification",
      "Active",
      "Suspended",
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(1);
    }
  });

  it("bypasses the layout on the login page and renders only children", () => {
    usePathname.mockReturnValue("/admin/login");
    render(
      <AdminLayout>
        <div data-testid="login-child">login</div>
      </AdminLayout>
    );

    // Children are rendered.
    expect(screen.getByTestId("login-child")).toBeInTheDocument();
    // No admin brand / nav chrome.
    expect(screen.queryByText("CleanCall Admin")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
  });
});
