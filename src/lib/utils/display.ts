// Null-safe display mapping for profile/detail views (Phase 2, Property 13).
// Pure, DB-independent: returns a human-readable string for any field value.

/** Indicator shown when a field value is null/undefined/empty. */
export const NOT_RECORDED = 'Not recorded';

/**
 * Returns the field's value as a display string when present, and the
 * not-recorded indicator when the value is null/undefined/empty.
 * Never throws. (Requirements 1.4, 9.2, 11.2, 13.3)
 */
export function displayField(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return NOT_RECORDED;
  }
  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : NOT_RECORDED;
  }
  return String(value);
}
