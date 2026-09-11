"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { CHART_PALETTE } from "./palette";
import { ChartEmptyState } from "./chart-empty-state";

const CHART_HEIGHT = 300;

interface ExistingCollectionChartProps {
  data: { key: string; count: number }[];
}

/**
 * Pie chart of Customer counts grouped by has-existing-collection value
 * (Requirement 7.6). A pie chart is acceptable for this distribution.
 * Data is derived from queries and passed in via props.
 */
export function ExistingCollectionChart({
  data,
}: ExistingCollectionChartProps) {
  if (data.length === 0) {
    return <ChartEmptyState height={CHART_HEIGHT} />;
  }

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="key"
          cx="50%"
          cy="50%"
          outerRadius="80%"
          label={(entry) => `${entry.key}: ${entry.count}`}
        >
          {data.map((entry, index) => (
            <Cell
              key={entry.key}
              fill={CHART_PALETTE[index % CHART_PALETTE.length]}
            />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
