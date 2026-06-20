import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { isValidNigerianPhone } from '@/lib/utils/phone';
import { customerRegistrationSchema } from '@/lib/validators/customer';
import { collectorRegistrationSchema } from '@/lib/validators/collector';
import { EKITI_LGAS } from '@/lib/constants/lgas';
import { CUSTOMER_CATEGORIES } from '@/lib/constants/categories';
import { DISPOSAL_METHODS } from '@/lib/constants/disposal-methods';
import { COLLECTION_FREQUENCIES } from '@/lib/constants/frequencies';

/**
 * Property-Based Tests for Validation Logic
 * Feature: cleancall-mvp
 */

const NUM_RUNS = 100;

// --- Helpers ---

/** Valid phone number generator (for creating valid base data) */
const validLocalPhoneArb = fc
  .tuple(
    fc.constantFrom('7', '8', '9'),
    fc.constantFrom('0', '1'),
    fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 8, maxLength: 8 })
  )
  .map(([d2, d3, rest]) => `0${d2}${d3}${rest}`);

const validInternationalPhoneArb = fc
  .tuple(
    fc.constantFrom('7', '8', '9'),
    fc.constantFrom('0', '1'),
    fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 8, maxLength: 8 })
  )
  .map(([d2, d3, rest]) => `+234${d2}${d3}${rest}`);

const validPhoneArb = fc.oneof(validLocalPhoneArb, validInternationalPhoneArb);

/** Generate strings that do NOT match the Nigerian phone pattern */
const invalidPhoneArb = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => {
    const cleaned = s.replace(/[\s\-]/g, '');
    return (
      !/^0[7-9][01]\d{8}$/.test(cleaned) &&
      !/^\+234[7-9][01]\d{8}$/.test(cleaned)
    );
  });

/** Generate a valid customer registration input */
const validCustomerInputArb = fc.record({
  full_name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
  phone: validPhoneArb,
  email: fc.constantFrom('', 'test@example.com'),
  address: fc.string({ minLength: 1, maxLength: 255 }).filter((s) => s.trim().length > 0),
  lga: fc.constantFrom(...EKITI_LGAS),
  category: fc.constantFrom(...CUSTOMER_CATEGORIES),
  disposal_method: fc.constantFrom(...DISPOSAL_METHODS),
  collection_frequency: fc.constantFrom(...COLLECTION_FREQUENCIES),
});

/** Simple email generator that Zod will definitely accept */
const safeEmailArb = fc
  .tuple(
    fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), { minLength: 3, maxLength: 10 }),
    fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), { minLength: 3, maxLength: 8 }),
    fc.constantFrom('com', 'org', 'net', 'ng')
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

/** Generate a valid collector registration input */
const validCollectorInputArb = fc.record({
  business_name: fc.string({ minLength: 1, maxLength: 150 }).filter((s) => s.trim().length > 0),
  contact_person: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
  phone: validPhoneArb,
  email: safeEmailArb,
  business_address: fc.string({ minLength: 1, maxLength: 300 }).filter((s) => s.trim().length > 0),
  service_areas: fc
    .subarray([...EKITI_LGAS], { minLength: 1, maxLength: 16 })
    .filter((arr) => arr.length >= 1),
  waste_types: fc.array(fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0), { minLength: 1, maxLength: 5 }),
  staff_count: fc.integer({ min: 1, max: 10000 }),
  vehicle_count: fc.integer({ min: 1, max: 10000 }),
  years_in_operation: fc.integer({ min: 0, max: 100 }),
  cac_number: fc.constantFrom('', 'RC12345'),
});

// =============================================================================
// Property 2: Phone Number Validation Rejects Invalid Formats
// =============================================================================

describe('Feature: cleancall-mvp, Property 2: Phone Number Validation Rejects Invalid Formats', () => {
  /**
   * Validates: Requirements 2.5, 3.5
   *
   * For any string that does not match the pattern of 11 digits starting with
   * 0[7-9][01] or 13 digits starting with +234[7-9][01], the phone validation
   * function SHALL return an error and the registration SHALL be rejected.
   */

  it('isValidNigerianPhone rejects all invalid phone strings', () => {
    fc.assert(
      fc.property(invalidPhoneArb, (phone) => {
        expect(isValidNigerianPhone(phone)).toBe(false);
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it('customer schema rejects invalid phone numbers', () => {
    fc.assert(
      fc.property(validCustomerInputArb, invalidPhoneArb, (validInput, invalidPhone) => {
        const input = { ...validInput, phone: invalidPhone };
        const result = customerRegistrationSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          const phoneErrors = result.error.issues.filter((i) => i.path.includes('phone'));
          expect(phoneErrors.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it('collector schema rejects invalid phone numbers', () => {
    fc.assert(
      fc.property(validCollectorInputArb, invalidPhoneArb, (validInput, invalidPhone) => {
        const input = { ...validInput, phone: invalidPhone };
        const result = collectorRegistrationSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          const phoneErrors = result.error.issues.filter((i) => i.path.includes('phone'));
          expect(phoneErrors.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: NUM_RUNS }
    );
  });
});

// =============================================================================
// Property 3: Enum Field Validation Rejects Invalid Values
// =============================================================================

describe('Feature: cleancall-mvp, Property 3: Enum Field Validation Rejects Invalid Values', () => {
  /**
   * Validates: Requirements 2.6, 2.7, 2.8, 2.9, 3.7, 3.8
   *
   * For any string not present in the defined set of allowed values for a
   * restricted field, the validation function SHALL reject the input and return
   * a field-specific error.
   */

  const invalidEnumStringArb = (validValues: readonly string[]) =>
    fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => !validValues.includes(s));

  it('customer schema rejects invalid LGA values', () => {
    fc.assert(
      fc.property(
        validCustomerInputArb,
        invalidEnumStringArb(EKITI_LGAS),
        (validInput, invalidLga) => {
          const input = { ...validInput, lga: invalidLga };
          const result = customerRegistrationSchema.safeParse(input);
          expect(result.success).toBe(false);
          if (!result.success) {
            const lgaErrors = result.error.issues.filter((i) => i.path.includes('lga'));
            expect(lgaErrors.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it('customer schema rejects invalid category values', () => {
    fc.assert(
      fc.property(
        validCustomerInputArb,
        invalidEnumStringArb(CUSTOMER_CATEGORIES),
        (validInput, invalidCategory) => {
          const input = { ...validInput, category: invalidCategory };
          const result = customerRegistrationSchema.safeParse(input);
          expect(result.success).toBe(false);
          if (!result.success) {
            const catErrors = result.error.issues.filter((i) => i.path.includes('category'));
            expect(catErrors.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it('customer schema rejects invalid disposal method values', () => {
    fc.assert(
      fc.property(
        validCustomerInputArb,
        invalidEnumStringArb(DISPOSAL_METHODS),
        (validInput, invalidMethod) => {
          const input = { ...validInput, disposal_method: invalidMethod };
          const result = customerRegistrationSchema.safeParse(input);
          expect(result.success).toBe(false);
          if (!result.success) {
            const methodErrors = result.error.issues.filter((i) =>
              i.path.includes('disposal_method')
            );
            expect(methodErrors.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it('customer schema rejects invalid collection frequency values', () => {
    fc.assert(
      fc.property(
        validCustomerInputArb,
        invalidEnumStringArb(COLLECTION_FREQUENCIES),
        (validInput, invalidFreq) => {
          const input = { ...validInput, collection_frequency: invalidFreq };
          const result = customerRegistrationSchema.safeParse(input);
          expect(result.success).toBe(false);
          if (!result.success) {
            const freqErrors = result.error.issues.filter((i) =>
              i.path.includes('collection_frequency')
            );
            expect(freqErrors.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it('collector schema rejects invalid service area LGA values', () => {
    fc.assert(
      fc.property(
        validCollectorInputArb,
        invalidEnumStringArb(EKITI_LGAS),
        (validInput, invalidLga) => {
          const input = { ...validInput, service_areas: [invalidLga] };
          const result = collectorRegistrationSchema.safeParse(input);
          expect(result.success).toBe(false);
          if (!result.success) {
            const areaErrors = result.error.issues.filter((i) =>
              i.path.includes('service_areas') || i.path[0] === 'service_areas'
            );
            expect(areaErrors.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });
});

// =============================================================================
// Property 4: Required Field Validation Identifies All Missing Fields
// =============================================================================

describe('Feature: cleancall-mvp, Property 4: Required Field Validation Identifies All Missing Fields', () => {
  /**
   * Validates: Requirements 2.4, 3.4
   *
   * For any subset of required registration fields left empty or omitted, the
   * validation function SHALL return errors for exactly those fields that are
   * missing, and no other fields SHALL be flagged.
   */

  const customerRequiredFields = [
    'full_name',
    'phone',
    'address',
    'lga',
    'category',
    'disposal_method',
    'collection_frequency',
  ] as const;

  const collectorRequiredFields = [
    'business_name',
    'contact_person',
    'phone',
    'email',
    'business_address',
    'service_areas',
    'waste_types',
    'staff_count',
    'vehicle_count',
    'years_in_operation',
  ] as const;

  it('customer schema reports errors for exactly the missing required fields', () => {
    // Generate a non-empty subset of required fields to leave empty
    const subsetsArb = fc
      .subarray([...customerRequiredFields], { minLength: 1 })
      .filter((arr) => arr.length >= 1);

    fc.assert(
      fc.property(validCustomerInputArb, subsetsArb, (validInput, fieldsToEmpty) => {
        const input: Record<string, unknown> = { ...validInput };

        // Set selected fields to empty string (simulating empty form submission)
        for (const field of fieldsToEmpty) {
          input[field] = '';
        }

        const result = customerRegistrationSchema.safeParse(input);
        expect(result.success).toBe(false);

        if (!result.success) {
          // Get the top-level field paths that have errors
          const errorFields = new Set(
            result.error.issues.map((i) => i.path[0] as string)
          );

          // Every field we emptied should have an error
          for (const field of fieldsToEmpty) {
            expect(errorFields.has(field)).toBe(true);
          }

          // No field that we didn't empty should have an error
          const keptFields = customerRequiredFields.filter(
            (f) => !fieldsToEmpty.includes(f)
          );
          for (const field of keptFields) {
            expect(errorFields.has(field)).toBe(false);
          }
        }
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it('collector schema reports errors for exactly the missing required fields', () => {
    // For collector, string fields get '' and array/number fields need special handling
    const stringFields = [
      'business_name',
      'contact_person',
      'phone',
      'email',
      'business_address',
    ] as const;

    const subsetsArb = fc
      .subarray([...stringFields], { minLength: 1 })
      .filter((arr) => arr.length >= 1);

    fc.assert(
      fc.property(validCollectorInputArb, subsetsArb, (validInput, fieldsToEmpty) => {
        const input: Record<string, unknown> = { ...validInput };

        // Set selected string fields to empty string
        for (const field of fieldsToEmpty) {
          input[field] = '';
        }

        const result = collectorRegistrationSchema.safeParse(input);
        expect(result.success).toBe(false);

        if (!result.success) {
          const errorFields = new Set(
            result.error.issues.map((i) => i.path[0] as string)
          );

          // Every field we emptied should have an error
          for (const field of fieldsToEmpty) {
            expect(errorFields.has(field)).toBe(true);
          }

          // No field that we didn't empty should have an error (among string fields)
          const keptFields = stringFields.filter(
            (f) => !fieldsToEmpty.includes(f)
          );
          for (const field of keptFields) {
            expect(errorFields.has(field)).toBe(false);
          }
        }
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it('collector schema reports errors when array fields are empty', () => {
    fc.assert(
      fc.property(validCollectorInputArb, (validInput) => {
        // Test with empty service_areas
        const inputEmptyAreas: Record<string, unknown> = {
          ...validInput,
          service_areas: [],
        };
        const result1 = collectorRegistrationSchema.safeParse(inputEmptyAreas);
        expect(result1.success).toBe(false);
        if (!result1.success) {
          const areaErrors = result1.error.issues.filter(
            (i) => i.path[0] === 'service_areas'
          );
          expect(areaErrors.length).toBeGreaterThan(0);
        }

        // Test with empty waste_types
        const inputEmptyWaste: Record<string, unknown> = {
          ...validInput,
          waste_types: [],
        };
        const result2 = collectorRegistrationSchema.safeParse(inputEmptyWaste);
        expect(result2.success).toBe(false);
        if (!result2.success) {
          const wasteErrors = result2.error.issues.filter(
            (i) => i.path[0] === 'waste_types'
          );
          expect(wasteErrors.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: NUM_RUNS }
    );
  });
});
