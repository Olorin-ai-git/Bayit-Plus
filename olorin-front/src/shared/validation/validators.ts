/**
 * Validation Utilities and Type Guards
 *
 * Type-safe validation utilities generated from Zod schemas.
 * Provides runtime type guards and validation functions.
 *
 * @module shared/validation/validators
 */

import {
  entitySchema,
  investigationSchema,
  investigationSettingsSchema,
  investigationListItemSchema,
  agentConfigSchema,
  agentLogSchema,
  agentAnalyticsSchema,
  ragDocumentSchema,
  ragQuerySchema,
  ragSearchResultSchema,
  type Entity,
  type Investigation,
  type InvestigationSettings,
  type InvestigationListItem,
  type AgentConfig,
  type AgentLog,
  type AgentAnalytics,
  type RagDocument,
  type RagQuery,
  type RagSearchResult
} from './schemas';

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for Entity
 */
export const isEntity = (data: unknown): data is Entity =>
  entitySchema.safeParse(data).success;

/**
 * Type guard for Investigation
 */
export const isInvestigation = (data: unknown): data is Investigation =>
  investigationSchema.safeParse(data).success;

/**
 * Type guard for InvestigationSettings
 */
export const isInvestigationSettings = (data: unknown): data is InvestigationSettings =>
  investigationSettingsSchema.safeParse(data).success;

/**
 * Type guard for InvestigationListItem
 */
export const isInvestigationListItem = (data: unknown): data is InvestigationListItem =>
  investigationListItemSchema.safeParse(data).success;

/**
 * Type guard for AgentConfig
 */
export const isAgentConfig = (data: unknown): data is AgentConfig =>
  agentConfigSchema.safeParse(data).success;

/**
 * Type guard for AgentLog
 */
export const isAgentLog = (data: unknown): data is AgentLog =>
  agentLogSchema.safeParse(data).success;

/**
 * Type guard for AgentAnalytics
 */
export const isAgentAnalytics = (data: unknown): data is AgentAnalytics =>
  agentAnalyticsSchema.safeParse(data).success;

/**
 * Type guard for RagDocument
 */
export const isRagDocument = (data: unknown): data is RagDocument =>
  ragDocumentSchema.safeParse(data).success;

/**
 * Type guard for RagQuery
 */
export const isRagQuery = (data: unknown): data is RagQuery =>
  ragQuerySchema.safeParse(data).success;

/**
 * Type guard for RagSearchResult
 */
export const isRagSearchResult = (data: unknown): data is RagSearchResult =>
  ragSearchResultSchema.safeParse(data).success;

// ============================================================================
// Validation Error Class
// ============================================================================

/**
 * Custom validation error with structured error details
 */
export class ValidationError extends Error {
  public readonly errors: Record<string, string[]>;

  constructor(message: string, errors: Record<string, string[]>) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }

  /**
   * Get first error message for a field
   */
  getFieldError(field: string): string | undefined {
    return this.errors[field]?.[0];
  }

  /**
   * Get all error messages for a field
   */
  getFieldErrors(field: string): string[] {
    return this.errors[field] || [];
  }

  /**
   * Check if field has errors
   */
  hasFieldError(field: string): boolean {
    return Boolean(this.errors[field]?.length);
  }

  /**
   * Get all error messages as flat array
   */
  getAllErrors(): string[] {
    return Object.values(this.errors).flat();
  }
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate data against schema and throw on failure
 *
 * @throws {ValidationError} If validation fails
 */
export function validate<T>(
  schema: { parse: (data: unknown) => T },
  data: unknown
): T {
  try {
    return schema.parse(data);
  } catch (error: any) {
    if (error?.errors) {
      const errorMap: Record<string, string[]> = {};

      for (const err of error.errors) {
        const path = err.path.join('.');
        if (!errorMap[path]) {
          errorMap[path] = [];
        }
        errorMap[path].push(err.message);
      }

      throw new ValidationError('Validation failed', errorMap);
    }
    throw error;
  }
}

/**
 * Validate data and return result with errors
 */
export function validateSafe<T>(
  schema: { safeParse: (data: unknown) => { success: boolean; data?: T; error?: any } },
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string[]> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data as T };
  }

  const errorMap: Record<string, string[]> = {};

  if (result.error?.errors) {
    for (const err of result.error.errors) {
      const path = err.path.join('.');
      if (!errorMap[path]) {
        errorMap[path] = [];
      }
      errorMap[path].push(err.message);
    }
  }

  return { success: false, errors: errorMap };
}

// ============================================================================
// API Response Validation
// ============================================================================

/**
 * Validate API response and throw on failure
 *
 * Use this to validate responses from backend APIs to ensure type safety.
 *
 * @example
 * const investigation = validateApiResponse(investigationSchema, response);
 *
 * @throws {ValidationError} If response doesn't match schema
 */
export function validateApiResponse<T>(
  schema: { parse: (data: unknown) => T },
  response: unknown,
  context?: string
): T {
  try {
    return validate(schema, response);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new ValidationError(
        `Invalid API response${context ? ` for ${context}` : ''}: ${error.message}`,
        error.errors
      );
    }
    throw error;
  }
}

/**
 * Validate array of items
 */
export function validateArray<T>(
  schema: { parse: (data: unknown) => T },
  items: unknown[]
): T[] {
  return items.map((item, index) => {
    try {
      return validate(schema, item);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(
          `Validation failed at index ${index}`,
          error.errors
        );
      }
      throw error;
    }
  });
}

// ============================================================================
// Field Validators
// ============================================================================

/**
 * Check if value is empty (null, undefined, empty string, empty array)
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/**
 * Check if field is required (not empty)
 */
export function isRequired(value: unknown): boolean {
  return !isEmpty(value);
}

/**
 * Check if string length is within range
 */
export function hasValidLength(
  value: string,
  min?: number,
  max?: number
): boolean {
  const length = value.length;
  if (min !== undefined && length < min) return false;
  if (max !== undefined && length > max) return false;
  return true;
}

/**
 * Check if number is within range
 */
export function isInRange(
  value: number,
  min?: number,
  max?: number
): boolean {
  if (min !== undefined && value < min) return false;
  if (max !== undefined && value > max) return false;
  return true;
}

// ============================================================================
// Exports
// ============================================================================

export const typeGuards = {
  isEntity,
  isInvestigation,
  isInvestigationSettings,
  isInvestigationListItem,
  isAgentConfig,
  isAgentLog,
  isAgentAnalytics,
  isRagDocument,
  isRagQuery,
  isRagSearchResult
};

export const validators = {
  validate,
  validateSafe,
  validateApiResponse,
  validateArray,
  isEmpty,
  isRequired,
  hasValidLength,
  isInRange
};
