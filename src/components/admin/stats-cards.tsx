"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { displayEntity } from "@/lib/utils/terminology";
import type { DashboardStats } from "@/types";

interface StatsCardsProps {
  stats: DashboardStats;
}

interface StatCard {
  title: string;
  value: number;
  description: string;
}

/**
 * Expanded dashboard stat cards (Requirements 6.1, 6.3, 17.1, 17.3).
 * Every value is query-derived from the DashboardStats payload — no hardcoded
 * numbers. Collectors are surfaced with the "Waste Manager(s)" display term
 * via the terminology helper. The grid is responsive across breakpoints.
 */
export function StatsCards({ stats }: StatsCardsProps) {
  const cards: StatCard[] = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      description: "All registered customers and waste managers",
    },
    {
      title: "Customers",
      value: stats.customerCount,
      description: "Registered households and businesses",
    },
    {
      title: displayEntity("collectors"),
      value: stats.collectorCount,
      description: "Registered waste collection providers",
    },
    {
      title: "Active Providers",
      value: stats.activeProviders,
      description: `${displayEntity("collectors")} marked active`,
    },
    {
      title: "Pending Providers",
      value: stats.pendingProviders,
      description: `${displayEntity("collectors")} awaiting verification`,
    },
    {
      title: "New This Week",
      value: stats.newRegistrationsThisWeek,
      description: "Registrations in the last 7 days",
    },
    {
      title: "Interested in Paid",
      value: stats.customersInterestedInPaid,
      description: "Customers open to a paid service",
    },
    {
      title: "With Existing Collection",
      value: stats.customersWithExistingCollection,
      description: "Customers who already have collection",
    },
    {
      title: "Without Existing Collection",
      value: stats.customersWithoutExistingCollection,
      description: "Customers with no existing collection",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
