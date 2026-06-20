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

interface SearchFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  lga: string;
  onLgaChange: (value: string) => void;
  showCategoryFilter?: boolean;
  category?: string;
  onCategoryChange?: (value: string) => void;
}

export function SearchFilterBar({
  search,
  onSearchChange,
  lga,
  onLgaChange,
  showCategoryFilter = false,
  category,
  onCategoryChange,
}: SearchFilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="flex-1">
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
    </div>
  );
}
