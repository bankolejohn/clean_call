"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { LGABreakdownItem } from "@/types";

import { CHART_COLORS } from "./palette";
import { ChartEmptyState } from "./chart-empty-state";

const CHART_HEIGHT = 340;

interface ByLgaChartProps {
  data: LGABreakdownItem[];
}

/**
 * Bar chart of counts grouped by LGA (Requirements 7.3, 7.4).
 * Renders two bars per LGA: customer counts and waste-manager (service-area)
 * coverage. Data is derived from queries and passed in via props.
 */
export function ByLgaChart({ data }: ByLgaChartProps) {
  if (data.length === 0) {
    return <ChartEmptyState height={CHART_HEIGHT} />;
  }

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 16, bottom: 48, left: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="lga"
          tick={{ fontSize: 11 }}
          angle={-45}
          textAnchor="end"
          interval={0}
          height={60}
        />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        <Bar
          dataKey="customerCount"
          name="Customers"
          fill={CHART_COLORS.primary}
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="collectorCount"
          name="Waste Managers"
          fill={CHART_COLORS.secondary}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
