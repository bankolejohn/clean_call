import { describe, it, expect } from 'vitest';
import { generateRequestNumber, generateTrackingToken } from '@/lib/utils/request-id';

/**
 * Unit tests for the Request_Number and Tracking_Token generators.
 * Feature: cleancall-phase-3-collection-requests
 */

describe('generateRequestNumber', () => {
  it('encodes a fixed UTC date as CR-20260105-XXXX', () => {
    const result = generateRequestNumber(new Date(Date.UTC(2026, 0, 5)));
    expect(result.startsWith('CR-20260105-')).toBe(true);
    expect(result).toMatch(/^CR-20260105-\d{4}$/);
  });
});

describe('generateTrackingToken', () => {
  it('produces a URL-safe base64url token of length 43', () => {
    const token = generateTrackingToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBe(43);
  });
});
