import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateRequestNumber, generateTrackingToken } from '@/lib/utils/request-id';

/**
 * Property-Based Tests for the Request_Number and Tracking_Token generators.
 * Feature: cleancall-phase-3-collection-requests
 */

const NUM_RUNS = 100;

// =============================================================================
// Property 5: Request_Number format encodes the date
// =============================================================================

// Feature: cleancall-phase-3-collection-requests, Property 5: Request_Number format encodes the date
describe('Feature: cleancall-phase-3-collection-requests, Property 5: Request_Number format encodes the date', () => {
  /**
   * Validates: Requirements 2.2, 5.5
   *
   * For any valid date, generateRequestNumber(date) matches CR-YYYYMMDD-XXXX and
   * the YYYYMMDD segment equals the UTC year/month/day of the supplied date.
   */
  it('matches CR-YYYYMMDD-XXXX and encodes the UTC date', () => {
    // Constrain to the four-digit-year range the CR-YYYYMMDD-XXXX format targets
    // (fc.date() otherwise yields years < 1000, which are not part of the format's
    // input space — real requests are dated in the present/near future).
    const realisticDateArb = fc.date({
      min: new Date(Date.UTC(1000, 0, 1)),
      max: new Date(Date.UTC(9999, 11, 31)),
    });

    fc.assert(
      fc.property(realisticDateArb, (date) => {
        // Guard against invalid Date instances that fc.date() can produce.
        fc.pre(!Number.isNaN(date.getTime()));

        const result = generateRequestNumber(date);
        expect(result).toMatch(/^CR-\d{8}-\d{4}$/);

        const y = date.getUTCFullYear();
        const m = String(date.getUTCMonth() + 1).padStart(2, '0');
        const d = String(date.getUTCDate()).padStart(2, '0');
        const expectedDateSegment = `${y}${m}${d}`;

        expect(result.slice(3, 3 + expectedDateSegment.length)).toBe(expectedDateSegment);
      }),
      { numRuns: NUM_RUNS }
    );
  });
});

// =============================================================================
// Property 6: Tracking_Token is URL-safe and collision-free
// =============================================================================

// Feature: cleancall-phase-3-collection-requests, Property 6: Tracking_Token is URL-safe and collision-free
describe('Feature: cleancall-phase-3-collection-requests, Property 6: Tracking_Token is URL-safe and collision-free', () => {
  /**
   * Validates: Requirements 2.3, 6.5
   *
   * Every generated token is URL-safe base64url, has the fixed length produced by
   * 32 random bytes (43 chars, unpadded base64url), and a large batch has no dupes.
   */
  const URL_SAFE = /^[A-Za-z0-9_-]+$/;
  const EXPECTED_LENGTH = 43; // 32 bytes → ceil(32/3)*4 = 44, minus 1 pad char = 43 unpadded

  it('each generated token is URL-safe base64url of fixed length 43', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 25 }), (count) => {
        for (let i = 0; i < count; i++) {
          const token = generateTrackingToken();
          expect(token).toMatch(URL_SAFE);
          expect(token.length).toBe(EXPECTED_LENGTH);
        }
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it('a large batch of generated tokens contains no duplicates', () => {
    const N = 5000;
    const tokens = new Set<string>();
    for (let i = 0; i < N; i++) {
      tokens.add(generateTrackingToken());
    }
    expect(tokens.size).toBe(N);
  });
});
