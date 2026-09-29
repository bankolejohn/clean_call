/**
 * Collection_Request status lifecycle values for Phase 3.
 * This is the single source of truth for request-status values throughout the application.
 */
export const REQUEST_STATUSES = [
  'PENDING',
  'UNDER_REVIEW',
  'ASSIGNED',
  'ACCEPTED',
  'EN_ROUTE',
  'COMPLETED',
  'CANCELLED',
  'DISPUTED',
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];
