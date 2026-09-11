// Pure filter predicates for customers and waste managers (Phase 2, Property 11).
//
// These mirror the semantics of the Supabase-backed API list routes
// (`/api/admin/customers`, `/api/admin/collectors`) but operate on plain
// arrays so property/unit tests can exercise the same filtering rules
// without a database.
//
// Semantics (Requirement 8.5 / Property 11):
//  - AND logic: a returned record satisfies ALL active filters.
//  - A filter is "active" only when it specifies a non-null/non-empty value.
//  - `search` is applied only when it has at least 2 characters, matched as a
//    case-insensitive substring across the searchable text fields.
//  - Exact-match filters compare strictly against the record's field value.
//  - A record whose field is null/undefined is excluded only when a non-null
//    filter for that field is active.
//  - Collector `lga` matches when the collector's `service_areas` includes it.
//  - Date range (`dateFrom`/`dateTo`) filters `created_at` inclusively.

import type { Customer, Collector } from '@/types';

export interface CustomerFilters {
  search?: string | null;
  lga?: string | null;
  category?: string | null;
  willingness_to_pay?: string | null;
  has_existing_collection?: string | null;
  status?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}

export interface CollectorFilters {
  search?: string | null;
  lga?: string | null;
  status?: string | null;
  wants_more_customers?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}

const MIN_SEARCH_LENGTH = 2;

/** A filter value is "active" when it is a non-null, non-empty string. */
function isActive(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.length > 0;
}

/** Case-insensitive substring match against a possibly-null field value. */
function matchesSearchField(field: unknown, needle: string): boolean {
  if (field === null || field === undefined) return false;
  return String(field).toLowerCase().includes(needle);
}

/** Exact match; a null/undefined field never matches an active filter. */
function matchesExact(field: unknown, value: string): boolean {
  return field !== null && field !== undefined && String(field) === value;
}

/** Inclusive `created_at` range check (lexicographic on ISO timestamps). */
function withinDateRange(
  createdAt: unknown,
  dateFrom?: string | null,
  dateTo?: string | null,
): boolean {
  if (createdAt === null || createdAt === undefined) return false;
  const ts = String(createdAt);
  if (isActive(dateFrom) && ts < dateFrom) return false;
  if (isActive(dateTo) && ts > dateTo) return false;
  return true;
}

/**
 * Filters customer rows by all active criteria using AND logic.
 * (Requirements 8.2, 8.4, 8.5, 8.6, 15.4, 1.4, 9.2)
 */
export function filterCustomers(
  rows: Customer[],
  filters: CustomerFilters = {},
): Customer[] {
  const search = isActive(filters.search) ? filters.search.trim().toLowerCase() : '';
  const applySearch = search.length >= MIN_SEARCH_LENGTH;

  return rows.filter((row) => {
    if (applySearch) {
      const searchHit =
        matchesSearchField(row.full_name, search) ||
        matchesSearchField(row.phone, search) ||
        matchesSearchField(row.email, search) ||
        matchesSearchField(row.address, search);
      if (!searchHit) return false;
    }

    if (isActive(filters.lga) && !matchesExact(row.lga, filters.lga)) return false;
    if (isActive(filters.category) && !matchesExact(row.category, filters.category)) return false;
    if (
      isActive(filters.willingness_to_pay) &&
      !matchesExact(row.willingness_to_pay, filters.willingness_to_pay)
    ) {
      return false;
    }
    if (
      isActive(filters.has_existing_collection) &&
      !matchesExact(row.has_existing_collection, filters.has_existing_collection)
    ) {
      return false;
    }
    if (isActive(filters.status) && !matchesExact(row.status, filters.status)) return false;

    if (
      (isActive(filters.dateFrom) || isActive(filters.dateTo)) &&
      !withinDateRange(row.created_at, filters.dateFrom, filters.dateTo)
    ) {
      return false;
    }

    return true;
  });
}

/**
 * Filters waste-manager (collector) rows by all active criteria using AND logic.
 * `lga` matches when the collector's `service_areas` includes it.
 * (Requirements 10.2, 10.5, 15.5, 1.4, 11.2)
 */
export function filterCollectors(
  rows: Collector[],
  filters: CollectorFilters = {},
): Collector[] {
  const search = isActive(filters.search) ? filters.search.trim().toLowerCase() : '';
  const applySearch = search.length >= MIN_SEARCH_LENGTH;

  return rows.filter((row) => {
    if (applySearch) {
      const searchHit =
        matchesSearchField(row.business_name, search) ||
        matchesSearchField(row.contact_person, search) ||
        matchesSearchField(row.phone, search) ||
        matchesSearchField(row.email, search) ||
        matchesSearchField(row.business_address, search);
      if (!searchHit) return false;
    }

    if (isActive(filters.lga)) {
      const areas = row.service_areas;
      if (!Array.isArray(areas) || !areas.some((area) => String(area) === filters.lga)) {
        return false;
      }
    }

    if (isActive(filters.status) && !matchesExact(row.status, filters.status)) return false;
    if (
      isActive(filters.wants_more_customers) &&
      !matchesExact(row.wants_more_customers, filters.wants_more_customers)
    ) {
      return false;
    }

    if (
      (isActive(filters.dateFrom) || isActive(filters.dateTo)) &&
      !withinDateRange(row.created_at, filters.dateFrom, filters.dateTo)
    ) {
      return false;
    }

    return true;
  });
}
