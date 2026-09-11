import { describe, it, expect } from "vitest";
import { displayField, NOT_RECORDED } from "@/lib/utils/display";
import { displayEntity } from "@/lib/utils/terminology";

// The detail pages (customers/[id], collectors/[id]) are async server
// components that call the Supabase server client + notFound(), which are
// awkward to render in jsdom. These tests cover the null-display and
// terminology behavior the detail views rely on
// (Requirements 9.2, 11.1, 11.2).

describe("Detail rendering — null-safe field display", () => {
  it("returns 'Not recorded' for null (Requirement 9.2)", () => {
    expect(displayField(null)).toBe("Not recorded");
    expect(displayField(null)).toBe(NOT_RECORDED);
  });

  it("returns 'Not recorded' for undefined", () => {
    expect(displayField(undefined)).toBe(NOT_RECORDED);
  });

  it("returns 'Not recorded' for empty string", () => {
    expect(displayField("")).toBe(NOT_RECORDED);
  });

  it("returns 'Not recorded' for an empty array", () => {
    expect(displayField([])).toBe(NOT_RECORDED);
  });

  it("returns the value as a string when present", () => {
    expect(displayField("Ado-Ekiti")).toBe("Ado-Ekiti");
    expect(displayField(42)).toBe("42");
    expect(displayField(0)).toBe("0");
    expect(displayField(false)).toBe("false");
  });

  it("joins non-empty arrays with a comma separator", () => {
    expect(displayField(["Organic", "Plastic"])).toBe("Organic, Plastic");
  });
});

describe("Detail rendering — waste-manager terminology", () => {
  it("displays 'Waste Manager' for the collector entity (Requirements 11.1, 11.2)", () => {
    expect(displayEntity("collector")).toBe("Waste Manager");
  });

  it("displays 'Waste Managers' for the plural collectors entity", () => {
    expect(displayEntity("collectors")).toBe("Waste Managers");
  });
});
