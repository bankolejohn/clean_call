import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { providerStatusSchema } from "@/lib/validators/status";
import { mapLifecycleAction, type LifecycleAction } from "@/lib/utils/lifecycle";
import { recordActivity, type ActivityActionType } from "@/lib/utils/activity-log";
import type { Collector, ProviderStatus } from "@/types";

const LIFECYCLE_ACTIONS: readonly LifecycleAction[] = [
  "approve",
  "suspend",
  "verify",
  "contact",
];

function isLifecycleAction(value: unknown): value is LifecycleAction {
  return (
    typeof value === "string" &&
    (LIFECYCLE_ACTIONS as readonly string[]).includes(value)
  );
}

/**
 * GET /api/admin/collectors/[id]
 * Fetches a single waste manager (collector) by id.
 * Requirements 11.1, 11.4.
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

  const { data, error } = await supabase
    .from("collectors")
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

  return NextResponse.json(data as Collector);
}

/**
 * PATCH /api/admin/collectors/[id]
 * Changes a waste manager's provider status. The body may contain either:
 *   - { status: <ProviderStatus> } — a raw status validated via providerStatusSchema
 *   - { action: 'approve'|'suspend'|'verify'|'contact' } — a named lifecycle action
 * Records the corresponding activity entry via a service-role client (best-effort).
 * Requirements 5.1–5.6, 10.5, 16.2, 16.3, 16.4.
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

  const rawAction = (body as { action?: unknown } | null)?.action;

  let targetStatus: ProviderStatus;
  let action: LifecycleAction | null = null;

  if (rawAction !== undefined && rawAction !== null) {
    // Named lifecycle action path.
    if (!isLifecycleAction(rawAction)) {
      return NextResponse.json(
        {
          error: "Invalid action",
          fieldErrors: {
            action: ["Please provide a valid lifecycle action"],
          },
        },
        { status: 400 }
      );
    }
    action = rawAction;
    targetStatus = mapLifecycleAction(action);
  } else {
    // Raw status path — validate with providerStatusSchema.
    const parsed = providerStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid status",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }
    targetStatus = parsed.data.status;
  }

  const { data, error } = await supabase
    .from("collectors")
    .update({ status: targetStatus })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }

  // Record activity via a service-role client (best-effort; never fails the request).
  const actionType: ActivityActionType =
    action === "approve"
      ? "provider_approval"
      : action === "suspend"
      ? "provider_suspension"
      : "provider_status_change";

  const serviceClient = createServiceClient();
  await recordActivity(
    serviceClient,
    actionType,
    `Waste Manager ${id} → ${targetStatus}`,
    { collectorId: id, newStatus: targetStatus, action: action ?? null }
  );

  return NextResponse.json(data as Collector);
}
