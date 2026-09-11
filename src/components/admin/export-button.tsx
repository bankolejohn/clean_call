"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ExportButtonProps {
  view: "customers" | "collectors";
  search?: string;
  lga?: string;
  category?: string;
  // --- Phase 2 customer filters ---
  willingnessToPay?: string;
  hasExistingCollection?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  interested?: string;
  // --- Phase 2 waste-manager (collector) filters ---
  wantsMoreCustomers?: string;
}

const EXPORT_TIMEOUT_MS = 30000;

export function ExportButton({
  view,
  search,
  lga,
  category,
  willingnessToPay,
  hasExistingCollection,
  status,
  dateFrom,
  dateTo,
  interested,
  wantsMoreCustomers,
}: ExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), EXPORT_TIMEOUT_MS);

    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (lga && lga !== "all") params.set("lga", lga);
      if (category && category !== "all") params.set("category", category);

      // Phase 2 customer filters
      if (willingnessToPay && willingnessToPay !== "all")
        params.set("willingness_to_pay", willingnessToPay);
      if (hasExistingCollection && hasExistingCollection !== "all")
        params.set("has_existing_collection", hasExistingCollection);
      if (status && status !== "all") params.set("status", status);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (interested) params.set("interested", interested);

      // Phase 2 waste-manager filters
      if (wantsMoreCustomers && wantsMoreCustomers !== "all")
        params.set("wants_more_customers", wantsMoreCustomers);

      const url = `/api/admin/export/${view}?${params.toString()}`;
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Export failed. Please try again.");
      }

      // Get filename from Content-Disposition header or generate fallback
      const disposition = response.headers.get("Content-Disposition");
      let filename = `${view}_export.csv`;
      if (disposition) {
        const match = disposition.match(/filename="(.+)"/);
        if (match) {
          filename = match[1];
        }
      }

      // Create blob and trigger download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Export timed out. Please try again or narrow your filters.");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Export failed. Please try again.");
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={loading}
        aria-label={`Export ${view} to CSV`}
      >
        {loading ? "Exporting..." : "Export CSV"}
      </Button>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
