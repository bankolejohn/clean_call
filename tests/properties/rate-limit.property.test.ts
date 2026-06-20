/**
 * Property 6: Rate Limiting Threshold
 *
 * For any email address, after exactly 5 consecutive failed login attempts
 * the system SHALL lock that email for 15 minutes, and for fewer than 5
 * consecutive failures the system SHALL allow further attempts.
 *
 * **Validates: Requirements 4.8**
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  checkRateLimit,
  incrementFailedAttempts,
  resetAttempts,
} from "@/lib/utils/rate-limit";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a mock Supabase client that stores login_attempts state in a Map.
 * This allows testing rate-limit logic without a real database connection.
 */
function createMockSupabaseClient(): SupabaseClient {
  const store = new Map<
    string,
    {
      email: string;
      attempt_count: number;
      locked_until: string | null;
      last_attempt_at: string;
    }
  >();

  const mockClient = {
    from: (table: string) => {
      if (table !== "login_attempts") {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        select: (columns: string) => ({
          eq: (column: string, value: string) => ({
            single: async () => {
              const record = store.get(value);
              if (!record) {
                return { data: null, error: { code: "PGRST116" } };
              }
              // Return only the requested columns
              const cols = columns.split(",").map((c) => c.trim());
              const data: Record<string, unknown> = {};
              for (const col of cols) {
                if (col in record) {
                  data[col] = record[col as keyof typeof record];
                }
              }
              return { data, error: null };
            },
          }),
        }),
        upsert: async (
          record: {
            email: string;
            attempt_count: number;
            locked_until: string | null;
            last_attempt_at: string;
          },
          _options?: { onConflict: string }
        ) => {
          store.set(record.email, record);
          return { data: record, error: null };
        },
      };
    },
  } as unknown as SupabaseClient;

  return mockClient;
}

describe("Feature: cleancall-mvp, Property 6: Rate Limiting Threshold", () => {
  it("should allow attempts when N < 5 and lock when N >= 5", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.integer({ min: 1, max: 10 }),
        async (email, n) => {
          const supabase = createMockSupabaseClient();

          // Simulate N consecutive failed attempts
          for (let i = 0; i < n; i++) {
            await incrementFailedAttempts(email, supabase);
          }

          // Check rate limit after N failures
          const result = await checkRateLimit(email, supabase);

          if (n < 5) {
            expect(result.allowed).toBe(true);
            expect(result.remainingAttempts).toBe(5 - n);
          } else {
            expect(result.allowed).toBe(false);
            expect(result.remainingAttempts).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should allow attempts again after reset", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.integer({ min: 1, max: 10 }),
        async (email, n) => {
          const supabase = createMockSupabaseClient();

          // Simulate N consecutive failed attempts
          for (let i = 0; i < n; i++) {
            await incrementFailedAttempts(email, supabase);
          }

          // Reset attempts (simulates successful login)
          await resetAttempts(email, supabase);

          // Check rate limit after reset
          const result = await checkRateLimit(email, supabase);

          expect(result.allowed).toBe(true);
          expect(result.remainingAttempts).toBe(5);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should lock at exactly 5 failed attempts, not before", async () => {
    await fc.assert(
      fc.asyncProperty(fc.emailAddress(), async (email) => {
        const supabase = createMockSupabaseClient();

        // After 4 attempts, should still be allowed
        for (let i = 0; i < 4; i++) {
          await incrementFailedAttempts(email, supabase);
        }
        const beforeLockout = await checkRateLimit(email, supabase);
        expect(beforeLockout.allowed).toBe(true);
        expect(beforeLockout.remainingAttempts).toBe(1);

        // After 5th attempt, should be locked
        await incrementFailedAttempts(email, supabase);
        const afterLockout = await checkRateLimit(email, supabase);
        expect(afterLockout.allowed).toBe(false);
        expect(afterLockout.remainingAttempts).toBe(0);
      }),
      { numRuns: 100 }
    );
  });
});
