/**
 * Property 11: Input Sanitization Preserves Data Integrity
 *
 * For any user-provided string input containing HTML tags or script content,
 * the sanitization function SHALL remove or escape potentially dangerous content
 * while preserving the semantic text content (non-HTML characters remain unchanged).
 *
 * **Validates: Requirements 8.5**
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { sanitizeInput, sanitizeRegistrationData } from "@/lib/utils/sanitize";

// --- Helpers ---

const HTML_TAG_REGEX = /<[^>]*>/;

/** Common HTML tags to embed in generated strings */
const HTML_TAGS = [
  "<script>",
  "</script>",
  "<div>",
  "</div>",
  "<b>",
  "</b>",
  "<a href=\"http://evil.com\">",
  "</a>",
  "<img src=x onerror=alert(1)>",
  "<iframe src=\"http://evil.com\">",
  "</iframe>",
  "<style>",
  "</style>",
  "<span>",
  "</span>",
  "<p>",
  "</p>",
  "<br>",
  "<br/>",
  "<input type=\"text\">",
];

/** Arbitrary that generates a random HTML tag */
const htmlTagArb = fc.constantFrom(...HTML_TAGS);

/** Arbitrary that generates plain text (no angle brackets) */
const plainTextArb = fc.string().map((s) => s.replace(/[<>]/g, ""));

/**
 * Arbitrary that generates a string with embedded HTML tags.
 * Structure: prefix + <tag> + inner_text + </tag> + suffix
 */
const stringWithHtmlArb = fc
  .tuple(plainTextArb, htmlTagArb, plainTextArb, htmlTagArb, plainTextArb)
  .map(([prefix, openTag, inner, closeTag, suffix]) => {
    return `${prefix}${openTag}${inner}${closeTag}${suffix}`;
  });

describe("Feature: cleancall-mvp, Property 11: Input Sanitization Preserves Data Integrity", () => {
  describe("sanitizeInput", () => {
    it("SHALL NOT contain any HTML tags after sanitization", () => {
      fc.assert(
        fc.property(stringWithHtmlArb, (input) => {
          const result = sanitizeInput(input);
          expect(result).not.toMatch(HTML_TAG_REGEX);
        }),
        { numRuns: 100 }
      );
    });

    it("SHALL preserve semantic text content (text between/outside tags)", () => {
      fc.assert(
        fc.property(
          fc.tuple(plainTextArb, htmlTagArb, plainTextArb, htmlTagArb, plainTextArb),
          ([prefix, openTag, inner, closeTag, suffix]) => {
            const input = `${prefix}${openTag}${inner}${closeTag}${suffix}`;
            const result = sanitizeInput(input);

            // The semantic text parts (prefix, inner, suffix) should be present
            // in the result (after trimming the overall result)
            const trimmedPrefix = prefix.trim();
            const trimmedInner = inner.trim();
            const trimmedSuffix = suffix.trim();

            if (trimmedPrefix) {
              expect(result).toContain(trimmedPrefix);
            }
            if (trimmedInner) {
              expect(result).toContain(trimmedInner);
            }
            if (trimmedSuffix) {
              expect(result).toContain(trimmedSuffix);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("SHALL be idempotent: sanitize(sanitize(x)) === sanitize(x)", () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const once = sanitizeInput(input);
          const twice = sanitizeInput(once);
          expect(twice).toBe(once);
        }),
        { numRuns: 100 }
      );
    });

    it("SHALL pass plain text through unchanged (after trim)", () => {
      fc.assert(
        fc.property(plainTextArb, (input) => {
          const result = sanitizeInput(input);
          expect(result).toBe(input.trim());
        }),
        { numRuns: 100 }
      );
    });

    it("SHALL trim whitespace from the result", () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const result = sanitizeInput(input);
          expect(result).toBe(result.trim());
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("sanitizeRegistrationData", () => {
    it("SHALL recursively sanitize all string fields in objects", () => {
      fc.assert(
        fc.property(
          fc.record({
            name: stringWithHtmlArb,
            address: stringWithHtmlArb,
            phone: plainTextArb,
          }),
          (data) => {
            const result = sanitizeRegistrationData(data);
            // No string field should contain HTML tags
            expect(result.name).not.toMatch(HTML_TAG_REGEX);
            expect(result.address).not.toMatch(HTML_TAG_REGEX);
            expect(result.phone).not.toMatch(HTML_TAG_REGEX);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("SHALL preserve non-string values (numbers, booleans) unchanged", () => {
      fc.assert(
        fc.property(
          fc.record({
            count: fc.integer(),
            active: fc.boolean(),
            label: stringWithHtmlArb,
          }),
          (data) => {
            const result = sanitizeRegistrationData(data);
            expect(result.count).toBe(data.count);
            expect(result.active).toBe(data.active);
            // String field still sanitized
            expect(result.label).not.toMatch(HTML_TAG_REGEX);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("SHALL sanitize strings within arrays", () => {
      fc.assert(
        fc.property(fc.array(stringWithHtmlArb, { minLength: 1, maxLength: 5 }), (arr) => {
          const result = sanitizeRegistrationData(arr);
          for (const item of result) {
            expect(item).not.toMatch(HTML_TAG_REGEX);
          }
        }),
        { numRuns: 100 }
      );
    });
  });
});
