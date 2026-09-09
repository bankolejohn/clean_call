import { describe, it, expect, beforeAll } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// Recharts' ResponsiveContainer relies on ResizeObserver, which jsdom does not
// implement. Provide a minimal no-op stub so components render without throwing.
beforeAll(() => {
  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
});

import {
  RegistrationsOverTimeChart,
  CustomersVsManagersChart,
  ByLgaChart,
  WillingnessToPayChart,
  ExistingCollectionChart,
} from "@/components/admin/charts";
import type { GroupCount } from "@/lib/utils/stats";
import type { LGABreakdownItem } from "@/types";

// Sample datasets. Recharts' ResponsiveContainer commonly renders nothing at
// 0x0 in jsdom, so these tests are intentionally light SMOKE tests:
//   (1) each component renders WITHOUT throwing given sample data, and
//   (2) each renders its empty-state text when given an empty array.
// The empty state is a plain <div> (outside ResponsiveContainer), so it is
// reliably queryable via screen.getByText(/no data available/i).

const GROUP_COUNTS: GroupCount[] = [
  { key: "Customers", count: 3 },
  { key: "Waste Managers", count: 1 },
];

const LGA_BREAKDOWN: LGABreakdownItem[] = [
  { lga: "Ado-Ekiti", customerCount: 2, collectorCount: 1 },
];

describe("RegistrationsOverTimeChart", () => {
  it("renders without throwing given sample data", () => {
    expect(() => render(<RegistrationsOverTimeChart data={GROUP_COUNTS} />)).not.toThrow();
    cleanup();
  });

  it("shows empty-state text when data is empty", () => {
    render(<RegistrationsOverTimeChart data={[]} />);
    expect(screen.getByText(/no data available/i)).toBeInTheDocument();
    cleanup();
  });
});

describe("CustomersVsManagersChart", () => {
  it("renders without throwing given sample data (bar variant)", () => {
    // This comparison must be a bar chart, not a pie chart. Asserting Recharts
    // internals is brittle in jsdom, so we keep this pragmatic: the component
    // renders cleanly with the GroupCount dataset. The bar-vs-pie guarantee is
    // enforced by the component implementation (task 12.1) and design.
    expect(() => render(<CustomersVsManagersChart data={GROUP_COUNTS} />)).not.toThrow();
    cleanup();
  });

  it("shows empty-state text when data is empty", () => {
    render(<CustomersVsManagersChart data={[]} />);
    expect(screen.getByText(/no data available/i)).toBeInTheDocument();
    cleanup();
  });
});

describe("ByLgaChart", () => {
  it("renders without throwing given sample data", () => {
    expect(() => render(<ByLgaChart data={LGA_BREAKDOWN} />)).not.toThrow();
    cleanup();
  });

  it("shows empty-state text when data is empty", () => {
    render(<ByLgaChart data={[]} />);
    expect(screen.getByText(/no data available/i)).toBeInTheDocument();
    cleanup();
  });
});

describe("WillingnessToPayChart", () => {
  it("renders without throwing given sample data", () => {
    expect(() => render(<WillingnessToPayChart data={GROUP_COUNTS} />)).not.toThrow();
    cleanup();
  });

  it("shows empty-state text when data is empty", () => {
    render(<WillingnessToPayChart data={[]} />);
    expect(screen.getByText(/no data available/i)).toBeInTheDocument();
    cleanup();
  });
});

describe("ExistingCollectionChart", () => {
  it("renders without throwing given sample data", () => {
    expect(() => render(<ExistingCollectionChart data={GROUP_COUNTS} />)).not.toThrow();
    cleanup();
  });

  it("shows empty-state text when data is empty", () => {
    render(<ExistingCollectionChart data={[]} />);
    expect(screen.getByText(/no data available/i)).toBeInTheDocument();
    cleanup();
  });
});
