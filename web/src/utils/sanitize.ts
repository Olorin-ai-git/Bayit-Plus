/**
 * Text Sanitization Utility
 *
 * Sanitizes untrusted user input to prevent XSS attacks
 * Uses DOMPurify for comprehensive protection
 */

import DOMPurify from 'dompurify';

/**
 * Sanitize untrusted text input
 * Removes all HTML tags and potentially malicious content
 *
 * @param input - Untrusted user input (from API, localStorage, URL params, etc.)
 * @returns Sanitized plain text safe for rendering
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) {
    return '';
  }

  // Configure DOMPurify to return plain text only (no HTML tags)
  const clean = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [], // No attributes allowed
    KEEP_CONTENT: true, // Keep text content
  });

  return clean.trim();
}

/**
 * Sanitize an array of text inputs
 *
 * @param inputs - Array of untrusted strings
 * @returns Array of sanitized strings
 */
export function sanitizeTextArray(inputs: (string | null | undefined)[]): string[] {
  return inputs.map(sanitizeText).filter(text => text.length > 0);
}

/**
 * Sanitize category object with name and emoji
 *
 * @param category - Category object with untrusted name field
 * @returns Category with sanitized fields
 */
export function sanitizeCategory<T extends { name: string; emoji?: string }>(
  category: T
): T {
  return {
    ...category,
    name: sanitizeText(category.name),
    emoji: category.emoji ? sanitizeText(category.emoji) : undefined,
  } as T;
}
