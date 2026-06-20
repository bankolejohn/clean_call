/**
 * CSV generation utility for CleanCall admin export.
 * Handles proper escaping of commas, double quotes, and newlines.
 */

/**
 * Escapes a CSV field value according to RFC 4180.
 * Wraps in double quotes if the value contains commas, double quotes, or newlines.
 * Double quotes within values are escaped by doubling them.
 */
function escapeCSVField(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);

  // If the value contains commas, double quotes, or newlines, wrap in quotes
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    // Escape double quotes by doubling them
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  return str;
}

/**
 * Generates a CSV string from headers and row data.
 * 
 * @param headers - Array of column header names (also used as keys for row data)
 * @param rows - Array of record objects where keys match header names
 * @returns CSV-formatted string with header row and data rows
 */
export function generateCSV(headers: string[], rows: Record<string, unknown>[]): string {
  // Generate header row
  const headerRow = headers.map(escapeCSVField).join(",");

  // Generate data rows
  const dataRows = rows.map((row) =>
    headers.map((header) => escapeCSVField(row[header])).join(",")
  );

  return [headerRow, ...dataRows].join("\n");
}

/**
 * Generates a CSV filename following the pattern: {view}_export_{YYYY-MM-DD}.csv
 * 
 * @param view - The type of data being exported ('customers' or 'collectors')
 * @returns Formatted filename string
 */
export function getCSVFilename(view: "customers" | "collectors"): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${view}_export_${year}-${month}-${day}.csv`;
}
