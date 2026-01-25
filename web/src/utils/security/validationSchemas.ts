import { z } from 'zod';

/**
 * Zod validation schemas for runtime data integrity
 *
 * Security Features:
 * - Type-safe validation of translation keys
 * - Plan feature data integrity checks
 * - Prevents data tampering
 */

// Translation key validation
export const translationKeySchema = z.string()
  .min(1)
  .max(200)
  .regex(/^[a-zA-Z0-9._-]+$/, 'Invalid translation key format')
  .refine(
    (key) => !key.includes('__proto__') && !key.includes('constructor'),
    'Unsafe translation key'
  );

// Plan tier validation
export const planTierSchema = z.enum([
  'non_registered',
  'registered_free',
  'basic',
  'premium',
  'family'
]);

// Feature category validation
export const featureCategorySchema = z.enum([
  'content',
  'quality',
  'devices',
  'features',
  'support'
]);

// Feature value validation (boolean or string)
export const featureValueSchema = z.union([
  z.boolean(),
  z.string().min(1).max(50)
]);

// Plan feature availability validation
export const planFeatureAvailabilitySchema = z.object({
  non_registered: featureValueSchema,
  registered_free: featureValueSchema,
  basic: featureValueSchema,
  premium: featureValueSchema,
  family: featureValueSchema,
});

// Complete plan feature validation
export const planFeatureSchema = z.object({
  id: z.string().min(1).max(100),
  category: featureCategorySchema,
  translationKey: translationKeySchema,
  availability: planFeatureAvailabilitySchema,
});

// Array of plan features validation
export const planFeaturesArraySchema = z.array(planFeatureSchema);

/**
 * Validate plan features data at runtime
 */
export function validatePlanFeatures(data: unknown): boolean {
  try {
    planFeaturesArraySchema.parse(data);
    return true;
  } catch (error) {
    logger.error('Plan features validation failed', 'validationSchemas', error);
    return false;
  }
}

/**
 * Validate translation key
 */
export function validateTranslationKey(key: unknown): boolean {
  try {
    translationKeySchema.parse(key);
    return true;
  } catch {
    return false;
  }
}

import logger from '@/utils/logger';
