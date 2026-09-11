import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { customerStatusSchema, providerStatusSchema } from '@/lib/validators/status';
import { CUSTOMER_STATUSES } from '@/lib/constants/customer-status';
import { PROVIDER_STATUSES } from '@/lib/constants/provider-status';

/**
 * Property-Based Tests for Status Change Validation Schemas
 * Feature: cleancall-phase-2-admin
 */

const NUM_RUNS = 100;

/**
 * For each schema, we generate values from two sources so that BOTH branches of
 * the biconditional (accept / reject) are exercised:
 *   - fc.string(): arbitrary strings, almost always outside the allowed set
 *   - fc.constantFrom(...ALLOWED): guaranteed members of the allowed set
 */
const customerStatusValueArb = fc.oneof(
  fc.string(),
  fc.constantFrom<string>(...CUSTOMER_STATUSES)
);

const providerStatusValueArb = fc.oneof(
  fc.string(),
  fc.constantFrom<string>(...PROVIDER_STATUSES)
);

// =============================================================================
// Property 3: Customer status accepted iff in allowed set
// =============================================================================

// Feature: cleancall-phase-2-admin, Property 3: Customer status accepted iff in allowed set
describe('Feature: cleancall-phase-2-admin, Property 3: Customer status accepted iff in allowed set', () => {
  /**
   * Validates: Requirements 3.2, 3.4, 16.3
   *
   * For ANY string value, customerStatusSchema.safeParse({ status: value })
   * succeeds IF AND ONLY IF value is one of CUSTOMER_STATUSES.
   */
  it('customerStatusSchema accepts a status iff it is in CUSTOMER_STATUSES', () => {
    fc.assert(
      fc.property(customerStatusValueArb, (value) => {
        const result = customerStatusSchema.safeParse({ status: value });
        const inAllowedSet = (CUSTOMER_STATUSES as readonly string[]).includes(value);
        expect(result.success).toBe(inAllowedSet);
      }),
      { numRuns: NUM_RUNS }
    );
  });
});

// =============================================================================
// Property 4: Provider status accepted iff in allowed set
// =============================================================================

// Feature: cleancall-phase-2-admin, Property 4: Provider status accepted iff in allowed set
describe('Feature: cleancall-phase-2-admin, Property 4: Provider status accepted iff in allowed set', () => {
  /**
   * Validates: Requirements 4.4, 5.2, 16.4
   *
   * For ANY string value, providerStatusSchema.safeParse({ status: value })
   * succeeds IF AND ONLY IF value is one of PROVIDER_STATUSES.
   */
  it('providerStatusSchema accepts a status iff it is in PROVIDER_STATUSES', () => {
    fc.assert(
      fc.property(providerStatusValueArb, (value) => {
        const result = providerStatusSchema.safeParse({ status: value });
        const inAllowedSet = (PROVIDER_STATUSES as readonly string[]).includes(value);
        expect(result.success).toBe(inAllowedSet);
      }),
      { numRuns: NUM_RUNS }
    );
  });
});
