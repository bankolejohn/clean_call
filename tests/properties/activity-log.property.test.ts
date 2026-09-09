import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  recordActivity,
  type ActivityActionType,
} from '@/lib/utils/activity-log';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Property-Based Tests for Phase 2 activity-log entries.
 *
 * Feature: cleancall-phase-2-admin, Property 16: Activity entries are well-formed and ordered
 *
 * Validates: Requirements 14.3, 14.4
 *
 * recordActivity itself performs I/O (a Supabase INSERT), so these properties
 * target the PURE, observable aspects of that behavior:
 *
 *   Part A (well-formed): For any recognized actionType, any description, and
 *   any metadata object, the payload that WOULD be inserted into `activity_log`
 *   carries a non-empty `action_type` equal to the given actionType and faithfully
 *   carries the description and metadata. We capture the payload with a mock
 *   Supabase client whose .from().insert() records the inserted row.
 *
 *   Part B (ordering): Ordering by created_at DESC (Requirement 14.4) yields a
 *   non-increasing sequence of created_at values for ANY array of entries.
 */

const NUM_RUNS = 100;

// The recognized activity event types (mirrors the ActivityActionType union).
const ACTION_TYPES: ActivityActionType[] = [
  'admin_login',
  'customer_status_change',
  'provider_approval',
  'provider_suspension',
  'provider_status_change',
  'data_export',
];

const actionTypeArb = fc.constantFrom<ActivityActionType>(...ACTION_TYPES);

// A JSON-serializable metadata object (string/number/boolean values).
const metadataArb = fc.dictionary(
  fc.string(),
  fc.oneof(fc.string(), fc.integer(), fc.boolean())
);

interface CapturedRow {
  action_type: string;
  description: string;
  metadata: Record<string, unknown>;
}

/**
 * A mock Supabase client whose .from().insert() captures the inserted payload
 * and resolves successfully. Only the surface recordActivity touches is modeled.
 */
function makeMockClient(captured: CapturedRow[]): SupabaseClient {
  return {
    from: () => ({
      insert: async (row: CapturedRow) => {
        captured.push(row);
        return { error: null };
      },
    }),
  } as unknown as SupabaseClient;
}

/**
 * Pure ordering model for Requirement 14.4: sort entries by created_at descending.
 * Returns a NEW array (does not mutate the input).
 */
function orderByCreatedAtDesc<T extends { created_at: number }>(
  entries: readonly T[]
): T[] {
  return [...entries].sort((a, b) => b.created_at - a.created_at);
}

describe('Feature: cleancall-phase-2-admin, Property 16: Activity entries are well-formed and ordered', () => {
  it('Part A: the inserted payload has a non-empty action_type equal to the given type and carries the description/metadata', async () => {
    await fc.assert(
      fc.asyncProperty(
        actionTypeArb,
        fc.string(),
        metadataArb,
        async (actionType, description, metadata) => {
          const captured: CapturedRow[] = [];
          const client = makeMockClient(captured);

          await recordActivity(client, actionType, description, metadata);

          // Exactly one row is inserted per call.
          expect(captured).toHaveLength(1);
          const row = captured[0];

          // action_type is non-empty and equals the requested actionType.
          expect(row.action_type).toBe(actionType);
          expect(row.action_type.length).toBeGreaterThan(0);

          // description and metadata are carried faithfully.
          expect(row.description).toBe(description);
          expect(row.metadata).toEqual(metadata);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it('Part B: ordering entries by created_at descending yields a non-increasing sequence', () => {
    const entryArb = fc.record({ created_at: fc.integer() });

    fc.assert(
      fc.property(fc.array(entryArb), (entries) => {
        const ordered = orderByCreatedAtDesc(entries);

        // Same population, just reordered.
        expect(ordered).toHaveLength(entries.length);

        // created_at is non-increasing across the ordered result.
        for (let i = 1; i < ordered.length; i++) {
          expect(ordered[i - 1].created_at).toBeGreaterThanOrEqual(
            ordered[i].created_at
          );
        }
      }),
      { numRuns: NUM_RUNS }
    );
  });
});
