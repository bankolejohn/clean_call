import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { CollectionRequest } from "@/types";

/**
 * Companion route for the Admin internal-notes editor (Requirement 9). The
 * status route only handles status transitions, so notes editing gets its own
 * minimal endpoint. Notes are an internal annotation, so no Activity_Log entry
 * is written here.
 */
const notesSchema = z.object({
  internal_notes: z.string().max(5000),
});

/**
 * PATCH /api/admin/requests/[id]/notes
 * Updates only the internal_notes column for a request. Auth-gated; validated;
 * no activity logging.
 */
export async function PATCH(
  request: NextRequest,
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = notesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid notes",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const service = createServiceClient();

  const { data, error } = await service
    .from("collection_requests")
    .update({ internal_notes: parsed.data.internal_notes })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data as CollectionRequest);
}
