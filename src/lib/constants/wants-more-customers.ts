/**
 * Options describing whether a waste manager wants more customers.
 * This is the single source of truth for wants-more-customers values throughout the application.
 */
export const WANTS_MORE_CUSTOMERS = [
  'Yes',
  'Maybe',
  'No',
] as const;

export type WantsMoreCustomers = (typeof WANTS_MORE_CUSTOMERS)[number];
