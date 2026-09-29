import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { filterRequests, type RequestFilters } from '@/lib/utils/request-filter';
import { toPublicView } from '@/lib/utils/public-view';
import { WASTE_TYPES } from '@/lib/constants/waste-types';
import { REQUEST_STATUSES } from '@/lib/constants/request-status';
import { EKITI_LGAS } from '@/lib/constants/lgas';
import type { CollectionRequest, PublicRequestView } from '@/types';

/**
 * Property-Based Tests for the admin list filter and the public-view projection.
 * Feature: cleancall-phase-3-collection-requests
 */

const NUM_RUNS = 100;

// =============================================================================
// Generators
// =============================================================================

const isoDateArb = fc
  .date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') })
  .map((d) => d.toISOString());

const dateOnlyArb = fc
  .date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') })
  .map((d) => d.toISOString().slice(0, 10));

/** A few reusable collector ids so filters can actually match some rows. */
const COLLECTOR_IDS = [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
];

/**
 * Build a CollectionRequest row. collector_id and other nullable fields may be
 * null. Only the fields relevant to filtering/projection are varied meaningfully.
 */
const requestArb: fc.Arbitrary<CollectionRequest> = fc.record({
  id: fc.uuid(),
  request_number: fc
    .stringOf(fc.constantFrom(...'0123456789'.split('')), { minLength: 4, maxLength: 4 })
    .map((s) => `CR-20250101-${s}`),
  tracking_token: fc.stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_'.split('')),
    { minLength: 20, maxLength: 43 }
  ),
  full_name: fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz '.split('')), {
    minLength: 2,
    maxLength: 30,
  }),
  phone: fc
    .stringOf(fc.constantFrom(...'0123456789'.split('')), { minLength: 8, maxLength: 8 })
    .map((s) => `080${s}`),
  email: fc.oneof(fc.constant(null), fc.constant('a@b.com')),
  customer_id: fc.oneof(fc.constant(null), fc.uuid()),
  pickup_address: fc.stringOf(fc.constantFrom(...'abcdefghij 0123456789'.split('')), {
    minLength: 3,
    maxLength: 40,
  }),
  lga: fc.constantFrom(...EKITI_LGAS),
  waste_type: fc.constantFrom(...WASTE_TYPES),
  estimated_quantity: fc.constantFrom('1 bag', '3 bags', '10 bags'),
  bin_bag_count: fc.oneof(fc.constant(null), fc.integer({ min: 0, max: 100 })),
  preferred_pickup_date: dateOnlyArb,
  preferred_pickup_time: fc.constantFrom('Morning', 'Afternoon', 'Evening'),
  additional_notes: fc.oneof(fc.constant(null), fc.constant('note')),
  photo_url: fc.oneof(fc.constant(null), fc.constant('http://x/p.jpg')),
  willingness_to_pay: fc.oneof(fc.constant(null), fc.constant('Yes' as const)),
  price_range: fc.oneof(fc.constant(null), fc.constant('Below ₦2,000' as const)),
  // include some null collector_ids so null-exclusion behavior is exercised
  collector_id: fc.oneof(fc.constant(null), fc.constantFrom(...COLLECTOR_IDS)),
  status: fc.constantFrom(...REQUEST_STATUSES),
  internal_notes: fc.oneof(fc.constant(null), fc.constant('admin only note')),
  created_at: isoDateArb,
  updated_at: isoDateArb,
  reviewed_at: fc.oneof(fc.constant(null), isoDateArb),
  assigned_at: fc.oneof(fc.constant(null), isoDateArb),
  accepted_at: fc.oneof(fc.constant(null), isoDateArb),
  en_route_at: fc.oneof(fc.constant(null), isoDateArb),
  completed_at: fc.oneof(fc.constant(null), isoDateArb),
  cancelled_at: fc.oneof(fc.constant(null), isoDateArb),
}) as fc.Arbitrary<CollectionRequest>;

const requestListArb = fc.array(requestArb, { minLength: 0, maxLength: 30 });

/** An arbitrary combination of active/inactive filters. */
const filtersArb: fc.Arbitrary<RequestFilters> = fc.record(
  {
    search: fc.oneof(
      fc.constant(undefined),
      fc.stringOf(fc.constantFrom(...'abc0 CR-'.split('')), { minLength: 1, maxLength: 5 })
    ),
    status: fc.oneof(fc.constant(undefined), fc.constantFrom(...REQUEST_STATUSES)),
    lga: fc.oneof(fc.constant(undefined), fc.constantFrom(...EKITI_LGAS)),
    waste_type: fc.oneof(fc.constant(undefined), fc.constantFrom(...WASTE_TYPES)),
    collector_id: fc.oneof(fc.constant(undefined), fc.constantFrom(...COLLECTOR_IDS)),
    createdFrom: fc.oneof(fc.constant(undefined), isoDateArb),
    createdTo: fc.oneof(fc.constant(undefined), isoDateArb),
    pickupFrom: fc.oneof(fc.constant(undefined), dateOnlyArb),
    pickupTo: fc.oneof(fc.constant(undefined), dateOnlyArb),
  },
  { requiredKeys: [] }
) as fc.Arbitrary<RequestFilters>;

/** Reproduce the "is this filter active" rule used by the implementation. */
function active(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  return true;
}

// =============================================================================
// Property 9: Admin list filter soundness
// =============================================================================

describe('Feature: cleancall-phase-3-collection-requests, Property 9: Admin list filter soundness', () => {
  /**
   * Validates: Requirements 8.2, 8.4, 8.5
   *
   * Every request in filterRequests(rows, filters) satisfies ALL active
   * conditions simultaneously, and a row with a null value for a filtered field
   * is excluded only when that filter specifies a non-null value.
   */
  it('every filtered result satisfies all active filter conditions', () => {
    fc.assert(
      fc.property(requestListArb, filtersArb, (rows, filters) => {
        const results = filterRequests(rows, filters);

        // subset invariant
        expect(results.length).toBeLessThanOrEqual(rows.length);

        for (const row of results) {
          if (active(filters.search)) {
            const needle = filters.search!.trim().toLowerCase();
            const matched = [row.request_number, row.full_name, row.phone].some(
              (f) => typeof f === 'string' && f.toLowerCase().includes(needle)
            );
            expect(matched).toBe(true);
          }
          if (active(filters.status)) expect(row.status).toBe(filters.status);
          if (active(filters.lga)) expect(row.lga).toBe(filters.lga);
          if (active(filters.waste_type)) expect(row.waste_type).toBe(filters.waste_type);
          if (active(filters.collector_id)) {
            // a null collector_id must NOT survive a non-null collector_id filter
            expect(row.collector_id).toBe(filters.collector_id);
          }
          if (active(filters.createdFrom)) {
            expect(row.created_at != null && row.created_at >= filters.createdFrom!).toBe(true);
          }
          if (active(filters.createdTo)) {
            expect(row.created_at != null && row.created_at <= filters.createdTo!).toBe(true);
          }
          if (active(filters.pickupFrom)) {
            expect(
              row.preferred_pickup_date != null &&
                row.preferred_pickup_date >= filters.pickupFrom!
            ).toBe(true);
          }
          if (active(filters.pickupTo)) {
            expect(
              row.preferred_pickup_date != null &&
                row.preferred_pickup_date <= filters.pickupTo!
            ).toBe(true);
          }
        }
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it('a row with null collector_id is excluded whenever a collector_id filter is set', () => {
    fc.assert(
      fc.property(
        requestListArb,
        fc.constantFrom(...COLLECTOR_IDS),
        (rows, collectorId) => {
          const results = filterRequests(rows, { collector_id: collectorId });
          for (const row of results) {
            expect(row.collector_id).not.toBeNull();
            expect(row.collector_id).toBe(collectorId);
          }
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });
});

// =============================================================================
// Property 11: Public view never exposes privileged fields
// =============================================================================

const WHITELIST_KEYS: (keyof PublicRequestView)[] = [
  'request_number',
  'status',
  'lga',
  'waste_type',
  'preferred_pickup_date',
  'preferred_pickup_time',
  'created_at',
  'reviewed_at',
  'assigned_at',
  'accepted_at',
  'en_route_at',
  'completed_at',
  'cancelled_at',
];

describe('Feature: cleancall-phase-3-collection-requests, Property 11: Public view never exposes privileged fields', () => {
  /**
   * Validates: Requirements 6.4, 9.6
   *
   * For ANY CollectionRequest row (fields may be null), toPublicView(row) omits
   * internal_notes, tracking_token, and collector_id, includes exactly the
   * whitelisted keys, and never throws.
   */
  it('never exposes internal_notes, tracking_token, or collector_id and includes exactly the whitelist', () => {
    fc.assert(
      fc.property(requestArb, (row) => {
        let view: PublicRequestView;
        expect(() => {
          view = toPublicView(row);
        }).not.toThrow();
        view = toPublicView(row);

        // privileged fields absent
        expect('internal_notes' in view).toBe(false);
        expect('tracking_token' in view).toBe(false);
        expect('collector_id' in view).toBe(false);

        // exactly the whitelisted keys are present
        const keys = Object.keys(view).sort();
        expect(keys).toEqual([...WHITELIST_KEYS].sort());
      }),
      { numRuns: NUM_RUNS }
    );
  });
});
