/**
 * Security Types
 * Type definitions for security utilities
 * Feature: Client-side security controls
 */

/**
 * Security configuration
 */
export interface SecurityConfig {
  enableXSSProtection: boolean;
  enableCSRFProtection: boolean;
  enableInputValidation: boolean;
  maxInputLength: number;
  allowedDomains: string[];
  sessionTimeoutMinutes: number;
  enableSecurityHeaders: boolean;
}

/**
 * Validation result for email
 */
export interface EmailValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validation result for username
 */
export interface UsernameValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Password strength levels
 */
export type PasswordStrength = 'weak' | 'medium' | 'strong' | 'very-strong';

/**
 * Validation result for password
 */
export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
  strength: PasswordStrength;
  suggestions: string[];
}

/**
 * Validation result for text input
 */
export interface TextValidationResult {
  valid: boolean;
  error?: string;
  sanitizedValue?: string;
}

/**
 * Text input validation options
 */
export interface TextValidationOptions {
  maxLength?: number;
  allowHTML?: boolean;
  fieldName?: string;
}

/**
 * HTML sanitization options
 */
export interface HTMLSanitizationOptions {
  allowedTags?: string[];
  allowedAttributes?: string[];
}

/**
 * CSP violation report
 */
export interface CSPViolation {
  blockedURI: string;
  documentURI: string;
  violatedDirective: string;
  effectiveDirective: string;
  originalPolicy: string;
  lineNumber?: number;
  columnNumber?: number;
  sourceFile?: string;
}

/**
 * Security status report
 */
export interface SecurityStatus {
  xssProtection: boolean;
  csrfProtection: boolean;
  sessionActive: boolean;
  sessionTimeRemaining: number;
}
