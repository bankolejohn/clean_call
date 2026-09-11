"use client";

import { useEffect, useState } from "react";
import {
  RegistrationsOverTimeChart,
  CustomersVsManagersChart,
  ByLgaChart,
  WillingnessToPayChart,
  ExistingCollectionChart,
} from "@/components/admin/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LGABreakdownItem } from "@/types";

// Shape of the query-derived chart datasets returned by GET /api/admin/analytics.
// The `{ key, count }` group-count shape drives each distribution chart.
interface AnalyticsData {
  registrationsOverTime: { key: string; count: number }[];
  customersVsManagers: { key: string; count: number }[];
  byLga: LGABreakdownItem[];
  byWillingness: { key: string; count: number }[];
  byExistingCollection: { key: string; count: number }[];
}

/**
 * Admin analytics page (Requirements 7.1–7.7).
 *
 * Consumes GET /api/admin/analytics and renders each chart component in a
 * titled Card. Every dataset is query-derived (Requirement 7.7); charts handle
 * empty data via their own empty-state fallback.
 */
export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const response = await fetch("/api/admin/analytics");
        if (!response.ok) {
          if (response.status === 401) {
            setError("Unauthorized. Please log in again.");
            return;
          }
          setError("Failed to load analytics data. Please try again.");
          return;
        }
        const result: AnalyticsData = await response.json();
        setAnalytics(result);
      } catch {
        setError("Connection error. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Registration trends and distributions across the platform.
        </p>
      </div>

      {error && (
        <div className="flex items-center justify-center py-12">
          <p className="text-destructive">{error}</p>
        </div>
      )}

      {loading && !error && (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      )}

      {!loading && !error && analytics && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">
                Registrations Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RegistrationsOverTimeChart
                data={analytics.registrationsOverTime}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Customers vs Waste Managers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CustomersVsManagersChart data={analytics.customersVsManagers} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Registrations by LGA</CardTitle>
            </CardHeader>
            <CardContent>
              <ByLgaChart data={analytics.byLga} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Willingness to Pay</CardTitle>
            </CardHeader>
            <CardContent>
              <WillingnessToPayChart data={analytics.byWillingness} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Existing Collection</CardTitle>
            </CardHeader>
            <CardContent>
              <ExistingCollectionChart data={analytics.byExistingCollection} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
