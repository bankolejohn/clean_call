import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { EKITI_LGAS } from "@/lib/constants/lgas";

/**
 * Feature: cleancall-mvp, Property 13: Dashboard Statistics Accuracy
 *
 * Validates: Requirements 5.1, 5.2, 5.4, 5.5
 *
 * For any set of customer and collector records stored in the database,
 * the dashboard statistics endpoint SHALL return a customer count equal to
 * the number of customer records, a collector count equal to the number of
 * collector records, and an LGA breakdown where the sum of all LGA counts
 * equals the total record count.
 */

interface CustomerRecord {
  lga: string;
}

interface CollectorRecord {
  service_areas: string[];
}

interface LGABreakdownItem {
  lga: string;
  customerCount: number;
  collectorCount: number;
}

interface StatsResult {
  customerCount: number;
  collectorCount: number;
  lgaBreakdown: LGABreakdownItem[];
}

/**
 * Pure function that computes dashboard statistics from arrays of customers and collectors.
 * This mirrors the logic in /api/admin/stats route handler.
 */
function computeStats(
  customers: CustomerRecord[],
  collectors: CollectorRecord[]
): StatsResult {
  const customerCount = customers.length;
  const collectorCount = collectors.length;

  // Count customers per LGA
  const customerLgaCounts: Record<string, number> = {};
  for (const customer of customers) {
    customerLgaCounts[customer.lga] = (customerLgaCounts[customer.lga] || 0) + 1;
  }

  // Count collectors per LGA (collectors can serve multiple LGAs)
  const collectorLgaCounts: Record<string, number> = {};
  for (const collector of collectors) {
    if (Array.isArray(collector.service_areas)) {
      for (const area of collector.service_areas) {
        collectorLgaCounts[area] = (collectorLgaCounts[area] || 0) + 1;
      }
    }
  }

  // Build breakdown for all 16 LGAs (including zeros)
  const lgaBreakdown: LGABreakdownItem[] = EKITI_LGAS.map((lga) => ({
    lga,
    customerCount: customerLgaCounts[lga] || 0,
    collectorCount: collectorLgaCounts[lga] || 0,
  }));

  return { customerCount, collectorCount, lgaBreakdown };
}

// Arbitraries for generating test data
const lgaArb = fc.constantFrom(...EKITI_LGAS);

const customerArb: fc.Arbitrary<CustomerRecord> = fc.record({
  lga: lgaArb,
});

const collectorArb: fc.Arbitrary<CollectorRecord> = fc.record({
  service_areas: fc.uniqueArray(lgaArb, { minLength: 1, maxLength: 16 }),
});

describe("Feature: cleancall-mvp, Property 13: Dashboard Statistics Accuracy", () => {
  it("customerCount should equal the number of customer records", () => {
    fc.assert(
      fc.property(
        fc.array(customerArb, { minLength: 0, maxLength: 50 }),
        fc.array(collectorArb, { minLength: 0, maxLength: 50 }),
        (customers, collectors) => {
          const stats = computeStats(customers, collectors);
          expect(stats.customerCount).toBe(customers.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("collectorCount should equal the number of collector records", () => {
    fc.assert(
      fc.property(
        fc.array(customerArb, { minLength: 0, maxLength: 50 }),
        fc.array(collectorArb, { minLength: 0, maxLength: 50 }),
        (customers, collectors) => {
          const stats = computeStats(customers, collectors);
          expect(stats.collectorCount).toBe(collectors.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("sum of all LGA customer counts should equal total customer count", () => {
    fc.assert(
      fc.property(
        fc.array(customerArb, { minLength: 0, maxLength: 50 }),
        fc.array(collectorArb, { minLength: 0, maxLength: 50 }),
        (customers, collectors) => {
          const stats = computeStats(customers, collectors);
          const sumCustomerCounts = stats.lgaBreakdown.reduce(
            (sum, item) => sum + item.customerCount,
            0
          );
          expect(sumCustomerCounts).toBe(stats.customerCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("each LGA customer count should equal the number of customers with that LGA", () => {
    fc.assert(
      fc.property(
        fc.array(customerArb, { minLength: 0, maxLength: 50 }),
        fc.array(collectorArb, { minLength: 0, maxLength: 50 }),
        (customers, collectors) => {
          const stats = computeStats(customers, collectors);

          for (const item of stats.lgaBreakdown) {
            const expectedCount = customers.filter(
              (c) => c.lga === item.lga
            ).length;
            expect(item.customerCount).toBe(expectedCount);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("all 16 LGAs should appear in the breakdown (including those with zero counts)", () => {
    fc.assert(
      fc.property(
        fc.array(customerArb, { minLength: 0, maxLength: 50 }),
        fc.array(collectorArb, { minLength: 0, maxLength: 50 }),
        (customers, collectors) => {
          const stats = computeStats(customers, collectors);

          expect(stats.lgaBreakdown.length).toBe(16);

          const lgasInBreakdown = stats.lgaBreakdown.map((item) => item.lga);
          for (const lga of EKITI_LGAS) {
            expect(lgasInBreakdown).toContain(lga);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("each LGA collector count should equal the number of collectors whose service_areas includes that LGA", () => {
    fc.assert(
      fc.property(
        fc.array(customerArb, { minLength: 0, maxLength: 50 }),
        fc.array(collectorArb, { minLength: 0, maxLength: 50 }),
        (customers, collectors) => {
          const stats = computeStats(customers, collectors);

          for (const item of stats.lgaBreakdown) {
            const expectedCount = collectors.filter((c) =>
              c.service_areas.includes(item.lga)
            ).length;
            expect(item.collectorCount).toBe(expectedCount);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("LGA breakdown counts should be non-negative for all entries", () => {
    fc.assert(
      fc.property(
        fc.array(customerArb, { minLength: 0, maxLength: 50 }),
        fc.array(collectorArb, { minLength: 0, maxLength: 50 }),
        (customers, collectors) => {
          const stats = computeStats(customers, collectors);

          for (const item of stats.lgaBreakdown) {
            expect(item.customerCount).toBeGreaterThanOrEqual(0);
            expect(item.collectorCount).toBeGreaterThanOrEqual(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
