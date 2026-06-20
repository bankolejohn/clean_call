/**
 * Rate limiting utility for admin login.
 * Tracks failed login attempts per email and enforces 15-minute lockout after 5 failures.
 * Uses Supabase `login_attempts` table for persistence.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  lockedUntil?: Date;
}

/**
 * Checks if a login attempt is allowed for the given email.
 * Returns the rate limit status including whether the attempt is allowed
 * and the remaining attempts before lockout.
 */
export async function checkRateLimit(
  email: string,
  supabaseClient: SupabaseClient
): Promise<RateLimitResult> {
  const { data, error } = await supabaseClient
    .from("login_attempts")
    .select("attempt_count, locked_until")
    .eq("email", email)
    .single();

  // No record found means no previous attempts
  if (error || !data) {
    return {
      allowed: true,
      remainingAttempts: MAX_ATTEMPTS,
    };
  }

  // Check if currently locked out
  if (data.locked_until) {
    const lockedUntil = new Date(data.locked_until);
    if (lockedUntil > new Date()) {
      return {
        allowed: false,
        remainingAttempts: 0,
        lockedUntil,
      };
    }
  }

  // Check attempt count
  const remainingAttempts = MAX_ATTEMPTS - data.attempt_count;

  if (remainingAttempts <= 0) {
    // Should be locked but lockout time might have passed
    return {
      allowed: false,
      remainingAttempts: 0,
    };
  }

  return {
    allowed: true,
    remainingAttempts,
  };
}

/**
 * Increments the failed attempt count for the given email.
 * If the threshold (5 attempts) is reached, sets a 15-minute lockout.
 */
export async function incrementFailedAttempts(
  email: string,
  supabaseClient: SupabaseClient
): Promise<void> {
  const { data } = await supabaseClient
    .from("login_attempts")
    .select("attempt_count")
    .eq("email", email)
    .single();

  const currentCount = data?.attempt_count ?? 0;
  const newCount = currentCount + 1;

  const lockedUntil =
    newCount >= MAX_ATTEMPTS
      ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000).toISOString()
      : null;

  await supabaseClient.from("login_attempts").upsert(
    {
      email,
      attempt_count: newCount,
      locked_until: lockedUntil,
      last_attempt_at: new Date().toISOString(),
    },
    { onConflict: "email" }
  );
}

/**
 * Resets the attempt count for the given email after a successful login.
 */
export async function resetAttempts(
  email: string,
  supabaseClient: SupabaseClient
): Promise<void> {
  await supabaseClient.from("login_attempts").upsert(
    {
      email,
      attempt_count: 0,
      locked_until: null,
      last_attempt_at: new Date().toISOString(),
    },
    { onConflict: "email" }
  );
}
