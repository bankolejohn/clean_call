import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateCSV, getCSVFilename, CUSTOMER_CSV_HEADERS } from "@/lib/utils/csv";
import { recordActivity } from "@/lib/utils/activity-log";

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
  const willingnessToPay = searchParams.get("willingness_to_pay") || "";
  const hasExistingCollection = searchParams.get("has_existing_collection") || "";
  const status = searchParams.get("status") || "";
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";

  try {
    // Build query with same filter logic as /api/admin/customers, fetching
    // Phase 1 + Phase 2 columns so all canonical CSV headers are populated.
    let query = supabase
      .from("customers")
      .select(
        "id, full_name, phone, email, address, lga, category, disposal_method, collection_frequency, created_at, willingness_to_pay, preferred_price_range, has_existing_collection, satisfaction_with_existing, status, updated_at"
      );

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

    // Apply Phase 2 willingness-to-pay filter (exact match)
    if (willingnessToPay) {
      query = query.eq("willingness_to_pay", willingnessToPay);
    }

    // Apply Phase 2 has-existing-collection filter (exact match)
    if (hasExistingCollection) {
      query = query.eq("has_existing_collection", hasExistingCollection);
    }

    // Apply Phase 2 status filter (exact match)
    if (status) {
      query = query.eq("status", status);
    }

    // Apply registration-date range filters
    if (dateFrom) {
      query = query.gte("created_at", dateFrom);
    }

    if (dateTo) {
      query = query.lte("created_at", dateTo);
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

    // Best-effort audit log of the export via a service-role client.
    try {
      const serviceClient = createServiceClient();
      await recordActivity(serviceClient, "data_export", "Exported customers CSV", {
        view: "customers",
        rowCount: rows.length,
        filters: {
          search,
          lga,
          category,
          willingness_to_pay: willingnessToPay,
          has_existing_collection: hasExistingCollection,
          status,
          dateFrom,
          dateTo,
        },
      });
    } catch {
      // recordActivity is already best-effort; guard client creation too so a
      // logging failure never blocks the export.
    }

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
