import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { assignRequestSchema } from "@/lib/validators/request-status";
import { recordActivity } from "@/lib/utils/activity-log";
import type { CollectionRequest } from "@/types";

/**
 * POST /api/admin/requests/[id]/assign
 * Assigns a request to an Active Waste_Manager with a single guarded atomic
 * update. Two concurrent assigns race at the database; exactly one wins and the
 * loser matches zero rows and gets a 400.
 * Requirements 10.4–10.8, 13.1–13.3, 14.2.
 */
export async function POST(
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

  const parsed = assignRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid assignment",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { collector_id } = parsed.data;
  const service = createServiceClient();

  // Verify the collector exists and is Active.
  const { data: collector, error: collectorError } = await service
    .from("collectors")
    .select("id, status")
    .eq("id", collector_id)
    .maybeSingle();

  if (collectorError) {
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }

  if (!collector || (collector as { status: string }).status !== "Active") {
    return NextResponse.json(
      { error: "The selected Waste Manager is invalid" },
      { status: 400 }
    );
  }

  // Guarded atomic assign: succeeds only when currently unassigned and in an
  // assignable status (PENDING or UNDER_REVIEW).
  const { data: rows, error } = await service
    .from("collection_requests")
    .update({
      collector_id,
      status: "ASSIGNED",
      assigned_at: new Date().toISOString(),
    })
    .eq("id", id)
    .is("collector_id", null)
    .in("status", ["PENDING", "UNDER_REVIEW"])
    .select();

  if (error) {
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json(
      { error: "This request is already assigned or not in an assignable state" },
      { status: 400 }
    );
  }

  const updated = rows[0] as CollectionRequest;

  // Record the assignment event (best-effort).
  await recordActivity(
    service,
    "request_assigned",
    `Request ${updated.request_number} assigned to ${collector_id}`,
    {
      request_id: id,
      request_number: updated.request_number,
      collector_id,
    }
  );

  return NextResponse.json(updated);
}
