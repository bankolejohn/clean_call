import type { CollectionRequest, PublicRequestView } from '@/types';

/**
 * Project a full CollectionRequest row down to the public-safe view.
 *
 * Only the whitelisted fields are copied. Privileged fields — internal_notes,
 * tracking_token, collector_id, and every other column — are omitted by
 * construction (Property 11). Never throws on null fields.
 */
export function toPublicView(row: CollectionRequest): PublicRequestView {
  return {
    request_number: row.request_number,
    status: row.status,
    lga: row.lga,
    waste_type: row.waste_type,
    preferred_pickup_date: row.preferred_pickup_date,
    preferred_pickup_time: row.preferred_pickup_time,
    created_at: row.created_at,
    reviewed_at: row.reviewed_at,
    assigned_at: row.assigned_at,
    accepted_at: row.accepted_at,
    en_route_at: row.en_route_at,
    completed_at: row.completed_at,
    cancelled_at: row.cancelled_at,
  };
}
