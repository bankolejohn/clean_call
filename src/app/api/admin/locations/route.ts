import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { locationBreakdown } from "@/lib/utils/stats";
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

  // Fetch customer LGAs
  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select("lga")
    .limit(MAX_ROWS);

  if (customersError) {
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }

  // Fetch collector service areas
  const { data: collectors, error: collectorsError } = await supabase
    .from("collectors")
    .select("service_areas")
    .limit(MAX_ROWS);

  if (collectorsError) {
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }

  // Query-derived breakdown for all 16 LGAs (including zeros).
  const breakdown = locationBreakdown(
    (customers as Customer[]) || [],
    (collectors as Collector[]) || []
  );

  return NextResponse.json(breakdown);
}
