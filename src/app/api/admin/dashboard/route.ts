import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeStats } from "@/lib/utils/stats";
import type { Customer, Collector } from "@/types";

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

  return NextResponse.json(stats);
}
