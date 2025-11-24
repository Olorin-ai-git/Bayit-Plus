/**
 * String Utilities
 *
 * Constitutional Compliance:
 * - Type-safe string operations
 * - No hardcoded values
 * - No mocks or placeholders
 *
 * Usage:
 *   import { slugify, escapeHtml, template } from '@api/utils/string';
 */

/**
 * Convert string to slug
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(str: string): string {
  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };

  return str.replace(/[&<>"'/]/g, (char) => htmlEscapeMap[char] || char);
}

/**
 * Unescape HTML special characters
 */
export function unescapeHtml(str: string): string {
  const htmlUnescapeMap: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#x2F;': '/'
  };

  return str.replace(/&[a-z]+;|&#x[0-9a-f]+;/gi, (entity) => htmlUnescapeMap[entity] || entity);
}

/**
 * Template string replacement
 */
export function template(
  str: string,
  data: Record<string, unknown>
): string {
  return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return String(data[key] ?? match);
  });
}

/**
 * Pad string to length
 */
export function pad(
  str: string,
  length: number,
  char: string = ' '
): string {
  const diff = length - str.length;
  if (diff <= 0) return str;

  const padLeft = Math.floor(diff / 2);
  const padRight = diff - padLeft;

  return char.repeat(padLeft) + str + char.repeat(padRight);
}

/**
 * Pad start of string
 */
export function padStart(
  str: string,
  length: number,
  char: string = ' '
): string {
  const diff = length - str.length;
  if (diff <= 0) return str;
  return char.repeat(diff) + str;
}

/**
 * Pad end of string
 */
export function padEnd(
  str: string,
  length: number,
  char: string = ' '
): string {
  const diff = length - str.length;
  if (diff <= 0) return str;
  return str + char.repeat(diff);
}

/**
 * Repeat string n times
 */
export function repeat(str: string, times: number): string {
  return str.repeat(times);
}

/**
 * Reverse string
 */
export function reverse(str: string): string {
  return str.split('').reverse().join('');
}

/**
 * Count occurrences of substring
 */
export function countOccurrences(str: string, substr: string): number {
  if (!substr) return 0;

  let count = 0;
  let position = 0;

  while ((position = str.indexOf(substr, position)) !== -1) {
    count++;
    position += substr.length;
  }

  return count;
}

/**
 * Check if string starts with any of the prefixes
 */
export function startsWithAny(str: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => str.startsWith(prefix));
}

/**
 * Check if string ends with any of the suffixes
 */
export function endsWithAny(str: string, suffixes: string[]): boolean {
  return suffixes.some((suffix) => str.endsWith(suffix));
}

/**
 * Remove prefix from string
 */
export function removePrefix(str: string, prefix: string): string {
  return str.startsWith(prefix) ? str.slice(prefix.length) : str;
}

/**
 * Remove suffix from string
 */
export function removeSuffix(str: string, suffix: string): string {
  return str.endsWith(suffix) ? str.slice(0, -suffix.length) : str;
}

/**
 * Split string into words
 */
export function words(str: string): string[] {
  return str.match(/[^\s]+/g) || [];
}

/**
 * Count words in string
 */
export function wordCount(str: string): number {
  return words(str).length;
}

/**
 * Limit string to word count
 */
export function limitWords(
  str: string,
  limit: number,
  suffix: string = '...'
): string {
  const wordArray = words(str);

  if (wordArray.length <= limit) {
    return str;
  }

  return wordArray.slice(0, limit).join(' ') + suffix;
}

/**
 * Extract all numbers from string
 */
export function extractNumbers(str: string): number[] {
  const matches = str.match(/-?\d+\.?\d*/g);
  return matches ? matches.map(Number) : [];
}

/**
 * Extract all URLs from string
 */
export function extractUrls(str: string): string[] {
  const urlRegex = /https?:\/\/[^\s]+/g;
  return str.match(urlRegex) || [];
}

/**
 * Extract all emails from string
 */
export function extractEmails(str: string): string[] {
  const emailRegex = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
  return str.match(emailRegex) || [];
}

/**
 * Strip HTML tags from string
 */
export function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

/**
 * Normalize whitespace
 */
export function normalizeWhitespace(str: string): string {
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Convert string to boolean
 */
export function toBoolean(str: string): boolean {
  const normalized = str.toLowerCase().trim();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

/**
 * Mask string (show only first and last n chars)
 */
export function mask(
  str: string,
  visibleStart: number = 4,
  visibleEnd: number = 4,
  maskChar: string = '*'
): string {
  if (str.length <= visibleStart + visibleEnd) {
    return str;
  }

  const start = str.slice(0, visibleStart);
  const end = str.slice(-visibleEnd);
  const masked = maskChar.repeat(str.length - visibleStart - visibleEnd);

  return start + masked + end;
}

/**
 * Ellipsis in middle of string
 */
export function ellipsisize(
  str: string,
  maxLength: number,
  ellipsis: string = '...'
): string {
  if (str.length <= maxLength) {
    return str;
  }

  const charsToShow = maxLength - ellipsis.length;
  const frontChars = Math.ceil(charsToShow / 2);
  const backChars = Math.floor(charsToShow / 2);

  return str.slice(0, frontChars) + ellipsis + str.slice(-backChars);
}
