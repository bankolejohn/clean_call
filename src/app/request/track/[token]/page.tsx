import { notFound } from 'next/navigation';

import { createServiceClient } from '@/lib/supabase/service';
import { toPublicView } from '@/lib/utils/public-view';
import { isCancellable } from '@/lib/utils/request-status';
import { StatusTimeline, type TimelineStep } from '@/components/request/status-timeline';
import { CancelRequestButton } from '@/components/request/cancel-request-button';
import type { CollectionRequest, PublicRequestView, RequestStatus } from '@/types';

// The token lookup must never be statically cached — each request resolves live.
export const dynamic = 'force-dynamic';

/** Human-friendly label for each request status. */
const STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  ASSIGNED: 'Assigned',
  ACCEPTED: 'Accepted',
  EN_ROUTE: 'En Route',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  DISPUTED: 'Disputed',
};

function statusLabel(status: RequestStatus): string {
  return STATUS_LABELS[status];
}

// The ordered "happy-path" lifecycle shown in the timeline. CANCELLED and
// DISPUTED are terminal branches handled separately (not part of the sequence).
const TIMELINE_SEQUENCE: readonly {
  status: Exclude<RequestStatus, 'CANCELLED' | 'DISPUTED'>;
  tsField: keyof PublicRequestView;
}[] = [
  { status: 'PENDING', tsField: 'created_at' },
  { status: 'UNDER_REVIEW', tsField: 'reviewed_at' },
  { status: 'ASSIGNED', tsField: 'assigned_at' },
  { status: 'ACCEPTED', tsField: 'accepted_at' },
  { status: 'EN_ROUTE', tsField: 'en_route_at' },
  { status: 'COMPLETED', tsField: 'completed_at' },
];

/**
 * Build the ordered timeline steps, deriving each step's done/current/upcoming
 * state from the lifecycle timestamps in the public view. A step is `done` when
 * its own timestamp is set OR a later step's timestamp is set; the earliest step
 * without a timestamp (but reachable) is `current`; the rest are `upcoming`.
 * When the request is CANCELLED, a terminal Cancelled step is appended.
 */
function buildTimeline(view: PublicRequestView): TimelineStep[] {
  const timestamps = TIMELINE_SEQUENCE.map((s) => (view[s.tsField] as string | null) ?? null);

  // The index of the furthest step that has a recorded timestamp.
  let lastReachedIndex = -1;
  for (let i = 0; i < timestamps.length; i++) {
    if (timestamps[i]) lastReachedIndex = i;
  }

  const isTerminalCancelled = view.status === 'CANCELLED';
  const isCompleted = view.status === 'COMPLETED';

  const steps: TimelineStep[] = TIMELINE_SEQUENCE.map((s, i) => {
    let state: TimelineStep['state'];
    if (i <= lastReachedIndex) {
      // This step (or a later one) has been reached.
      state = i === lastReachedIndex && !isCompleted ? 'current' : 'done';
    } else if (i === lastReachedIndex + 1 && !isTerminalCancelled) {
      state = 'current';
    } else {
      state = 'upcoming';
    }

    // Completed requests mark every step done.
    if (isCompleted) state = 'done';
    // Cancelled requests never present a live "current" happy-path step.
    if (isTerminalCancelled && state === 'current') state = 'upcoming';

    return {
      status: s.status,
      label: statusLabel(s.status),
      state,
      at: timestamps[i],
    };
  });

  if (isTerminalCancelled) {
    steps.push({
      status: 'CANCELLED',
      label: statusLabel('CANCELLED'),
      state: 'done',
      at: view.cancelled_at,
    });
  }

  return steps;
}

function formatDate(value: string | null): string {
  if (!value) return 'Not recorded';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  // Date-only fields are stored as YYYY-MM-DD; render without a time.
  return d.toLocaleDateString('en-NG', { dateStyle: 'medium' });
}

interface TrackPageProps {
  params: Promise<{ token: string }>;
}

export default async function TrackPage({ params }: TrackPageProps) {
  const { token } = await params;

  const service = createServiceClient();
  const { data, error } = await service
    .from('collection_requests')
    .select('*')
    .eq('tracking_token', token)
    .maybeSingle();

  // Never reveal whether a Request_Number exists — any miss is a generic 404.
  if (error || !data) {
    notFound();
  }

  const view = toPublicView(data as CollectionRequest);
  const steps = buildTimeline(view);
  const cancellable = isCancellable(view.status);
  const isDisputed = view.status === 'DISPUTED';

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <header className="mb-8">
        <p className="text-sm text-muted-foreground">Tracking request</p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">{view.request_number}</h1>
        <p className="mt-2 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          {statusLabel(view.status)}
        </p>
      </header>

      {isDisputed && (
        <div
          role="status"
          className="mb-8 rounded-md border border-border bg-muted px-4 py-3 text-sm text-muted-foreground"
        >
          This request is currently marked as <span className="font-medium">Disputed</span> and is being
          reviewed. We will update the status once it is resolved.
        </div>
      )}

      <section className="mb-10" aria-labelledby="timeline-heading">
        <h2 id="timeline-heading" className="mb-4 text-lg font-medium text-foreground">
          Progress
        </h2>
        <StatusTimeline steps={steps} cancelled={view.status === 'CANCELLED'} />
      </section>

      <section aria-labelledby="summary-heading">
        <h2 id="summary-heading" className="mb-4 text-lg font-medium text-foreground">
          Summary
        </h2>
        <dl className="grid grid-cols-1 gap-4 rounded-lg border border-border p-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Current status</dt>
            <dd className="mt-1 text-sm text-foreground">{statusLabel(view.status)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Local Government Area</dt>
            <dd className="mt-1 text-sm text-foreground">{view.lga}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Waste type</dt>
            <dd className="mt-1 text-sm text-foreground">{view.waste_type}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Preferred pickup date</dt>
            <dd className="mt-1 text-sm text-foreground">{formatDate(view.preferred_pickup_date)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Preferred pickup time</dt>
            <dd className="mt-1 text-sm text-foreground">{view.preferred_pickup_time}</dd>
          </div>
        </dl>
      </section>

      {cancellable && (
        <section className="mt-10 rounded-lg border border-border p-4" aria-labelledby="cancel-heading">
          <h2 id="cancel-heading" className="text-lg font-medium text-foreground">
            Need to cancel?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This request can still be cancelled while it has not been picked up.
          </p>
          <CancelRequestButton token={token} />
        </section>
      )}
    </main>
  );
}
