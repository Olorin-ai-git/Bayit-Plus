/**
 * Validation Utilities
 * Zod schemas and DOMPurify sanitization for form validation and XSS prevention
 */

import { z } from 'zod';
import DOMPurify from 'dompurify';

/**
 * Sanitize string input to prevent XSS attacks
 */
export const sanitizeString = (input: string): string => {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
};

/**
 * Contact form schema for Bayit Plus consumer support
 */
export const contactFormSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .transform(sanitizeString),
  email: z
    .string()
    .email('Please enter a valid email address')
    .max(254, 'Email must be less than 254 characters'),
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(2000, 'Message must be less than 2000 characters')
    .transform(sanitizeString),
  helpType: z.enum(['subscribe', 'trial', 'support', 'billing', 'feedback']).optional(),
  currentProvider: z.enum(['none', 'satellite', 'iptv', 'youtube', 'other']).optional(),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;

/**
 * Subscription form schema
 */
export const subscriptionFormSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  plan: z.enum(['basic', 'premium', 'family']),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }),
});

export type SubscriptionFormData = z.infer<typeof subscriptionFormSchema>;

/**
 * Validate form data against a schema
 */
export const validateForm = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } => {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  result.error.errors.forEach((err) => {
    const path = err.path.join('.');
    errors[path] = err.message;
  });

  return { success: false, errors };
};
