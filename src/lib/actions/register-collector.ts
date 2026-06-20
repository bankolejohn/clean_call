"use server";

import { collectorRegistrationSchema } from "@/lib/validators/collector";
import { sanitizeInput, normalizePhone, sanitizeRegistrationData } from "@/lib/utils/sanitize";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

export async function registerCollector(formData: FormData): Promise<ActionResult> {
  // Extract scalar fields
  const rawData = {
    business_name: formData.get("business_name") as string || "",
    contact_person: formData.get("contact_person") as string || "",
    phone: formData.get("phone") as string || "",
    email: formData.get("email") as string || "",
    business_address: formData.get("business_address") as string || "",
    staff_count: Number(formData.get("staff_count")),
    vehicle_count: Number(formData.get("vehicle_count")),
    years_in_operation: Number(formData.get("years_in_operation")),
    cac_number: (formData.get("cac_number") as string) || "",
    // Multi-value fields: FormData stores multiple values under the same key
    service_areas: formData.getAll("service_areas") as string[],
    waste_types: formData.getAll("waste_types") as string[],
  };

  // Validate with Zod
  const parseResult = collectorRegistrationSchema.safeParse(rawData);

  if (!parseResult.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parseResult.error.issues) {
      const path = issue.path.join(".");
      if (!fieldErrors[path]) {
        fieldErrors[path] = issue.message;
      }
    }
    return { success: false, fieldErrors };
  }

  // Sanitize all string inputs
  const sanitizedData = sanitizeRegistrationData(parseResult.data);

  // Normalize phone number
  const normalizedPhone = normalizePhone(sanitizedData.phone);

  // Prepare data for insertion
  const insertData = {
    business_name: sanitizedData.business_name,
    contact_person: sanitizedData.contact_person,
    phone: normalizedPhone,
    email: sanitizedData.email,
    business_address: sanitizedData.business_address,
    service_areas: sanitizedData.service_areas,
    waste_types: sanitizedData.waste_types,
    staff_count: sanitizedData.staff_count,
    vehicle_count: sanitizedData.vehicle_count,
    years_in_operation: sanitizedData.years_in_operation,
    cac_number: sanitizedData.cac_number || null,
  };

  // Insert into database
  const supabase = await createClient();
  const { error } = await supabase.from("collectors").insert(insertData);

  if (error) {
    console.error("Collector registration error:", error);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }

  return { success: true };
}
