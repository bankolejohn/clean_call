import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
}));

// Mock server actions
vi.mock("@/lib/actions/register-customer", () => ({
  registerCustomer: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/actions/register-collector", () => ({
  registerCollector: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/actions/auth", () => ({
  loginAdmin: vi.fn().mockResolvedValue({ success: true }),
}));

import { CustomerForm } from "@/components/forms/customer-form";
import { CollectorForm } from "@/components/forms/collector-form";
import { LoginForm } from "@/components/forms/login-form";
import { EKITI_LGAS } from "@/lib/constants/lgas";
import { CUSTOMER_CATEGORIES } from "@/lib/constants/categories";
import { DISPOSAL_METHODS } from "@/lib/constants/disposal-methods";
import { COLLECTION_FREQUENCIES } from "@/lib/constants/frequencies";
import { getCSVFilename } from "@/lib/utils/csv";
import { sanitizeInput } from "@/lib/utils/sanitize";
import { isValidNigerianPhone } from "@/lib/utils/phone";

describe("Customer Form", () => {
  beforeEach(() => {
    render(<CustomerForm />);
  });

  it("renders all 8 fields with labels", () => {
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/local government area/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/current waste disposal method/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/waste collection frequency needed/i)).toBeInTheDocument();
  });

  it("has aria-required on required fields", () => {
    expect(screen.getByLabelText(/full name/i)).toHaveAttribute("aria-required", "true");
    expect(screen.getByLabelText(/phone number/i)).toHaveAttribute("aria-required", "true");
    expect(screen.getByLabelText(/^address/i)).toHaveAttribute("aria-required", "true");
    expect(screen.getByLabelText(/local government area/i)).toHaveAttribute("aria-required", "true");
    expect(screen.getByLabelText(/category/i)).toHaveAttribute("aria-required", "true");
    expect(screen.getByLabelText(/current waste disposal method/i)).toHaveAttribute("aria-required", "true");
    expect(screen.getByLabelText(/waste collection frequency needed/i)).toHaveAttribute("aria-required", "true");
  });

  it("does not mark optional email field as aria-required", () => {
    expect(screen.getByLabelText(/email address/i)).not.toHaveAttribute("aria-required", "true");
  });

  it("renders a submit button", () => {
    expect(screen.getByRole("button", { name: /register/i })).toBeInTheDocument();
  });
});

describe("Collector Form", () => {
  beforeEach(() => {
    render(<CollectorForm />);
  });

  it("renders all fields with labels", () => {
    expect(screen.getByLabelText(/business name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contact person/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/business address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/number of staff/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/number of vehicles/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/years in operation/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cac registration number/i)).toBeInTheDocument();
  });

  it("renders service areas fieldset with LGA checkboxes", () => {
    const legend = screen.getByText(/service areas/i);
    expect(legend).toBeInTheDocument();
    // All 16 LGAs should have checkboxes
    for (const lga of EKITI_LGAS) {
      expect(screen.getByLabelText(lga)).toBeInTheDocument();
    }
  });

  it("renders waste types fieldset with checkboxes", () => {
    const legend = screen.getByText(/waste types handled/i);
    expect(legend).toBeInTheDocument();
  });

  it("has aria-required on required input fields", () => {
    expect(screen.getByLabelText(/business name/i)).toHaveAttribute("aria-required", "true");
    expect(screen.getByLabelText(/contact person/i)).toHaveAttribute("aria-required", "true");
    expect(screen.getByLabelText(/phone number/i)).toHaveAttribute("aria-required", "true");
    expect(screen.getByLabelText(/email address/i)).toHaveAttribute("aria-required", "true");
    expect(screen.getByLabelText(/business address/i)).toHaveAttribute("aria-required", "true");
    expect(screen.getByLabelText(/number of staff/i)).toHaveAttribute("aria-required", "true");
    expect(screen.getByLabelText(/number of vehicles/i)).toHaveAttribute("aria-required", "true");
    expect(screen.getByLabelText(/years in operation/i)).toHaveAttribute("aria-required", "true");
  });

  it("does not mark optional CAC field as aria-required", () => {
    expect(screen.getByLabelText(/cac registration number/i)).not.toHaveAttribute("aria-required", "true");
  });

  it("renders a submit button", () => {
    expect(screen.getByRole("button", { name: /register as collector/i })).toBeInTheDocument();
  });
});

describe("Login Form", () => {
  beforeEach(() => {
    render(<LoginForm />);
  });

  it("renders email field with label", () => {
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toHaveAttribute("type", "email");
  });

  it("renders password field with label", () => {
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toHaveAttribute("type", "password");
  });

  it("renders a sign in button", () => {
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });
});

describe("Constants", () => {
  it("EKITI_LGAS has exactly 16 entries", () => {
    expect(EKITI_LGAS).toHaveLength(16);
  });

  it("EKITI_LGAS contains all 16 LGAs", () => {
    const expectedLgas = [
      "Ado-Ekiti", "Ikere", "Oye", "Ikole", "Ekiti East",
      "Ekiti West", "Emure", "Ise/Orun", "Irepodun/Ifelodun",
      "Ijero", "Efon", "Ekiti South-West", "Gbonyin",
      "Ido-Osi", "Moba", "Ilejemeje",
    ];
    for (const lga of expectedLgas) {
      expect(EKITI_LGAS).toContain(lga);
    }
  });

  it("CUSTOMER_CATEGORIES has exactly 5 entries", () => {
    expect(CUSTOMER_CATEGORIES).toHaveLength(5);
  });

  it("DISPOSAL_METHODS has exactly 6 entries", () => {
    expect(DISPOSAL_METHODS).toHaveLength(6);
  });

  it("COLLECTION_FREQUENCIES has exactly 5 entries", () => {
    expect(COLLECTION_FREQUENCIES).toHaveLength(5);
  });
});

describe("CSV Filename Generation", () => {
  it("generates filename for customers view matching pattern", () => {
    const filename = getCSVFilename("customers");
    expect(filename).toMatch(/^customers_export_\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it("generates filename for collectors view matching pattern", () => {
    const filename = getCSVFilename("collectors");
    expect(filename).toMatch(/^collectors_export_\d{4}-\d{2}-\d{2}\.csv$/);
  });
});

describe("Sanitization Edge Cases", () => {
  it("empty string returns empty", () => {
    expect(sanitizeInput("")).toBe("");
  });

  it("plain text without HTML is unchanged", () => {
    expect(sanitizeInput("Hello World")).toBe("Hello World");
    expect(sanitizeInput("John Doe 123")).toBe("John Doe 123");
  });

  it("nested HTML tags are stripped", () => {
    expect(sanitizeInput("<div><span><b>nested</b></span></div>")).toBe("nested");
  });

  it("script tags content is preserved but tags stripped", () => {
    expect(sanitizeInput("<script>alert('xss')</script>")).toBe("alert('xss')");
  });
});

describe("Phone Validation Edge Cases", () => {
  it("rejects 10-digit number (too short)", () => {
    expect(isValidNigerianPhone("0701234567")).toBe(false);
  });

  it("rejects 12-digit number (too long)", () => {
    expect(isValidNigerianPhone("070123456789")).toBe(false);
  });

  it("accepts all valid prefix combinations for local format", () => {
    // Second digit 7, 8, 9 with third digit 0 or 1
    expect(isValidNigerianPhone("07012345678")).toBe(true);
    expect(isValidNigerianPhone("07112345678")).toBe(true);
    expect(isValidNigerianPhone("08012345678")).toBe(true);
    expect(isValidNigerianPhone("08112345678")).toBe(true);
    expect(isValidNigerianPhone("09012345678")).toBe(true);
    expect(isValidNigerianPhone("09112345678")).toBe(true);
  });

  it("accepts all valid prefix combinations for international format", () => {
    expect(isValidNigerianPhone("+2347012345678")).toBe(true);
    expect(isValidNigerianPhone("+2347112345678")).toBe(true);
    expect(isValidNigerianPhone("+2348012345678")).toBe(true);
    expect(isValidNigerianPhone("+2348112345678")).toBe(true);
    expect(isValidNigerianPhone("+2349012345678")).toBe(true);
    expect(isValidNigerianPhone("+2349112345678")).toBe(true);
  });

  it("rejects international number that is too long (14 digits)", () => {
    expect(isValidNigerianPhone("+23470123456789")).toBe(false);
  });

  it("rejects international number that is too short (12 digits)", () => {
    expect(isValidNigerianPhone("+234701234567")).toBe(false);
  });
});
