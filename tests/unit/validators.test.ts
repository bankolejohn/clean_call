import { describe, it, expect } from 'vitest';
import { loginSchema } from '@/lib/validators/auth';
import { customerRegistrationSchema } from '@/lib/validators/customer';
import { collectorRegistrationSchema } from '@/lib/validators/collector';

describe('loginSchema', () => {
  it('accepts valid login data', () => {
    const result = loginSchema.safeParse({
      email: 'admin@cleancall.ng',
      password: 'securepass123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty email', () => {
    const result = loginSchema.safeParse({
      email: '',
      password: 'securepass123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email format', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'securepass123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects email exceeding 254 characters', () => {
    const result = loginSchema.safeParse({
      email: 'a'.repeat(246) + '@test.com',
      password: 'securepass123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password shorter than 8 characters', () => {
    const result = loginSchema.safeParse({
      email: 'admin@cleancall.ng',
      password: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password exceeding 128 characters', () => {
    const result = loginSchema.safeParse({
      email: 'admin@cleancall.ng',
      password: 'a'.repeat(129),
    });
    expect(result.success).toBe(false);
  });

  it('accepts password at exactly 8 characters', () => {
    const result = loginSchema.safeParse({
      email: 'admin@cleancall.ng',
      password: '12345678',
    });
    expect(result.success).toBe(true);
  });

  it('accepts password at exactly 128 characters', () => {
    const result = loginSchema.safeParse({
      email: 'admin@cleancall.ng',
      password: 'a'.repeat(128),
    });
    expect(result.success).toBe(true);
  });
});

describe('customerRegistrationSchema', () => {
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

  it('accepts valid customer data', () => {
    const result = customerRegistrationSchema.safeParse(validCustomer);
    expect(result.success).toBe(true);
  });

  it('accepts valid customer data with email', () => {
    const result = customerRegistrationSchema.safeParse({
      ...validCustomer,
      email: 'adebayo@example.com',
    });
    expect(result.success).toBe(true);
  });

  it('accepts Nigerian phone with +234 prefix', () => {
    const result = customerRegistrationSchema.safeParse({
      ...validCustomer,
      phone: '+2348012345678',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty full_name', () => {
    const result = customerRegistrationSchema.safeParse({
      ...validCustomer,
      full_name: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects full_name exceeding 100 characters', () => {
    const result = customerRegistrationSchema.safeParse({
      ...validCustomer,
      full_name: 'a'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid phone number format', () => {
    const result = customerRegistrationSchema.safeParse({
      ...validCustomer,
      phone: '1234567890',
    });
    expect(result.success).toBe(false);
  });

  it('rejects phone starting with wrong prefix', () => {
    const result = customerRegistrationSchema.safeParse({
      ...validCustomer,
      phone: '06012345678',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email format', () => {
    const result = customerRegistrationSchema.safeParse({
      ...validCustomer,
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty address', () => {
    const result = customerRegistrationSchema.safeParse({
      ...validCustomer,
      address: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects address exceeding 255 characters', () => {
    const result = customerRegistrationSchema.safeParse({
      ...validCustomer,
      address: 'a'.repeat(256),
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid LGA value', () => {
    const result = customerRegistrationSchema.safeParse({
      ...validCustomer,
      lga: 'Lagos',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid category value', () => {
    const result = customerRegistrationSchema.safeParse({
      ...validCustomer,
      category: 'Factory',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid disposal method value', () => {
    const result = customerRegistrationSchema.safeParse({
      ...validCustomer,
      disposal_method: 'Recycling',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid collection frequency value', () => {
    const result = customerRegistrationSchema.safeParse({
      ...validCustomer,
      collection_frequency: 'Yearly',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid LGA values', () => {
    const lgas = [
      'Ado-Ekiti', 'Ikere', 'Oye', 'Ikole', 'Ekiti East', 'Ekiti West',
      'Emure', 'Ise/Orun', 'Irepodun/Ifelodun', 'Ijero', 'Efon',
      'Ekiti South-West', 'Gbonyin', 'Ido-Osi', 'Moba', 'Ilejemeje',
    ];
    for (const lga of lgas) {
      const result = customerRegistrationSchema.safeParse({
        ...validCustomer,
        lga,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe('collectorRegistrationSchema', () => {
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

  it('accepts valid collector data', () => {
    const result = collectorRegistrationSchema.safeParse(validCollector);
    expect(result.success).toBe(true);
  });

  it('accepts valid collector data without optional cac_number', () => {
    const { cac_number, ...withoutCac } = validCollector;
    const result = collectorRegistrationSchema.safeParse(withoutCac);
    expect(result.success).toBe(true);
  });

  it('accepts empty string cac_number', () => {
    const result = collectorRegistrationSchema.safeParse({
      ...validCollector,
      cac_number: '',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty business_name', () => {
    const result = collectorRegistrationSchema.safeParse({
      ...validCollector,
      business_name: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects business_name exceeding 150 characters', () => {
    const result = collectorRegistrationSchema.safeParse({
      ...validCollector,
      business_name: 'a'.repeat(151),
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty contact_person', () => {
    const result = collectorRegistrationSchema.safeParse({
      ...validCollector,
      contact_person: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects contact_person exceeding 100 characters', () => {
    const result = collectorRegistrationSchema.safeParse({
      ...validCollector,
      contact_person: 'a'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid phone number', () => {
    const result = collectorRegistrationSchema.safeParse({
      ...validCollector,
      phone: '12345',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty email', () => {
    const result = collectorRegistrationSchema.safeParse({
      ...validCollector,
      email: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email format', () => {
    const result = collectorRegistrationSchema.safeParse({
      ...validCollector,
      email: 'invalid-email',
    });
    expect(result.success).toBe(false);
  });

  it('rejects business_address exceeding 300 characters', () => {
    const result = collectorRegistrationSchema.safeParse({
      ...validCollector,
      business_address: 'a'.repeat(301),
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty service_areas array', () => {
    const result = collectorRegistrationSchema.safeParse({
      ...validCollector,
      service_areas: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid LGA in service_areas', () => {
    const result = collectorRegistrationSchema.safeParse({
      ...validCollector,
      service_areas: ['Ado-Ekiti', 'Lagos'],
    });
    expect(result.success).toBe(false);
  });

  it('accepts all 16 LGAs in service_areas', () => {
    const allLgas = [
      'Ado-Ekiti', 'Ikere', 'Oye', 'Ikole', 'Ekiti East', 'Ekiti West',
      'Emure', 'Ise/Orun', 'Irepodun/Ifelodun', 'Ijero', 'Efon',
      'Ekiti South-West', 'Gbonyin', 'Ido-Osi', 'Moba', 'Ilejemeje',
    ];
    const result = collectorRegistrationSchema.safeParse({
      ...validCollector,
      service_areas: allLgas,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty waste_types array', () => {
    const result = collectorRegistrationSchema.safeParse({
      ...validCollector,
      waste_types: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects staff_count less than 1', () => {
    const result = collectorRegistrationSchema.safeParse({
      ...validCollector,
      staff_count: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects staff_count exceeding 10000', () => {
    const result = collectorRegistrationSchema.safeParse({
      ...validCollector,
      staff_count: 10001,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer staff_count', () => {
    const result = collectorRegistrationSchema.safeParse({
      ...validCollector,
      staff_count: 5.5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects vehicle_count less than 1', () => {
    const result = collectorRegistrationSchema.safeParse({
      ...validCollector,
      vehicle_count: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects vehicle_count exceeding 10000', () => {
    const result = collectorRegistrationSchema.safeParse({
      ...validCollector,
      vehicle_count: 10001,
    });
    expect(result.success).toBe(false);
  });

  it('accepts years_in_operation at 0', () => {
    const result = collectorRegistrationSchema.safeParse({
      ...validCollector,
      years_in_operation: 0,
    });
    expect(result.success).toBe(true);
  });

  it('rejects years_in_operation exceeding 100', () => {
    const result = collectorRegistrationSchema.safeParse({
      ...validCollector,
      years_in_operation: 101,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative years_in_operation', () => {
    const result = collectorRegistrationSchema.safeParse({
      ...validCollector,
      years_in_operation: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects cac_number exceeding 20 characters', () => {
    const result = collectorRegistrationSchema.safeParse({
      ...validCollector,
      cac_number: 'a'.repeat(21),
    });
    expect(result.success).toBe(false);
  });
});
