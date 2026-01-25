import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes i18n translation strings to prevent XSS attacks
 *
 * Security Features:
 * - Removes script tags and event handlers
 * - Blocks unsafe patterns: {{...}}, __proto__, constructor
 * - Preserves safe HTML tags (p, strong, em, br)
 * - Validates against malicious template injection
 */

const UNSAFE_PATTERNS = [
  /\{\{.*?\}\}/g,  // Template injection
  /__proto__/gi,    // Prototype pollution
  /constructor/gi,  // Constructor access
  /<script/gi,      // Script tags
  /javascript:/gi,  // JavaScript protocol
  /on\w+=/gi,       // Event handlers (onclick, onload, etc.)
];

const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: ['p', 'strong', 'em', 'br', 'span'],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
};

/**
 * Sanitize a single translation string
 */
export function sanitizeI18n(value: string): string {
  if (typeof value !== 'string') {
    return '';
  }

  // Check for unsafe patterns
  for (const pattern of UNSAFE_PATTERNS) {
    if (pattern.test(value)) {
      logger.warn('Blocked unsafe i18n pattern', { pattern: pattern.toString(), value });
      return '';
    }
  }

  // Sanitize with DOMPurify
  const sanitized = DOMPurify.sanitize(value, DOMPURIFY_CONFIG);

  return sanitized;
}

/**
 * Recursively sanitize an object containing translations
 */
export function sanitizeI18nObject(obj: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeI18n(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'string' ? sanitizeI18n(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeI18nObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

import logger from '@/utils/logger';
