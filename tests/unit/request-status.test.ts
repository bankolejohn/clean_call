import { describe, it, expect } from 'vitest';
import {
  ALLOWED_TRANSITIONS,
  isAllowedTransition,
} from '@/lib/utils/request-status';
import { REQUEST_STATUSES } from '@/lib/constants/request-status';

/**
 * Unit tests for the Request_Status transition module.
 * Feature: cleancall-phase-3-collection-requests
 */

describe('ALLOWED_TRANSITIONS shape', () => {
  it('encodes the exact transition table', () => {
    expect(ALLOWED_TRANSITIONS).toEqual({
      PENDING: ['UNDER_REVIEW', 'CANCELLED', 'DISPUTED'],
      UNDER_REVIEW: ['CANCELLED', 'DISPUTED'],
      ASSIGNED: ['ACCEPTED', 'CANCELLED', 'DISPUTED'],
      ACCEPTED: ['EN_ROUTE', 'CANCELLED', 'DISPUTED'],
      EN_ROUTE: ['COMPLETED', 'DISPUTED'],
      COMPLETED: [],
      CANCELLED: [],
      DISPUTED: ['CANCELLED', 'COMPLETED'],
    });
  });

  it('never lists ASSIGNED as a transition target', () => {
    for (const from of REQUEST_STATUSES) {
      expect(ALLOWED_TRANSITIONS[from]).not.toContain('ASSIGNED');
    }
  });
});

describe('isAllowedTransition — representative allowed transitions', () => {
  it('PENDING → UNDER_REVIEW is allowed', () => {
    expect(isAllowedTransition('PENDING', 'UNDER_REVIEW')).toBe(true);
  });

  it('EN_ROUTE → COMPLETED is allowed', () => {
    expect(isAllowedTransition('EN_ROUTE', 'COMPLETED')).toBe(true);
  });

  it('DISPUTED → CANCELLED is allowed', () => {
    expect(isAllowedTransition('DISPUTED', 'CANCELLED')).toBe(true);
  });
});

describe('isAllowedTransition — representative blocked transitions', () => {
  it('PENDING → COMPLETED is blocked', () => {
    expect(isAllowedTransition('PENDING', 'COMPLETED')).toBe(false);
  });

  it('EN_ROUTE → PENDING is blocked', () => {
    expect(isAllowedTransition('EN_ROUTE', 'PENDING')).toBe(false);
  });

  it('any transition to ASSIGNED is blocked (assign op only)', () => {
    for (const from of REQUEST_STATUSES) {
      expect(isAllowedTransition(from, 'ASSIGNED')).toBe(false);
    }
  });
});
