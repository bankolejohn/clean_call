"use client";

interface ChartEmptyStateProps {
  height: number;
  message?: string;
}

/**
 * Shared empty-state placeholder rendered when a chart has no data points.
 * Occupies the same vertical space as the chart so layouts stay stable.
 */
export function ChartEmptyState({
  height,
  message = "No data available",
}: ChartEmptyStateProps) {
  return (
    <div
      className="flex w-full items-center justify-center text-sm text-muted-foreground"
      style={{ height }}
    >
      {message}
    </div>
  );
}
