import { z } from 'zod';
import { REQUEST_STATUSES } from '@/lib/constants/request-status';

/**
 * Admin status-change payload.
 * `fromExpected` is an optional optimistic-concurrency guard so a concurrent
 * status change cannot be silently clobbered.
 */
export const requestStatusChangeSchema = z.object({
  status: z.enum(REQUEST_STATUSES),
  fromExpected: z.enum(REQUEST_STATUSES).optional(),
});

/** Admin assignment payload. */
export const assignRequestSchema = z.object({
  collector_id: z.string().uuid(),
});
