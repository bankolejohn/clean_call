import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Customer, PaginatedResponse } from "@/types";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Validate authenticated session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse query parameters
  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.max(1, Math.min(100, parseInt(searchParams.get("pageSize") || "20", 10)));
  const search = searchParams.get("search") || "";
  const lga = searchParams.get("lga") || "";
  const category = searchParams.get("category") || "";

  // Build query
  let query = supabase
    .from("customers")
    .select("*", { count: "exact" });

  // Apply search filter (minimum 2 characters, case-insensitive)
  if (search.length >= 2) {
    const searchPattern = `%${search}%`;
    query = query.or(
      `full_name.ilike.${searchPattern},phone.ilike.${searchPattern},email.ilike.${searchPattern},address.ilike.${searchPattern}`
    );
  }

  // Apply LGA filter (exact match)
  if (lga) {
    query = query.eq("lga", lga);
  }

  // Apply category filter (exact match)
  if (category) {
    query = query.eq("category", category);
  }

  // Apply ordering
  query = query.order("created_at", { ascending: false });

  // Apply pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }

  const response: PaginatedResponse<Customer> = {
    data: (data as Customer[]) || [],
    total: count || 0,
    page,
    pageSize,
  };

  return NextResponse.json(response);
}
