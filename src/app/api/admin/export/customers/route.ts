import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateCSV, getCSVFilename } from "@/lib/utils/csv";

const CUSTOMER_CSV_HEADERS = [
  "id",
  "full_name",
  "phone",
  "email",
  "address",
  "lga",
  "category",
  "disposal_method",
  "collection_frequency",
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
  const category = searchParams.get("category") || "";

  try {
    // Build query with same filter logic as /api/admin/customers
    let query = supabase
      .from("customers")
      .select("id, full_name, phone, email, address, lga, category, disposal_method, collection_frequency, created_at");

    // Apply search filter (case-insensitive, minimum 2 characters)
    if (search.length >= 2) {
      const searchPattern = `%${search}%`;
      query = query.or(
        `full_name.ilike.${searchPattern},phone.ilike.${searchPattern},email.ilike.${searchPattern},address.ilike.${searchPattern}`
      );
    }

    // Apply LGA filter
    if (lga) {
      query = query.eq("lga", lga);
    }

    // Apply category filter
    if (category) {
      query = query.eq("category", category);
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

    const rows = (data || []) as Record<string, unknown>[];
    const csv = generateCSV(CUSTOMER_CSV_HEADERS, rows);
    const filename = getCSVFilename("customers");

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
