import { describe, it, expect, vi, beforeEach } from "vitest";
import { isValidNigerianPhone } from "@/lib/utils/phone";
import {
  sanitizeInput,
  normalizePhone,
  sanitizeRegistrationData,
} from "@/lib/utils/sanitize";
import { generateCSV, getCSVFilename } from "@/lib/utils/csv";
import {
  checkRateLimit,
  incrementFailedAttempts,
  resetAttempts,
} from "@/lib/utils/rate-limit";

describe("Phone Validation", () => {
  describe("isValidNigerianPhone", () => {
    it("accepts valid local format numbers", () => {
      expect(isValidNigerianPhone("07012345678")).toBe(true);
      expect(isValidNigerianPhone("08112345678")).toBe(true);
      expect(isValidNigerianPhone("09012345678")).toBe(true);
      expect(isValidNigerianPhone("07112345678")).toBe(true);
    });

    it("accepts valid international format numbers", () => {
      expect(isValidNigerianPhone("+2347012345678")).toBe(true);
      expect(isValidNigerianPhone("+2348112345678")).toBe(true);
      expect(isValidNigerianPhone("+2349012345678")).toBe(true);
    });

    it("accepts numbers with spaces and dashes (stripped before validation)", () => {
      expect(isValidNigerianPhone("070 1234 5678")).toBe(true);
      expect(isValidNigerianPhone("070-1234-5678")).toBe(true);
      expect(isValidNigerianPhone("+234-701-234-5678")).toBe(true);
    });

    it("rejects numbers with invalid prefix", () => {
      expect(isValidNigerianPhone("06012345678")).toBe(false);
      expect(isValidNigerianPhone("01012345678")).toBe(false);
      expect(isValidNigerianPhone("05012345678")).toBe(false);
    });

    it("rejects numbers with invalid second digit (not 7-9)", () => {
      expect(isValidNigerianPhone("02012345678")).toBe(false);
      expect(isValidNigerianPhone("04012345678")).toBe(false);
    });

    it("rejects numbers with invalid third digit (not 0-1)", () => {
      expect(isValidNigerianPhone("07212345678")).toBe(false);
      expect(isValidNigerianPhone("07912345678")).toBe(false);
    });

    it("rejects numbers that are too short", () => {
      expect(isValidNigerianPhone("070123456")).toBe(false);
      expect(isValidNigerianPhone("0701234567")).toBe(false);
    });

    it("rejects numbers that are too long", () => {
      expect(isValidNigerianPhone("070123456789")).toBe(false);
      expect(isValidNigerianPhone("+23470123456789")).toBe(false);
    });

    it("rejects empty string", () => {
      expect(isValidNigerianPhone("")).toBe(false);
    });

    it("rejects non-numeric strings", () => {
      expect(isValidNigerianPhone("abcdefghijk")).toBe(false);
      expect(isValidNigerianPhone("phone number")).toBe(false);
    });
  });
});

describe("Sanitization", () => {
  describe("sanitizeInput", () => {
    it("strips HTML tags", () => {
      expect(sanitizeInput("<b>bold</b>")).toBe("bold");
      expect(sanitizeInput("<script>alert('xss')</script>")).toBe("alert('xss')");
      expect(sanitizeInput('<a href="http://x">link</a>')).toBe("link");
    });

    it("strips nested HTML tags", () => {
      expect(sanitizeInput("<div><p>text</p></div>")).toBe("text");
    });

    it("trims whitespace", () => {
      expect(sanitizeInput("  hello  ")).toBe("hello");
      expect(sanitizeInput("\n\ttest\n\t")).toBe("test");
    });

    it("handles empty string", () => {
      expect(sanitizeInput("")).toBe("");
    });

    it("preserves text without HTML", () => {
      expect(sanitizeInput("John Doe")).toBe("John Doe");
      expect(sanitizeInput("123 Main Street")).toBe("123 Main Street");
    });
  });

  describe("normalizePhone", () => {
    it("removes spaces", () => {
      expect(normalizePhone("070 1234 5678")).toBe("07012345678");
    });

    it("removes dashes", () => {
      expect(normalizePhone("070-1234-5678")).toBe("07012345678");
    });

    it("removes parentheses", () => {
      expect(normalizePhone("(070)12345678")).toBe("07012345678");
    });

    it("removes all formatting characters", () => {
      expect(normalizePhone("+234 (70) 123-4567-8")).toBe("+2347012345678");
    });

    it("handles already clean number", () => {
      expect(normalizePhone("07012345678")).toBe("07012345678");
    });
  });

  describe("sanitizeRegistrationData", () => {
    it("sanitizes string fields in an object", () => {
      const data = {
        name: "  <b>John</b>  ",
        phone: "07012345678",
        address: "<script>alert('x')</script>123 Main St",
      };
      const result = sanitizeRegistrationData(data);
      expect(result.name).toBe("John");
      expect(result.phone).toBe("07012345678");
      expect(result.address).toBe("alert('x')123 Main St");
    });

    it("preserves non-string values", () => {
      const data = { count: 5, active: true, tags: ["a", "b"] };
      const result = sanitizeRegistrationData(data);
      expect(result.count).toBe(5);
      expect(result.active).toBe(true);
    });

    it("sanitizes arrays of strings", () => {
      const data = { areas: ["<b>Area1</b>", "  Area2  "] };
      const result = sanitizeRegistrationData(data);
      expect(result.areas).toEqual(["Area1", "Area2"]);
    });

    it("handles null and undefined", () => {
      expect(sanitizeRegistrationData(null)).toBe(null);
      expect(sanitizeRegistrationData(undefined)).toBe(undefined);
    });
  });
});

describe("CSV Generation", () => {
  describe("generateCSV", () => {
    it("generates a simple CSV with headers and data", () => {
      const headers = ["name", "phone"];
      const rows = [{ name: "John", phone: "07012345678" }];
      const result = generateCSV(headers, rows);
      expect(result).toBe("name,phone\nJohn,07012345678");
    });

    it("escapes commas by wrapping in double quotes", () => {
      const headers = ["address"];
      const rows = [{ address: "123 Main St, Apt 4" }];
      const result = generateCSV(headers, rows);
      expect(result).toBe('address\n"123 Main St, Apt 4"');
    });

    it("escapes double quotes by doubling them", () => {
      const headers = ["name"];
      const rows = [{ name: 'John "The Man" Doe' }];
      const result = generateCSV(headers, rows);
      expect(result).toBe('name\n"John ""The Man"" Doe"');
    });

    it("escapes newlines by wrapping in double quotes", () => {
      const headers = ["address"];
      const rows = [{ address: "123 Main St\nApt 4" }];
      const result = generateCSV(headers, rows);
      expect(result).toBe('address\n"123 Main St\nApt 4"');
    });

    it("handles null/undefined values as empty strings", () => {
      const headers = ["name", "email"];
      const rows = [{ name: "John", email: null }];
      const result = generateCSV(headers, rows);
      expect(result).toBe("name,email\nJohn,");
    });

    it("generates header-only CSV when no rows", () => {
      const headers = ["name", "phone", "email"];
      const rows: Record<string, unknown>[] = [];
      const result = generateCSV(headers, rows);
      expect(result).toBe("name,phone,email");
    });

    it("handles multiple rows", () => {
      const headers = ["name", "phone"];
      const rows = [
        { name: "Alice", phone: "07011111111" },
        { name: "Bob", phone: "08022222222" },
      ];
      const result = generateCSV(headers, rows);
      expect(result).toBe("name,phone\nAlice,07011111111\nBob,08022222222");
    });
  });

  describe("getCSVFilename", () => {
    it("generates customers filename with correct format", () => {
      const filename = getCSVFilename("customers");
      expect(filename).toMatch(/^customers_export_\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it("generates collectors filename with correct format", () => {
      const filename = getCSVFilename("collectors");
      expect(filename).toMatch(/^collectors_export_\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it("uses current date", () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const expected = `customers_export_${year}-${month}-${day}.csv`;
      expect(getCSVFilename("customers")).toBe(expected);
    });
  });
});

describe("Rate Limiting", () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    };
    // Chain methods properly
    mockSupabase.from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockSupabase.single,
        })),
      })),
      upsert: mockSupabase.upsert,
    }));
  });

  describe("checkRateLimit", () => {
    it("allows access when no previous attempts exist", async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: { code: "PGRST116" } });
      const result = await checkRateLimit("test@example.com", mockSupabase);
      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(5);
    });

    it("allows access when attempts are below threshold", async () => {
      mockSupabase.single.mockResolvedValue({
        data: { attempt_count: 2, locked_until: null },
        error: null,
      });
      const result = await checkRateLimit("test@example.com", mockSupabase);
      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(3);
    });

    it("denies access when locked_until is in the future", async () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      mockSupabase.single.mockResolvedValue({
        data: { attempt_count: 5, locked_until: futureDate },
        error: null,
      });
      const result = await checkRateLimit("test@example.com", mockSupabase);
      expect(result.allowed).toBe(false);
      expect(result.remainingAttempts).toBe(0);
      expect(result.lockedUntil).toBeInstanceOf(Date);
    });

    it("denies access when attempt count meets threshold", async () => {
      mockSupabase.single.mockResolvedValue({
        data: { attempt_count: 5, locked_until: null },
        error: null,
      });
      const result = await checkRateLimit("test@example.com", mockSupabase);
      expect(result.allowed).toBe(false);
      expect(result.remainingAttempts).toBe(0);
    });
  });

  describe("incrementFailedAttempts", () => {
    it("increments attempt count", async () => {
      mockSupabase.single.mockResolvedValue({
        data: { attempt_count: 2 },
        error: null,
      });
      await incrementFailedAttempts("test@example.com", mockSupabase);
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ email: "test@example.com", attempt_count: 3 }),
        { onConflict: "email" }
      );
    });

    it("sets lockout when reaching 5 attempts", async () => {
      mockSupabase.single.mockResolvedValue({
        data: { attempt_count: 4 },
        error: null,
      });
      await incrementFailedAttempts("test@example.com", mockSupabase);
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "test@example.com",
          attempt_count: 5,
          locked_until: expect.any(String),
        }),
        { onConflict: "email" }
      );
    });

    it("creates record when none exists", async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116" },
      });
      await incrementFailedAttempts("new@example.com", mockSupabase);
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ email: "new@example.com", attempt_count: 1 }),
        { onConflict: "email" }
      );
    });
  });

  describe("resetAttempts", () => {
    it("resets attempt count to 0 and clears lockout", async () => {
      await resetAttempts("test@example.com", mockSupabase);
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "test@example.com",
          attempt_count: 0,
          locked_until: null,
        }),
        { onConflict: "email" }
      );
    });
  });
});
