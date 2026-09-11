"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { CHART_COLORS } from "./palette";
import { ChartEmptyState } from "./chart-empty-state";

const CHART_HEIGHT = 300;

interface RegistrationsOverTimeChartProps {
  data: { key: string; count: number }[];
}

/**
 * Line chart of registrations over time (Requirement 7.1).
 * `key` is the time bucket (e.g. date) on the x-axis; `count` on the y-axis.
 * Data is derived from queries and passed in via props.
 */
export function RegistrationsOverTimeChart({
  data,
}: RegistrationsOverTimeChartProps) {
  if (data.length === 0) {
    return <ChartEmptyState height={CHART_HEIGHT} />;
  }

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="key" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="count"
          name="Registrations"
          stroke={CHART_COLORS.primary}
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
