import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

/**
 * Property 5: Duplicate Phone Detection
 * Validates: Requirements 2.10
 *
 * For any valid customer registration that has been successfully stored,
 * a subsequent registration attempt with the same phone number SHALL be
 * rejected with an error indicating the phone is already registered.
 */

// Mock Supabase before importing the action
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { registerCustomer } from "@/lib/actions/register-customer";
import { createClient } from "@/lib/supabase/server";

// Generator for valid Nigerian phone numbers matching ^0[7-9][01]\d{8}$
const validNigerianPhoneArb = fc
  .tuple(
    fc.constantFrom("7", "8", "9"),
    fc.constantFrom("0", "1"),
    fc.stringOf(fc.constantFrom("0", "1", "2", "3", "4", "5", "6", "7", "8", "9"), {
      minLength: 8,
      maxLength: 8,
    })
  )
  .map(([second, third, rest]) => `0${second}${third}${rest}`);

// Helper to create a valid FormData for customer registration with a given phone
function createValidFormData(phone: string): FormData {
  const formData = new FormData();
  formData.set("full_name", "Test User");
  formData.set("phone", phone);
  formData.set("email", "");
  formData.set("address", "123 Test Street, Ado-Ekiti");
  formData.set("lga", "Ado-Ekiti");
  formData.set("category", "Household");
  formData.set("disposal_method", "Burning");
  formData.set("collection_frequency", "Weekly");
  return formData;
}

// Helper to create a mock Supabase client
function createMockSupabaseClient(existingPhones: Set<string>) {
  const insertedPhones = new Set(existingPhones);

  const mockClient = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockImplementation((_column: string, value: string) => {
      return {
        maybeSingle: vi.fn().mockResolvedValue({
          data: insertedPhones.has(value) ? { id: "existing-id" } : null,
          error: null,
        }),
      };
    }),
    insert: vi.fn().mockImplementation((record: { phone: string }) => {
      // Simulate successful insert and add to set
      insertedPhones.add(record.phone);
      return Promise.resolve({ error: null });
    }),
  };

  return mockClient;
}

describe("Property 5: Duplicate Phone Detection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reject registration when phone number already exists in database", async () => {
    await fc.assert(
      fc.asyncProperty(validNigerianPhoneArb, async (phone) => {
        // Setup: phone already exists in the "database"
        const existingPhones = new Set([phone]);
        const mockClient = createMockSupabaseClient(existingPhones);

        vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

        // Act: attempt to register with the same phone
        const formData = createValidFormData(phone);
        const result = await registerCustomer(formData);

        // Assert: registration must be rejected with phone duplicate error
        expect(result.success).toBe(false);
        expect(result.fieldErrors).toBeDefined();
        expect(result.fieldErrors!.phone).toBeDefined();
        expect(result.fieldErrors!.phone.toLowerCase()).toContain("already registered");
      }),
      { numRuns: 100 }
    );
  });

  it("should allow registration when phone number does not exist in database", async () => {
    await fc.assert(
      fc.asyncProperty(validNigerianPhoneArb, async (phone) => {
        // Setup: no existing phones in the "database"
        const existingPhones = new Set<string>();
        const mockClient = createMockSupabaseClient(existingPhones);

        vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

        // Act: register with a fresh phone
        const formData = createValidFormData(phone);
        const result = await registerCustomer(formData);

        // Assert: registration must succeed
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("should reject second registration attempt with the same phone number", async () => {
    await fc.assert(
      fc.asyncProperty(validNigerianPhoneArb, async (phone) => {
        // Setup: empty database that tracks inserts
        const existingPhones = new Set<string>();
        const mockClient = createMockSupabaseClient(existingPhones);

        vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

        // Act 1: first registration should succeed
        const formData1 = createValidFormData(phone);
        const result1 = await registerCustomer(formData1);
        expect(result1.success).toBe(true);

        // Act 2: second registration with same phone should fail
        const formData2 = createValidFormData(phone);
        const result2 = await registerCustomer(formData2);

        // Assert: second attempt must be rejected with duplicate phone error
        expect(result2.success).toBe(false);
        expect(result2.fieldErrors).toBeDefined();
        expect(result2.fieldErrors!.phone).toBeDefined();
        expect(result2.fieldErrors!.phone.toLowerCase()).toContain("already registered");
      }),
      { numRuns: 100 }
    );
  });
});
