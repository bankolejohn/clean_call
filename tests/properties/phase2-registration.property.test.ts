import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { customerRegistrationSchema } from '@/lib/validators/customer';
import { collectorRegistrationSchema } from '@/lib/validators/collector';
import { EKITI_LGAS } from '@/lib/constants/lgas';
import { CUSTOMER_CATEGORIES } from '@/lib/constants/categories';
import { DISPOSAL_METHODS } from '@/lib/constants/disposal-methods';
import { COLLECTION_FREQUENCIES } from '@/lib/constants/frequencies';

/**
 * Property-Based Tests for Phase 2 backward-compatible registration.
 *
 * Feature: cleancall-phase-2-admin, Property 1: Backward-compatible registration stores nulls
 *
 * Validates: Requirements 1.5, 2.8, 4.5
 *
 * For ANY valid Phase 1 registration input (customer OR collector) with ALL Phase 2
 * fields omitted, the registration schema SHALL parse successfully, and every omitted
 * Phase 2 field resolves to undefined (not present) after parse.
 */

const NUM_RUNS = 100;

// --- Shared valid-input generators (Phase 1 fields ONLY, no Phase 2 fields) ---

/** Valid Nigerian local phone: matches ^0[7-9][01]\d{8}$ */
const validLocalPhoneArb = fc
  .tuple(
    fc.constantFrom('7', '8', '9'),
    fc.constantFrom('0', '1'),
    fc.stringOf(
      fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'),
      { minLength: 8, maxLength: 8 }
    )
  )
  .map(([d2, d3, rest]) => `0${d2}${d3}${rest}`);

/** Simple email generator that Zod will definitely accept */
const safeEmailArb = fc
  .tuple(
    fc.stringOf(
      fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')),
      { minLength: 3, maxLength: 10 }
    ),
    fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), {
      minLength: 3,
      maxLength: 8,
    }),
    fc.constantFrom('com', 'org', 'net', 'ng')
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

/** Valid customer input containing ONLY Phase 1 fields (all Phase 2 fields omitted) */
const phase1OnlyCustomerArb = fc.record({
  full_name: fc
    .string({ minLength: 1, maxLength: 100 })
    .filter((s) => s.trim().length > 0),
  phone: validLocalPhoneArb,
  email: fc.constantFrom('', 'test@example.com'),
  address: fc
    .string({ minLength: 1, maxLength: 255 })
    .filter((s) => s.trim().length > 0),
  lga: fc.constantFrom(...EKITI_LGAS),
  category: fc.constantFrom(...CUSTOMER_CATEGORIES),
  disposal_method: fc.constantFrom(...DISPOSAL_METHODS),
  collection_frequency: fc.constantFrom(...COLLECTION_FREQUENCIES),
});

/** Valid collector input containing ONLY Phase 1 fields (wants_more_customers omitted) */
const phase1OnlyCollectorArb = fc.record({
  business_name: fc
    .string({ minLength: 1, maxLength: 150 })
    .filter((s) => s.trim().length > 0),
  contact_person: fc
    .string({ minLength: 1, maxLength: 100 })
    .filter((s) => s.trim().length > 0),
  phone: validLocalPhoneArb,
  email: safeEmailArb,
  business_address: fc
    .string({ minLength: 1, maxLength: 300 })
    .filter((s) => s.trim().length > 0),
  service_areas: fc
    .subarray([...EKITI_LGAS], { minLength: 1, maxLength: 16 })
    .filter((arr) => arr.length >= 1),
  waste_types: fc.array(
    fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
    { minLength: 1, maxLength: 5 }
  ),
  staff_count: fc.integer({ min: 1, max: 10000 }),
  vehicle_count: fc.integer({ min: 1, max: 10000 }),
  years_in_operation: fc.integer({ min: 0, max: 100 }),
  cac_number: fc.constantFrom('', 'RC12345'),
});

// =============================================================================
// Property 1: Backward-compatible registration stores nulls
// =============================================================================

describe('Feature: cleancall-phase-2-admin, Property 1: Backward-compatible registration stores nulls', () => {
  it('customer schema parses Phase-1-only input and leaves every Phase 2 field undefined', () => {
    fc.assert(
      fc.property(phase1OnlyCustomerArb, (input) => {
        // Ensure no Phase 2 keys are present on the generated input.
        expect(Object.prototype.hasOwnProperty.call(input, 'willingness_to_pay')).toBe(false);
        expect(Object.prototype.hasOwnProperty.call(input, 'preferred_price_range')).toBe(false);
        expect(Object.prototype.hasOwnProperty.call(input, 'has_existing_collection')).toBe(false);
        expect(Object.prototype.hasOwnProperty.call(input, 'satisfaction_with_existing')).toBe(false);

        const result = customerRegistrationSchema.safeParse(input);
        expect(result.success).toBe(true);

        if (result.success) {
          const parsed = result.data;
          expect(parsed.willingness_to_pay).toBeUndefined();
          expect(parsed.preferred_price_range).toBeUndefined();
          expect(parsed.has_existing_collection).toBeUndefined();
          expect(parsed.satisfaction_with_existing).toBeUndefined();
        }
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it('collector schema parses Phase-1-only input and leaves wants_more_customers undefined', () => {
    fc.assert(
      fc.property(phase1OnlyCollectorArb, (input) => {
        // Ensure the Phase 2 key is not present on the generated input.
        expect(Object.prototype.hasOwnProperty.call(input, 'wants_more_customers')).toBe(false);

        const result = collectorRegistrationSchema.safeParse(input);
        expect(result.success).toBe(true);

        if (result.success) {
          expect(result.data.wants_more_customers).toBeUndefined();
        }
      }),
      { numRuns: NUM_RUNS }
    );
  });
});
