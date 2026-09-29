import { describe, it, expect } from 'vitest';
import { displayField, NOT_RECORDED } from '@/lib/utils/display';

/**
 * Unit tests confirming the existing displayField helper renders "Not recorded"
 * for null Collection_Request fields reused on the admin detail view.
 * Feature: cleancall-phase-3-collection-requests
 * Validates: Requirements 9.3
 */

describe('displayField for null Collection_Request fields', () => {
  // Representative nullable request fields simulated as null/undefined/''.
  const requestFields = [
    'bin_bag_count',
    'email',
    'additional_notes',
    'willingness_to_pay',
    'price_range',
  ] as const;

  it.each(requestFields)('returns "Not recorded" for null %s', (field) => {
    void field;
    expect(displayField(null)).toBe(NOT_RECORDED);
    expect(displayField(null)).toBe('Not recorded');
  });

  it.each(requestFields)('returns "Not recorded" for undefined %s', (field) => {
    void field;
    expect(displayField(undefined)).toBe('Not recorded');
  });

  it.each(requestFields)('returns "Not recorded" for empty-string %s', (field) => {
    void field;
    expect(displayField('')).toBe('Not recorded');
  });
});
