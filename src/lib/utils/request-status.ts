import type { RequestStatus } from '@/lib/constants/request-status';

// ASSIGNED is intentionally NOT a value in any list here — it is reachable
// ONLY through the assignment operation (Requirement 4.5, 10.5).
export const ALLOWED_TRANSITIONS: Record<RequestStatus, readonly RequestStatus[]> = {
  PENDING:      ['UNDER_REVIEW', 'CANCELLED', 'DISPUTED'],
  UNDER_REVIEW: ['CANCELLED', 'DISPUTED'], // → ASSIGNED handled by assign op
  ASSIGNED:     ['ACCEPTED', 'CANCELLED', 'DISPUTED'],
  ACCEPTED:     ['EN_ROUTE', 'CANCELLED', 'DISPUTED'],
  EN_ROUTE:     ['COMPLETED', 'DISPUTED'],
  COMPLETED:    [],  // terminal
  CANCELLED:    [],  // terminal
  DISPUTED:     ['CANCELLED', 'COMPLETED'], // resolution
} as const;

/** True iff (from → to) is a permitted generic transition. Self-transition is never allowed. */
export function isAllowedTransition(from: RequestStatus, to: RequestStatus): boolean {
  if (from === to) return false;                       // Requirement 4.8
  return ALLOWED_TRANSITIONS[from].includes(to);       // Requirement 4.3, 4.7
}

/** The lifecycle timestamp column set when a request enters `status`, or null if none. */
export function timestampFieldForStatus(status: RequestStatus): string | null {
  switch (status) {
    case 'UNDER_REVIEW': return 'reviewed_at';
    case 'ASSIGNED':     return 'assigned_at';
    case 'ACCEPTED':     return 'accepted_at';
    case 'EN_ROUTE':     return 'en_route_at';
    case 'COMPLETED':    return 'completed_at';
    case 'CANCELLED':    return 'cancelled_at';
    default:             return null; // PENDING (created_at), DISPUTED (no dedicated ts)
  }
}

export const ASSIGNABLE_STATUSES: readonly RequestStatus[] = ['PENDING', 'UNDER_REVIEW'];
export const CANCELLABLE_STATUSES: readonly RequestStatus[] = ['PENDING', 'UNDER_REVIEW', 'ASSIGNED', 'ACCEPTED'];

export function isAssignable(status: RequestStatus): boolean {
  return ASSIGNABLE_STATUSES.includes(status);         // Requirement 10.4
}
export function isCancellable(status: RequestStatus): boolean {
  return CANCELLABLE_STATUSES.includes(status);        // Requirement 7.1, 7.2
}
