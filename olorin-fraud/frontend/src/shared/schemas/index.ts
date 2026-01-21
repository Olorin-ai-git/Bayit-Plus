/**
 * Shared Zod Validation Schemas
 *
 * Central export for all validation schemas used across microservices
 */

// Common schemas
export * from './common.schemas';

// Investigation schemas
export * from './investigation.schemas';

// Agent schemas
export * from './agent.schemas';

/**
 * Schema validation utilities
 */

/**
 * Safe parse with detailed error messages
 */
export function safeParseWithErrors<T>(
  schema: { safeParse: (data: unknown) => { success: boolean; data?: T; error?: any } },
  data: unknown,
  context?: string
): { success: boolean; data?: T; errors?: string[] } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error?.errors?.map((err: any) => {
    const path = err.path.join('.');
    const message = err.message;
    return context ? `[${context}] ${path}: ${message}` : `${path}: ${message}`;
  }) || ['Unknown validation error'];

  return { success: false, errors };
}

/**
 * Validate and throw on error
 */
export function validateOrThrow<T>(
  schema: { parse: (data: unknown) => T },
  data: unknown,
  errorMessage?: string
): T {
  try {
    return schema.parse(data);
  } catch (error: any) {
    const message = errorMessage || 'Validation failed';
    const details = error?.errors?.map((err: any) => `${err.path.join('.')}: ${err.message}`).join(', ');
    throw new Error(`${message}: ${details}`);
  }
}

/**
 * Partial validation - validates only provided fields
 */
export function partialValidate<T>(
  schema: { partial: () => { parse: (data: unknown) => Partial<T> } },
  data: unknown
): Partial<T> {
  return schema.partial().parse(data);
}
