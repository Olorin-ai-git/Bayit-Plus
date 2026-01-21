/**
 * Investigation Configuration Validator
 * Feature: 006-hybrid-graph-integration (Task T023)
 *
 * Client-side validation for hybrid graph investigation configurations.
 * Uses existing Zod schemas from hybridGraphValidation.ts
 *
 * SYSTEM MANDATE Compliance:
 * - Configuration-driven validation
 * - No hardcoded values or magic numbers
 * - Fail-fast with detailed error messages
 */

import { validateInvestigationConfig as zodValidate } from './hybridGraphValidation';
import type { InvestigationConfig } from '../types/hybridGraphTypes';

/**
 * Validation error structure
 */
export interface ValidationError {
  field: string;
  messages: string[];
}

/**
 * Validation result structure
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  data?: InvestigationConfig;
}

/**
 * Validate investigation configuration with detailed error reporting
 * @param config - Investigation configuration to validate
 * @returns Validation result with errors array
 */
export function validateConfig(config: unknown): ValidationResult {
  const result = zodValidate(config);

  if (result.success) {
    return {
      isValid: true,
      errors: [],
      data: result.data,
    };
  }

  const errors: ValidationError[] = [];

  if (result.errors) {
    Object.entries(result.errors).forEach(([field, messages]) => {
      errors.push({ field, messages });
    });
  }

  return {
    isValid: false,
    errors,
  };
}

/**
 * Check if configuration is valid (boolean check)
 * @param config - Investigation configuration to validate
 * @returns True if valid, false otherwise
 */
export function isConfigValid(config: unknown): boolean {
  const result = validateConfig(config);
  return result.isValid;
}

/**
 * Get first error message for a specific field
 * @param errors - Array of validation errors
 * @param field - Field name to get error for
 * @returns First error message or undefined
 */
export function getFieldError(errors: ValidationError[], field: string): string | undefined {
  const fieldError = errors.find((error) => error.field === field);
  return fieldError?.messages[0];
}

/**
 * Get all error messages as a flat array
 * @param errors - Array of validation errors
 * @returns Flat array of all error messages
 */
export function getAllErrorMessages(errors: ValidationError[]): string[] {
  return errors.flatMap((error) => error.messages);
}

/**
 * Format validation errors for display
 * @param errors - Array of validation errors
 * @returns Formatted error string
 */
export function formatErrors(errors: ValidationError[]): string {
  if (errors.length === 0) {
    return '';
  }

  return errors
    .map((error) => {
      const field = error.field.replace('_', ' ');
      const messages = error.messages.join('; ');
      return `${field}: ${messages}`;
    })
    .join('\n');
}
