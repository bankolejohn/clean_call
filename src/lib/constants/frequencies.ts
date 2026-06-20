/**
 * Waste collection frequency options for customer registration.
 * This is the single source of truth for frequency values throughout the application.
 */
export const COLLECTION_FREQUENCIES = [
  'Daily',
  'Twice a Week',
  'Weekly',
  'Bi-Weekly',
  'Monthly',
] as const;

export type CollectionFrequency = (typeof COLLECTION_FREQUENCIES)[number];
