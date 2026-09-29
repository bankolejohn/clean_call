"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RegistrationTable,
  type ColumnDef,
} from "@/components/admin/registration-table";
import { EKITI_LGAS } from "@/lib/constants/lgas";
import { REQUEST_STATUSES } from "@/lib/constants/request-status";
import { WASTE_TYPES } from "@/lib/constants/waste-types";
import type { CollectionRequest, PaginatedResponse } from "@/types";

const REQUEST_COLUMNS: ColumnDef[] = [
  { key: "request_number", header: "Request #" },
  { key: "full_name", header: "Name" },
  { key: "phone", header: "Phone" },
  { key: "lga", header: "LGA" },
  { key: "waste_type", header: "Waste Type" },
  {
    key: "status",
    header: "Status",
    render: (value) => String(value ?? "—"),
  },
  {
    key: "collector_id",
    header: "Waste Manager",
    render: (value) => (value ? "Assigned" : "Awaiting assignment"),
  },
  {
    key: "created_at",
    header: "Created",
    render: (value) =>
      value ? new Date(value as string).toLocaleDateString() : "",
  },
];

function RequestsPageContent() {
  const searchParams = useSearchParams();
  // Nav sub-views and deep links pre-select filters via query params
  // (Requirement 8.1/8.4). Empty string means "no filter"; the UI select uses
  // the sentinel "all" to represent that same absence.
  const initialStatus = searchParams.get("status") || "";
  const initialLga = searchParams.get("lga") || "";
  const initialWasteType = searchParams.get("waste_type") || "";
  const initialCollectorId = searchParams.get("collector_id") || "";
  const initialDateFrom = searchParams.get("dateFrom") || "";
  const initialDateTo = searchParams.get("dateTo") || "";
  const initialSearch = searchParams.get("search") || "";

  const [data, setData] = useState<CollectionRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState(initialStatus);
  const [lga, setLga] = useState(initialLga);
  const [wasteType, setWasteType] = useState(initialWasteType);
  const [collectorId] = useState(initialCollectorId);
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [loading, setLoading] = useState(true);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (search) params.set("search", search);
      if (status && status !== "all") params.set("status", status);
      if (lga && lga !== "all") params.set("lga", lga);
      if (wasteType && wasteType !== "all")
        params.set("waste_type", wasteType);
      if (collectorId) params.set("collector_id", collectorId);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const response = await fetch(`/api/admin/requests?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch requests");
      }
      const result: PaginatedResponse<CollectionRequest> =
        await response.json();
      setData(result.data);
      setTotal(result.total);
    } catch {
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    pageSize,
    search,
    status,
    lga,
    wasteType,
    collectorId,
    dateFrom,
    dateTo,
  ]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Reset to the first page whenever a filter changes.
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };
  const handleStatusChange = (value: string) => {
    setStatus(value);
    setPage(1);
  };
  const handleLgaChange = (value: string) => {
    setLga(value);
    setPage(1);
  };
  const handleWasteTypeChange = (value: string) => {
    setWasteType(value);
    setPage(1);
  };
  const handleDateFromChange = (value: string) => {
    setDateFrom(value);
    setPage(1);
  };
  const handleDateToChange = (value: string) => {
    setDateTo(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Collection Requests</h1>

      {/* Request-specific filters: search + status/waste_type/lga selects +
          date range. Kept inline (rather than overloading SearchFilterBar) so
          the request filter vocabulary stays self-contained and typed. */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        <div className="flex-1 min-w-50">
          <label htmlFor="request-search" className="sr-only">
            Search requests
          </label>
          <Input
            id="request-search"
            type="search"
            placeholder="Search by request #, name, or phone..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            aria-label="Search requests"
          />
        </div>
        <div className="w-full sm:w-48">
          <label htmlFor="request-status-filter" className="sr-only">
            Filter by status
          </label>
          <Select value={status || ""} onValueChange={handleStatusChange}>
            <SelectTrigger
              id="request-status-filter"
              aria-label="Filter by status"
            >
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {REQUEST_STATUSES.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-48">
          <label htmlFor="request-waste-type-filter" className="sr-only">
            Filter by waste type
          </label>
          <Select value={wasteType || ""} onValueChange={handleWasteTypeChange}>
            <SelectTrigger
              id="request-waste-type-filter"
              aria-label="Filter by waste type"
            >
              <SelectValue placeholder="All Waste Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Waste Types</SelectItem>
              {WASTE_TYPES.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-48">
          <label htmlFor="request-lga-filter" className="sr-only">
            Filter by LGA
          </label>
          <Select value={lga || ""} onValueChange={handleLgaChange}>
            <SelectTrigger id="request-lga-filter" aria-label="Filter by LGA">
              <SelectValue placeholder="All LGAs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All LGAs</SelectItem>
              {EKITI_LGAS.map((lgaOption) => (
                <SelectItem key={lgaOption} value={lgaOption}>
                  {lgaOption}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-44">
          <label htmlFor="request-date-from" className="sr-only">
            Created from
          </label>
          <Input
            id="request-date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => handleDateFromChange(e.target.value)}
            aria-label="Created from date"
          />
        </div>
        <div className="w-full sm:w-44">
          <label htmlFor="request-date-to" className="sr-only">
            Created to
          </label>
          <Input
            id="request-date-to"
            type="date"
            value={dateTo}
            onChange={(e) => handleDateToChange(e.target.value)}
            aria-label="Created to date"
          />
        </div>
      </div>

      {loading ? (
        <div className="border rounded-md p-8 text-center text-muted-foreground">
          Loading...
        </div>
      ) : (
        <RegistrationTable
          columns={REQUEST_COLUMNS}
          data={data as unknown as Record<string, unknown>[]}
          emptyMessage="No matching requests found"
          actions={(row) => (
            <Link
              href={`/admin/requests/${row.id}`}
              className="text-primary underline-offset-4 hover:underline text-sm"
            >
              View
            </Link>
          )}
        />
      )}

      {/* Pagination controls */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Total: {total} records</p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(1)}
            disabled={page <= 1}
            aria-label="First page"
          >
            First
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            Prev
          </Button>
          <span className="text-sm px-2">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            Next
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(totalPages)}
            disabled={page >= totalPages}
            aria-label="Last page"
          >
            Last
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function RequestsPage() {
  // useSearchParams (read in RequestsPageContent) must sit inside a Suspense
  // boundary so this client page doesn't bail out of prerendering (carried-
  // forward Phase 2 build gotcha).
  return (
    <Suspense fallback={null}>
      <RequestsPageContent />
    </Suspense>
  );
}
