/**
 * Integration tests for customer and collector registration flows.
 * Tests server actions with mocked Supabase clients.
 *
 * Validates: Requirements 2.2, 2.3, 3.2, 3.3
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/headers before importing actions
vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      getAll: vi.fn(() => []),
      set: vi.fn(),
    })
  ),
}));

// Mock the Supabase server client
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockMaybeSingle = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: vi.fn((table: string) => {
        if (table === "customers") {
          return {
            insert: mockInsert,
            select: vi.fn(() => ({
              eq: mockEq,
            })),
          };
        }
        if (table === "collectors") {
          return {
            insert: mockInsert,
          };
        }
        return { insert: mockInsert };
      }),
    })
  ),
}));

describe("Customer Registration Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: no duplicate phone found
    mockEq.mockReturnValue({
      maybeSingle: mockMaybeSingle,
    });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    // Default: insert succeeds
    mockInsert.mockResolvedValue({ data: null, error: null });
  });

  it("should successfully register a customer with valid data", async () => {
    const { registerCustomer } = await import(
      "@/lib/actions/register-customer"
    );

    const formData = new FormData();
    formData.set("full_name", "Adekunle Johnson");
    formData.set("phone", "08012345678");
    formData.set("email", "adekunle@example.com");
    formData.set("address", "15 Fajuyi Road, Ado-Ekiti");
    formData.set("lga", "Ado-Ekiti");
    formData.set("category", "Household");
    formData.set("disposal_method", "Burning");
    formData.set("collection_frequency", "Weekly");

    const result = await registerCustomer(formData);

    expect(result).toEqual({ success: true });
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        full_name: "Adekunle Johnson",
        phone: "08012345678",
        email: "adekunle@example.com",
        address: "15 Fajuyi Road, Ado-Ekiti",
        lga: "Ado-Ekiti",
        category: "Household",
        disposal_method: "Burning",
        collection_frequency: "Weekly",
      })
    );
  });

  it("should reject registration with missing required fields", async () => {
    const { registerCustomer } = await import(
      "@/lib/actions/register-customer"
    );

    const formData = new FormData();
    formData.set("full_name", "");
    formData.set("phone", "");
    formData.set("address", "");
    formData.set("lga", "");
    formData.set("category", "");
    formData.set("disposal_method", "");
    formData.set("collection_frequency", "");

    const result = await registerCustomer(formData);

    expect(result.success).toBe(false);
    expect(result.fieldErrors).toBeDefined();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("should reject registration with duplicate phone number", async () => {
    // Simulate existing record found
    mockMaybeSingle.mockResolvedValue({
      data: { id: "existing-id" },
      error: null,
    });

    const { registerCustomer } = await import(
      "@/lib/actions/register-customer"
    );

    const formData = new FormData();
    formData.set("full_name", "Adekunle Johnson");
    formData.set("phone", "08012345678");
    formData.set("email", "");
    formData.set("address", "15 Fajuyi Road, Ado-Ekiti");
    formData.set("lga", "Ado-Ekiti");
    formData.set("category", "Household");
    formData.set("disposal_method", "Burning");
    formData.set("collection_frequency", "Weekly");

    const result = await registerCustomer(formData);

    expect(result.success).toBe(false);
    expect(result.fieldErrors?.phone).toContain("already registered");
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("should sanitize HTML from input data before inserting", async () => {
    const { registerCustomer } = await import(
      "@/lib/actions/register-customer"
    );

    const formData = new FormData();
    formData.set("full_name", '<script>alert("xss")</script>Adekunle');
    formData.set("phone", "08012345678");
    formData.set("email", "");
    formData.set("address", "15 Fajuyi Road");
    formData.set("lga", "Ado-Ekiti");
    formData.set("category", "Household");
    formData.set("disposal_method", "Burning");
    formData.set("collection_frequency", "Weekly");

    const result = await registerCustomer(formData);

    expect(result).toEqual({ success: true });
    // Verify that the insert was called with sanitized data (no script tag)
    const insertCall = mockInsert.mock.calls[0][0];
    expect(insertCall.full_name).not.toContain("<script>");
    expect(insertCall.full_name).toContain("Adekunle");
  });

  it("should return error when database insert fails", async () => {
    mockInsert.mockResolvedValue({
      data: null,
      error: { code: "PGRST500", message: "Database error" },
    });

    const { registerCustomer } = await import(
      "@/lib/actions/register-customer"
    );

    const formData = new FormData();
    formData.set("full_name", "Adekunle Johnson");
    formData.set("phone", "08012345678");
    formData.set("email", "");
    formData.set("address", "15 Fajuyi Road, Ado-Ekiti");
    formData.set("lga", "Ado-Ekiti");
    formData.set("category", "Household");
    formData.set("disposal_method", "Burning");
    formData.set("collection_frequency", "Weekly");

    const result = await registerCustomer(formData);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("Collector Registration Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: insert succeeds
    mockInsert.mockResolvedValue({ data: null, error: null });
  });

  it("should successfully register a collector with valid data", async () => {
    const { registerCollector } = await import(
      "@/lib/actions/register-collector"
    );

    const formData = new FormData();
    formData.set("business_name", "Ekiti Waste Solutions Ltd");
    formData.set("contact_person", "Bayo Adeyemi");
    formData.set("phone", "08098765432");
    formData.set("email", "info@ekitiwaste.com");
    formData.set("business_address", "45 Bank Road, Ado-Ekiti");
    formData.append("service_areas", "Ado-Ekiti");
    formData.append("service_areas", "Ikere");
    formData.append("waste_types", "General Waste");
    formData.append("waste_types", "Recyclables");
    formData.set("staff_count", "25");
    formData.set("vehicle_count", "10");
    formData.set("years_in_operation", "5");
    formData.set("cac_number", "RC12345");

    const result = await registerCollector(formData);

    expect(result).toEqual({ success: true });
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        business_name: "Ekiti Waste Solutions Ltd",
        contact_person: "Bayo Adeyemi",
        phone: "08098765432",
        email: "info@ekitiwaste.com",
        business_address: "45 Bank Road, Ado-Ekiti",
        service_areas: ["Ado-Ekiti", "Ikere"],
        waste_types: ["General Waste", "Recyclables"],
        staff_count: 25,
        vehicle_count: 10,
        years_in_operation: 5,
        cac_number: "RC12345",
      })
    );
  });

  it("should successfully register a collector without optional CAC number", async () => {
    const { registerCollector } = await import(
      "@/lib/actions/register-collector"
    );

    const formData = new FormData();
    formData.set("business_name", "CleanUp Services");
    formData.set("contact_person", "Funke Ojo");
    formData.set("phone", "07011223344");
    formData.set("email", "funke@cleanup.ng");
    formData.set("business_address", "12 Market Street, Ikere");
    formData.append("service_areas", "Ikere");
    formData.append("waste_types", "Organic Waste");
    formData.set("staff_count", "5");
    formData.set("vehicle_count", "3");
    formData.set("years_in_operation", "2");
    formData.set("cac_number", "");

    const result = await registerCollector(formData);

    expect(result).toEqual({ success: true });
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        cac_number: null,
      })
    );
  });

  it("should reject registration with missing required fields", async () => {
    const { registerCollector } = await import(
      "@/lib/actions/register-collector"
    );

    const formData = new FormData();
    formData.set("business_name", "");
    formData.set("contact_person", "");
    formData.set("phone", "");
    formData.set("email", "");
    formData.set("business_address", "");
    formData.set("staff_count", "0");
    formData.set("vehicle_count", "0");
    formData.set("years_in_operation", "-1");

    const result = await registerCollector(formData);

    expect(result.success).toBe(false);
    expect(result.fieldErrors).toBeDefined();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("should reject registration with invalid phone format", async () => {
    const { registerCollector } = await import(
      "@/lib/actions/register-collector"
    );

    const formData = new FormData();
    formData.set("business_name", "Test Business");
    formData.set("contact_person", "Test Person");
    formData.set("phone", "1234567"); // invalid
    formData.set("email", "test@example.com");
    formData.set("business_address", "Test Address");
    formData.append("service_areas", "Ado-Ekiti");
    formData.append("waste_types", "General Waste");
    formData.set("staff_count", "5");
    formData.set("vehicle_count", "2");
    formData.set("years_in_operation", "1");

    const result = await registerCollector(formData);

    expect(result.success).toBe(false);
    expect(result.fieldErrors).toBeDefined();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("should return error when database insert fails", async () => {
    mockInsert.mockResolvedValue({
      data: null,
      error: { code: "PGRST500", message: "Database error" },
    });

    const { registerCollector } = await import(
      "@/lib/actions/register-collector"
    );

    const formData = new FormData();
    formData.set("business_name", "Ekiti Waste Solutions Ltd");
    formData.set("contact_person", "Bayo Adeyemi");
    formData.set("phone", "08098765432");
    formData.set("email", "info@ekitiwaste.com");
    formData.set("business_address", "45 Bank Road, Ado-Ekiti");
    formData.append("service_areas", "Ado-Ekiti");
    formData.append("waste_types", "General Waste");
    formData.set("staff_count", "25");
    formData.set("vehicle_count", "10");
    formData.set("years_in_operation", "5");
    formData.set("cac_number", "");

    const result = await registerCollector(formData);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
