"use server";

import { customerRegistrationSchema } from "@/lib/validators/customer";
import { sanitizeRegistrationData, normalizePhone } from "@/lib/utils/sanitize";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

export async function registerCustomer(formData: FormData): Promise<ActionResult> {
  // Reads an optional field: returns the string only when it is present and
  // non-empty, otherwise undefined so the optional Zod enums validate cleanly.
  const optional = (key: string): string | undefined => {
    const value = formData.get(key);
    return typeof value === "string" && value.length > 0 ? value : undefined;
  };

  // Extract form data
  const rawData = {
    full_name: formData.get("full_name") as string,
    phone: formData.get("phone") as string,
    email: formData.get("email") as string,
    address: formData.get("address") as string,
    lga: formData.get("lga") as string,
    category: formData.get("category") as string,
    disposal_method: formData.get("disposal_method") as string,
    collection_frequency: formData.get("collection_frequency") as string,
    // Phase 2 market-research fields — optional, only included when present.
    willingness_to_pay: optional("willingness_to_pay"),
    preferred_price_range: optional("preferred_price_range"),
    has_existing_collection: optional("has_existing_collection"),
    satisfaction_with_existing: optional("satisfaction_with_existing"),
  };

  // Validate with Zod
  const parseResult = customerRegistrationSchema.safeParse(rawData);

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

  // Sanitize validated data
  const sanitizedData = sanitizeRegistrationData(parseResult.data);

  // Normalize phone number
  const normalizedPhone = normalizePhone(sanitizedData.phone);

  // Create Supabase client
  const supabase = await createClient();

  // Check for duplicate phone
  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (existing) {
    return {
      success: false,
      fieldErrors: {
        phone: "This phone number is already registered",
      },
    };
  }

  // Insert into database
  const { error: insertError } = await supabase.from("customers").insert({
    full_name: sanitizedData.full_name,
    phone: normalizedPhone,
    email: sanitizedData.email || null,
    address: sanitizedData.address,
    lga: sanitizedData.lga,
    category: sanitizedData.category,
    disposal_method: sanitizedData.disposal_method,
    collection_frequency: sanitizedData.collection_frequency,
    // Phase 2 market-research fields. Insert the validated enum values from
    // parseResult.data (not the sanitized copy) so the exact strings — including
    // the ₦ symbol and en-dash in price ranges — satisfy the DB CHECK constraints.
    // Omitted fields become null so Phase 1 submissions still succeed.
    willingness_to_pay: parseResult.data.willingness_to_pay ?? null,
    preferred_price_range: parseResult.data.preferred_price_range ?? null,
    has_existing_collection: parseResult.data.has_existing_collection ?? null,
    satisfaction_with_existing: parseResult.data.satisfaction_with_existing ?? null,
  });

  if (insertError) {
    // Check if it's a unique constraint violation (race condition)
    if (insertError.code === "23505") {
      return {
        success: false,
        fieldErrors: {
          phone: "This phone number is already registered",
        },
      };
    }

    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }

  return { success: true };
}
