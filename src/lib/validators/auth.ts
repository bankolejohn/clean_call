import { z } from 'zod';

/**
 * Zod schema for admin login form validation.
 * Used for both client-side and server-side validation.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .max(254, 'Email must be 254 characters or less')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be 128 characters or less'),
});

export type LoginInput = z.infer<typeof loginSchema>;
