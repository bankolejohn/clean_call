/**
 * Pure stat & aggregation helpers for the CleanCall Phase 2 admin dashboard.
 *
 * These functions are deterministic and side-effect-free: they take plain
 * arrays of already-fetched records and return computed values. They contain
 * NO Supabase access and NO I/O, so they can be reused by both the admin API
 * routes and the property-based tests without touching the database.
 *
 * See design.md "Correctness Properties" 6-10 and 14, and the `computeStats`
 * helper referenced in the Testing Strategy.
 */

import type {
  Customer,
  Collector,
  DashboardStats,
  RecentRegistration,
  LGABreakdownItem,
  EkitiLGA,
} from '@/types';
import { EKITI_LGAS } from '@/lib/constants/lgas';

/** A single group in a chart aggregation: a key and how many records fall in it. */
export interface GroupCount {
  key: string;
  count: number;
}

/** A per-LGA demand/supply summary used by the locations view (Property 14). */
export interface LocationBreakdownItem {
  lga: EkitiLGA;
  customerCount: number;
  collectorCount: number;
}

/** Willingness-to-pay values that count as "interested in paid service" (Req 6.5). */
const INTERESTED_WILLINGNESS: ReadonlySet<string> = new Set([
  'Yes',
  'Maybe - Depends on price',
]);

/** has_existing_collection values that count as "has existing collection" (Req 6.6). */
const WITH_EXISTING_COLLECTION: ReadonlySet<string> = new Set([
  'Yes',
  'Sometimes',
]);

/** has_existing_collection values that count as "without existing collection" (Req 6.6). */
const WITHOUT_EXISTING_COLLECTION: ReadonlySet<string> = new Set([
  'No',
  'I manage it myself',
]);

/** Milliseconds in seven days, used for the "this week" window. */
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * True when `createdAt` (an ISO timestamp string) falls within the last 7 days
 * relative to `now` (>= now - 7d). Unparseable timestamps are treated as
 * out-of-window rather than throwing.
 */
function isWithinLastWeek(createdAt: string | undefined, now: Date): boolean {
  if (!createdAt) return false;
  const ts = new Date(createdAt).getTime();
  if (Number.isNaN(ts)) return false;
  return ts >= now.getTime() - SEVEN_DAYS_MS;
}

/**
 * Represents a Collector's LGA for "recent registration" display purposes:
 * the first of its service areas, or an empty string when it has none.
 */
function collectorLga(collector: Collector): string {
  const areas = collector.service_areas;
  if (Array.isArray(areas) && areas.length > 0) {
    return String(areas[0] ?? '');
  }
  return '';
}

/**
 * Build the top-N most recent registrations across both customers and
 * collectors, sorted by `created_at` descending. Defaults to 10.
 */
export function computeRecentRegistrations(
  customers: Customer[],
  collectors: Collector[],
  limit = 10
): RecentRegistration[] {
  const merged: RecentRegistration[] = [
    ...customers.map((c) => ({
      name: c.full_name,
      role: 'Customer' as const,
      lga: c.lga ?? '',
      created_at: c.created_at,
    })),
    ...collectors.map((c) => ({
      name: c.contact_person,
      role: 'Collector' as const,
      lga: collectorLga(c),
      created_at: c.created_at,
    })),
  ];

  return merged
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, limit);
}

/**
 * Build the LGA breakdown for all 16 canonical Ekiti LGAs (including zeros).
 * Customer count is the number of customers in that LGA; collector count is the
 * number of collectors whose `service_areas` include that LGA (coverage).
 */
export function computeLgaBreakdown(
  customers: Customer[],
  collectors: Collector[]
): LGABreakdownItem[] {
  const customerCounts: Record<string, number> = {};
  for (const c of customers) {
    if (c.lga) {
      customerCounts[c.lga] = (customerCounts[c.lga] ?? 0) + 1;
    }
  }

  const collectorCounts: Record<string, number> = {};
  for (const c of collectors) {
    const areas = c.service_areas;
    if (Array.isArray(areas)) {
      // A collector serving the same LGA twice should only count once here;
      // dedupe per record so coverage reflects distinct providers.
      const distinct = new Set(areas);
      for (const area of distinct) {
        if (area) {
          collectorCounts[area] = (collectorCounts[area] ?? 0) + 1;
        }
      }
    }
  }

  return EKITI_LGAS.map((lga) => ({
    lga,
    customerCount: customerCounts[lga] ?? 0,
    collectorCount: collectorCounts[lga] ?? 0,
  }));
}

/**
 * Compute the expanded admin dashboard statistics from plain arrays.
 *
 * All counts default to 0 when no records match (never undefined). The `now`
 * parameter is injectable so the "this week" window is deterministic in tests.
 *
 * Validates: Requirements 6.1, 6.2, 6.4, 6.5, 6.6, 6.7 (Properties 6-9).
 */
export function computeStats(
  customers: Customer[],
  collectors: Collector[],
  now: Date = new Date()
): DashboardStats {
  const customerCount = customers.length;
  const collectorCount = collectors.length;

  let activeProviders = 0;
  let pendingProviders = 0;
  for (const c of collectors) {
    if (c.status === 'Active') activeProviders += 1;
    else if (c.status === 'Pending') pendingProviders += 1;
  }

  let customersInterestedInPaid = 0;
  let customersWithExistingCollection = 0;
  let customersWithoutExistingCollection = 0;
  let newCustomersThisWeek = 0;
  for (const c of customers) {
    if (c.willingness_to_pay && INTERESTED_WILLINGNESS.has(c.willingness_to_pay)) {
      customersInterestedInPaid += 1;
    }
    if (c.has_existing_collection) {
      if (WITH_EXISTING_COLLECTION.has(c.has_existing_collection)) {
        customersWithExistingCollection += 1;
      } else if (WITHOUT_EXISTING_COLLECTION.has(c.has_existing_collection)) {
        customersWithoutExistingCollection += 1;
      }
      // null/undefined has_existing_collection is counted in NEITHER bucket.
    }
    if (isWithinLastWeek(c.created_at, now)) {
      newCustomersThisWeek += 1;
    }
  }

  let newCollectorsThisWeek = 0;
  for (const c of collectors) {
    if (isWithinLastWeek(c.created_at, now)) {
      newCollectorsThisWeek += 1;
    }
  }

  return {
    customerCount,
    collectorCount,
    totalUsers: customerCount + collectorCount,
    activeProviders,
    pendingProviders,
    newRegistrationsThisWeek: newCustomersThisWeek + newCollectorsThisWeek,
    customersInterestedInPaid,
    customersWithExistingCollection,
    customersWithoutExistingCollection,
    recentRegistrations: computeRecentRegistrations(customers, collectors),
    lgaBreakdown: computeLgaBreakdown(customers, collectors),
  };
}

/**
 * Turn a Record<string, number> tally into a stable GroupCount[] preserving
 * the order in which keys were first seen.
 */
function toGroupCounts(order: string[], counts: Record<string, number>): GroupCount[] {
  return order.map((key) => ({ key, count: counts[key] ?? 0 }));
}

/**
 * Group customers by their `willingness_to_pay` value. Records with a
 * null/undefined value are excluded from the groups entirely, so the group
 * counts sum to exactly the number of customers that have a value (Property 10).
 */
export function groupCustomersByWillingness(customers: Customer[]): GroupCount[] {
  const order: string[] = [];
  const counts: Record<string, number> = {};
  for (const c of customers) {
    const key = c.willingness_to_pay;
    if (!key) continue;
    if (!(key in counts)) order.push(key);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return toGroupCounts(order, counts);
}

/**
 * Group customers by their `has_existing_collection` value, excluding nulls.
 * Group counts sum to exactly the number of customers with a value (Property 10).
 */
export function groupCustomersByExistingCollection(
  customers: Customer[]
): GroupCount[] {
  const order: string[] = [];
  const counts: Record<string, number> = {};
  for (const c of customers) {
    const key = c.has_existing_collection;
    if (!key) continue;
    if (!(key in counts)) order.push(key);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return toGroupCounts(order, counts);
}

/**
 * Compare the total count of Customers to the total count of Waste Managers
 * (collectors). Every record has a role, so the counts sum to the full input
 * population (Property 10, Requirement 7.2).
 */
export function groupByRole(
  customers: Customer[],
  collectors: Collector[]
): GroupCount[] {
  return [
    { key: 'Customers', count: customers.length },
    { key: 'Waste Managers', count: collectors.length },
  ];
}

/** Extract the `YYYY-MM-DD` day from an ISO timestamp, or null if unparseable. */
function toDayKey(createdAt: string | undefined): string | null {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Group all registrations (customers + collectors) by calendar day
 * (`YYYY-MM-DD`, UTC) derived from `created_at`, ascending by day. Records with
 * a missing/unparseable `created_at` are excluded, so the counts sum to exactly
 * the number of records with a usable date (Property 10, Requirement 7.1).
 */
export function groupRegistrationsByDate(
  customers: Customer[],
  collectors: Collector[]
): GroupCount[] {
  const counts: Record<string, number> = {};
  const record = (createdAt: string | undefined) => {
    const key = toDayKey(createdAt);
    if (key === null) return;
    counts[key] = (counts[key] ?? 0) + 1;
  };
  for (const c of customers) record(c.created_at);
  for (const c of collectors) record(c.created_at);

  return Object.keys(counts)
    .sort()
    .map((key) => ({ key, count: counts[key] }));
}

/**
 * Group customers by LGA and collectors by service-area coverage across all 16
 * canonical Ekiti LGAs (including zeros). Alias-friendly wrapper around
 * {@link computeLgaBreakdown} for use by the analytics/charts layer.
 */
export function groupByLga(
  customers: Customer[],
  collectors: Collector[]
): LGABreakdownItem[] {
  return computeLgaBreakdown(customers, collectors);
}

/**
 * Location breakdown for the locations view: for all 16 LGAs (including zeros),
 * report the customer count in that LGA and the count of collectors whose
 * `service_areas` include that LGA (coverage).
 *
 * Validates: Requirement 12.1, 12.2, 12.3 (Property 14).
 */
export function locationBreakdown(
  customers: Customer[],
  collectors: Collector[]
): LocationBreakdownItem[] {
  // computeLgaBreakdown already produces exactly this shape.
  return computeLgaBreakdown(customers, collectors);
}
