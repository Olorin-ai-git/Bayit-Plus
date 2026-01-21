/**
 * Validation Utilities
 *
 * Constitutional Compliance:
 * - Type-safe validation helpers
 * - No hardcoded values
 * - No mocks or placeholders
 *
 * Usage:
 *   import { isValidEmail, isValidUrl } from '@api/utils/validation';
 */

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate UUID
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate ISO date string
 */
export function isValidISODate(date: string): boolean {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  if (!isoDateRegex.test(date)) {
    return false;
  }

  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime());
}

/**
 * Validate phone number (basic)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-()]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

/**
 * Validate IP address
 */
export function isValidIPAddress(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i;

  if (ipv4Regex.test(ip)) {
    const octets = ip.split('.');
    return octets.every((octet) => {
      const num = parseInt(octet, 10);
      return num >= 0 && num <= 255;
    });
  }

  return ipv6Regex.test(ip);
}

/**
 * Validate non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validate string length
 */
export function hasValidLength(
  value: string,
  min?: number,
  max?: number
): boolean {
  const length = value.length;

  if (min !== undefined && length < min) {
    return false;
  }

  if (max !== undefined && length > max) {
    return false;
  }

  return true;
}

/**
 * Validate number range
 */
export function isInRange(
  value: number,
  min?: number,
  max?: number
): boolean {
  if (min !== undefined && value < min) {
    return false;
  }

  if (max !== undefined && value > max) {
    return false;
  }

  return true;
}

/**
 * Validate required fields
 */
export function hasRequiredFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[]
): boolean {
  return fields.every((field) => {
    const value = obj[field];
    return value !== null && value !== undefined && value !== '';
  });
}

/**
 * Validate enum value
 */
export function isValidEnum<T extends string>(
  value: unknown,
  enumValues: readonly T[]
): value is T {
  return typeof value === 'string' && (enumValues as readonly string[]).includes(value);
}

/**
 * Validate array
 */
export function isNonEmptyArray<T>(value: unknown): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Validate object
 */
export function isNonEmptyObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0
  );
}

/**
 * Sanitize string
 */
export function sanitizeString(value: string): string {
  return value.trim().replace(/[<>]/g, '');
}

/**
 * Validate JSON string
 */
export function isValidJSON(value: string): boolean {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse JSON safely
 */
export function parseJSON<T>(value: string, defaultValue: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Validate date range
 */
export function isValidDateRange(start: string | Date, end: string | Date): boolean {
  const startDate = typeof start === 'string' ? new Date(start) : start;
  const endDate = typeof end === 'string' ? new Date(end) : end;

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return false;
  }

  return startDate <= endDate;
}

/**
 * Validate pagination parameters
 */
export function isValidPagination(page: number, pageSize: number): boolean {
  return (
    Number.isInteger(page) &&
    Number.isInteger(pageSize) &&
    page > 0 &&
    pageSize > 0 &&
    pageSize <= 100
  );
}
