"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { CHART_COLORS } from "./palette";
import { ChartEmptyState } from "./chart-empty-state";

const CHART_HEIGHT = 300;

interface CustomersVsManagersChartProps {
  data: { key: string; count: number }[];
}

/**
 * Bar chart comparing Customer vs Waste Manager counts (Requirement 7.2).
 * This comparison MUST be a bar chart, not a pie chart.
 * Each datum's `key` labels a category (e.g. "Customers", "Waste Managers")
 * and `count` is the total for that category.
 */
export function CustomersVsManagersChart({
  data,
}: CustomersVsManagersChartProps) {
  if (data.length === 0) {
    return <ChartEmptyState height={CHART_HEIGHT} />;
  }

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="key" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar
          dataKey="count"
          name="Registrations"
          fill={CHART_COLORS.primary}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
