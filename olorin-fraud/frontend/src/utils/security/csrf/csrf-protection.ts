/**
 * CSRF Protection
 * Cross-Site Request Forgery prevention utilities
 * Feature: Client-side security controls
 */

import { getCachedSecurityConfig } from '../config/security-config';

/**
 * CSRF token storage
 */
let csrfToken: string | null = null;

/**
 * Storage key for CSRF token
 */
const CSRF_TOKEN_KEY = 'csrf_token';

/**
 * Generate CSRF token using crypto.getRandomValues
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');

  csrfToken = token;

  // Store in sessionStorage for persistence across pages
  sessionStorage.setItem(CSRF_TOKEN_KEY, token);

  return token;
}

/**
 * Get current CSRF token
 * Generates new token if none exists
 */
export function getCSRFToken(): string {
  const config = getCachedSecurityConfig();

  if (!config.enableCSRFProtection) {
    return ''; // CSRF protection disabled
  }

  if (csrfToken) {
    return csrfToken;
  }

  // Try to retrieve from sessionStorage
  const stored = sessionStorage.getItem(CSRF_TOKEN_KEY);
  if (stored) {
    csrfToken = stored;
    return stored;
  }

  // Generate new token if none exists
  return generateCSRFToken();
}

/**
 * Add CSRF token to request headers
 */
export function addCSRFTokenToHeaders(
  headers: Record<string, string> = {}
): Record<string, string> {
  const token = getCSRFToken();

  if (!token) {
    return headers;
  }

  return {
    ...headers,
    'X-CSRF-Token': token,
  };
}

/**
 * Add CSRF token to FormData
 */
export function addCSRFTokenToFormData(formData: FormData): FormData {
  const token = getCSRFToken();

  if (token) {
    formData.append('csrf_token', token);
  }

  return formData;
}

/**
 * Clear CSRF token
 */
export function clearCSRFToken(): void {
  csrfToken = null;
  sessionStorage.removeItem(CSRF_TOKEN_KEY);
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(token: string): boolean {
  const currentToken = getCSRFToken();
  return token === currentToken;
}

/**
 * Refresh CSRF token (generate new one)
 */
export function refreshCSRFToken(): string {
  clearCSRFToken();
  return generateCSRFToken();
}
