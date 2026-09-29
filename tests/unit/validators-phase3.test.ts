import { describe, it, expect } from 'vitest';
import { collectionRequestSchema } from '@/lib/validators/collection-request';
import {
  requestStatusChangeSchema,
  assignRequestSchema,
} from '@/lib/validators/request-status';
import { EKITI_LGAS } from '@/lib/constants/lgas';
import { WASTE_TYPES } from '@/lib/constants/waste-types';

/**
 * Unit tests for Phase 3 validators.
 * Feature: cleancall-phase-3-collection-requests
 * Validates: Requirements 5.3, 5.4, 4.7, 10.5
 */

/** A fully-valid public submission (comfortably-future pickup date). */
function validSubmission(overrides: Record<string, unknown> = {}) {
  const future = new Date();
  future.setUTCDate(future.getUTCDate() + 30);
  const y = future.getUTCFullYear();
  const m = String(future.getUTCMonth() + 1).padStart(2, '0');
  const d = String(future.getUTCDate()).padStart(2, '0');

  return {
    full_name: 'Ada Obi',
    phone: '08031234567',
    email: 'ada@example.com',
    pickup_address: '12 Market Road, Ado-Ekiti',
    lga: EKITI_LGAS[0],
    waste_type: WASTE_TYPES[0],
    estimated_quantity: '3 bags',
    bin_bag_count: 3,
    preferred_pickup_date: `${y}-${m}-${d}`,
    preferred_pickup_time: 'Morning',
    additional_notes: 'Leave at the gate',
    willingness_to_pay: 'Yes',
    price_range: 'Below ₦2,000',
    ...overrides,
  };
}

describe('collectionRequestSchema', () => {
  it('accepts a fully-valid submission', () => {
    const result = collectionRequestSchema.safeParse(validSubmission());
    expect(result.success).toBe(true);
  });

  it('rejects a bad phone number with a phone field error', () => {
    const result = collectionRequestSchema.safeParse(
      validSubmission({ phone: '12345' })
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.phone).toBeDefined();
    }
  });

  it('rejects an invalid LGA with an lga field error', () => {
    const result = collectionRequestSchema.safeParse(
      validSubmission({ lga: 'Nowhere' })
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.lga).toBeDefined();
    }
  });

  it('rejects an invalid waste type with a waste_type field error', () => {
    const result = collectionRequestSchema.safeParse(
      validSubmission({ waste_type: 'PLASTIC' })
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.waste_type).toBeDefined();
    }
  });

  it('rejects an empty required field (full_name) with a full_name field error', () => {
    const result = collectionRequestSchema.safeParse(
      validSubmission({ full_name: '' })
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.full_name).toBeDefined();
    }
  });

  it('rejects a past preferred_pickup_date with a preferred_pickup_date field error', () => {
    const result = collectionRequestSchema.safeParse(
      validSubmission({ preferred_pickup_date: '2000-01-01' })
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.preferred_pickup_date).toBeDefined();
    }
  });
});

describe('requestStatusChangeSchema', () => {
  it('accepts { status: ACCEPTED }', () => {
    expect(requestStatusChangeSchema.safeParse({ status: 'ACCEPTED' }).success).toBe(true);
  });

  it('accepts { status: ACCEPTED, fromExpected: ASSIGNED }', () => {
    expect(
      requestStatusChangeSchema.safeParse({
        status: 'ACCEPTED',
        fromExpected: 'ASSIGNED',
      }).success
    ).toBe(true);
  });

  it('rejects an unknown status', () => {
    const result = requestStatusChangeSchema.safeParse({ status: 'NOPE' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.status).toBeDefined();
    }
  });
});

describe('assignRequestSchema', () => {
  it('accepts a valid uuid collector_id', () => {
    const result = assignRequestSchema.safeParse({
      collector_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a non-uuid collector_id', () => {
    const result = assignRequestSchema.safeParse({ collector_id: 'not-a-uuid' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.collector_id).toBeDefined();
    }
  });
});
