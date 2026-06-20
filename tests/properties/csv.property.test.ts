import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { generateCSV, getCSVFilename } from "@/lib/utils/csv";

/**
 * Feature: cleancall-mvp, Property 10: CSV Serialization Round-Trip
 *
 * Validates: Requirements 7.1, 7.2, 7.3
 *
 * For any set of registration records (including field values containing commas,
 * double quotes, and newlines), generating a CSV export and parsing it back SHALL
 * produce records with values identical to the original data, with all fields in
 * the specified column order.
 */

/**
 * RFC 4180 compliant CSV parser.
 * Parses a CSV string back into an array of string arrays.
 */
function parseCSV(csv: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;
  let i = 0;

  while (i < csv.length) {
    const char = csv[i];

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote (doubled quote)
        if (i + 1 < csv.length && csv[i + 1] === '"') {
          currentField += '"';
          i += 2;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
        }
      } else {
        currentField += char;
        i++;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
      } else if (char === ",") {
        currentRow.push(currentField);
        currentField = "";
        i++;
      } else if (char === "\n") {
        currentRow.push(currentField);
        currentField = "";
        rows.push(currentRow);
        currentRow = [];
        i++;
      } else if (char === "\r") {
        // Handle \r\n as a single line break
        if (i + 1 < csv.length && csv[i + 1] === "\n") {
          i++;
        }
        currentRow.push(currentField);
        currentField = "";
        rows.push(currentRow);
        currentRow = [];
        i++;
      } else {
        currentField += char;
        i++;
      }
    }
  }

  // Handle last field and row
  if (currentField !== "" || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Arbitrary that generates strings containing special CSV characters:
 * commas, double quotes, newlines, carriage returns, and empty strings.
 */
const csvProblematicString = fc.oneof(
  // Normal alphanumeric text
  fc.string({ minLength: 0, maxLength: 50 }),
  // String with commas
  fc.stringOf(
    fc.oneof(fc.constant(","), fc.char()),
    { minLength: 1, maxLength: 30 }
  ),
  // String with double quotes
  fc.stringOf(
    fc.oneof(fc.constant('"'), fc.char()),
    { minLength: 1, maxLength: 30 }
  ),
  // String with newlines
  fc.stringOf(
    fc.oneof(fc.constant("\n"), fc.constant("\r"), fc.char()),
    { minLength: 1, maxLength: 30 }
  ),
  // Empty string
  fc.constant(""),
  // Mixed special characters
  fc.stringOf(
    fc.oneof(
      fc.constant(","),
      fc.constant('"'),
      fc.constant("\n"),
      fc.constant("\r"),
      fc.char16bits()
    ),
    { minLength: 1, maxLength: 40 }
  )
);

describe("Feature: cleancall-mvp, Property 10: CSV Serialization Round-Trip", () => {
  it("should round-trip any records with arbitrary string values through CSV serialization and parsing", () => {
    const headers = ["col_a", "col_b", "col_c", "col_d"];

    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            col_a: csvProblematicString,
            col_b: csvProblematicString,
            col_c: csvProblematicString,
            col_d: csvProblematicString,
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (rows) => {
          // Serialize to CSV
          const csv = generateCSV(headers, rows);

          // Parse back
          const parsed = parseCSV(csv);

          // First row should be headers
          expect(parsed[0]).toEqual(headers);

          // Remaining rows should match original data
          expect(parsed.length - 1).toBe(rows.length);

          for (let i = 0; i < rows.length; i++) {
            const parsedRow = parsed[i + 1];
            const originalRow = rows[i];

            expect(parsedRow.length).toBe(headers.length);

            for (let j = 0; j < headers.length; j++) {
              const originalValue = String(
                (originalRow as Record<string, string>)[headers[j]] ?? ""
              );
              expect(parsedRow[j]).toBe(originalValue);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("header row should match provided headers exactly", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), {
          minLength: 1,
          maxLength: 10,
        }),
        (headers) => {
          const csv = generateCSV(headers, []);
          const parsed = parseCSV(csv);

          expect(parsed.length).toBe(1);
          expect(parsed[0]).toEqual(headers.map((h) => String(h)));
        }
      ),
      { numRuns: 100 }
    );
  });

  it("empty rows should produce header-only CSV", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 15 }), {
          minLength: 1,
          maxLength: 8,
        }),
        (headers) => {
          const csv = generateCSV(headers, []);
          const parsed = parseCSV(csv);

          // Should only have the header row
          expect(parsed.length).toBe(1);
          expect(parsed[0]).toEqual(headers);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("getCSVFilename should always match {view}_export_YYYY-MM-DD.csv pattern", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("customers" as const, "collectors" as const),
        (view) => {
          const filename = getCSVFilename(view);
          const pattern = /^(customers|collectors)_export_\d{4}-\d{2}-\d{2}\.csv$/;
          expect(filename).toMatch(pattern);
          expect(filename.startsWith(view)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
