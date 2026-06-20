import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { EKITI_LGAS } from "@/lib/constants/lgas";
import type { DashboardStats, RecentRegistration, LGABreakdownItem, EkitiLGA } from "@/types";

export async function GET() {
  const supabase = await createClient();

  // Validate authenticated session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get customer count
  const { count: customerCount, error: customerCountError } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true });

  if (customerCountError) {
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }

  // Get collector count
  const { count: collectorCount, error: collectorCountError } = await supabase
    .from("collectors")
    .select("*", { count: "exact", head: true });

  if (collectorCountError) {
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }

  // Get recent 10 registrations (union of customers and collectors, sorted by created_at desc)
  const { data: recentCustomers, error: recentCustomersError } = await supabase
    .from("customers")
    .select("full_name, lga, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  if (recentCustomersError) {
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }

  const { data: recentCollectors, error: recentCollectorsError } = await supabase
    .from("collectors")
    .select("contact_person, lga:service_areas, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  if (recentCollectorsError) {
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }

  // Merge and sort recent registrations
  const mergedRecent: RecentRegistration[] = [
    ...(recentCustomers || []).map((c) => ({
      name: c.full_name,
      role: "Customer" as const,
      lga: c.lga,
      created_at: c.created_at,
    })),
    ...(recentCollectors || []).map((c) => ({
      name: c.contact_person,
      role: "Collector" as const,
      // service_areas is an array; use first area as representative LGA
      lga: Array.isArray(c.lga) ? c.lga[0] || "" : String(c.lga || ""),
      created_at: c.created_at,
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 10);

  // Get LGA breakdown
  const { data: allCustomers, error: customersLgaError } = await supabase
    .from("customers")
    .select("lga");

  if (customersLgaError) {
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }

  const { data: allCollectors, error: collectorsLgaError } = await supabase
    .from("collectors")
    .select("service_areas");

  if (collectorsLgaError) {
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }

  // Count customers per LGA
  const customerLgaCounts: Record<string, number> = {};
  for (const row of allCustomers || []) {
    customerLgaCounts[row.lga] = (customerLgaCounts[row.lga] || 0) + 1;
  }

  // Count collectors per LGA (collectors can serve multiple LGAs)
  const collectorLgaCounts: Record<string, number> = {};
  for (const row of allCollectors || []) {
    const areas = row.service_areas as string[];
    if (Array.isArray(areas)) {
      for (const area of areas) {
        collectorLgaCounts[area] = (collectorLgaCounts[area] || 0) + 1;
      }
    }
  }

  // Build breakdown for all 16 LGAs (including zeros)
  const lgaBreakdown: LGABreakdownItem[] = EKITI_LGAS.map((lga) => ({
    lga: lga as EkitiLGA,
    customerCount: customerLgaCounts[lga] || 0,
    collectorCount: collectorLgaCounts[lga] || 0,
  }));

  const stats: DashboardStats = {
    customerCount: customerCount || 0,
    collectorCount: collectorCount || 0,
    recentRegistrations: mergedRecent,
    lgaBreakdown,
  };

  return NextResponse.json(stats);
}
