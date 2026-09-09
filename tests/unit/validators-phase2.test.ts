import { describe, it, expect } from 'vitest';
import { customerRegistrationSchema } from '@/lib/validators/customer';
import { collectorRegistrationSchema } from '@/lib/validators/collector';
import { customerStatusSchema, providerStatusSchema } from '@/lib/validators/status';
import { WILLINGNESS_TO_PAY } from '@/lib/constants/willingness-to-pay';
import { PRICE_RANGES } from '@/lib/constants/price-ranges';
import { EXISTING_COLLECTION_OPTIONS } from '@/lib/constants/existing-collection';
import { WANTS_MORE_CUSTOMERS } from '@/lib/constants/wants-more-customers';
import { CUSTOMER_STATUSES } from '@/lib/constants/customer-status';
import { PROVIDER_STATUSES } from '@/lib/constants/provider-status';

/**
 * Phase 2 validator tests.
 *
 * Covers the optional market-research fields added to the customer/collector
 * registration schemas, the satisfaction conditional transform, and the new
 * status-change schemas.
 *
 * Requirements: 1.5, 2.6, 2.7, 3.4, 5.2
 */

describe('customerRegistrationSchema — Phase 2 fields', () => {
  const validCustomer = {
    full_name: 'Adebayo Johnson',
    phone: '08012345678',
    email: '',
    address: '12 Adekunle Street, Ado-Ekiti',
    lga: 'Ado-Ekiti' as const,
    category: 'Household' as const,
    disposal_method: 'Burning' as const,
    collection_frequency: 'Weekly' as const,
  };

  it('accepts a Phase-1-only customer with no Phase 2 fields (Requirement 1.5)', () => {
    const result = customerRegistrationSchema.safeParse(validCustomer);
    expect(result.success).toBe(true);
  });

  it('accepts all valid willingness_to_pay enum values', () => {
    for (const value of WILLINGNESS_TO_PAY) {
      const result = customerRegistrationSchema.safeParse({
        ...validCustomer,
        willingness_to_pay: value,
      });
      expect(result.success).toBe(true);
    }
  });

  it('accepts all valid preferred_price_range enum values', () => {
    for (const value of PRICE_RANGES) {
      const result = customerRegistrationSchema.safeParse({
        ...validCustomer,
        preferred_price_range: value,
      });
      expect(result.success).toBe(true);
    }
  });

  it('accepts all valid has_existing_collection enum values', () => {
    for (const value of EXISTING_COLLECTION_OPTIONS) {
      const result = customerRegistrationSchema.safeParse({
        ...validCustomer,
        has_existing_collection: value,
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects an invalid willingness_to_pay value', () => {
    const result = customerRegistrationSchema.safeParse({
      ...validCustomer,
      willingness_to_pay: 'Absolutely',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid preferred_price_range value', () => {
    const result = customerRegistrationSchema.safeParse({
      ...validCustomer,
      preferred_price_range: '₦1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid has_existing_collection value', () => {
    const result = customerRegistrationSchema.safeParse({
      ...validCustomer,
      has_existing_collection: 'Occasionally',
    });
    expect(result.success).toBe(false);
  });
});

describe('customerRegistrationSchema — satisfaction conditional transform (Requirements 2.6, 2.7)', () => {
  const validCustomer = {
    full_name: 'Ngozi Okeke',
    phone: '08123456789',
    email: '',
    address: '7 Market Road, Ado-Ekiti',
    lga: 'Ado-Ekiti' as const,
    category: 'Household' as const,
    disposal_method: 'Private Collector' as const,
    collection_frequency: 'Weekly' as const,
  };

  it('retains satisfaction_with_existing when has_existing_collection === "Yes"', () => {
    const result = customerRegistrationSchema.safeParse({
      ...validCustomer,
      has_existing_collection: 'Yes',
      satisfaction_with_existing: 'Somewhat',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.satisfaction_with_existing).toBe('Somewhat');
    }
  });

  it('nulls out satisfaction_with_existing when has_existing_collection === "No"', () => {
    const result = customerRegistrationSchema.safeParse({
      ...validCustomer,
      has_existing_collection: 'No',
      satisfaction_with_existing: 'Yes',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.satisfaction_with_existing).toBeUndefined();
    }
  });

  it('nulls out satisfaction_with_existing when has_existing_collection is omitted', () => {
    const result = customerRegistrationSchema.safeParse({
      ...validCustomer,
      satisfaction_with_existing: 'No',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.satisfaction_with_existing).toBeUndefined();
    }
  });

  it('nulls out satisfaction_with_existing for "Sometimes" and "I manage it myself"', () => {
    for (const value of ['Sometimes', 'I manage it myself'] as const) {
      const result = customerRegistrationSchema.safeParse({
        ...validCustomer,
        has_existing_collection: value,
        satisfaction_with_existing: 'Yes',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.satisfaction_with_existing).toBeUndefined();
      }
    }
  });
});

describe('collectorRegistrationSchema — Phase 2 fields', () => {
  const validCollector = {
    business_name: 'EcoWaste Solutions Ltd',
    contact_person: 'Oluwaseun Akinola',
    phone: '09087654321',
    email: 'info@ecowaste.ng',
    business_address: '45 Industrial Layout, Ado-Ekiti',
    service_areas: ['Ado-Ekiti', 'Ikere'] as const,
    waste_types: ['General Waste', 'Recyclables'],
    staff_count: 25,
    vehicle_count: 5,
    years_in_operation: 3,
    cac_number: 'RC1234567',
  };

  it('accepts a Phase-1-only collector with no wants_more_customers field (Requirement 1.5)', () => {
    const result = collectorRegistrationSchema.safeParse(validCollector);
    expect(result.success).toBe(true);
  });

  it('accepts all valid wants_more_customers enum values (Yes/Maybe/No)', () => {
    for (const value of WANTS_MORE_CUSTOMERS) {
      const result = collectorRegistrationSchema.safeParse({
        ...validCollector,
        wants_more_customers: value,
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects an invalid wants_more_customers value', () => {
    const result = collectorRegistrationSchema.safeParse({
      ...validCollector,
      wants_more_customers: 'Definitely',
    });
    expect(result.success).toBe(false);
  });
});

describe('customerStatusSchema (Requirement 3.4)', () => {
  it('accepts a representative valid customer status', () => {
    const result = customerStatusSchema.safeParse({ status: 'Contacted' });
    expect(result.success).toBe(true);
  });

  it('accepts every allowed customer status', () => {
    for (const status of CUSTOMER_STATUSES) {
      const result = customerStatusSchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it('rejects an invalid customer status', () => {
    const result = customerStatusSchema.safeParse({ status: 'Archived' });
    expect(result.success).toBe(false);
  });
});

describe('providerStatusSchema (Requirement 5.2)', () => {
  it('accepts a representative valid provider status', () => {
    const result = providerStatusSchema.safeParse({ status: 'Active' });
    expect(result.success).toBe(true);
  });

  it('accepts every allowed provider status', () => {
    for (const status of PROVIDER_STATUSES) {
      const result = providerStatusSchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it('rejects an invalid provider status', () => {
    const result = providerStatusSchema.safeParse({ status: 'Approved' });
    expect(result.success).toBe(false);
  });
});
