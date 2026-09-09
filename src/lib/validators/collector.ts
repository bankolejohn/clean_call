import { z } from 'zod';
import { WANTS_MORE_CUSTOMERS } from '@/lib/constants/wants-more-customers';

/**
 * Valid Ekiti State Local Government Areas
 */
const EKITI_LGAS = [
  'Ado-Ekiti',
  'Ikere',
  'Oye',
  'Ikole',
  'Ekiti East',
  'Ekiti West',
  'Emure',
  'Ise/Orun',
  'Irepodun/Ifelodun',
  'Ijero',
  'Efon',
  'Ekiti South-West',
  'Gbonyin',
  'Ido-Osi',
  'Moba',
  'Ilejemeje',
] as const;

/**
 * Nigerian phone number regex:
 * - Local format: 0[7-9][01]XXXXXXXX (11 digits)
 * - International format: +234[7-9][01]XXXXXXXX (14 chars)
 */
const NIGERIAN_PHONE_REGEX = /^(0[7-9][01]\d{8}|\+234[7-9][01]\d{8})$/;

/**
 * Zod schema for collector registration form validation.
 * Used for both client-side and server-side validation.
 */
export const collectorRegistrationSchema = z.object({
  business_name: z
    .string()
    .min(1, 'Business name is required')
    .max(150, 'Business name must be 150 characters or less'),
  contact_person: z
    .string()
    .min(1, 'Contact person name is required')
    .max(100, 'Contact person name must be 100 characters or less'),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(NIGERIAN_PHONE_REGEX, 'Please enter a valid Nigerian phone number'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  business_address: z
    .string()
    .min(1, 'Business address is required')
    .max(300, 'Business address must be 300 characters or less'),
  service_areas: z
    .array(z.enum(EKITI_LGAS, {
      errorMap: () => ({ message: 'Each service area must be a valid LGA' }),
    }))
    .min(1, 'At least one service area is required')
    .max(16, 'Cannot select more than 16 service areas'),
  waste_types: z
    .array(z.string().min(1))
    .min(1, 'At least one waste type is required'),
  staff_count: z
    .number({ invalid_type_error: 'Staff count must be a number' })
    .int('Staff count must be a whole number')
    .min(1, 'Staff count must be at least 1')
    .max(10000, 'Staff count must be 10,000 or less'),
  vehicle_count: z
    .number({ invalid_type_error: 'Vehicle count must be a number' })
    .int('Vehicle count must be a whole number')
    .min(1, 'Vehicle count must be at least 1')
    .max(10000, 'Vehicle count must be 10,000 or less'),
  years_in_operation: z
    .number({ invalid_type_error: 'Years in operation must be a number' })
    .int('Years in operation must be a whole number')
    .min(0, 'Years in operation must be 0 or more')
    .max(100, 'Years in operation must be 100 or less'),
  cac_number: z
    .string()
    .max(20, 'CAC number must be 20 characters or less')
    .optional()
    .or(z.literal('')),
  // Phase 2 market-research field — optional so Phase 1 submissions still validate.
  wants_more_customers: z.enum(WANTS_MORE_CUSTOMERS).optional(),
});

export type CollectorRegistrationInput = z.infer<typeof collectorRegistrationSchema>;
