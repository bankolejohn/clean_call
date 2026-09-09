/**
 * Satisfaction options for a customer's existing waste-collection arrangement.
 * This is the single source of truth for satisfaction values throughout the application.
 */
export const SATISFACTION_OPTIONS = [
  'Yes',
  'No',
  'Somewhat',
] as const;

export type Satisfaction = (typeof SATISFACTION_OPTIONS)[number];
