"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RegistrationTable, type ColumnDef } from "@/components/admin/registration-table";
import { SearchFilterBar } from "@/components/admin/search-filter-bar";
import { ExportButton } from "@/components/admin/export-button";
import type { Customer, PaginatedResponse } from "@/types";

const columns: ColumnDef[] = [
  { key: "full_name", header: "Full Name" },
  { key: "phone", header: "Phone" },
  { key: "email", header: "Email", render: (value) => String(value || "—") },
  { key: "address", header: "Address" },
  { key: "lga", header: "LGA" },
  { key: "category", header: "Category" },
  {
    key: "willingness_to_pay",
    header: "Willingness to Pay",
    render: (value) => String(value || "—"),
  },
  {
    key: "has_existing_collection",
    header: "Existing Collection",
    render: (value) => String(value || "—"),
  },
  {
    key: "status",
    header: "Status",
    render: (value) => String(value || "—"),
  },
  { key: "disposal_method", header: "Disposal Method" },
  { key: "collection_frequency", header: "Frequency" },
  {
    key: "created_at",
    header: "Registered",
    render: (value) =>
      new Date(String(value)).toLocaleDateString("en-NG", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
  },
];

function CustomersPageContent() {
  const searchParams = useSearchParams();
  // Sub-view URL params drive the initial filter state (Requirement 15.2/15.4).
  // `interested=true` maps to the willingness-in-{Yes,Maybe} API filter.
  // `status=...` pre-selects the customer status filter.
  // `existing=yes` pre-selects has_existing_collection = "Yes".
  // NOTE: `existing=no` maps to multiple values ("No" and "I manage it myself")
  // which the single-value has_existing_collection filter can't express, so it
  // is passed through as a dedicated `existing` API param when supported; here
  // we leave the has_existing_collection filter unset for existing=no.
  // TODO: support the No-collection multi-value case via a dedicated API param.
  const initialInterested = searchParams.get("interested") === "true";
  const initialStatus = searchParams.get("status") || "";
  const initialExisting = searchParams.get("existing") || "";

  const [data, setData] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [lga, setLga] = useState("");
  const [category, setCategory] = useState("");
  const [willingnessToPay, setWillingnessToPay] = useState("");
  const [hasExistingCollection, setHasExistingCollection] = useState(
    initialExisting === "yes" ? "Yes" : ""
  );
  const [status, setStatus] = useState(initialStatus);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [interested] = useState(initialInterested);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounced search value for API calls
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.length === 0 || search.length >= 2) {
        setDebouncedSearch(search);
        setPage(1);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (lga && lga !== "all") params.set("lga", lga);
    if (category && category !== "all") params.set("category", category);
    if (willingnessToPay && willingnessToPay !== "all")
      params.set("willingness_to_pay", willingnessToPay);
    if (hasExistingCollection && hasExistingCollection !== "all")
      params.set("has_existing_collection", hasExistingCollection);
    if (status && status !== "all") params.set("status", status);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (interested) params.set("interested", "true");

    try {
      const response = await fetch(`/api/admin/customers?${params.toString()}`);
      if (!response.ok) {
        if (response.status === 401) {
          setError("Unauthorized. Please log in again.");
          return;
        }
        setError("Failed to load customer data. Please try again.");
        return;
      }
      const result: PaginatedResponse<Customer> = await response.json();
      setData(result.data);
      setTotal(result.total);
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [
    page,
    pageSize,
    debouncedSearch,
    lga,
    category,
    willingnessToPay,
    hasExistingCollection,
    status,
    dateFrom,
    dateTo,
    interested,
  ]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleLgaChange = useCallback((value: string) => {
    setLga(value);
    setPage(1);
  }, []);

  const handleCategoryChange = useCallback((value: string) => {
    setCategory(value);
    setPage(1);
  }, []);

  const handleWillingnessChange = useCallback((value: string) => {
    setWillingnessToPay(value);
    setPage(1);
  }, []);

  const handleExistingCollectionChange = useCallback((value: string) => {
    setHasExistingCollection(value);
    setPage(1);
  }, []);

  const handleStatusChange = useCallback((value: string) => {
    setStatus(value);
    setPage(1);
  }, []);

  const handleDateFromChange = useCallback((value: string) => {
    setDateFrom(value);
    setPage(1);
  }, []);

  const handleDateToChange = useCallback((value: string) => {
    setDateTo(value);
    setPage(1);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customer Registrations</h1>
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">
            Total: {total} records
          </p>
          <ExportButton
            view="customers"
            search={debouncedSearch}
            lga={lga}
            category={category}
            willingnessToPay={willingnessToPay}
            hasExistingCollection={hasExistingCollection}
            status={status}
            dateFrom={dateFrom}
            dateTo={dateTo}
            interested={interested ? "true" : undefined}
          />
        </div>
      </div>

      <SearchFilterBar
        search={search}
        onSearchChange={setSearch}
        lga={lga}
        onLgaChange={handleLgaChange}
        showCategoryFilter={true}
        category={category}
        onCategoryChange={handleCategoryChange}
        willingnessToPay={willingnessToPay}
        onWillingnessToPayChange={handleWillingnessChange}
        hasExistingCollection={hasExistingCollection}
        onHasExistingCollectionChange={handleExistingCollectionChange}
        customerStatus={status}
        onCustomerStatusChange={handleStatusChange}
        dateFrom={dateFrom}
        onDateFromChange={handleDateFromChange}
        dateTo={dateTo}
        onDateToChange={handleDateToChange}
      />

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
          <RegistrationTable
            columns={columns}
            data={data as unknown as Record<string, unknown>[]}
            emptyMessage="No matching records found"
            actions={(row) => (
              <Link
                href={`/admin/registrations/customers/${row.id}`}
                className="text-primary underline-offset-4 hover:underline text-sm"
              >
                View
              </Link>
            )}
          />

          {/* Pagination Controls */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(1)}
                disabled={page <= 1}
              >
                First
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
              >
                Last
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function CustomersPage() {
  // useSearchParams (read in CustomersPageContent) must sit inside a Suspense
  // boundary so this client page doesn't bail out of prerendering.
  return (
    <Suspense fallback={null}>
      <CustomersPageContent />
    </Suspense>
  );
}
