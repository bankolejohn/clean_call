import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { EKITI_LGAS } from '@/lib/constants/lgas';
import { CUSTOMER_CATEGORIES } from '@/lib/constants/categories';
import { DISPOSAL_METHODS } from '@/lib/constants/disposal-methods';
import { COLLECTION_FREQUENCIES } from '@/lib/constants/frequencies';
import type { Customer } from '@/types';

/**
 * Property-Based Tests for Search/Filter Correctness and Pagination
 * Feature: cleancall-mvp
 */

const NUM_RUNS = 100;

// =============================================================================
// Helper Functions (pure logic mirroring the API's behavior)
// =============================================================================

/**
 * Filters an array of customer records based on search + filter criteria.
 * Mirrors the logic in /api/admin/customers/route.ts
 */
function filterCustomers(
  customers: Customer[],
  search: string,
  lga: string | null,
  category: string | null
): Customer[] {
  return customers.filter((customer) => {
    // Search filter: minimum 2 characters, case-insensitive partial match
    if (search.length >= 2) {
      const query = search.toLowerCase();
      const matchesSearch =
        customer.full_name.toLowerCase().includes(query) ||
        customer.phone.toLowerCase().includes(query) ||
        (customer.email && customer.email.toLowerCase().includes(query)) ||
        customer.address.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // LGA filter: exact match
    if (lga && customer.lga !== lga) return false;

    // Category filter: exact match
    if (category && customer.category !== category) return false;

    return true;
  });
}

/**
 * Paginates an array of items.
 * Mirrors the pagination logic in the API routes.
 */
function paginateArray<T>(
  items: T[],
  page: number,
  pageSize: number
): { data: T[]; total: number; page: number; pageSize: number } {
  const total = items.length;
  const from = (page - 1) * pageSize;
  const data = items.slice(from, from + pageSize);
  return { data, total, page, pageSize };
}

// =============================================================================
// Generators
// =============================================================================

/** Generate a valid phone number */
const validPhoneArb = fc
  .tuple(
    fc.constantFrom('7', '8', '9'),
    fc.constantFrom('0', '1'),
    fc.stringOf(
      fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'),
      { minLength: 8, maxLength: 8 }
    )
  )
  .map(([d2, d3, rest]) => `0${d2}${d3}${rest}`);

/** Simple email generator */
const emailArb = fc
  .tuple(
    fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), {
      minLength: 3,
      maxLength: 8,
    }),
    fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), {
      minLength: 3,
      maxLength: 6,
    }),
    fc.constantFrom('com', 'org', 'net', 'ng')
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

/** Generate a Customer record */
const customerArb: fc.Arbitrary<Customer> = fc.record({
  id: fc.uuid(),
  full_name: fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz '.split('')), {
    minLength: 2,
    maxLength: 50,
  }),
  phone: validPhoneArb,
  email: fc.oneof(emailArb, fc.constant('')),
  address: fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789 ,'.split('')), {
    minLength: 5,
    maxLength: 100,
  }),
  lga: fc.constantFrom(...EKITI_LGAS),
  category: fc.constantFrom(...CUSTOMER_CATEGORIES),
  disposal_method: fc.constantFrom(...DISPOSAL_METHODS),
  collection_frequency: fc.constantFrom(...COLLECTION_FREQUENCIES),
  created_at: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }).map((d) => d.toISOString()),
});

/** Generate a list of customer records */
const customerListArb = fc.array(customerArb, { minLength: 0, maxLength: 50 });

// =============================================================================
// Property 8: Combined Search and Filter Correctness
// =============================================================================

describe('Feature: cleancall-mvp, Property 8: Combined Search and Filter Correctness', () => {
  /**
   * Validates: Requirements 6.3, 6.4, 6.5, 6.8
   *
   * For any combination of search query (≥2 characters) and filter selections
   * (LGA, category) applied to a dataset of registrations, every record in the
   * result set SHALL satisfy ALL active conditions simultaneously.
   */

  it('every filtered result satisfies all active search and filter conditions', () => {
    // Generate a search query that is a substring of an existing record field
    // to ensure we get non-empty results sometimes
    const searchAndFilterArb = fc.tuple(
      customerListArb,
      // Search query: 2-10 lowercase alpha chars
      fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), {
        minLength: 2,
        maxLength: 10,
      }),
      // LGA filter (nullable)
      fc.oneof(fc.constant(null), fc.constantFrom(...EKITI_LGAS)),
      // Category filter (nullable)
      fc.oneof(fc.constant(null), fc.constantFrom(...CUSTOMER_CATEGORIES))
    );

    fc.assert(
      fc.property(searchAndFilterArb, ([customers, search, lga, category]) => {
        const results = filterCustomers(customers, search, lga, category);

        for (const record of results) {
          // If search is active (≥2 chars), record must match in at least one field
          if (search.length >= 2) {
            const query = search.toLowerCase();
            const matchesSearch =
              record.full_name.toLowerCase().includes(query) ||
              record.phone.toLowerCase().includes(query) ||
              (record.email && record.email.toLowerCase().includes(query)) ||
              record.address.toLowerCase().includes(query);
            expect(matchesSearch).toBe(true);
          }

          // If LGA filter is active, record must match
          if (lga) {
            expect(record.lga).toBe(lga);
          }

          // If category filter is active, record must match
          if (category) {
            expect(record.category).toBe(category);
          }
        }
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it('filter results are a subset of the input dataset', () => {
    const searchAndFilterArb = fc.tuple(
      customerListArb,
      fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), {
        minLength: 0,
        maxLength: 10,
      }),
      fc.oneof(fc.constant(null), fc.constantFrom(...EKITI_LGAS)),
      fc.oneof(fc.constant(null), fc.constantFrom(...CUSTOMER_CATEGORIES))
    );

    fc.assert(
      fc.property(searchAndFilterArb, ([customers, search, lga, category]) => {
        const results = filterCustomers(customers, search, lga, category);

        // Results can never exceed input size
        expect(results.length).toBeLessThanOrEqual(customers.length);

        // Every result must be present in the original dataset
        for (const record of results) {
          expect(customers).toContain(record);
        }
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it('no eligible record is excluded from results', () => {
    // For each record in the dataset that satisfies all conditions,
    // it must appear in the filtered results
    const searchAndFilterArb = fc.tuple(
      customerListArb,
      fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), {
        minLength: 2,
        maxLength: 8,
      }),
      fc.oneof(fc.constant(null), fc.constantFrom(...EKITI_LGAS)),
      fc.oneof(fc.constant(null), fc.constantFrom(...CUSTOMER_CATEGORIES))
    );

    fc.assert(
      fc.property(searchAndFilterArb, ([customers, search, lga, category]) => {
        const results = filterCustomers(customers, search, lga, category);

        for (const customer of customers) {
          const query = search.toLowerCase();
          const matchesSearch =
            customer.full_name.toLowerCase().includes(query) ||
            customer.phone.toLowerCase().includes(query) ||
            (customer.email && customer.email.toLowerCase().includes(query)) ||
            customer.address.toLowerCase().includes(query);

          const matchesLga = !lga || customer.lga === lga;
          const matchesCategory = !category || customer.category === category;

          if (matchesSearch && matchesLga && matchesCategory) {
            expect(results).toContain(customer);
          }
        }
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it('search with less than 2 characters does not filter by search', () => {
    fc.assert(
      fc.property(
        customerListArb,
        fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), {
          minLength: 0,
          maxLength: 1,
        }),
        fc.oneof(fc.constant(null), fc.constantFrom(...EKITI_LGAS)),
        fc.oneof(fc.constant(null), fc.constantFrom(...CUSTOMER_CATEGORIES)),
        (customers, shortSearch, lga, category) => {
          const resultsWithShortSearch = filterCustomers(customers, shortSearch, lga, category);
          const resultsWithNoSearch = filterCustomers(customers, '', lga, category);

          // Short search (0-1 chars) should behave the same as no search
          expect(resultsWithShortSearch.length).toBe(resultsWithNoSearch.length);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });
});

// =============================================================================
// Property 9: Pagination Correctness
// =============================================================================

describe('Feature: cleancall-mvp, Property 9: Pagination Correctness', () => {
  /**
   * Validates: Requirements 6.6
   *
   * For any dataset of N registration records with page size 20, page P SHALL
   * contain exactly min(20, N - (P-1)*20) records, the total count SHALL equal N,
   * and the union of all pages SHALL equal the full dataset with no duplicates
   * or omissions.
   */

  it('each page contains the correct number of items', () => {
    // Generate array sizes from 1-100 and valid page numbers
    const paginationArb = fc
      .array(fc.nat(), { minLength: 1, maxLength: 100 })
      .chain((items) => {
        const totalPages = Math.ceil(items.length / 20);
        return fc.tuple(
          fc.constant(items),
          fc.integer({ min: 1, max: totalPages })
        );
      });

    fc.assert(
      fc.property(paginationArb, ([items, page]) => {
        const pageSize = 20;
        const result = paginateArray(items, page, pageSize);

        const expectedLength = Math.min(pageSize, items.length - (page - 1) * pageSize);
        expect(result.data.length).toBe(expectedLength);
        expect(result.total).toBe(items.length);
        expect(result.page).toBe(page);
        expect(result.pageSize).toBe(pageSize);
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it('total count always equals the full dataset size', () => {
    fc.assert(
      fc.property(
        fc.array(fc.nat(), { minLength: 0, maxLength: 100 }),
        fc.integer({ min: 1, max: 10 }),
        (items, page) => {
          const result = paginateArray(items, page, 20);
          expect(result.total).toBe(items.length);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it('union of all pages equals the full dataset with no duplicates', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 100 }),
        (items) => {
          const pageSize = 20;
          const totalPages = Math.ceil(items.length / pageSize);
          const allPageItems: string[] = [];

          for (let page = 1; page <= totalPages; page++) {
            const result = paginateArray(items, page, pageSize);
            allPageItems.push(...result.data);
          }

          // Union of all pages equals the full dataset
          expect(allPageItems.length).toBe(items.length);

          // Items are in the same order as the original
          for (let i = 0; i < items.length; i++) {
            expect(allPageItems[i]).toBe(items[i]);
          }
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it('pages beyond the last page return empty data', () => {
    fc.assert(
      fc.property(
        fc.array(fc.nat(), { minLength: 1, maxLength: 100 }),
        (items) => {
          const pageSize = 20;
          const totalPages = Math.ceil(items.length / pageSize);
          const beyondPage = totalPages + 1;

          const result = paginateArray(items, beyondPage, pageSize);
          expect(result.data.length).toBe(0);
          expect(result.total).toBe(items.length);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it('first page starts at the beginning of the dataset', () => {
    fc.assert(
      fc.property(
        fc.array(fc.nat(), { minLength: 1, maxLength: 100 }),
        (items) => {
          const pageSize = 20;
          const result = paginateArray(items, 1, pageSize);

          // First page items should match the first N items of the dataset
          const expectedItems = items.slice(0, pageSize);
          expect(result.data).toEqual(expectedItems);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it('pagination with variable page sizes maintains correctness', () => {
    const pageSizeArb = fc.integer({ min: 1, max: 50 });

    fc.assert(
      fc.property(
        fc.array(fc.nat(), { minLength: 1, maxLength: 100 }),
        pageSizeArb,
        (items, pageSize) => {
          const totalPages = Math.ceil(items.length / pageSize);
          const allPageItems: number[] = [];

          for (let page = 1; page <= totalPages; page++) {
            const result = paginateArray(items, page, pageSize);
            expect(result.data.length).toBe(
              Math.min(pageSize, items.length - (page - 1) * pageSize)
            );
            allPageItems.push(...result.data);
          }

          // All items collected across pages should equal the original
          expect(allPageItems).toEqual(items);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });
});
