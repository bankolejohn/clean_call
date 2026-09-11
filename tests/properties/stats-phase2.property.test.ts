import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import {
  computeStats,
  groupCustomersByWillingness,
  groupCustomersByExistingCollection,
  groupByRole,
  groupRegistrationsByDate,
  groupByLga,
} from '@/lib/utils/stats';

import { EKITI_LGAS } from '@/lib/constants/lgas';
import { CUSTOMER_CATEGORIES } from '@/lib/constants/categories';
import { DISPOSAL_METHODS } from '@/lib/constants/disposal-methods';
import { COLLECTION_FREQUENCIES } from '@/lib/constants/frequencies';
import { CUSTOMER_STATUSES } from '@/lib/constants/customer-status';
import { PROVIDER_STATUSES } from '@/lib/constants/provider-status';
import { WILLINGNESS_TO_PAY } from '@/lib/constants/willingness-to-pay';
import { PRICE_RANGES } from '@/lib/constants/price-ranges';
import { EXISTING_COLLECTION_OPTIONS } from '@/lib/constants/existing-collection';
import { SATISFACTION_OPTIONS } from '@/lib/constants/satisfaction';
import { WANTS_MORE_CUSTOMERS } from '@/lib/constants/wants-more-customers';

import type { Customer, Collector } from '@/types';

/**
 * Property-based tests for the pure stat & aggregation helpers in
 * `src/lib/utils/stats.ts`. These target Correctness Properties 6-10 from
 * design.md for the cleancall-phase-2-admin feature.
 *
 * The generators below build `Customer[]` and `Collector[]` that MATCH the
 * `Customer`/`Collector` types in `@/types`, including the Phase 2 fields
 * (`status`, `updated_at`, `willingness_to_pay`, `has_existing_collection`,
 * etc). Optional Phase 2 fields are wrapped in `fc.option(..., { nil: undefined })`
 * so that null/undefined and zero-match cases (e.g. Requirement 6.7 zero counts,
 * null `has_existing_collection`) are exercised by the generators themselves.
 */

// ---------------------------------------------------------------------------
// Membership sets mirroring the classification rules in stats.ts (Req 6.5, 6.6)
// ---------------------------------------------------------------------------

const INTERESTED_WILLINGNESS = new Set<string>(['Yes', 'Maybe - Depends on price']);
const WITH_EXISTING = new Set<string>(['Yes', 'Sometimes']);
const WITHOUT_EXISTING = new Set<string>(['No', 'I manage it myself']);

// ---------------------------------------------------------------------------
// Shared arbitraries
// ---------------------------------------------------------------------------

const lgaArb = fc.constantFrom(...EKITI_LGAS);

/** ISO timestamp arbitrary spanning a wide range (past and recent). */
const isoTimestampArb: fc.Arbitrary<string> = fc
  .date({
    min: new Date('2020-01-01T00:00:00.000Z'),
    max: new Date('2030-12-31T23:59:59.000Z'),
  })
  .map((d) => d.toISOString());

/**
 * Customer generator matching the `Customer` type. Optional Phase 2
 * market-research fields use `fc.option(..., { nil: undefined })` so null/undefined
 * (unrecorded) values are generated frequently, exercising the zero-match and
 * null-exclusion edge cases.
 */
const customerArb: fc.Arbitrary<Customer> = fc.record({
  id: fc.uuid(),
  full_name: fc.string({ minLength: 1, maxLength: 30 }),
  phone: fc.string({ minLength: 1, maxLength: 15 }),
  email: fc.option(fc.emailAddress(), { nil: undefined }),
  address: fc.string({ minLength: 1, maxLength: 40 }),
  lga: lgaArb,
  category: fc.constantFrom(...CUSTOMER_CATEGORIES),
  disposal_method: fc.constantFrom(...DISPOSAL_METHODS),
  collection_frequency: fc.constantFrom(...COLLECTION_FREQUENCIES),
  // Phase 2 optional fields — include undefined via fc.option
  willingness_to_pay: fc.option(fc.constantFrom(...WILLINGNESS_TO_PAY), {
    nil: undefined,
  }),
  preferred_price_range: fc.option(fc.constantFrom(...PRICE_RANGES), {
    nil: undefined,
  }),
  has_existing_collection: fc.option(
    fc.constantFrom(...EXISTING_COLLECTION_OPTIONS),
    { nil: undefined }
  ),
  satisfaction_with_existing: fc.option(fc.constantFrom(...SATISFACTION_OPTIONS), {
    nil: undefined,
  }),
  created_at: isoTimestampArb,
  status: fc.constantFrom(...CUSTOMER_STATUSES),
  updated_at: isoTimestampArb,
}) as fc.Arbitrary<Customer>;

/**
 * Collector generator matching the `Collector` type. `wants_more_customers`
 * is optional (nullable), and `service_areas` may be empty to exercise the
 * zero-coverage case.
 */
const collectorArb: fc.Arbitrary<Collector> = fc.record({
  id: fc.uuid(),
  business_name: fc.string({ minLength: 1, maxLength: 30 }),
  contact_person: fc.string({ minLength: 1, maxLength: 30 }),
  phone: fc.string({ minLength: 1, maxLength: 15 }),
  email: fc.emailAddress(),
  business_address: fc.string({ minLength: 1, maxLength: 40 }),
  service_areas: fc.uniqueArray(lgaArb, { minLength: 0, maxLength: 16 }),
  waste_types: fc.array(fc.string({ minLength: 1, maxLength: 10 }), {
    minLength: 0,
    maxLength: 5,
  }),
  staff_count: fc.nat({ max: 100 }),
  vehicle_count: fc.nat({ max: 50 }),
  years_in_operation: fc.nat({ max: 50 }),
  cac_number: fc.option(fc.string({ minLength: 1, maxLength: 12 }), {
    nil: undefined,
  }),
  wants_more_customers: fc.option(fc.constantFrom(...WANTS_MORE_CUSTOMERS), {
    nil: undefined,
  }),
  created_at: isoTimestampArb,
  status: fc.constantFrom(...PROVIDER_STATUSES),
  updated_at: isoTimestampArb,
}) as fc.Arbitrary<Collector>;

const customersArb = fc.array(customerArb, { minLength: 0, maxLength: 60 });
const collectorsArb = fc.array(collectorArb, { minLength: 0, maxLength: 60 });

// ---------------------------------------------------------------------------
// Property 6: Total users equals customers plus managers
// ---------------------------------------------------------------------------

describe('Feature: cleancall-phase-2-admin, Property 6: Total users equals customers plus managers', () => {
  // Feature: cleancall-phase-2-admin, Property 6: For any customer dataset and
  // any collector dataset, computeStats(...).totalUsers === customerCount +
  // collectorCount, counting only registration records.
  // Validates: Requirements 6.2
  it('totalUsers equals customers.length + collectors.length', () => {
    fc.assert(
      fc.property(customersArb, collectorsArb, (customers, collectors) => {
        const stats = computeStats(customers, collectors);
        expect(stats.totalUsers).toBe(customers.length + collectors.length);
        expect(stats.customerCount).toBe(customers.length);
        expect(stats.collectorCount).toBe(collectors.length);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 7: Provider status counts are exact
// ---------------------------------------------------------------------------

describe('Feature: cleancall-phase-2-admin, Property 7: Provider status counts are exact', () => {
  // Feature: cleancall-phase-2-admin, Property 7: For any collector dataset,
  // activeProviders === count(status === 'Active') and pendingProviders ===
  // count(status === 'Pending').
  // Validates: Requirements 6.4
  it('activeProviders and pendingProviders match exact status counts', () => {
    fc.assert(
      fc.property(customersArb, collectorsArb, (customers, collectors) => {
        const stats = computeStats(customers, collectors);
        const expectedActive = collectors.filter(
          (c) => c.status === 'Active'
        ).length;
        const expectedPending = collectors.filter(
          (c) => c.status === 'Pending'
        ).length;
        expect(stats.activeProviders).toBe(expectedActive);
        expect(stats.pendingProviders).toBe(expectedPending);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 8: Interested-in-paid membership is exact
// ---------------------------------------------------------------------------

describe('Feature: cleancall-phase-2-admin, Property 8: Interested-in-paid membership is exact', () => {
  // Feature: cleancall-phase-2-admin, Property 8: For any customer dataset,
  // customersInterestedInPaid === count(willingness_to_pay in {Yes,
  // 'Maybe - Depends on price'}); null/undefined willingness is excluded.
  // Validates: Requirements 6.5, 15.4
  it('customersInterestedInPaid equals count of Yes / Maybe - Depends on price', () => {
    fc.assert(
      fc.property(customersArb, collectorsArb, (customers, collectors) => {
        const stats = computeStats(customers, collectors);
        const expected = customers.filter(
          (c) =>
            c.willingness_to_pay != null &&
            INTERESTED_WILLINGNESS.has(c.willingness_to_pay)
        ).length;
        expect(stats.customersInterestedInPaid).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: Existing-collection partition is exact and excludes nulls
// ---------------------------------------------------------------------------

describe('Feature: cleancall-phase-2-admin, Property 9: Existing-collection partition is exact and excludes nulls', () => {
  // Feature: cleancall-phase-2-admin, Property 9: For any customer dataset,
  // customersWithExistingCollection === count in {Yes, Sometimes},
  // customersWithoutExistingCollection === count in {No, 'I manage it myself'},
  // and customers with null/undefined has_existing_collection are counted in
  // NEITHER bucket (with + without <= total).
  // Validates: Requirements 6.6, 6.7
  it('with/without partition is exact and null values are excluded from both', () => {
    fc.assert(
      fc.property(customersArb, collectorsArb, (customers, collectors) => {
        const stats = computeStats(customers, collectors);

        const expectedWith = customers.filter(
          (c) =>
            c.has_existing_collection != null &&
            WITH_EXISTING.has(c.has_existing_collection)
        ).length;
        const expectedWithout = customers.filter(
          (c) =>
            c.has_existing_collection != null &&
            WITHOUT_EXISTING.has(c.has_existing_collection)
        ).length;
        const classifiable = customers.filter(
          (c) =>
            c.has_existing_collection != null &&
            (WITH_EXISTING.has(c.has_existing_collection) ||
              WITHOUT_EXISTING.has(c.has_existing_collection))
        ).length;

        expect(stats.customersWithExistingCollection).toBe(expectedWith);
        expect(stats.customersWithoutExistingCollection).toBe(expectedWithout);

        // Nulls counted in neither bucket: buckets never exceed total, and
        // together they equal exactly the number of non-null classifiable values.
        expect(
          stats.customersWithExistingCollection +
            stats.customersWithoutExistingCollection
        ).toBeLessThanOrEqual(customers.length);
        expect(
          stats.customersWithExistingCollection +
            stats.customersWithoutExistingCollection
        ).toBe(classifiable);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 10: Chart aggregations sum to their input population
// ---------------------------------------------------------------------------

describe('Feature: cleancall-phase-2-admin, Property 10: Chart aggregations sum to their input population', () => {
  const sum = (groups: { count: number }[]) =>
    groups.reduce((acc, g) => acc + g.count, 0);

  // Feature: cleancall-phase-2-admin, Property 10: For each chart grouping,
  // the group counts sum to exactly the number of input records having a
  // non-null value for that dimension.
  // Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
  it('each chart grouping sums to its non-null input population', () => {
    fc.assert(
      fc.property(customersArb, collectorsArb, (customers, collectors) => {
        // by willingness to pay (Req 7.5): non-null willingness_to_pay
        const willingnessGroups = groupCustomersByWillingness(customers);
        const willingnessPop = customers.filter(
          (c) => c.willingness_to_pay != null
        ).length;
        expect(sum(willingnessGroups)).toBe(willingnessPop);

        // by has-existing-collection (Req 7.6): non-null has_existing_collection
        const existingGroups = groupCustomersByExistingCollection(customers);
        const existingPop = customers.filter(
          (c) => c.has_existing_collection != null
        ).length;
        expect(sum(existingGroups)).toBe(existingPop);

        // by role (Req 7.2): every record has a role, so it sums to the full population
        const roleGroups = groupByRole(customers, collectors);
        expect(sum(roleGroups)).toBe(customers.length + collectors.length);

        // by time bucket (Req 7.1): non-null / parseable created_at.
        // All generated created_at values are valid ISO strings, so every
        // record contributes exactly one to a day bucket.
        const dateGroups = groupRegistrationsByDate(customers, collectors);
        expect(sum(dateGroups)).toBe(customers.length + collectors.length);

        // by LGA (Req 7.3, 7.4): customer-count dimension — every customer has an
        // LGA, so the summed customer counts equal the customer population.
        const lgaGroups = groupByLga(customers, collectors);
        const lgaCustomerSum = lgaGroups.reduce(
          (acc, g) => acc + g.customerCount,
          0
        );
        const customerLgaPop = customers.filter((c) => c.lga != null).length;
        expect(lgaCustomerSum).toBe(customerLgaPop);
      }),
      { numRuns: 100 }
    );
  });
});
