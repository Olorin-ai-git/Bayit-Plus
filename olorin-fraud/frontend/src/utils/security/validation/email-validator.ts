/**
 * Email Validator
 * Email validation with security considerations
 * Feature: Client-side security controls
 */

import type { EmailValidationResult } from '../types/security-types';

/**
 * Validate email format with security checks
 */
export function validateEmail(email: string): EmailValidationResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email) {
    return { valid: false, error: 'Email is required' };
  }

  if (email.length > 254) {
    return { valid: false, error: 'Email is too long' };
  }

  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  // Check for potentially malicious patterns
  const maliciousPatterns = [
    /<script/i,
    /javascript:/i,
    /@.*@/, // Multiple @ symbols
  ];

  for (const pattern of maliciousPatterns) {
    if (pattern.test(email)) {
      return { valid: false, error: 'Email contains invalid characters' };
    }
  }

  return { valid: true };
}

/**
 * Check if email is from allowed domain
 */
export function isEmailFromAllowedDomain(
  email: string,
  allowedDomains: string[]
): boolean {
  if (allowedDomains.length === 0) {
    return true; // No domain restrictions
  }

  const domain = email.split('@')[1];
  if (!domain) {
    return false;
  }

  return allowedDomains.some(allowed =>
    domain === allowed || domain.endsWith(`.${allowed}`)
  );
}

/**
 * Normalize email address (lowercase, trim)
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
