/**
 * Preferred price-range options for market-research questions.
 * These string values must match the DB CHECK constraints in the migration exactly
 * (including the naira ₦ symbol and en-dash – character).
 * This is the single source of truth for price-range values throughout the application.
 */
export const PRICE_RANGES = [
  'Below ₦2,000',
  '₦2,000–₦5,000',
  '₦5,000–₦10,000',
  'Above ₦10,000',
  'Not sure',
] as const;

export type PriceRange = (typeof PRICE_RANGES)[number];
