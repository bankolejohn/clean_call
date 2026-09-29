import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  ALLOWED_TRANSITIONS,
  isAllowedTransition,
  timestampFieldForStatus,
  isAssignable,
  isCancellable,
} from '@/lib/utils/request-status';
import { REQUEST_STATUSES, type RequestStatus } from '@/lib/constants/request-status';

/**
 * Property-Based Tests for the Request_Status transition module.
 * Feature: cleancall-phase-3-collection-requests
 */

const NUM_RUNS = 100;

// The exact 16-transition table from Requirement 4.3 / design, encoded
// independently of the source module so the property is a real oracle.
const EXPECTED_TABLE: Record<RequestStatus, readonly RequestStatus[]> = {
  PENDING: ['UNDER_REVIEW', 'CANCELLED', 'DISPUTED'],
  UNDER_REVIEW: ['CANCELLED', 'DISPUTED'],
  ASSIGNED: ['ACCEPTED', 'CANCELLED', 'DISPUTED'],
  ACCEPTED: ['EN_ROUTE', 'CANCELLED', 'DISPUTED'],
  EN_ROUTE: ['COMPLETED', 'DISPUTED'],
  COMPLETED: [],
  CANCELLED: [],
  DISPUTED: ['CANCELLED', 'COMPLETED'],
};

const statusArb = fc.constantFrom<RequestStatus>(...REQUEST_STATUSES);

// =============================================================================
// Property 1: Allowed transitions match the exact table
// =============================================================================

// Feature: cleancall-phase-3-collection-requests, Property 1: Allowed transitions match the exact table
describe('Feature: cleancall-phase-3-collection-requests, Property 1: Allowed transitions match the exact table', () => {
  /**
   * Validates: Requirements 4.3, 4.4, 4.7
   *
   * For ALL (from, to), isAllowedTransition(from, to) is true iff from !== to
   * AND ALLOWED_TRANSITIONS[from] includes to. Also asserts the DISPUTED allowed
   * set is exactly {CANCELLED, COMPLETED} and COMPLETED/CANCELLED sets are empty.
   */
  it('isAllowedTransition matches (from !== to && table[from] includes to) for all pairs', () => {
    fc.assert(
      fc.property(statusArb, statusArb, (from, to) => {
        const expected = from !== to && EXPECTED_TABLE[from].includes(to);
        expect(isAllowedTransition(from, to)).toBe(expected);
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it('DISPUTED allowed set is exactly {CANCELLED, COMPLETED}; COMPLETED/CANCELLED are empty', () => {
    expect([...ALLOWED_TRANSITIONS.DISPUTED].sort()).toEqual(['CANCELLED', 'COMPLETED']);
    expect(ALLOWED_TRANSITIONS.COMPLETED).toEqual([]);
    expect(ALLOWED_TRANSITIONS.CANCELLED).toEqual([]);
  });
});

// =============================================================================
// Property 2: Self-transition is never allowed
// =============================================================================

// Feature: cleancall-phase-3-collection-requests, Property 2: Self-transition is never allowed
describe('Feature: cleancall-phase-3-collection-requests, Property 2: Self-transition is never allowed', () => {
  /**
   * Validates: Requirements 4.8
   *
   * For ALL statuses s, isAllowedTransition(s, s) is false.
   */
  it('isAllowedTransition(s, s) === false for every status', () => {
    fc.assert(
      fc.property(statusArb, (s) => {
        expect(isAllowedTransition(s, s)).toBe(false);
      }),
      { numRuns: NUM_RUNS }
    );
  });
});

// =============================================================================
// Property 3: Lifecycle timestamp mapping is exact
// =============================================================================

// Feature: cleancall-phase-3-collection-requests, Property 3: Lifecycle timestamp mapping is exact
describe('Feature: cleancall-phase-3-collection-requests, Property 3: Lifecycle timestamp mapping is exact', () => {
  /**
   * Validates: Requirements 4.5, 4.6, 2.10
   *
   * timestampFieldForStatus returns the exact mapping, and ASSIGNED never appears
   * as a transition target in any ALLOWED_TRANSITIONS list.
   */
  const EXPECTED_TS: Record<RequestStatus, string | null> = {
    PENDING: null,
    UNDER_REVIEW: 'reviewed_at',
    ASSIGNED: 'assigned_at',
    ACCEPTED: 'accepted_at',
    EN_ROUTE: 'en_route_at',
    COMPLETED: 'completed_at',
    CANCELLED: 'cancelled_at',
    DISPUTED: null,
  };

  it('timestampFieldForStatus returns the exact lifecycle column or null', () => {
    fc.assert(
      fc.property(statusArb, (s) => {
        expect(timestampFieldForStatus(s)).toBe(EXPECTED_TS[s]);
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it('ASSIGNED is never a generic transition target', () => {
    for (const from of REQUEST_STATUSES) {
      expect(ALLOWED_TRANSITIONS[from]).not.toContain('ASSIGNED');
    }
  });
});

// =============================================================================
// Property 7: Assignable guard is exact
// =============================================================================

// Feature: cleancall-phase-3-collection-requests, Property 7: Assignable guard is exact
describe('Feature: cleancall-phase-3-collection-requests, Property 7: Assignable guard is exact', () => {
  /**
   * Validates: Requirements 10.4, 10.5, 10.7
   *
   * isAssignable(s) is true iff s is PENDING or UNDER_REVIEW.
   */
  it('isAssignable(s) === (s is PENDING or UNDER_REVIEW)', () => {
    fc.assert(
      fc.property(statusArb, (s) => {
        const expected = s === 'PENDING' || s === 'UNDER_REVIEW';
        expect(isAssignable(s)).toBe(expected);
      }),
      { numRuns: NUM_RUNS }
    );
  });
});

// =============================================================================
// Property 8: Cancellable guard is exact
// =============================================================================

// Feature: cleancall-phase-3-collection-requests, Property 8: Cancellable guard is exact
describe('Feature: cleancall-phase-3-collection-requests, Property 8: Cancellable guard is exact', () => {
  /**
   * Validates: Requirements 7.1, 7.2
   *
   * isCancellable(s) is true iff s is PENDING, UNDER_REVIEW, ASSIGNED, or ACCEPTED,
   * and false for EN_ROUTE, COMPLETED, CANCELLED, DISPUTED.
   */
  const CANCELLABLE = new Set<RequestStatus>(['PENDING', 'UNDER_REVIEW', 'ASSIGNED', 'ACCEPTED']);

  it('isCancellable(s) === (s in {PENDING, UNDER_REVIEW, ASSIGNED, ACCEPTED})', () => {
    fc.assert(
      fc.property(statusArb, (s) => {
        expect(isCancellable(s)).toBe(CANCELLABLE.has(s));
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it('isCancellable is false for the non-cancellable statuses', () => {
    for (const s of ['EN_ROUTE', 'COMPLETED', 'CANCELLED', 'DISPUTED'] as const) {
      expect(isCancellable(s)).toBe(false);
    }
  });
});
