import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  groupRegistrationsByDate,
  groupByRole,
  groupByLga,
  groupCustomersByWillingness,
  groupCustomersByExistingCollection,
} from "@/lib/utils/stats";
import type { Customer, Collector } from "@/types";

// A high cap for a single select. At MVP volume a single unpaginated fetch is
// sufficient; the cap guards against unbounded reads.
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

  // Fetch all customers (only the columns the chart helpers need)
  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select("lga, created_at, willingness_to_pay, has_existing_collection")
    .limit(MAX_ROWS);

  if (customersError) {
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }

  // Fetch all collectors (only the columns the chart helpers need)
  const { data: collectors, error: collectorsError } = await supabase
    .from("collectors")
    .select("service_areas, created_at")
    .limit(MAX_ROWS);

  if (collectorsError) {
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }

  const customerRows = (customers as Customer[]) || [];
  const collectorRows = (collectors as Collector[]) || [];

  // Every chart dataset is query-derived via the pure helpers (no hardcoded values).
  const payload = {
    registrationsOverTime: groupRegistrationsByDate(customerRows, collectorRows),
    customersVsManagers: groupByRole(customerRows, collectorRows),
    byLga: groupByLga(customerRows, collectorRows),
    byWillingness: groupCustomersByWillingness(customerRows),
    byExistingCollection: groupCustomersByExistingCollection(customerRows),
  };

  return NextResponse.json(payload);
}
