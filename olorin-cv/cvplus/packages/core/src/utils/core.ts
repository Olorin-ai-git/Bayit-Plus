/**
 * Core Utilities
 * Temporary replacements for @cvplus/core functionality
  */

// generateId moved to crypto.ts to avoid conflicts

/**
 * Validate user data (placeholder implementation)
  */
export function validateUser(user: any): boolean {
  return user && typeof user.id === 'string';
}

/**
 * Validate CV data (placeholder implementation)
  */
export function validateCVData(cvData: any): boolean {
  return cvData && typeof cvData === 'object';
}

/**
 * API Response utilities
  */
export const ApiResponseHelpers = {
  success: <T>(data: T) => ({ success: true, data }),
  error: (message: string) => ({ success: false, error: { message } })
};