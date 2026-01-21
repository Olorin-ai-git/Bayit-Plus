/**
 * Input Validator
 * General text input validation with security considerations
 * Feature: Client-side security controls
 */

import type { TextValidationResult, TextValidationOptions } from '../types/security-types';
import { getCachedSecurityConfig } from '../config/security-config';
import { sanitizeHTML, sanitizeText, containsMaliciousPatterns } from '../xss/xss-protection';

/**
 * Validate general text input with security checks
 */
export function validateTextInput(
  input: string,
  options: TextValidationOptions = {}
): TextValidationResult {
  const config = getCachedSecurityConfig();

  const {
    maxLength = config.maxInputLength,
    allowHTML = false,
    fieldName = 'Input',
  } = options;

  if (input.length > maxLength) {
    return {
      valid: false,
      error: `${fieldName} exceeds maximum length of ${maxLength}`,
    };
  }

  // Check for potentially malicious patterns
  if (containsMaliciousPatterns(input)) {
    return {
      valid: false,
      error: `${fieldName} contains potentially malicious content`,
    };
  }

  // Sanitize the input
  let sanitizedValue = input;
  if (allowHTML) {
    sanitizedValue = sanitizeHTML(input);
  } else {
    sanitizedValue = sanitizeText(input);
  }

  return { valid: true, sanitizedValue };
}

/**
 * Validate input length
 */
export function validateLength(
  input: string,
  minLength: number,
  maxLength: number,
  fieldName: string = 'Input'
): { valid: boolean; error?: string } {
  if (input.length < minLength) {
    return {
      valid: false,
      error: `${fieldName} must be at least ${minLength} characters`,
    };
  }

  if (input.length > maxLength) {
    return {
      valid: false,
      error: `${fieldName} must not exceed ${maxLength} characters`,
    };
  }

  return { valid: true };
}

/**
 * Validate input against regex pattern
 */
export function validatePattern(
  input: string,
  pattern: RegExp,
  errorMessage: string
): { valid: boolean; error?: string } {
  if (!pattern.test(input)) {
    return { valid: false, error: errorMessage };
  }

  return { valid: true };
}

/**
 * Validate required field
 */
export function validateRequired(
  input: string | null | undefined,
  fieldName: string = 'Field'
): { valid: boolean; error?: string } {
  if (!input || input.trim().length === 0) {
    return { valid: false, error: `${fieldName} is required` };
  }

  return { valid: true };
}

/**
 * Validate numeric input
 */
export function validateNumeric(
  input: string,
  options: {
    min?: number;
    max?: number;
    integer?: boolean;
    fieldName?: string;
  } = {}
): { valid: boolean; error?: string; value?: number } {
  const { min, max, integer = false, fieldName = 'Number' } = options;

  const num = integer ? parseInt(input, 10) : parseFloat(input);

  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} must be a valid number` };
  }

  if (integer && !Number.isInteger(num)) {
    return { valid: false, error: `${fieldName} must be an integer` };
  }

  if (min !== undefined && num < min) {
    return { valid: false, error: `${fieldName} must be at least ${min}` };
  }

  if (max !== undefined && num > max) {
    return { valid: false, error: `${fieldName} must not exceed ${max}` };
  }

  return { valid: true, value: num };
}

/**
 * Validate phone number format (basic validation)
 */
export function validatePhoneNumber(phone: string): { valid: boolean; error?: string } {
  // Remove common formatting characters
  const cleaned = phone.replace(/[\s\-().+]/g, '');

  // Basic phone number validation (10-15 digits)
  const phoneRegex = /^\d{10,15}$/;

  if (!phoneRegex.test(cleaned)) {
    return {
      valid: false,
      error: 'Invalid phone number format',
    };
  }

  return { valid: true };
}

/**
 * Validate URL format
 */
export function validateURLFormat(url: string): { valid: boolean; error?: string } {
  try {
    new URL(url);
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}
