import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { mapLifecycleAction, type LifecycleAction } from '@/lib/utils/lifecycle';
import type { ProviderStatus } from '@/types';

/**
 * Property-Based Tests for Phase 2 provider lifecycle action mapping.
 *
 * Feature: cleancall-phase-2-admin, Property 5: Lifecycle actions map to fixed statuses
 *
 * Validates: Requirements 5.3, 5.4, 5.5, 5.6, 10.5
 *
 * For ANY lifecycle action, mapLifecycleAction yields a fixed provider status:
 *   approve  → Active
 *   suspend  → Suspended
 *   verify   → Verified
 *   contact  → Contacted
 */

const NUM_RUNS = 100;

// Table-driven expected mapping, driven by fast-check to satisfy the "for any" property.
const EXPECTED: Record<LifecycleAction, ProviderStatus> = {
  approve: 'Active',
  suspend: 'Suspended',
  verify: 'Verified',
  contact: 'Contacted',
};

const lifecycleActionArb = fc.constantFrom<LifecycleAction>(
  'approve',
  'suspend',
  'verify',
  'contact'
);

describe('Feature: cleancall-phase-2-admin, Property 5: Lifecycle actions map to fixed statuses', () => {
  it('maps every lifecycle action to its exact fixed provider status', () => {
    fc.assert(
      fc.property(lifecycleActionArb, (action) => {
        expect(mapLifecycleAction(action)).toBe(EXPECTED[action]);
      }),
      { numRuns: NUM_RUNS }
    );
  });
});
