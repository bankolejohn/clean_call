import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  recordActivity,
  type ActivityActionType,
} from '@/lib/utils/activity-log';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Unit tests for the activity-log helper.
 *
 * Validates: Requirements 14.1, 14.2, 14.3
 *
 * recordActivity is best-effort: it inserts an entry into `activity_log` and
 * MUST NOT fail the primary operation, whether the insert returns { error } or
 * throws outright.
 */

interface CapturedRow {
  action_type: string;
  description: string;
  metadata: Record<string, unknown>;
}

/** Mock client that captures the inserted payload and resolves successfully. */
function makeCapturingClient(captured: CapturedRow[]): SupabaseClient {
  return {
    from: () => ({
      insert: async (row: CapturedRow) => {
        captured.push(row);
        return { error: null };
      },
    }),
  } as unknown as SupabaseClient;
}

/** Mock client whose insert resolves with an { error } object (no throw). */
function makeErrorReturningClient(): SupabaseClient {
  return {
    from: () => ({
      insert: async () => ({ error: { message: 'insert failed' } }),
    }),
  } as unknown as SupabaseClient;
}

/** Mock client whose insert throws. */
function makeThrowingClient(): SupabaseClient {
  return {
    from: () => ({
      insert: async () => {
        throw new Error('network exploded');
      },
    }),
  } as unknown as SupabaseClient;
}

describe('recordActivity', () => {
  // The helper logs failures via console.error; silence it to keep output clean.
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('inserts the correct { action_type, description, metadata } shape for a representative action type', async () => {
    const captured: CapturedRow[] = [];
    const client = makeCapturingClient(captured);

    const actionType: ActivityActionType = 'customer_status_change';
    const description = 'Customer #42 moved to Contacted';
    const metadata = { customerId: '42', newStatus: 'Contacted' };

    await recordActivity(client, actionType, description, metadata);

    expect(captured).toHaveLength(1);
    expect(captured[0]).toEqual({
      action_type: 'customer_status_change',
      description: 'Customer #42 moved to Contacted',
      metadata: { customerId: '42', newStatus: 'Contacted' },
    });
  });

  it('defaults metadata to {} when omitted', async () => {
    const captured: CapturedRow[] = [];
    const client = makeCapturingClient(captured);

    await recordActivity(client, 'admin_login', 'Admin signed in');

    expect(captured).toHaveLength(1);
    expect(captured[0].metadata).toEqual({});
  });

  it('swallows a returned { error } object without throwing', async () => {
    const client = makeErrorReturningClient();

    await expect(
      recordActivity(client, 'data_export', 'Exported customers CSV')
    ).resolves.toBeUndefined();
  });

  it('swallows a thrown insert error without throwing', async () => {
    const client = makeThrowingClient();

    await expect(
      recordActivity(client, 'provider_approval', 'Approved provider #7')
    ).resolves.toBeUndefined();
  });
});
