import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isCollectorWasteTypeCompatible } from "@/lib/utils/waste-type-match";
import type { CandidateCollector } from "@/types";
import type { WasteType } from "@/lib/constants/waste-types";

const MAX_CANDIDATES = 50;

/**
 * GET /api/admin/requests/[id]/candidates
 * Suggests Active collectors whose service_areas contain the request's LGA and
 * whose free-text waste_types are compatible with the request's Waste_Type.
 * Capped at 50; may be empty. Suggestion only — the Admin may assign any
 * collector.
 * Requirements 10.1, 10.2, 10.3, 14.2.
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

  // Load the request's lga + waste_type.
  const { data: requestRow, error: requestError } = await supabase
    .from("collection_requests")
    .select("lga, waste_type")
    .eq("id", id)
    .maybeSingle();

  if (requestError) {
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }

  if (!requestRow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { lga, waste_type } = requestRow as {
    lga: string;
    waste_type: WasteType;
  };

  const service = createServiceClient();

  // Active collectors serving the request's LGA.
  const { data: collectors, error: collectorsError } = await service
    .from("collectors")
    .select("id, business_name, service_areas, waste_types, status")
    .eq("status", "Active")
    .contains("service_areas", [lga]);

  if (collectorsError) {
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }

  const candidates: CandidateCollector[] = ((collectors as CandidateCollector[]) || [])
    .filter((c) =>
      isCollectorWasteTypeCompatible(c.waste_types ?? [], waste_type)
    )
    .slice(0, MAX_CANDIDATES);

  return NextResponse.json(candidates);
}
