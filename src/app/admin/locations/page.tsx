"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ByLgaChart } from "@/components/admin/charts";
import type { LGABreakdownItem } from "@/types";

/**
 * Location & LGA management view (Requirements 12.1–12.4).
 *
 * Consumes GET /api/admin/locations, which returns an LGABreakdownItem[] with
 * one entry for each of the 16 Ekiti LGAs (including LGAs whose counts are
 * zero). Rendered as a table plus a simple bar chart — no interactive
 * geographic map (Requirement 12.4). `collectorCount` is the service-area
 * coverage: the number of Waste Managers whose service areas include the LGA
 * (Requirement 12.3).
 */
export default function LocationsPage() {
  const [data, setData] = useState<LGABreakdownItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLocations() {
      try {
        const response = await fetch("/api/admin/locations");
        if (!response.ok) {
          if (response.status === 401) {
            setError("Unauthorized. Please log in again.");
            return;
          }
          setError("Failed to load location data. Please try again.");
          return;
        }
        const result: LGABreakdownItem[] = await response.json();
        setData(result);
      } catch {
        setError("Connection error. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchLocations();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Locations</h1>
        <p className="text-sm text-muted-foreground">
          Demand and service coverage across all 16 Ekiti State LGAs.
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

      {!loading && !error && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Coverage by LGA</CardTitle>
            </CardHeader>
            <CardContent>
              <ByLgaChart data={data} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">LGA Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>LGA</TableHead>
                    <TableHead className="text-right">Customers</TableHead>
                    <TableHead className="text-right">
                      Waste Managers
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item) => (
                    <TableRow key={item.lga}>
                      <TableCell className="font-medium">{item.lga}</TableCell>
                      <TableCell className="text-right">
                        {item.customerCount}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.collectorCount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {data.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No location data available.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
