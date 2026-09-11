import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import {
  filterCustomers,
  filterCollectors,
  type CustomerFilters,
  type CollectorFilters,
} from '@/lib/utils/filter';
import { displayField, NOT_RECORDED } from '@/lib/utils/display';
import { locationBreakdown } from '@/lib/utils/stats';
import { EKITI_LGAS } from '@/lib/constants/lgas';

import type { Customer, Collector } from '@/types';
import { CUSTOMER_CATEGORIES } from '@/lib/constants/categories';
import { WILLINGNESS_TO_PAY } from '@/lib/constants/willingness-to-pay';
import { EXISTING_COLLECTION_OPTIONS } from '@/lib/constants/existing-collection';
import { CUSTOMER_STATUSES } from '@/lib/constants/customer-status';
import { PROVIDER_STATUSES } from '@/lib/constants/provider-status';
import { WANTS_MORE_CUSTOMERS } from '@/lib/constants/wants-more-customers';

/**
 * Property-Based Tests for CleanCall Phase 2 filtering, pagination, display,
 * and location breakdown.
 *
 * Feature: cleancall-phase-2-admin
 *   Property 11: Filter soundness across all active conditions
 *   Property 12: Pagination partitions a sorted result without gaps or overlap
 *   Property 13: Null field values display as "Not recorded"
 *   Property 14: Location breakdown covers all 16 LGAs with exact counts
 *
 * Validates: Requirements 8.2, 8.3, 8.4, 8.5, 8.6, 10.2, 10.4, 13.3, 15.5,
 *            1.4, 9.2, 11.2, 12.1, 12.2, 12.3
 *
 * All generators intentionally include null/undefined for optional Phase 2
 * fields (via fc.option) so the null-exclusion semantics are exercised.
 */

const NUM_RUNS = 200;
const MIN_SEARCH_LENGTH = 2;

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** ISO timestamp in a bounded window so date-range filtering is meaningful. */
const isoTimestampArb: fc.Arbitrary<string> = fc
  .date({
    min: new Date('2024-01-01T00:00:00.000Z'),
    max: new Date('2025-12-31T23:59:59.000Z'),
  })
  .map((d) => d.toISOString());

const lgaArb = fc.constantFrom(...EKITI_LGAS);
const categoryArb = fc.constantFrom(...CUSTOMER_CATEGORIES);
const willingnessArb = fc.constantFrom(...WILLINGNESS_TO_PAY);
const existingCollectionArb = fc.constantFrom(...EXISTING_COLLECTION_OPTIONS);
const customerStatusArb = fc.constantFrom(...CUSTOMER_STATUSES);
const providerStatusArb = fc.constantFrom(...PROVIDER_STATUSES);
const wantsMoreArb = fc.constantFrom(...WANTS_MORE_CUSTOMERS);

/**
 * fc.option maps "none" to `undefined` by default, but the DB row types allow
 * `null` for optional fields too. Emit either null or undefined for optional
 * fields so both absence representations are exercised.
 */
function optionalNullable<T>(arb: fc.Arbitrary<T>): fc.Arbitrary<T | null | undefined> {
  return fc.oneof(
    { weight: 3, arbitrary: arb },
    { weight: 1, arbitrary: fc.constant(null) },
    { weight: 1, arbitrary: fc.constant(undefined) }
  ) as fc.Arbitrary<T | null | undefined>;
}

// Small text pools so search substrings actually collide sometimes.
const nameArb = fc.constantFrom(
  'Ada Obi',
  'Bola Ade',
  'Chidi Eze',
  'Femi Bello',
  'Grace John',
  'Halima Musa'
);
const phoneArb = fc.constantFrom(
  '08030000001',
  '08030000002',
  '07011112222',
  '09099998888'
);
const emailArb = fc.constantFrom(
  'a@example.com',
  'b@example.com',
  'contact@waste.ng',
  ''
);

const customerArb: fc.Arbitrary<Customer> = fc.record({
  id: fc.uuid(),
  full_name: nameArb,
  phone: phoneArb,
  email: emailArb,
  address: fc.constantFrom('12 Market St', '3 Church Rd', 'Plot 5 Estate', ''),
  lga: lgaArb,
  category: categoryArb,
  disposal_method: fc.constantFrom('Burning', 'Dumping', 'Buried'),
  collection_frequency: fc.constantFrom('Daily', 'Weekly', 'Monthly'),
  created_at: isoTimestampArb,
  updated_at: isoTimestampArb,
  status: customerStatusArb,
  willingness_to_pay: optionalNullable(willingnessArb),
  preferred_price_range: optionalNullable(fc.constantFrom('Below ₦2,000', 'Not sure')),
  has_existing_collection: optionalNullable(existingCollectionArb),
  satisfaction_with_existing: optionalNullable(fc.constantFrom('Yes', 'No', 'Somewhat')),
}) as fc.Arbitrary<Customer>;

const collectorArb: fc.Arbitrary<Collector> = fc.record({
  id: fc.uuid(),
  business_name: fc.constantFrom('EcoWaste', 'GreenBin', 'CleanCo', 'PureCollect'),
  contact_person: nameArb,
  phone: phoneArb,
  email: fc.constantFrom('biz@example.com', 'info@green.ng', ''),
  business_address: fc.constantFrom('1 Industrial Ave', '9 Depot Rd', ''),
  service_areas: fc.uniqueArray(lgaArb, { minLength: 0, maxLength: 16 }),
  waste_types: fc.uniqueArray(fc.constantFrom('Household', 'Plastic', 'Organic'), {
    minLength: 0,
    maxLength: 3,
  }),
  staff_count: fc.nat({ max: 50 }),
  vehicle_count: fc.nat({ max: 20 }),
  years_in_operation: fc.nat({ max: 30 }),
  cac_number: optionalNullable(fc.constantFrom('RC12345', 'RC67890')),
  created_at: isoTimestampArb,
  updated_at: isoTimestampArb,
  status: providerStatusArb,
  wants_more_customers: optionalNullable(wantsMoreArb),
}) as fc.Arbitrary<Collector>;

// Filter generators: each field is optional so ~half the fields are inactive.
const customerFiltersArb: fc.Arbitrary<CustomerFilters> = fc.record(
  {
    // Bias toward pool values (so filters sometimes match) but also allow noise.
    search: fc.oneof(fc.constantFrom('Ada', 'Bola', '0803', 'example', 'zz'), fc.string()),
    lga: lgaArb,
    category: categoryArb,
    willingness_to_pay: willingnessArb,
    has_existing_collection: existingCollectionArb,
    status: customerStatusArb,
    dateFrom: isoTimestampArb,
    dateTo: isoTimestampArb,
  },
  { requiredKeys: [] }
);

const collectorFiltersArb: fc.Arbitrary<CollectorFilters> = fc.record(
  {
    search: fc.oneof(fc.constantFrom('Eco', 'Green', 'Ada', '0803', 'zz'), fc.string()),
    lga: lgaArb,
    status: providerStatusArb,
    wants_more_customers: wantsMoreArb,
    dateFrom: isoTimestampArb,
    dateTo: isoTimestampArb,
  },
  { requiredKeys: [] }
);

// ---------------------------------------------------------------------------
// Independent reference predicates (mirror filter.ts semantics)
// ---------------------------------------------------------------------------

function isActive(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.length > 0;
}

function exactMatch(field: unknown, value: string): boolean {
  return field !== null && field !== undefined && String(field) === value;
}

function substringMatch(field: unknown, needle: string): boolean {
  if (field === null || field === undefined) return false;
  return String(field).toLowerCase().includes(needle);
}

function inDateRange(
  createdAt: unknown,
  dateFrom?: string | null,
  dateTo?: string | null
): boolean {
  if (createdAt === null || createdAt === undefined) return false;
  const ts = String(createdAt);
  if (isActive(dateFrom) && ts < dateFrom) return false;
  if (isActive(dateTo) && ts > dateTo) return false;
  return true;
}

/** Every active condition on a customer, evaluated independently. */
function customerPredicates(
  row: Customer,
  f: CustomerFilters
): boolean[] {
  const preds: boolean[] = [];
  const search = isActive(f.search) ? f.search.trim().toLowerCase() : '';
  if (search.length >= MIN_SEARCH_LENGTH) {
    preds.push(
      substringMatch(row.full_name, search) ||
        substringMatch(row.phone, search) ||
        substringMatch(row.email, search) ||
        substringMatch(row.address, search)
    );
  }
  if (isActive(f.lga)) preds.push(exactMatch(row.lga, f.lga));
  if (isActive(f.category)) preds.push(exactMatch(row.category, f.category));
  if (isActive(f.willingness_to_pay))
    preds.push(exactMatch(row.willingness_to_pay, f.willingness_to_pay));
  if (isActive(f.has_existing_collection))
    preds.push(exactMatch(row.has_existing_collection, f.has_existing_collection));
  if (isActive(f.status)) preds.push(exactMatch(row.status, f.status));
  if (isActive(f.dateFrom) || isActive(f.dateTo)) {
    preds.push(inDateRange(row.created_at, f.dateFrom, f.dateTo));
  }
  return preds;
}

/** Every active condition on a collector, evaluated independently. */
function collectorPredicates(
  row: Collector,
  f: CollectorFilters
): boolean[] {
  const preds: boolean[] = [];
  const search = isActive(f.search) ? f.search.trim().toLowerCase() : '';
  if (search.length >= MIN_SEARCH_LENGTH) {
    preds.push(
      substringMatch(row.business_name, search) ||
        substringMatch(row.contact_person, search) ||
        substringMatch(row.phone, search) ||
        substringMatch(row.email, search) ||
        substringMatch(row.business_address, search)
    );
  }
  if (isActive(f.lga)) {
    const areas = row.service_areas;
    preds.push(Array.isArray(areas) && areas.some((a) => String(a) === f.lga));
  }
  if (isActive(f.status)) preds.push(exactMatch(row.status, f.status));
  if (isActive(f.wants_more_customers))
    preds.push(exactMatch(row.wants_more_customers, f.wants_more_customers));
  if (isActive(f.dateFrom) || isActive(f.dateTo)) {
    preds.push(inDateRange(row.created_at, f.dateFrom, f.dateTo));
  }
  return preds;
}

// ---------------------------------------------------------------------------
// Pagination helper (no existing helper found under src/lib/utils; define a
// local range-based paginator mirroring Supabase .range() semantics).
// ---------------------------------------------------------------------------

function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

// ===========================================================================
// Property 11: Filter soundness across all active conditions
// ===========================================================================

describe('Feature: cleancall-phase-2-admin, Property 11: Filter soundness across all active conditions', () => {
  it('every returned customer satisfies ALL active conditions, and every excluded customer fails at least one', () => {
    fc.assert(
      fc.property(
        fc.array(customerArb, { minLength: 0, maxLength: 40 }),
        customerFiltersArb,
        (rows, filters) => {
          const result = filterCustomers(rows, filters);
          const resultIds = new Set(result.map((r) => r.id));

          // Soundness: each returned row satisfies every active predicate.
          for (const row of result) {
            const preds = customerPredicates(row, filters);
            expect(preds.every(Boolean)).toBe(true);
          }

          // Completeness: each excluded row fails at least one active condition.
          for (const row of rows) {
            if (resultIds.has(row.id)) continue;
            const preds = customerPredicates(row, filters);
            // If there are no active predicates, nothing may be excluded.
            expect(preds.some((p) => p === false)).toBe(true);
          }
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it('every returned waste manager satisfies ALL active conditions, and every excluded one fails at least one', () => {
    fc.assert(
      fc.property(
        fc.array(collectorArb, { minLength: 0, maxLength: 40 }),
        collectorFiltersArb,
        (rows, filters) => {
          const result = filterCollectors(rows, filters);
          const resultIds = new Set(result.map((r) => r.id));

          for (const row of result) {
            const preds = collectorPredicates(row, filters);
            expect(preds.every(Boolean)).toBe(true);
          }

          for (const row of rows) {
            if (resultIds.has(row.id)) continue;
            const preds = collectorPredicates(row, filters);
            expect(preds.some((p) => p === false)).toBe(true);
          }
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it('a record whose filtered field is null is excluded only when that filter specifies a non-null value', () => {
    fc.assert(
      fc.property(
        fc.array(customerArb, { minLength: 0, maxLength: 30 }),
        (rows) => {
          // Active status filter targeting a specific non-null value.
          const active = filterCustomers(rows, { status: 'New' });
          for (const row of active) expect(row.status).toBe('New');

          // With no active filter on willingness_to_pay, rows with a null
          // willingness value are NOT excluded on that basis.
          const noWillingnessFilter = filterCustomers(rows, {});
          expect(noWillingnessFilter.length).toBe(rows.length);

          // With an active willingness filter, null-valued rows are excluded.
          const withWillingness = filterCustomers(rows, {
            willingness_to_pay: 'Yes',
          });
          for (const row of withWillingness) {
            expect(row.willingness_to_pay).toBe('Yes');
          }
          const nullWillingness = rows.filter(
            (r) => r.willingness_to_pay == null
          );
          for (const row of nullWillingness) {
            expect(withWillingness.some((r) => r.id === row.id)).toBe(false);
          }
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });
});

// ===========================================================================
// Property 12: Pagination partitions a sorted result without gaps or overlap
// ===========================================================================

describe('Feature: cleancall-phase-2-admin, Property 12: Pagination partitions a sorted result without gaps or overlap', () => {
  it('concatenating all pages in order reproduces the full list exactly (no dupes/drops)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(), { minLength: 0, maxLength: 200 }),
        fc.integer({ min: 1, max: 25 }),
        (items, pageSize) => {
          const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
          const reassembled: number[] = [];
          for (let page = 1; page <= totalPages; page++) {
            reassembled.push(...paginate(items, page, pageSize));
          }
          expect(reassembled).toEqual(items);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it('each page holds min(pageSize, remaining) items', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(), { minLength: 0, maxLength: 200 }),
        fc.integer({ min: 1, max: 25 }),
        (items, pageSize) => {
          const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
          for (let page = 1; page <= totalPages; page++) {
            const remaining = Math.max(0, items.length - (page - 1) * pageSize);
            const expectedSize = Math.min(pageSize, remaining);
            expect(paginate(items, page, pageSize).length).toBe(expectedSize);
          }
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it('descending created_at order is preserved across the concatenated pages', () => {
    fc.assert(
      fc.property(
        fc.array(customerArb, { minLength: 0, maxLength: 100 }),
        fc.integer({ min: 1, max: 20 }),
        (rows, pageSize) => {
          // Sort by created_at descending first, then paginate.
          const sorted = [...rows].sort(
            (a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
          const reassembled: Customer[] = [];
          for (let page = 1; page <= totalPages; page++) {
            reassembled.push(...paginate(sorted, page, pageSize));
          }
          // Exact reproduction of the sorted list.
          expect(reassembled).toEqual(sorted);
          // Order is monotonically non-increasing on created_at.
          for (let i = 1; i < reassembled.length; i++) {
            const prev = new Date(reassembled[i - 1].created_at).getTime();
            const curr = new Date(reassembled[i].created_at).getTime();
            expect(prev).toBeGreaterThanOrEqual(curr);
          }
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });
});

// ===========================================================================
// Property 13: Null field values display as "Not recorded"
// ===========================================================================

describe('Feature: cleancall-phase-2-admin, Property 13: Null field values display as "Not recorded"', () => {
  it('returns NOT_RECORDED for null/undefined/empty and a value-containing string otherwise; never throws', () => {
    const nonEmptyValueArb = fc.oneof(
      fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0 && s !== ''),
      fc.integer(),
      fc.float({ noNaN: true }),
      fc.boolean(),
      fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 4 })
    );

    const anyValueArb = fc.oneof(
      fc.constant(null),
      fc.constant(undefined),
      fc.constant(''),
      fc.constant([]),
      nonEmptyValueArb
    );

    fc.assert(
      fc.property(anyValueArb, (value) => {
        // Never throws.
        let output = '';
        expect(() => {
          output = displayField(value);
        }).not.toThrow();

        const isEmptyish =
          value === null ||
          value === undefined ||
          value === '' ||
          (Array.isArray(value) && value.length === 0);

        if (isEmptyish) {
          expect(output).toBe(NOT_RECORDED);
        } else if (Array.isArray(value)) {
          // Non-empty arrays: output contains each element's string form.
          for (const el of value) {
            expect(output).toContain(String(el));
          }
        } else {
          // Scalars: output contains the stringified value.
          expect(output).toBe(String(value));
        }
      }),
      { numRuns: NUM_RUNS }
    );
  });
});

// ===========================================================================
// Property 14: Location breakdown covers all 16 LGAs with exact counts
// ===========================================================================

describe('Feature: cleancall-phase-2-admin, Property 14: Location breakdown covers all 16 LGAs with exact counts', () => {
  it('returns exactly the 16 canonical LGAs (including zeros) with exact customer and waste-manager coverage counts', () => {
    fc.assert(
      fc.property(
        fc.array(customerArb, { minLength: 0, maxLength: 50 }),
        fc.array(collectorArb, { minLength: 0, maxLength: 50 }),
        (customers, collectors) => {
          const breakdown = locationBreakdown(customers, collectors);

          // Exactly 16 entries, matching EKITI_LGAS in canonical order.
          expect(breakdown.length).toBe(16);
          expect(breakdown.map((b) => b.lga)).toEqual([...EKITI_LGAS]);

          for (const entry of breakdown) {
            const expectedCustomers = customers.filter(
              (c) => c.lga === entry.lga
            ).length;
            expect(entry.customerCount).toBe(expectedCustomers);

            const expectedCollectors = collectors.filter(
              (c) =>
                Array.isArray(c.service_areas) &&
                c.service_areas.includes(entry.lga)
            ).length;
            expect(entry.collectorCount).toBe(expectedCollectors);
          }
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });
});
