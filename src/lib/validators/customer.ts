import { z } from 'zod';

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

const CUSTOMER_CATEGORIES = [
  'Household',
  'Business',
  'School',
  'Religious Organization',
  'Other',
] as const;

const DISPOSAL_METHODS = [
  'Burning',
  'Burying',
  'Roadside Dumping',
  'Private Collector',
  'Government Collector',
  'Other',
] as const;

const COLLECTION_FREQUENCIES = [
  'Daily',
  'Twice a Week',
  'Weekly',
  'Bi-Weekly',
  'Monthly',
] as const;

/**
 * Nigerian phone number regex:
 * - Local format: 0[7-9][01]XXXXXXXX (11 digits)
 * - International format: +234[7-9][01]XXXXXXXX (14 chars)
 */
const NIGERIAN_PHONE_REGEX = /^(0[7-9][01]\d{8}|\+234[7-9][01]\d{8})$/;

/**
 * Zod schema for customer registration form validation.
 * Used for both client-side and server-side validation.
 */
export const customerRegistrationSchema = z.object({
  full_name: z
    .string()
    .min(1, 'Full name is required')
    .max(100, 'Full name must be 100 characters or less'),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(NIGERIAN_PHONE_REGEX, 'Please enter a valid Nigerian phone number'),
  email: z
    .string()
    .email('Please enter a valid email address')
    .optional()
    .or(z.literal('')),
  address: z
    .string()
    .min(1, 'Address is required')
    .max(255, 'Address must be 255 characters or less'),
  lga: z.enum(EKITI_LGAS, {
    errorMap: () => ({ message: 'Please select a valid LGA' }),
  }),
  category: z.enum(CUSTOMER_CATEGORIES, {
    errorMap: () => ({ message: 'Please select a valid category' }),
  }),
  disposal_method: z.enum(DISPOSAL_METHODS, {
    errorMap: () => ({ message: 'Please select a valid disposal method' }),
  }),
  collection_frequency: z.enum(COLLECTION_FREQUENCIES, {
    errorMap: () => ({ message: 'Please select a valid collection frequency' }),
  }),
});

export type CustomerRegistrationInput = z.infer<typeof customerRegistrationSchema>;
