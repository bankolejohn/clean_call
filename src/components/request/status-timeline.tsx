import type { RequestStatus } from '@/types';

/** A single rendered step in the lifecycle timeline. */
export interface TimelineStep {
  /** Canonical status this step represents. */
  status: RequestStatus;
  /** Human-friendly label shown to the public. */
  label: string;
  /** Rendering state derived from the lifecycle timestamps. */
  state: 'done' | 'current' | 'upcoming';
  /** ISO timestamp the request entered this step, when known. */
  at: string | null;
}

function formatDateTime(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

interface StatusTimelineProps {
  steps: TimelineStep[];
  /** True when the request is in a terminal Cancelled state. */
  cancelled?: boolean;
}

/**
 * Presentational, accessible lifecycle timeline. Renders an ordered list where
 * each step is marked done / current / upcoming. Cancelled requests render the
 * final step in a destructive style. Purely presentational — it receives fully
 * derived steps and never reads privileged fields.
 */
export function StatusTimeline({ steps, cancelled = false }: StatusTimelineProps) {
  return (
    <ol className="relative space-y-6 border-l border-border pl-6" aria-label="Request status timeline">
      {steps.map((step) => {
        const when = formatDateTime(step.at);
        const isCancelStep = cancelled && step.status === 'CANCELLED';

        const dotClass = isCancelStep
          ? 'bg-destructive border-destructive'
          : step.state === 'done'
            ? 'bg-primary border-primary'
            : step.state === 'current'
              ? 'bg-background border-primary ring-2 ring-primary'
              : 'bg-background border-border';

        const labelClass =
          isCancelStep
            ? 'text-destructive font-semibold'
            : step.state === 'upcoming'
              ? 'text-muted-foreground'
              : 'text-foreground font-medium';

        return (
          <li key={step.status} className="relative">
            <span
              className={`absolute -left-[1.9rem] mt-1 h-3.5 w-3.5 rounded-full border-2 ${dotClass}`}
              aria-hidden="true"
            />
            <div className="flex flex-col">
              <span className={`text-sm ${labelClass}`}>
                {step.label}
                {step.state === 'current' && !isCancelStep && (
                  <span className="ml-2 text-xs font-normal text-primary">(current)</span>
                )}
              </span>
              {when && <time className="text-xs text-muted-foreground">{when}</time>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
