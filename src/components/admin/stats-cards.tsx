"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsCardsProps {
  customerCount: number;
  collectorCount: number;
}

export function StatsCards({ customerCount, collectorCount }: StatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Customers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{customerCount}</div>
          <p className="text-xs text-muted-foreground">
            Registered households and businesses
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Collectors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{collectorCount}</div>
          <p className="text-xs text-muted-foreground">
            Registered waste collection providers
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
