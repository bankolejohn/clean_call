import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requestStatusChangeSchema } from "@/lib/validators/request-status";
import {
  isAllowedTransition,
  timestampFieldForStatus,
} from "@/lib/utils/request-status";
import { recordActivity, type ActivityActionType } from "@/lib/utils/activity-log";
import type { RequestStatus } from "@/lib/constants/request-status";
import type { CollectionRequest } from "@/types";

/** Maps a target status to its specific activity action type. */
function activityTypeForStatus(to: RequestStatus): ActivityActionType {
  switch (to) {
    case "UNDER_REVIEW":
      return "request_reviewed";
    case "ACCEPTED":
      return "request_accepted";
    case "EN_ROUTE":
      return "request_en_route";
    case "COMPLETED":
      return "request_completed";
    case "CANCELLED":
      return "request_cancelled";
    case "DISPUTED":
      return "request_disputed";
    default:
      return "request_status_change";
  }
}

/**
 * PATCH /api/admin/requests/[id]/status
 * Drives a request through its controlled status lifecycle with a guarded,
 * optimistic-concurrency update. Rejects to === 'ASSIGNED' (only the assign op
 * sets it), self-transitions, and any transition not permitted by the table.
 * Requirements 4.6–4.11, 11.1–11.8, 13.1–13.3, 14.2.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = requestStatusChangeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid status change",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const to = parsed.data.status;
  const service = createServiceClient();

  // Determine the current status: use fromExpected if provided, else load it.
  let from: RequestStatus;
  let requestNumber: string;

  if (parsed.data.fromExpected) {
    from = parsed.data.fromExpected;
    const { data: current, error: loadError } = await service
      .from("collection_requests")
      .select("request_number")
      .eq("id", id)
      .maybeSingle();

    if (loadError) {
      return NextResponse.json(
        { error: "An unexpected error occurred. Please try again." },
        { status: 500 }
      );
    }
    if (!current) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    requestNumber = (current as { request_number: string }).request_number;
  } else {
    const { data: current, error: loadError } = await service
      .from("collection_requests")
      .select("status, request_number")
      .eq("id", id)
      .maybeSingle();

    if (loadError) {
      return NextResponse.json(
        { error: "An unexpected error occurred. Please try again." },
        { status: 500 }
      );
    }
    if (!current) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    from = (current as { status: RequestStatus }).status;
    requestNumber = (current as { request_number: string }).request_number;
  }

  // ASSIGNED is reachable ONLY through the assign operation.
  if (to === "ASSIGNED") {
    return NextResponse.json(
      { error: "Transition not allowed" },
      { status: 400 }
    );
  }

  // Reject self-transition and anything not in the allowed table.
  if (!isAllowedTransition(from, to)) {
    return NextResponse.json(
      { error: "Transition not allowed" },
      { status: 400 }
    );
  }

  // Build the patch, setting the lifecycle timestamp for the target status.
  const patch: Record<string, unknown> = { status: to };
  const nextTs = timestampFieldForStatus(to);
  if (nextTs) {
    patch[nextTs] = new Date().toISOString();
  }

  // Guarded optimistic update: only if still in the expected `from` state.
  const { data, error } = await service
    .from("collection_requests")
    .update(patch)
    .eq("id", id)
    .eq("status", from)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Transition no longer valid" },
      { status: 400 }
    );
  }

  // Record the specific lifecycle event (best-effort).
  await recordActivity(
    service,
    activityTypeForStatus(to),
    `Request ${requestNumber} status ${from} → ${to}`,
    { request_id: id, request_number: requestNumber, from, to }
  );

  return NextResponse.json(data as CollectionRequest);
}
