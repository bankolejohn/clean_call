"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RecentRegistration } from "@/types";

interface RecentRegistrationsProps {
  recentRegistrations: RecentRegistration[];
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function RecentRegistrations({
  recentRegistrations,
}: RecentRegistrationsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Registrations</CardTitle>
      </CardHeader>
      <CardContent>
        {recentRegistrations.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No registrations yet
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>LGA</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentRegistrations.map((reg, index) => (
                <TableRow key={`${reg.name}-${reg.created_at}-${index}`}>
                  <TableCell className="font-medium">{reg.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        reg.role === "Customer" ? "default" : "secondary"
                      }
                    >
                      {reg.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{reg.lga}</TableCell>
                  <TableCell>{formatDate(reg.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
