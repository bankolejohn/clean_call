import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { CollectionRequest, PaginatedResponse } from "@/types";

/**
 * GET /api/admin/requests
 * Lists collection requests with search (request_number/full_name/phone) and
 * filters (status, lga, waste_type, collector_id, created_at date range).
 * Combining search + filters yields the AND of all active conditions.
 * Requirements 8.1–8.6, 14.2.
 */
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
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.max(
    1,
    Math.min(100, parseInt(searchParams.get("pageSize") || "20", 10))
  );
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const lga = searchParams.get("lga") || "";
  const wasteType = searchParams.get("waste_type") || "";
  const collectorId = searchParams.get("collector_id") || "";
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";

  // Build query
  let query = supabase
    .from("collection_requests")
    .select("*", { count: "exact" });

  // Apply search filter (case-insensitive, minimum 2 characters)
  if (search.length >= 2) {
    const searchPattern = `%${search}%`;
    query = query.or(
      `request_number.ilike.${searchPattern},full_name.ilike.${searchPattern},phone.ilike.${searchPattern}`
    );
  }

  // Apply filters only when present (exact match)
  if (status) {
    query = query.eq("status", status);
  }
  if (lga) {
    query = query.eq("lga", lga);
  }
  if (wasteType) {
    query = query.eq("waste_type", wasteType);
  }
  if (collectorId) {
    query = query.eq("collector_id", collectorId);
  }

  // Apply created_at date range
  if (dateFrom) {
    query = query.gte("created_at", dateFrom);
  }
  if (dateTo) {
    query = query.lte("created_at", dateTo);
  }

  // Apply ordering and pagination
  const from = (page - 1) * pageSize;
  const to = page * pageSize - 1;

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }

  const response: PaginatedResponse<CollectionRequest> = {
    data: (data as CollectionRequest[]) || [],
    total: count || 0,
    page,
    pageSize,
  };

  return NextResponse.json(response);
}
