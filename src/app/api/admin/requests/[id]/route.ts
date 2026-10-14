import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ActivityLogEntry, CollectionRequest } from "@/types";

/**
 * GET /api/admin/requests/[id]
 * Fetches a single collection request (including internal_notes for the Admin)
 * plus its related activity_log entries (by metadata.request_id), newest first.
 * Requirements 9.1, 9.5, 9.6, 9.7, 14.2.
 */
export async function GET(
  _request: NextRequest,
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

  const { data: requestRow, error } = await supabase
    .from("collection_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }

  if (!requestRow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Related activity for this request (authed client can SELECT activity_log
  // per the Phase 2 policy). Best-effort: an activity error should not fail the
  // detail read.
  const { data: activity } = await supabase
    .from("activity_log")
    .select("*")
    .eq("metadata->>request_id", id)
    .order("created_at", { ascending: false });

  const response: CollectionRequest & { activity: ActivityLogEntry[] } = {
    ...(requestRow as CollectionRequest),
    activity: (activity as ActivityLogEntry[]) || [],
  };

  return NextResponse.json(response);
}
