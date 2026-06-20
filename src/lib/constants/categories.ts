/**
 * Customer categories for waste collection registration.
 * This is the single source of truth for category values throughout the application.
 */
export const CUSTOMER_CATEGORIES = [
  'Household',
  'Business',
  'School',
  'Religious Organization',
  'Other',
] as const;

export type CustomerCategory = (typeof CUSTOMER_CATEGORIES)[number];
