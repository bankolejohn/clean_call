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
import type { ActivityLogEntry } from "@/types";

// Human-friendly labels for known activity action types.
const ACTION_TYPE_LABELS: Record<string, string> = {
  customer_status_change: "Customer status change",
  provider_approval: "Provider approved",
  admin_login: "Admin login",
  data_export: "Data export",
  provider_suspension: "Provider suspended",
  provider_status_change: "Provider status change",
};

function formatActionType(actionType: string): string {
  return ACTION_TYPE_LABELS[actionType] ?? actionType;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ActivityLogPage() {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchActivityLog() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/admin/activity-log");
        if (!response.ok) {
          if (!cancelled) {
            if (response.status === 401) {
              setError("Unauthorized. Please log in again.");
            } else {
              setError("Failed to load activity log. Please try again.");
            }
          }
          return;
        }
        const result: ActivityLogEntry[] = await response.json();
        if (!cancelled) {
          // Entries arrive sorted created_at DESC from the API; render as-is.
          setEntries(result);
        }
      } catch {
        if (!cancelled) {
          setError("Connection error. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchActivityLog();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Activity Log</h1>
        {!loading && !error && (
          <p className="text-sm text-muted-foreground">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </p>
        )}
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

      {!loading && !error && entries.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">No activity recorded yet.</p>
        </div>
      )}

      {!loading && !error && entries.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="font-medium">
                  {formatActionType(entry.action_type)}
                </TableCell>
                <TableCell>{entry.description}</TableCell>
                <TableCell>{formatDate(entry.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
