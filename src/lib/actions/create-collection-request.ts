"use server";

import { collectionRequestSchema } from "@/lib/validators/collection-request";
import { sanitizeRegistrationData, normalizePhone } from "@/lib/utils/sanitize";
import {
  generateRequestNumber,
  generateTrackingToken,
} from "@/lib/utils/request-id";
import { recordActivity } from "@/lib/utils/activity-log";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionResult } from "@/types";

/** Max attempts to regenerate request_number on a UNIQUE (23505) collision. */
const MAX_REQUEST_NUMBER_ATTEMPTS = 5;

/**
 * Public Collection_Request submission server action.
 *
 * Runs entirely server-side and owns the whole insert payload: it generates the
 * Request_Number and Tracking_Token, forces status = 'PENDING', and inserts via
 * the SERVICE-role client (collection_requests has no anon policy). Privileged
 * columns (status, collector_id, internal_notes, request_number, tracking_token,
 * photo_url, customer_id) are NEVER read from the client (Requirement 14.5).
 */
export async function createCollectionRequest(
  formData: FormData
): Promise<ActionResult> {
  // Reads an optional field: returns the string only when it is present and
  // non-empty, otherwise undefined so the optional Zod enums validate cleanly.
  const optional = (key: string): string | undefined => {
    const value = formData.get(key);
    return typeof value === "string" && value.length > 0 ? value : undefined;
  };

  // Extract only the client-supplied fields the schema accepts. status,
  // collector_id, internal_notes, request_number, tracking_token, photo_url and
  // customer_id are intentionally never read from the form.
  const rawData = {
    full_name: formData.get("full_name") as string,
    phone: formData.get("phone") as string,
    email: formData.get("email") as string,
    pickup_address: formData.get("pickup_address") as string,
    lga: formData.get("lga") as string,
    waste_type: formData.get("waste_type") as string,
    estimated_quantity: formData.get("estimated_quantity") as string,
    bin_bag_count: optional("bin_bag_count"),
    preferred_pickup_date: formData.get("preferred_pickup_date") as string,
    preferred_pickup_time: formData.get("preferred_pickup_time") as string,
    additional_notes: optional("additional_notes"),
    willingness_to_pay: optional("willingness_to_pay"),
    price_range: optional("price_range"),
  };

  // Validate with Zod
  const parseResult = collectionRequestSchema.safeParse(rawData);

  if (!parseResult.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parseResult.error.issues) {
      const field = issue.path[0] as string;
      if (!fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return { success: false, fieldErrors };
  }

  // Sanitize validated data (strips HTML from strings).
  const sanitizedData = sanitizeRegistrationData(parseResult.data);

  // Normalize phone number
  const normalizedPhone = normalizePhone(sanitizedData.phone);

  // Create service-role Supabase client (bypasses RLS; required because
  // collection_requests has no anon policy — the design's insert-via-service
  // decision).
  const service = createServiceClient();

  // Generate identity fields server-side; status is forced to PENDING here.
  const trackingToken = generateTrackingToken();

  let attempts = 0;
  let requestNumber = generateRequestNumber();

  // Insert with bounded retry on request_number UNIQUE violation (23505).
  // eslint-disable-next-line no-constant-condition
  while (true) {
    attempts += 1;

    const { data, error } = await service
      .from("collection_requests")
      .insert({
        request_number: requestNumber,
        tracking_token: trackingToken,
        full_name: sanitizedData.full_name,
        phone: normalizedPhone,
        email: sanitizedData.email || null,
        pickup_address: sanitizedData.pickup_address,
        lga: sanitizedData.lga,
        waste_type: sanitizedData.waste_type,
        estimated_quantity: sanitizedData.estimated_quantity,
        bin_bag_count: sanitizedData.bin_bag_count ?? null,
        preferred_pickup_date: sanitizedData.preferred_pickup_date,
        preferred_pickup_time: sanitizedData.preferred_pickup_time,
        additional_notes: sanitizedData.additional_notes || null,
        // Insert the validated enum values from parseResult.data (not the
        // sanitized copy) so the exact strings — including the ₦ symbol and the
        // en-dash in price ranges — satisfy the DB CHECK constraints.
        willingness_to_pay: parseResult.data.willingness_to_pay ?? null,
        price_range: parseResult.data.price_range ?? null,
        status: "PENDING",
      })
      .select("id, request_number, tracking_token")
      .single();

    if (!error && data) {
      // Best-effort activity log — never fail the op if logging fails
      // (recordActivity already swallows errors).
      await recordActivity(
        service,
        "request_created",
        `Collection request ${data.request_number} created`,
        { request_id: data.id, request_number: data.request_number }
      );

      return {
        success: true,
        request_number: data.request_number,
        tracking_token: data.tracking_token,
      };
    }

    // On a request_number UNIQUE collision, regenerate and retry (bounded).
    if (error?.code === "23505" && attempts < MAX_REQUEST_NUMBER_ATTEMPTS) {
      requestNumber = generateRequestNumber();
      continue;
    }

    // Any other error, or a 23505 that recurs after all retries.
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}
