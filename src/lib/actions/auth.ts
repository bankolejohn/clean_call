"use server";

import { redirect } from "next/navigation";
import { loginSchema } from "@/lib/validators/auth";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  checkRateLimit,
  incrementFailedAttempts,
  resetAttempts,
} from "@/lib/utils/rate-limit";
import type { ActionResult } from "@/types";

/**
 * Server action to authenticate an admin user.
 * Validates input, checks rate limiting, authenticates with Supabase Auth,
 * and manages login attempt tracking.
 */
export async function loginAdmin(formData: FormData): Promise<ActionResult> {
  const rawData = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  // Validate input with Zod
  const parsed = loginSchema.safeParse(rawData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as string;
      if (!fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return { success: false, fieldErrors };
  }

  const { email, password } = parsed.data;
  const serviceClient = createServiceClient();

  // Check rate limit using service role client (login_attempts table has RLS for service_role only)
  const rateLimitResult = await checkRateLimit(email, serviceClient);

  if (!rateLimitResult.allowed) {
    const minutesRemaining = rateLimitResult.lockedUntil
      ? Math.ceil(
          (rateLimitResult.lockedUntil.getTime() - Date.now()) / (1000 * 60)
        )
      : 15;

    return {
      success: false,
      error: `Too many attempts. Please try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? "s" : ""}.`,
    };
  }

  // Authenticate using the regular server client (sets session cookie properly)
  const supabase = await createClient();
  const { error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    // Increment failed attempts using service role client
    await incrementFailedAttempts(email, serviceClient);

    // Check if this was a service unavailability issue
    if (authError.status && authError.status >= 500) {
      return {
        success: false,
        error: "The authentication service is temporarily unavailable. Please try again later.",
      };
    }

    // Generic error message - never reveal which field was wrong
    return {
      success: false,
      error: "Invalid credentials. Please try again.",
    };
  }

  // Authentication successful - reset failed attempts
  await resetAttempts(email, serviceClient);

  // Redirect to admin dashboard
  redirect("/admin/dashboard");
}

/**
 * Server action to log out an admin user.
 * Terminates the session and redirects to the login page.
 */
export async function logoutAdmin(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
