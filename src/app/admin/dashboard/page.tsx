"use client";

import { useEffect, useState } from "react";
import { StatsCards } from "@/components/admin/stats-cards";
import { RecentRegistrations } from "@/components/admin/recent-registrations";
import { LGABreakdown } from "@/components/admin/lga-breakdown";
import type { DashboardStats } from "@/types";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/admin/stats");
        if (!response.ok) {
          if (response.status === 401) {
            setError("Unauthorized. Please log in again.");
            return;
          }
          setError("Failed to load dashboard data. Please try again.");
          return;
        }
        const data: DashboardStats = await response.json();
        setStats(data);
      } catch {
        setError("Connection error. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
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
      <StatsCards
        customerCount={stats.customerCount}
        collectorCount={stats.collectorCount}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentRegistrations
          recentRegistrations={stats.recentRegistrations}
        />
        <LGABreakdown lgaBreakdown={stats.lgaBreakdown} />
      </div>
    </div>
  );
}
