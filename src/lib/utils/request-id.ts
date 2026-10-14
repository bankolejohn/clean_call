import { randomBytes, randomInt } from 'node:crypto';

/**
 * Human-friendly Request_Number: CR-YYYYMMDD-XXXX where XXXX is a 4-digit random
 * suffix. Uniqueness is enforced by the DB UNIQUE constraint plus retry-on-conflict
 * in the server action (Requirement 2.2, 5.5).
 */
export function generateRequestNumber(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const suffix = String(randomInt(0, 10000)).padStart(4, '0');
  return `CR-${y}${m}${d}-${suffix}`;
}

/**
 * Unguessable, URL-safe Tracking_Token (~32 bytes of entropy, base64url). Not
 * derivable from the Request_Number (Requirement 2.3, glossary Tracking_Token).
 */
export function generateTrackingToken(): string {
  return randomBytes(32).toString('base64url');
}
