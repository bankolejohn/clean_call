"use client";

import { useEffect, useState } from "react";
import { StatsCards } from "@/components/admin/stats-cards";
import { RecentRegistrations } from "@/components/admin/recent-registrations";
import { LGABreakdown } from "@/components/admin/lga-breakdown";
import {
  RegistrationsOverTimeChart,
  CustomersVsManagersChart,
  ByLgaChart,
  WillingnessToPayChart,
  ExistingCollectionChart,
} from "@/components/admin/charts";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardStats, LGABreakdownItem } from "@/types";

// The dashboard API extends DashboardStats with the Phase 3 pending-requests
// count. Read it via a loosened type so the shared DashboardStats stays intact.
type DashboardStatsWithRequests = DashboardStats & {
  pendingRequests?: number;
};

// Shape of the query-derived chart datasets returned by GET /api/admin/analytics.
interface AnalyticsData {
  registrationsOverTime: { key: string; count: number }[];
  customersVsManagers: { key: string; count: number }[];
  byLga: LGABreakdownItem[];
  byWillingness: { key: string; count: number }[];
  byExistingCollection: { key: string; count: number }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStatsWithRequests | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const [statsRes, analyticsRes] = await Promise.all([
          fetch("/api/admin/dashboard"),
          fetch("/api/admin/analytics"),
        ]);

        if (!statsRes.ok || !analyticsRes.ok) {
          if (statsRes.status === 401 || analyticsRes.status === 401) {
            setError("Unauthorized. Please log in again.");
            return;
          }
          setError("Failed to load dashboard data. Please try again.");
          return;
        }

        const statsData: DashboardStatsWithRequests = await statsRes.json();
        const analyticsData: AnalyticsData = await analyticsRes.json();
        setStats(statsData);
        setAnalytics(analyticsData);
      } catch {
        setError("Connection error. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center justify-center py-12">
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <StatsCards stats={stats} />

      {/* Phase 3: pending collection-requests count, linking into the list
          filtered to PENDING. */}
      <Link href="/admin/requests?status=PENDING" className="block">
        <Card className="transition-colors hover:bg-muted/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.pendingRequests ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Collection requests awaiting review
            </p>
          </CardContent>
        </Card>
      </Link>

      {analytics && (
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Registrations by LGA</CardTitle>
            </CardHeader>
            <CardContent>
              <ByLgaChart data={analytics.byLga} />
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <RecentRegistrations recentRegistrations={stats.recentRegistrations} />
        <LGABreakdown lgaBreakdown={stats.lgaBreakdown} />
      </div>
    </div>
  );
}
