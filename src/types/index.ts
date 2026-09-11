// Shared TypeScript types for CleanCall MVP

import { EKITI_LGAS } from '@/lib/constants/lgas';
import { CUSTOMER_CATEGORIES } from '@/lib/constants/categories';
import { DISPOSAL_METHODS } from '@/lib/constants/disposal-methods';
import { COLLECTION_FREQUENCIES } from '@/lib/constants/frequencies';
import { WILLINGNESS_TO_PAY } from '@/lib/constants/willingness-to-pay';
import { PRICE_RANGES } from '@/lib/constants/price-ranges';
import { EXISTING_COLLECTION_OPTIONS } from '@/lib/constants/existing-collection';
import { SATISFACTION_OPTIONS } from '@/lib/constants/satisfaction';
import { CUSTOMER_STATUSES } from '@/lib/constants/customer-status';
import { PROVIDER_STATUSES } from '@/lib/constants/provider-status';
import { WANTS_MORE_CUSTOMERS } from '@/lib/constants/wants-more-customers';

// Re-export derived types from constants for convenience
export type EkitiLGA = (typeof EKITI_LGAS)[number];
export type CustomerCategory = (typeof CUSTOMER_CATEGORIES)[number];
export type DisposalMethod = (typeof DISPOSAL_METHODS)[number];
export type CollectionFrequency = (typeof COLLECTION_FREQUENCIES)[number];

// Phase 2 derived types from new constants
export type WillingnessToPay = (typeof WILLINGNESS_TO_PAY)[number];
export type PriceRange = (typeof PRICE_RANGES)[number];
export type ExistingCollection = (typeof EXISTING_COLLECTION_OPTIONS)[number];
export type Satisfaction = (typeof SATISFACTION_OPTIONS)[number];
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];
export type ProviderStatus = (typeof PROVIDER_STATUSES)[number];
export type WantsMoreCustomers = (typeof WANTS_MORE_CUSTOMERS)[number];

export interface CustomerRegistrationInput {
  full_name: string;
  phone: string;
  email?: string;
  address: string;
  lga: EkitiLGA;
  category: CustomerCategory;
  disposal_method: DisposalMethod;
  collection_frequency: CollectionFrequency;
  // Phase 2 optional market-research fields
  willingness_to_pay?: WillingnessToPay;
  preferred_price_range?: PriceRange;
  has_existing_collection?: ExistingCollection;
  satisfaction_with_existing?: Satisfaction;
}

export interface CollectorRegistrationInput {
  business_name: string;
  contact_person: string;
  phone: string;
  email: string;
  business_address: string;
  service_areas: EkitiLGA[];
  waste_types: string[];
  staff_count: number;
  vehicle_count: number;
  years_in_operation: number;
  cac_number?: string;
  // Phase 2 optional marketplace field
  wants_more_customers?: WantsMoreCustomers;
}

export interface Customer extends CustomerRegistrationInput {
  id: string;
  created_at: string;
  status: CustomerStatus;
  updated_at: string;
}

export interface Collector extends CollectorRegistrationInput {
  id: string;
  created_at: string;
  status: ProviderStatus;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DashboardStats {
  // Phase 1 fields (retained for backward compatibility)
  customerCount: number;
  collectorCount: number;
  recentRegistrations: RecentRegistration[];
  lgaBreakdown: LGABreakdownItem[];
  // Phase 2 expanded stats
  totalUsers: number;
  activeProviders: number;
  pendingProviders: number;
  newRegistrationsThisWeek: number;
  customersInterestedInPaid: number;
  customersWithExistingCollection: number;
  customersWithoutExistingCollection: number;
}

export interface RecentRegistration {
  name: string;
  role: 'Customer' | 'Collector';
  lga: string;
  created_at: string;
}

export interface LGABreakdownItem {
  lga: EkitiLGA;
  customerCount: number;
  collectorCount: number;
}

export interface ActivityLogEntry {
  id: string;
  action_type: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}
