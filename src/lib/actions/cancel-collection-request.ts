"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { recordActivity } from "@/lib/utils/activity-log";
import {
  isCancellable,
  CANCELLABLE_STATUSES,
} from "@/lib/utils/request-status";
import type { ActionResult, RequestStatus } from "@/types";

/**
 * Public cancellation server action for a Collection_Request.
 *
 * Authorization is solely the opaque tracking `token` (Requirement 7.5, 14.10):
 * anyone holding the token may cancel, no session is required. Runs entirely
 * server-side via the SERVICE-role client (collection_requests has no anon
 * policy).
 *
 * The cancel is guarded twice: an up-front `isCancellable` check on the loaded
 * status (Requirement 7.1, 7.2) AND a `status in CANCELLABLE_STATUSES` predicate
 * on the UPDATE itself, so a request that moved to a non-cancellable status
 * concurrently cannot be cancelled (the update simply matches no row).
 */
export async function cancelCollectionRequest(
  token: string
): Promise<ActionResult> {
  // Reject missing / malformed tokens without touching the database.
  if (!token || typeof token !== "string") {
    return { success: false, error: "Invalid request." };
  }

  // Service-role client (bypasses RLS; required because collection_requests has
  // no anon policy).
  const service = createServiceClient();

  // Load the target row by token. maybeSingle → null (not an error) when the
  // token matches nothing.
  const { data: row } = await service
    .from("collection_requests")
    .select("id, request_number, status")
    .eq("tracking_token", token)
    .maybeSingle();

  // Generic not-found message — never reveal whether a token exists.
  if (!row) {
    return { success: false, error: "Request not found." };
  }

  const status = row.status as RequestStatus;

  // Up-front guard on the loaded status.
  if (!isCancellable(status)) {
    return {
      success: false,
      error: "This request can no longer be cancelled.",
    };
  }

  // Guarded update: only flips to CANCELLED while the row is still in a
  // cancellable status. If it raced to a non-cancellable status, no row is
  // returned and we treat it as no-longer-cancellable.
  const { data: updated } = await service
    .from("collection_requests")
    .update({
      status: "CANCELLED",
      cancelled_at: new Date().toISOString(),
    })
    .eq("tracking_token", token)
    .in("status", [...CANCELLABLE_STATUSES])
    .select("id, request_number, status")
    .maybeSingle();

  if (!updated) {
    return {
      success: false,
      error: "This request can no longer be cancelled.",
    };
  }

  // Best-effort activity log — never fail the op if logging fails
  // (recordActivity already swallows errors). `from` records the status the
  // request was cancelled out of.
  await recordActivity(
    service,
    "request_cancelled",
    `Collection request ${row.request_number} cancelled by customer`,
    {
      request_id: row.id,
      request_number: row.request_number,
      from: row.status,
    }
  );

  return { success: true, request_number: row.request_number };
}
