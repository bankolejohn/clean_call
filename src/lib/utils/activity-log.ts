/**
 * Activity log helper.
 *
 * Server-side helper that appends an entry to the `activity_log` table so that
 * status changes, approvals, suspensions, logins, and exports all record
 * through a single code path (Requirement 14).
 *
 * Authorization note: the `activity_log` INSERT policy permits **`service_role`
 * only**. This helper takes whatever Supabase client is passed in — it does NOT
 * create its own — and the CALLER is responsible for passing a server-side
 * client with service-role privileges. Keeping writes on the service role means
 * the RLS policy, not the caller, is the single source of truth for who may
 * append to the audit log (see Requirement 16.5).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The set of recognized activity event types. `action_type` is stored as plain
 * TEXT in the database (not a DB enum) so future event types can be added
 * without a schema change (Requirement 19.3).
 */
export type ActivityActionType =
  | "admin_login"
  | "customer_status_change"
  | "provider_approval"
  | "provider_suspension"
  | "provider_status_change"
  | "data_export";

/**
 * Records a single activity entry. Best-effort only: logging must NEVER fail the
 * primary operation (a status change, approval, or export). Both failure modes
 * are swallowed here and only reported server-side:
 *   1. A thrown exception (network / unexpected error).
 *   2. A returned `{ error }` object — Supabase's query builder resolves with an
 *      error object rather than throwing on most failures.
 *
 * @param client - a service-role Supabase client supplied by the caller
 * @param actionType - the recognized activity event type
 * @param description - human-readable summary of what happened
 * @param metadata - optional structured context (entity ids, new status, etc.)
 */
export async function recordActivity(
  client: SupabaseClient,
  actionType: ActivityActionType,
  description: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    const { error } = await client.from("activity_log").insert({
      action_type: actionType,
      description,
      metadata,
    });

    // Supabase returns { error } rather than throwing — handle it without rethrowing.
    if (error) {
      console.error("Failed to record activity:", error);
    }
  } catch (err) {
    // Best-effort: activity logging must never fail the primary operation.
    console.error("Failed to record activity:", err);
  }
}
