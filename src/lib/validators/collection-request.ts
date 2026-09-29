import { z } from 'zod';
import { EKITI_LGAS } from '@/lib/constants/lgas';
import { WASTE_TYPES } from '@/lib/constants/waste-types';
import { WILLINGNESS_TO_PAY } from '@/lib/constants/willingness-to-pay';
import { PRICE_RANGES } from '@/lib/constants/price-ranges';

/**
 * Nigerian phone number regex (identical to Phase 1 registration validation):
 * - Local format:         0[7-9][01]XXXXXXXX  (11 digits)
 * - International format:  +234[7-9][01]XXXXXXXX
 */
const NIGERIAN_PHONE = /^(0[7-9][01]\d{8}|\+234[7-9][01]\d{8})$/;

/**
 * True iff `dateStr` parses to a calendar date that is today (UTC) or later.
 * Comparison is date-only (time stripped) so a request for "today" passes.
 * Returns false for any unparseable input (robust to garbage).
 */
export function notInPast(dateStr: string): boolean {
  if (typeof dateStr !== 'string' || dateStr.trim() === '') return false;

  const parsed = new Date(dateStr);
  const ms = parsed.getTime();
  if (Number.isNaN(ms)) return false;

  // Date-only comparison in UTC: strip the time component from both sides.
  const pickup = Date.UTC(
    parsed.getUTCFullYear(),
    parsed.getUTCMonth(),
    parsed.getUTCDate()
  );

  const now = new Date();
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );

  return pickup >= today;
}

/**
 * Public Collection_Request submission schema.
 *
 * Reuses the Phase 1 Nigerian phone regex, the canonical EKITI_LGAS and
 * WASTE_TYPES enums, and the Phase 2 WILLINGNESS_TO_PAY / PRICE_RANGES enums.
 *
 * NOTE: status, collector_id, internal_notes, request_number, tracking_token,
 * photo_url and customer_id are intentionally NOT part of this schema — they are
 * never accepted from the client (Requirement 14.5).
 */
export const collectionRequestSchema = z.object({
  full_name: z.string().trim().min(1).max(100),
  phone: z
    .string()
    .trim()
    .regex(NIGERIAN_PHONE, 'Enter a valid Nigerian phone number'),
  email: z.string().trim().email().max(150).optional().or(z.literal('')),
  pickup_address: z.string().trim().min(1).max(255),
  lga: z.enum(EKITI_LGAS),
  waste_type: z.enum(WASTE_TYPES),
  estimated_quantity: z.string().trim().min(1).max(200),
  bin_bag_count: z.coerce.number().int().min(0).max(10000).optional(),
  preferred_pickup_date: z
    .string()
    .refine(notInPast, 'Pickup date cannot be in the past'),
  preferred_pickup_time: z.string().trim().min(1).max(100),
  additional_notes: z.string().trim().max(1000).optional().or(z.literal('')),
  willingness_to_pay: z.enum(WILLINGNESS_TO_PAY).optional(),
  price_range: z.enum(PRICE_RANGES).optional(),
});

export type CollectionRequestInput = z.infer<typeof collectionRequestSchema>;
