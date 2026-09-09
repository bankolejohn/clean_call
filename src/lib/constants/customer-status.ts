/**
 * Lifecycle statuses for a customer registration.
 * This is the single source of truth for customer status values throughout the application.
 */
export const CUSTOMER_STATUSES = [
  'New',
  'Contacted',
  'Interested',
  'Converted',
  'Inactive',
] as const;

export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];
