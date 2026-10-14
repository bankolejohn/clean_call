import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeStats } from "@/lib/utils/stats";
import type { Customer, Collector, ActivityLogEntry } from "@/types";

// Activity_Log action types that represent request lifecycle events.
const REQUEST_EVENT_TYPES = [
  "request_created",
  "request_assigned",
  "request_completed",
  "request_cancelled",
  "request_status_change",
  "request_reviewed",
  "request_accepted",
  "request_en_route",
  "request_disputed",
] as const;

// A high cap for a single select. At MVP volume (~99 records) a single
// unpaginated fetch is sufficient; the cap guards against unbounded reads.
const MAX_ROWS = 10000;

export async function GET() {
  const supabase = await createClient();

  // Validate authenticated session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all customers (only the columns the stats helper needs)
  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select(
      "id, full_name, lga, created_at, willingness_to_pay, has_existing_collection, status"
    )
    .limit(MAX_ROWS);

  if (customersError) {
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }

  // Fetch all collectors (only the columns the stats helper needs)
  const { data: collectors, error: collectorsError } = await supabase
    .from("collectors")
    .select("id, contact_person, service_areas, created_at, status")
    .limit(MAX_ROWS);

  if (collectorsError) {
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }

  // All statistics are query-derived via the pure helper (no hardcoded values).
  const stats = computeStats(
    (customers as Customer[]) || [],
    (collectors as Collector[]) || []
  );

  // Phase 3: pending collection-request count (query-derived).
  const { count: pendingRequests } = await supabase
    .from("collection_requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "PENDING");

  // Phase 3: recent request lifecycle events from the Activity_Log.
  const { data: recentRequestEvents } = await supabase
    .from("activity_log")
    .select("*")
    .in("action_type", REQUEST_EVENT_TYPES as unknown as string[])
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({
    ...stats,
    pendingRequests: pendingRequests || 0,
    recentRequestEvents: (recentRequestEvents as ActivityLogEntry[]) || [],
  });
}
