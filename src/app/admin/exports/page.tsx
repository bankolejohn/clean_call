"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ExportButton } from "@/components/admin/export-button";

export default function ExportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Exports</h1>
        <p className="text-muted-foreground">
          Download registration data as CSV files.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Customers</CardTitle>
            <CardDescription>
              Export all customer registrations, including Phase 2 fields.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExportButton view="customers" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Waste Managers</CardTitle>
            <CardDescription>
              Export all waste manager registrations, including Phase 2 fields.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExportButton view="collectors" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
