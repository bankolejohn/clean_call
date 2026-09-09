import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { customerRegistrationSchema } from '@/lib/validators/customer';
import { EKITI_LGAS } from '@/lib/constants/lgas';
import { CUSTOMER_CATEGORIES } from '@/lib/constants/categories';
import { DISPOSAL_METHODS } from '@/lib/constants/disposal-methods';
import { COLLECTION_FREQUENCIES } from '@/lib/constants/frequencies';

/**
 * Property-Based Tests for customer registration transform behaviour.
 * Feature: cleancall-phase-2-admin, Property 2: Satisfaction is conditional on existing collection
 *
 * Validates: Requirements 2.6, 2.7
 *
 * NOTE on undefined vs null:
 * The design's Property 2 text describes the dropped value as "null". The actual
 * implementation uses an optional Zod field (`satisfaction_with_existing` is
 * `.optional()`), and its transform assigns `undefined` — not `null` — whenever
 * `has_existing_collection` is anything other than exactly "Yes". We therefore
 * assert `undefined` here, which reflects the real runtime value produced by the
 * schema. See src/lib/validators/customer.ts transform().
 */

const NUM_RUNS = 100;

// --- Valid base-input generators (mirrors tests/properties/validation.property.test.ts) ---

const validLocalPhoneArb = fc
  .tuple(
    fc.constantFrom('7', '8', '9'),
    fc.constantFrom('0', '1'),
    fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), {
      minLength: 8,
      maxLength: 8,
    })
  )
  .map(([d2, d3, rest]) => `0${d2}${d3}${rest}`);

const validInternationalPhoneArb = fc
  .tuple(
    fc.constantFrom('7', '8', '9'),
    fc.constantFrom('0', '1'),
    fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), {
      minLength: 8,
      maxLength: 8,
    })
  )
  .map(([d2, d3, rest]) => `+234${d2}${d3}${rest}`);

const validPhoneArb = fc.oneof(validLocalPhoneArb, validInternationalPhoneArb);

/** Generate a valid base customer registration input (Phase 1 required fields). */
const validBaseCustomerInputArb = fc.record({
  full_name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
  phone: validPhoneArb,
  email: fc.constantFrom('', 'test@example.com'),
  address: fc.string({ minLength: 1, maxLength: 255 }).filter((s) => s.trim().length > 0),
  lga: fc.constantFrom(...EKITI_LGAS),
  category: fc.constantFrom(...CUSTOMER_CATEGORIES),
  disposal_method: fc.constantFrom(...DISPOSAL_METHODS),
  collection_frequency: fc.constantFrom(...COLLECTION_FREQUENCIES),
});

// Vary has_existing_collection over ALL allowed values plus `undefined` (omitted).
const hasExistingCollectionArb = fc.constantFrom<
  'Yes' | 'No' | 'Sometimes' | 'I manage it myself' | undefined
>('Yes', 'No', 'Sometimes', 'I manage it myself', undefined);

// Vary satisfaction_with_existing over ALL allowed values plus `undefined` (omitted).
const satisfactionArb = fc.constantFrom<'Yes' | 'No' | 'Somewhat' | undefined>(
  'Yes',
  'No',
  'Somewhat',
  undefined
);

// =============================================================================
// Property 2: Satisfaction is conditional on existing collection
// =============================================================================

describe('Feature: cleancall-phase-2-admin, Property 2: Satisfaction is conditional on existing collection', () => {
  /**
   * Validates: Requirements 2.6, 2.7
   *
   * For ANY customer registration input, after customerRegistrationSchema
   * parse+transform, satisfaction_with_existing SHALL be undefined whenever
   * has_existing_collection is anything other than exactly "Yes", regardless of
   * the submitted satisfaction value. When has_existing_collection === "Yes", the
   * submitted satisfaction value SHALL be preserved verbatim.
   */
  it('drops satisfaction_with_existing unless has_existing_collection is exactly "Yes"', () => {
    fc.assert(
      fc.property(
        validBaseCustomerInputArb,
        hasExistingCollectionArb,
        satisfactionArb,
        (baseInput, hasExisting, satisfaction) => {
          const input: Record<string, unknown> = { ...baseInput };
          // Only include the keys when defined so `undefined` models an omitted field.
          if (hasExisting !== undefined) input.has_existing_collection = hasExisting;
          if (satisfaction !== undefined) input.satisfaction_with_existing = satisfaction;

          const result = customerRegistrationSchema.safeParse(input);
          expect(result.success).toBe(true);

          if (result.success) {
            if (hasExisting === 'Yes') {
              // Value preserved verbatim (including undefined when omitted).
              expect(result.data.satisfaction_with_existing).toBe(satisfaction);
            } else {
              // Anything other than exactly "Yes" => satisfaction dropped to undefined.
              expect(result.data.satisfaction_with_existing).toBeUndefined();
            }
          }
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });
});
