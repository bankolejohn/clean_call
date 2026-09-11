import { z } from 'zod';
import { CUSTOMER_STATUSES } from '@/lib/constants/customer-status';
import { PROVIDER_STATUSES } from '@/lib/constants/provider-status';

/**
 * Validation schema for a customer status-change PATCH payload.
 * Any value outside CUSTOMER_STATUSES fails safeParse, which the API
 * translates to a 400 response.
 */
export const customerStatusSchema = z.object({
  status: z.enum(CUSTOMER_STATUSES, {
    errorMap: () => ({ message: 'Please select a valid customer status' }),
  }),
});

/**
 * Validation schema for a provider (waste-manager) status-change PATCH payload.
 * Any value outside PROVIDER_STATUSES fails safeParse, which the API
 * translates to a 400 response.
 */
export const providerStatusSchema = z.object({
  status: z.enum(PROVIDER_STATUSES, {
    errorMap: () => ({ message: 'Please select a valid provider status' }),
  }),
});

export type CustomerStatusInput = z.infer<typeof customerStatusSchema>;
export type ProviderStatusInput = z.infer<typeof providerStatusSchema>;
