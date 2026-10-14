/**
 * Canonical Waste_Type options for Phase 3 collection requests.
 * This is the single source of truth for waste-type values throughout the application.
 */
export const WASTE_TYPES = [
  'HOUSEHOLD',
  'COMMERCIAL',
  'RECYCLABLE',
  'CONSTRUCTION',
  'MEDICAL',
] as const;

export type WasteType = (typeof WASTE_TYPES)[number];
