/**
 * Lifecycle statuses for a waste-manager (provider) registration.
 * This is the single source of truth for provider status values throughout the application.
 */
export const PROVIDER_STATUSES = [
  'Pending',
  'Contacted',
  'Verified',
  'Active',
  'Inactive',
  'Suspended',
  'Rejected',
] as const;

export type ProviderStatus = (typeof PROVIDER_STATUSES)[number];
