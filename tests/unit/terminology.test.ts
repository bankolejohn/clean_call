import { describe, it, expect } from "vitest";
import { displayEntity, TERMINOLOGY } from "@/lib/utils/terminology";

describe("Terminology Mapping", () => {
  describe("displayEntity", () => {
    it('returns "Waste Manager" for the singular "collector" key', () => {
      expect(displayEntity("collector")).toBe("Waste Manager");
    });

    it('returns "Waste Managers" for the plural "collectors" key', () => {
      expect(displayEntity("collectors")).toBe("Waste Managers");
    });
  });

  describe("TERMINOLOGY map", () => {
    it("maps the expected singular and plural keys to display labels", () => {
      expect(TERMINOLOGY).toEqual({
        collector: "Waste Manager",
        collectors: "Waste Managers",
      });
    });

    it('exposes the singular "collector" key', () => {
      expect(TERMINOLOGY.collector).toBe("Waste Manager");
    });

    it('exposes the plural "collectors" key', () => {
      expect(TERMINOLOGY.collectors).toBe("Waste Managers");
    });
  });
});
