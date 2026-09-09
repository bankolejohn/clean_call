// Provider lifecycle action → status mapping (Phase 2, Property 5).
// Pure, DB-independent: maps a named admin action to a fixed provider status.

import type { ProviderStatus } from '@/types';

export type LifecycleAction = 'approve' | 'suspend' | 'verify' | 'contact';

/**
 * Maps a lifecycle action to its fixed target provider status.
 * approve → Active, suspend → Suspended, verify → Verified, contact → Contacted.
 * (Requirements 5.3, 5.4, 5.5, 5.6, 10.5)
 */
export function mapLifecycleAction(action: LifecycleAction): ProviderStatus {
  switch (action) {
    case 'approve':
      return 'Active';
    case 'suspend':
      return 'Suspended';
    case 'verify':
      return 'Verified';
    case 'contact':
      return 'Contacted';
  }
}
