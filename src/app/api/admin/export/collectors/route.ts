import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateCSV, getCSVFilename } from "@/lib/utils/csv";

const COLLECTOR_CSV_HEADERS = [
  "id",
  "business_name",
  "contact_person",
  "phone",
  "email",
  "cac_number",
  "business_address",
  "service_areas",
  "waste_types",
  "staff_count",
  "vehicle_count",
  "years_in_operation",
  "created_at",
];

const MAX_EXPORT_RECORDS = 10000;

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Validate authenticated session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const lga = searchParams.get("lga") || "";

  try {
    // Build query with same filter logic as /api/admin/collectors
    let query = supabase
      .from("collectors")
      .select("id, business_name, contact_person, phone, email, cac_number, business_address, service_areas, waste_types, staff_count, vehicle_count, years_in_operation, created_at");

    // Apply search filter (case-insensitive, minimum 2 characters)
    if (search.length >= 2) {
      const searchPattern = `%${search}%`;
      query = query.or(
        `business_name.ilike.${searchPattern},contact_person.ilike.${searchPattern},phone.ilike.${searchPattern},email.ilike.${searchPattern},business_address.ilike.${searchPattern}`
      );
    }

    // Apply LGA filter (matches service_areas array contains)
    if (lga) {
      query = query.contains("service_areas", [lga]);
    }

    // Order and limit
    query = query.order("created_at", { ascending: false }).limit(MAX_EXPORT_RECORDS);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "An unexpected error occurred. Please try again." },
        { status: 500 }
      );
    }

    // Serialize array fields as comma-separated strings
    const rows = (data || []).map((row) => ({
      ...row,
      service_areas: Array.isArray(row.service_areas)
        ? row.service_areas.join(", ")
        : row.service_areas ?? "",
      waste_types: Array.isArray(row.waste_types)
        ? row.waste_types.join(", ")
        : row.waste_types ?? "",
    })) as Record<string, unknown>[];

    const csv = generateCSV(COLLECTOR_CSV_HEADERS, rows);
    const filename = getCSVFilename("collectors");

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Export failed. Please try again." },
      { status: 500 }
    );
  }
}
