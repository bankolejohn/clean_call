import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { customerStatusSchema } from "@/lib/validators/status";
import { recordActivity } from "@/lib/utils/activity-log";
import type { Customer } from "@/types";

/**
 * GET /api/admin/customers/[id]
 *
 * Fetches a single customer by id for the admin detail view.
 * Requires an authenticated admin session (401 otherwise). Returns 404 when the
 * id does not match an existing row.
 *
 * _Requirements: 9.1, 9.4, 16.2_
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Validate authenticated session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
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

  return NextResponse.json(data as Customer);
}

/**
 * PATCH /api/admin/customers/[id]
 *
 * Changes a customer's lifecycle status. Requires an authenticated admin
 * session (401 otherwise). The payload is validated with `customerStatusSchema`;
 * an invalid payload returns 400 with field errors and performs NO mutation.
 * On success, the status change is recorded to the activity log (best-effort,
 * via a service-role client) and the updated row is returned.
 *
 * _Requirements: 3.3, 3.4, 3.5, 16.2, 16.3, 16.4_
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Validate authenticated session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse and validate the request body — no mutation happens until this passes.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const parsed = customerStatusSchema.safeParse(body);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "_";
      if (!fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return NextResponse.json(
      { error: "Validation failed", fieldErrors },
      { status: 400 }
    );
  }

  const { status } = parsed.data;

  // updated_at is maintained by the DB BEFORE UPDATE trigger.
  const { data, error } = await supabase
    .from("customers")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }

  // Best-effort activity logging via a service-role client (RLS: INSERT is
  // service_role only). recordActivity swallows its own errors.
  await recordActivity(
    createServiceClient(),
    "customer_status_change",
    `Customer ${id} status changed to ${status}`,
    { customerId: id, newStatus: status }
  );

  return NextResponse.json(data as Customer);
}
