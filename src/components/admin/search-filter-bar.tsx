"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EKITI_LGAS } from "@/lib/constants/lgas";
import { CUSTOMER_CATEGORIES } from "@/lib/constants/categories";
import {
  WILLINGNESS_TO_PAY,
  EXISTING_COLLECTION_OPTIONS,
  CUSTOMER_STATUSES,
  PROVIDER_STATUSES,
  WANTS_MORE_CUSTOMERS,
} from "@/lib/constants";

interface SearchFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  lga: string;
  onLgaChange: (value: string) => void;
  showCategoryFilter?: boolean;
  category?: string;
  onCategoryChange?: (value: string) => void;

  // --- Phase 2 optional customer filters ---
  // Each control renders only when its onChange handler is provided, keeping
  // existing usages (search + lga + optional category) unchanged.
  willingnessToPay?: string;
  onWillingnessToPayChange?: (value: string) => void;
  hasExistingCollection?: string;
  onHasExistingCollectionChange?: (value: string) => void;
  customerStatus?: string;
  onCustomerStatusChange?: (value: string) => void;
  dateFrom?: string;
  onDateFromChange?: (value: string) => void;
  dateTo?: string;
  onDateToChange?: (value: string) => void;

  // --- Phase 2 optional waste-manager (collector) filters ---
  providerStatus?: string;
  onProviderStatusChange?: (value: string) => void;
  wantsMoreCustomers?: string;
  onWantsMoreCustomersChange?: (value: string) => void;
}

export function SearchFilterBar({
  search,
  onSearchChange,
  lga,
  onLgaChange,
  showCategoryFilter = false,
  category,
  onCategoryChange,
  willingnessToPay,
  onWillingnessToPayChange,
  hasExistingCollection,
  onHasExistingCollectionChange,
  customerStatus,
  onCustomerStatusChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  providerStatus,
  onProviderStatusChange,
  wantsMoreCustomers,
  onWantsMoreCustomersChange,
}: SearchFilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-3">
      <div className="flex-1 min-w-50">
        <label htmlFor="search-input" className="sr-only">
          Search registrations
        </label>
        <Input
          id="search-input"
          type="search"
          placeholder="Search by name, phone, email, or address..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search registrations"
        />
      </div>
      <div className="w-full sm:w-48">
        <label htmlFor="lga-filter" className="sr-only">
          Filter by LGA
        </label>
        <Select value={lga} onValueChange={onLgaChange}>
          <SelectTrigger id="lga-filter" aria-label="Filter by LGA">
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
      {showCategoryFilter && onCategoryChange && (
        <div className="w-full sm:w-48">
          <label htmlFor="category-filter" className="sr-only">
            Filter by category
          </label>
          <Select value={category || ""} onValueChange={onCategoryChange}>
            <SelectTrigger id="category-filter" aria-label="Filter by category">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CUSTOMER_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* --- Phase 2 customer filters --- */}
      {onWillingnessToPayChange && (
        <div className="w-full sm:w-48">
          <label htmlFor="willingness-filter" className="sr-only">
            Filter by willingness to pay
          </label>
          <Select
            value={willingnessToPay || ""}
            onValueChange={onWillingnessToPayChange}
          >
            <SelectTrigger
              id="willingness-filter"
              aria-label="Filter by willingness to pay"
            >
              <SelectValue placeholder="All Willingness" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Willingness</SelectItem>
              {WILLINGNESS_TO_PAY.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {onHasExistingCollectionChange && (
        <div className="w-full sm:w-48">
          <label htmlFor="existing-collection-filter" className="sr-only">
            Filter by existing collection
          </label>
          <Select
            value={hasExistingCollection || ""}
            onValueChange={onHasExistingCollectionChange}
          >
            <SelectTrigger
              id="existing-collection-filter"
              aria-label="Filter by existing collection"
            >
              <SelectValue placeholder="All Collection" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Collection</SelectItem>
              {EXISTING_COLLECTION_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {onCustomerStatusChange && (
        <div className="w-full sm:w-48">
          <label htmlFor="customer-status-filter" className="sr-only">
            Filter by status
          </label>
          <Select
            value={customerStatus || ""}
            onValueChange={onCustomerStatusChange}
          >
            <SelectTrigger
              id="customer-status-filter"
              aria-label="Filter by status"
            >
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {CUSTOMER_STATUSES.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {onDateFromChange && (
        <div className="w-full sm:w-44">
          <label htmlFor="date-from-filter" className="sr-only">
            Registered from
          </label>
          <Input
            id="date-from-filter"
            type="date"
            value={dateFrom || ""}
            onChange={(e) => onDateFromChange(e.target.value)}
            aria-label="Registered from date"
          />
        </div>
      )}
      {onDateToChange && (
        <div className="w-full sm:w-44">
          <label htmlFor="date-to-filter" className="sr-only">
            Registered to
          </label>
          <Input
            id="date-to-filter"
            type="date"
            value={dateTo || ""}
            onChange={(e) => onDateToChange(e.target.value)}
            aria-label="Registered to date"
          />
        </div>
      )}

      {/* --- Phase 2 waste-manager filters --- */}
      {onProviderStatusChange && (
        <div className="w-full sm:w-48">
          <label htmlFor="provider-status-filter" className="sr-only">
            Filter by status
          </label>
          <Select
            value={providerStatus || ""}
            onValueChange={onProviderStatusChange}
          >
            <SelectTrigger
              id="provider-status-filter"
              aria-label="Filter by status"
            >
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {PROVIDER_STATUSES.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {onWantsMoreCustomersChange && (
        <div className="w-full sm:w-48">
          <label htmlFor="wants-more-filter" className="sr-only">
            Filter by wants more customers
          </label>
          <Select
            value={wantsMoreCustomers || ""}
            onValueChange={onWantsMoreCustomersChange}
          >
            <SelectTrigger
              id="wants-more-filter"
              aria-label="Filter by wants more customers"
            >
              <SelectValue placeholder="Wants More?" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wants More?</SelectItem>
              {WANTS_MORE_CUSTOMERS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
