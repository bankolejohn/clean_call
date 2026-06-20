// Shared TypeScript types for CleanCall MVP

import { EKITI_LGAS } from '@/lib/constants/lgas';
import { CUSTOMER_CATEGORIES } from '@/lib/constants/categories';
import { DISPOSAL_METHODS } from '@/lib/constants/disposal-methods';
import { COLLECTION_FREQUENCIES } from '@/lib/constants/frequencies';

// Re-export derived types from constants for convenience
export type EkitiLGA = (typeof EKITI_LGAS)[number];
export type CustomerCategory = (typeof CUSTOMER_CATEGORIES)[number];
export type DisposalMethod = (typeof DISPOSAL_METHODS)[number];
export type CollectionFrequency = (typeof COLLECTION_FREQUENCIES)[number];

export interface CustomerRegistrationInput {
  full_name: string;
  phone: string;
  email?: string;
  address: string;
  lga: EkitiLGA;
  category: CustomerCategory;
  disposal_method: DisposalMethod;
  collection_frequency: CollectionFrequency;
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
}

export interface Customer extends CustomerRegistrationInput {
  id: string;
  created_at: string;
}

export interface Collector extends CollectorRegistrationInput {
  id: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DashboardStats {
  customerCount: number;
  collectorCount: number;
  recentRegistrations: RecentRegistration[];
  lgaBreakdown: LGABreakdownItem[];
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

export interface ActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}
