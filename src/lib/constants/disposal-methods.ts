/**
 * Current waste disposal methods available for customer registration.
 * This is the single source of truth for disposal method values throughout the application.
 */
export const DISPOSAL_METHODS = [
  'Burning',
  'Burying',
  'Roadside Dumping',
  'Private Collector',
  'Government Collector',
  'Other',
] as const;

export type DisposalMethod = (typeof DISPOSAL_METHODS)[number];
