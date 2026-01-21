/**
 * CV Validator - Re-export Facade
  */

// TEMPORARILY DISABLED: processing package not built yet
// export { CVValidator } from "@cvplus/processing";

// Placeholder implementation for backward compatibility
export const CVValidator = {
  validate: async () => ({ success: false, error: 'Service temporarily unavailable during migration' }),
  validateStructure: async () => ({ success: false, error: 'Service temporarily unavailable during migration' }),
} as const;

export interface CVValidatorOptions {
  strict?: boolean;
  format?: string;
}

export interface CVValidatorResult {
  success: boolean;
  valid?: boolean;
  errors?: string[];
  warnings?: string[];
  error?: string;
}
