import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Collector, PaginatedResponse } from "@/types";

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
  const pageSize = Math.max(1, Math.min(100, parseInt(searchParams.get("pageSize") || "20", 10)));
  const search = searchParams.get("search") || "";
  const lga = searchParams.get("lga") || "";

  // Build query
  let query = supabase
    .from("collectors")
    .select("*", { count: "exact" });

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

  const response: PaginatedResponse<Collector> = {
    data: (data as Collector[]) || [],
    total: count || 0,
    page,
    pageSize,
  };

  return NextResponse.json(response);
}
