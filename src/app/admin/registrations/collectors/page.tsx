"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SearchFilterBar } from "@/components/admin/search-filter-bar";
import { ExportButton } from "@/components/admin/export-button";
import {
  RegistrationTable,
  type ColumnDef,
} from "@/components/admin/registration-table";
import type { Collector, PaginatedResponse } from "@/types";

const COLLECTOR_COLUMNS: ColumnDef[] = [
  { key: "business_name", header: "Business Name" },
  { key: "contact_person", header: "Contact Person" },
  { key: "phone", header: "Phone" },
  { key: "email", header: "Email" },
  { key: "cac_number", header: "CAC Number" },
  { key: "business_address", header: "Address" },
  {
    key: "service_areas",
    header: "Service Areas",
    render: (value) =>
      Array.isArray(value) ? value.join(", ") : String(value ?? ""),
  },
  {
    key: "waste_types",
    header: "Waste Types",
    render: (value) =>
      Array.isArray(value) ? value.join(", ") : String(value ?? ""),
  },
  { key: "staff_count", header: "Staff" },
  { key: "vehicle_count", header: "Vehicles" },
  { key: "years_in_operation", header: "Years" },
  {
    key: "status",
    header: "Status",
    render: (value) => String(value || "—"),
  },
  {
    key: "wants_more_customers",
    header: "Wants More Customers",
    render: (value) => String(value || "—"),
  },
  {
    key: "created_at",
    header: "Registered",
    render: (value) =>
      value ? new Date(value as string).toLocaleDateString() : "",
  },
];

function CollectorsPageContent() {
  const searchParams = useSearchParams();
  // `status=...` pre-selects the provider status filter for the Waste Managers
  // navigation sub-views (Requirement 15.3/15.5).
  const initialStatus = searchParams.get("status") || "";

  const [data, setData] = useState<Collector[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [lga, setLga] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [wantsMoreCustomers, setWantsMoreCustomers] = useState("");
  const [loading, setLoading] = useState(true);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const fetchCollectors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (search) params.set("search", search);
      if (lga && lga !== "all") params.set("lga", lga);
      if (status && status !== "all") params.set("status", status);
      if (wantsMoreCustomers && wantsMoreCustomers !== "all")
        params.set("wants_more_customers", wantsMoreCustomers);

      const response = await fetch(`/api/admin/collectors?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch collectors");
      }
      const result: PaginatedResponse<Collector> = await response.json();
      setData(result.data);
      setTotal(result.total);
    } catch {
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, lga, status, wantsMoreCustomers]);

  useEffect(() => {
    fetchCollectors();
  }, [fetchCollectors]);

  // Reset page when filters change
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleLgaChange = (value: string) => {
    setLga(value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    setPage(1);
  };

  const handleWantsMoreCustomersChange = (value: string) => {
    setWantsMoreCustomers(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Waste Manager Registrations</h1>
        <ExportButton
          view="collectors"
          search={search}
          lga={lga}
          status={status}
          wantsMoreCustomers={wantsMoreCustomers}
        />
      </div>

      <SearchFilterBar
        search={search}
        onSearchChange={handleSearchChange}
        lga={lga}
        onLgaChange={handleLgaChange}
        showCategoryFilter={false}
        providerStatus={status}
        onProviderStatusChange={handleStatusChange}
        wantsMoreCustomers={wantsMoreCustomers}
        onWantsMoreCustomersChange={handleWantsMoreCustomersChange}
      />

      {loading ? (
        <div className="border rounded-md p-8 text-center text-muted-foreground">
          Loading...
        </div>
      ) : (
        <RegistrationTable
          columns={COLLECTOR_COLUMNS}
          data={data as unknown as Record<string, unknown>[]}
          emptyMessage="No matching records found"
          actions={(row) => (
            <Link
              href={`/admin/registrations/collectors/${row.id}`}
              className="text-primary underline-offset-4 hover:underline text-sm"
            >
              View
            </Link>
          )}
        />
      )}

      {/* Pagination controls */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Total: {total} records
        </p>
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

export default function CollectorsPage() {
  // useSearchParams (read in CollectorsPageContent) must sit inside a Suspense
  // boundary so this client page doesn't bail out of prerendering.
  return (
    <Suspense fallback={null}>
      <CollectorsPageContent />
    </Suspense>
  );
}
