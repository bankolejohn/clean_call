import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  generateCSV,
  CUSTOMER_CSV_HEADERS,
  COLLECTOR_CSV_HEADERS,
} from "@/lib/utils/csv";

// Feature: cleancall-phase-2-admin, Property 15: CSV export round-trip preserves fields and maps nulls to empty
//
// Validates: Requirements 13.1, 13.2, 13.4
//
// For any dataset of customer or collector row objects (keyed by the Phase 2
// header sets, with some Phase 2 fields sometimes null/undefined and values
// that may contain commas/quotes/newlines), generateCSV followed by an
// RFC-4180 parse round-trips every field, and null/undefined values become
// empty cells: each parsed cell equals String(original ?? "").

/**
 * RFC 4180 compliant CSV parser (adapted from the Phase 1 CSV property test).
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
        // Escaped quote (doubled quote) inside a quoted field
        if (i + 1 < csv.length && csv[i + 1] === '"') {
          currentField += '"';
          i += 2;
        } else {
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
        // Treat \r\n as a single line break
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

  // Flush the trailing field/row
  if (currentField !== "" || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Cell values that exercise CSV escaping: normal text, empty strings, numbers,
 * booleans, and strings peppered with commas, double quotes, and newlines.
 */
const csvCellValue = fc.oneof(
  fc.string({ minLength: 0, maxLength: 40 }),
  fc.constant(""),
  fc.integer(),
  fc.boolean(),
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

/**
 * Phase 2 header sets are the tail columns appended after the Phase 1 columns.
 * These are the fields that are allowed to be null/undefined in exports.
 */
const CUSTOMER_PHASE2_FIELDS = [
  "willingness_to_pay",
  "preferred_price_range",
  "has_existing_collection",
  "satisfaction_with_existing",
  "status",
  "updated_at",
];

const COLLECTOR_PHASE2_FIELDS = [
  "wants_more_customers",
  "status",
  "updated_at",
];

/**
 * A cell value that is sometimes explicitly null/undefined (to exercise the
 * null→empty mapping) and otherwise an arbitrary escaping-relevant value.
 */
const nullableCellValue = fc.oneof(
  fc.constant(null),
  fc.constant(undefined),
  csvCellValue
);

/**
 * Builds an arbitrary that produces a dataset of row objects keyed by the given
 * headers. Fields listed in `nullableFields` may be null/undefined.
 */
function datasetArbitrary(
  headers: string[],
  nullableFields: string[]
): fc.Arbitrary<Record<string, unknown>[]> {
  const nullable = new Set(nullableFields);
  const shape: Record<string, fc.Arbitrary<unknown>> = {};
  for (const header of headers) {
    shape[header] = nullable.has(header) ? nullableCellValue : csvCellValue;
  }
  return fc.array(fc.record(shape), { minLength: 0, maxLength: 15 });
}

/**
 * Asserts the CSV round-trip property for a headers/rows pair:
 * - The header row equals `headers` exactly.
 * - Each parsed data cell equals String(original ?? "").
 */
function assertRoundTrip(headers: string[], rows: Record<string, unknown>[]) {
  const csv = generateCSV(headers, rows);
  const parsed = parseCSV(csv);

  // Header row matches exactly.
  expect(parsed[0]).toEqual(headers);

  // One parsed row per data row (plus the header row).
  expect(parsed.length - 1).toBe(rows.length);

  for (let r = 0; r < rows.length; r++) {
    const parsedRow = parsed[r + 1];
    const originalRow = rows[r];

    expect(parsedRow.length).toBe(headers.length);

    for (let c = 0; c < headers.length; c++) {
      const original = originalRow[headers[c]];
      // null/undefined → empty cell; everything else → String(value).
      const expected = original === null || original === undefined ? "" : String(original);
      expect(parsedRow[c]).toBe(expected);
    }
  }
}

describe("Feature: cleancall-phase-2-admin, Property 15: CSV export round-trip preserves fields and maps nulls to empty", () => {
  it("round-trips customer and collector datasets, mapping null/undefined Phase 2 fields to empty cells", () => {
    fc.assert(
      fc.property(
        datasetArbitrary(CUSTOMER_CSV_HEADERS, CUSTOMER_PHASE2_FIELDS),
        datasetArbitrary(COLLECTOR_CSV_HEADERS, COLLECTOR_PHASE2_FIELDS),
        (customerRows, collectorRows) => {
          assertRoundTrip(CUSTOMER_CSV_HEADERS, customerRows);
          assertRoundTrip(COLLECTOR_CSV_HEADERS, collectorRows);
        }
      ),
      { numRuns: 100 }
    );
  });
});
