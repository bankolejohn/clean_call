import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  collectionRequestSchema,
  type CollectionRequestInput,
} from '@/lib/validators/collection-request';
import { WASTE_TYPES } from '@/lib/constants/waste-types';
import { EKITI_LGAS } from '@/lib/constants/lgas';

/**
 * Property-Based Tests for the public Collection_Request submission schema.
 * Feature: cleancall-phase-3-collection-requests
 */

const NUM_RUNS = 100;

// =============================================================================
// Helpers
// =============================================================================

/** Format a Date to a UTC 'YYYY-MM-DD' string. */
function ymd(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Today's date-only (UTC), as a Date at midnight UTC. */
function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Offset today's UTC date by `days` and return 'YYYY-MM-DD'. */
function dateWithOffset(days: number): string {
  const base = todayUtc();
  base.setUTCDate(base.getUTCDate() + days);
  return ymd(base);
}

/**
 * Build a fully-valid submission object, overriding fields per test. Because
 * every other field is always valid, the overridden field is the only deciding
 * factor for schema success/failure.
 */
function validSubmission(
  overrides: Partial<Record<keyof CollectionRequestInput, unknown>> = {}
): Record<string, unknown> {
  return {
    full_name: 'Ada Obi',
    phone: '08031234567',
    email: '',
    pickup_address: '12 Market Road, Ado-Ekiti',
    lga: EKITI_LGAS[0],
    waste_type: WASTE_TYPES[0],
    estimated_quantity: '3 bags',
    bin_bag_count: 3,
    // default to a comfortably-future date so date is never the deciding factor
    preferred_pickup_date: dateWithOffset(30),
    preferred_pickup_time: 'Morning',
    additional_notes: '',
    ...overrides,
  };
}

// =============================================================================
// Property 10: Canonical Waste_Type validation is exact
// =============================================================================

describe('Feature: cleancall-phase-3-collection-requests, Property 10: Canonical Waste_Type validation is exact', () => {
  /**
   * Validates: Requirements 3.1, 5.3
   *
   * For ANY string value, the submission schema's waste_type field validates
   * successfully IF AND ONLY IF the value is one of WASTE_TYPES. All other
   * fields are held valid so waste_type is the sole deciding factor.
   */
  it('collectionRequestSchema accepts a submission iff waste_type is in WASTE_TYPES', () => {
    const wasteTypeArb = fc.oneof(
      fc.string(),
      fc.constantFrom<string>(...WASTE_TYPES)
    );

    fc.assert(
      fc.property(wasteTypeArb, (value) => {
        const result = collectionRequestSchema.safeParse(
          validSubmission({ waste_type: value })
        );
        const inAllowedSet = (WASTE_TYPES as readonly string[]).includes(value);
        expect(result.success).toBe(inAllowedSet);
      }),
      { numRuns: NUM_RUNS }
    );
  });
});

// =============================================================================
// Property 12: Preferred pickup date rejects the past
// =============================================================================

describe('Feature: cleancall-phase-3-collection-requests, Property 12: Preferred pickup date rejects the past', () => {
  /**
   * Validates: Requirements 5.3, 5.4
   *
   * For ANY calendar date strictly before today (UTC), the schema rejects
   * preferred_pickup_date; for ANY date equal to or after today (all else
   * valid), the schema accepts it.
   */
  it('rejects preferred_pickup_date strictly before today (UTC)', () => {
    // offsets 1..3650 days in the past
    const pastOffsetArb = fc.integer({ min: 1, max: 3650 });

    fc.assert(
      fc.property(pastOffsetArb, (offset) => {
        const pastDate = dateWithOffset(-offset);
        const result = collectionRequestSchema.safeParse(
          validSubmission({ preferred_pickup_date: pastDate })
        );
        expect(result.success).toBe(false);
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it('accepts preferred_pickup_date equal to or after today (UTC)', () => {
    // offsets 0..3650 days from today (0 = today)
    const futureOffsetArb = fc.integer({ min: 0, max: 3650 });

    fc.assert(
      fc.property(futureOffsetArb, (offset) => {
        const futureDate = dateWithOffset(offset);
        const result = collectionRequestSchema.safeParse(
          validSubmission({ preferred_pickup_date: futureDate })
        );
        expect(result.success).toBe(true);
      }),
      { numRuns: NUM_RUNS }
    );
  });
});
