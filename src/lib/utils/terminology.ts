/**
 * Terminology display helper.
 *
 * Display-only mapping so the admin UI shows "Waste Manager" without renaming
 * the `collectors` table, its columns, or any code identifiers. This is a pure
 * lookup — no data migration and no identifier rename.
 */

export const TERMINOLOGY = {
  collector: "Waste Manager",
  collectors: "Waste Managers",
} as const;

/**
 * Returns the display label for a known entity key.
 *
 * @param key - `"collector"` or `"collectors"`
 * @returns the human-facing label (e.g. "Waste Manager" / "Waste Managers")
 */
export function displayEntity(key: keyof typeof TERMINOLOGY): string {
  return TERMINOLOGY[key];
}
