import type { CollectionRequest, RequestStatus, WasteType } from '@/types';

/**
 * All-optional filter set for the admin Collection_Request list.
 * A filter is "active" only when it is present and (for strings) non-empty.
 * Active filters combine with AND logic.
 */
export interface RequestFilters {
  /** Case-insensitive substring match against request_number OR full_name OR phone. */
  search?: string;
  status?: RequestStatus;
  lga?: string;
  waste_type?: WasteType;
  collector_id?: string;
  /** Inclusive lower/upper bounds compared (string/ISO) against created_at. */
  createdFrom?: string;
  createdTo?: string;
  /** Inclusive lower/upper bounds compared (string/ISO) against preferred_pickup_date. */
  pickupFrom?: string;
  pickupTo?: string;
}

/** A filter value counts as "active" when it is not undefined/null and not an empty/whitespace string. */
function isActive(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  return true;
}

/**
 * Pure AND-logic filter over collection requests.
 *
 * Property 9 (filter soundness): a request whose relevant field is null is
 * excluded ONLY when the corresponding filter specifies a non-null value; when
 * a filter is absent it never excludes. Never throws on null fields.
 */
export function filterRequests(
  rows: CollectionRequest[],
  filters: RequestFilters
): CollectionRequest[] {
  return rows.filter((row) => {
    // search — matches request_number OR full_name OR phone (case-insensitive substring)
    if (isActive(filters.search)) {
      const needle = filters.search!.trim().toLowerCase();
      const haystacks = [row.request_number, row.full_name, row.phone];
      const matched = haystacks.some(
        (field) =>
          typeof field === 'string' && field.toLowerCase().includes(needle)
      );
      if (!matched) return false;
    }

    // status
    if (isActive(filters.status) && row.status !== filters.status) {
      return false;
    }

    // lga
    if (isActive(filters.lga) && row.lga !== filters.lga) {
      return false;
    }

    // waste_type
    if (isActive(filters.waste_type) && row.waste_type !== filters.waste_type) {
      return false;
    }

    // collector_id — a null collector_id is excluded only when a value is specified
    if (isActive(filters.collector_id) && row.collector_id !== filters.collector_id) {
      return false;
    }

    // created_at range (inclusive, string/ISO comparison)
    if (isActive(filters.createdFrom)) {
      if (row.created_at == null || row.created_at < filters.createdFrom!) {
        return false;
      }
    }
    if (isActive(filters.createdTo)) {
      if (row.created_at == null || row.created_at > filters.createdTo!) {
        return false;
      }
    }

    // preferred_pickup_date range (inclusive, string/ISO comparison)
    if (isActive(filters.pickupFrom)) {
      if (
        row.preferred_pickup_date == null ||
        row.preferred_pickup_date < filters.pickupFrom!
      ) {
        return false;
      }
    }
    if (isActive(filters.pickupTo)) {
      if (
        row.preferred_pickup_date == null ||
        row.preferred_pickup_date > filters.pickupTo!
      ) {
        return false;
      }
    }

    return true;
  });
}
