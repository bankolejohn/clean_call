"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LGABreakdownItem } from "@/types";

interface LGABreakdownProps {
  lgaBreakdown: LGABreakdownItem[];
}

export function LGABreakdown({ lgaBreakdown }: LGABreakdownProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Registrations by LGA</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>LGA</TableHead>
              <TableHead className="text-right">Customers</TableHead>
              <TableHead className="text-right">Collectors</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lgaBreakdown.map((item) => (
              <TableRow key={item.lga}>
                <TableCell className="font-medium">{item.lga}</TableCell>
                <TableCell className="text-right">
                  {item.customerCount}
                </TableCell>
                <TableCell className="text-right">
                  {item.collectorCount}
                </TableCell>
                <TableCell className="text-right">
                  {item.customerCount + item.collectorCount}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
