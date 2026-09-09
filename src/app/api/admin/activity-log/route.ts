import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ActivityLogEntry } from "@/types";

// Cap the number of entries returned so the log read stays bounded.
const MAX_ENTRIES = 200;

export async function GET() {
  const supabase = await createClient();

  // Validate authenticated session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Admins read the activity log via the authenticated SELECT policy.
  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(MAX_ENTRIES);

  if (error) {
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json((data as ActivityLogEntry[]) || []);
}
