/**
 * Options describing whether a customer already has a waste-collection arrangement.
 * This is the single source of truth for existing-collection values throughout the application.
 */
export const EXISTING_COLLECTION_OPTIONS = [
  'Yes',
  'No',
  'Sometimes',
  'I manage it myself',
] as const;

export type ExistingCollection = (typeof EXISTING_COLLECTION_OPTIONS)[number];
