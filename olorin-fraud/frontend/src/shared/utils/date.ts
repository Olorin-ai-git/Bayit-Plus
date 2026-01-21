/**
 * Date Formatting Utilities
 * Consolidated date/time formatting functions
 *
 * SYSTEM MANDATE Compliance:
 * - Configuration-driven locale settings
 * - Type-safe formatting options
 * - No hardcoded values
 * - Reusable across all microservices
 *
 * Usage:
 *   import { formatDate, formatRelativeTime, formatDuration } from '@shared/utils/date';
 */

/**
 * Date format types
 */
export type DateFormat = 'short' | 'long' | 'time' | 'datetime' | 'iso' | 'relative' | 'custom';

/**
 * Date format options
 */
export interface DateFormatOptions {
  /** Format type */
  format?: DateFormat;
  /** Locale for formatting (default: 'en-US') */
  locale?: string;
  /** Custom Intl.DateTimeFormat options */
  customOptions?: Intl.DateTimeFormatOptions;
  /** Include time in relative format */
  includeTime?: boolean;
}

/**
 * Format date with multiple format options
 * Consolidates all date formatting into a single function
 */
export function formatDate(
  date: Date | string | number,
  options: DateFormatOptions = {}
): string {
  const { format = 'short', locale = 'en-US', customOptions, includeTime = false } = options;

  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

  // Validate date
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  switch (format) {
    case 'short':
      return dateObj.toLocaleDateString(locale);

    case 'long':
      return dateObj.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

    case 'time':
      return dateObj.toLocaleTimeString(locale);

    case 'datetime':
      return dateObj.toLocaleString(locale);

    case 'iso':
      return dateObj.toISOString();

    case 'relative':
      return formatRelativeTime(dateObj, includeTime);

    case 'custom':
      if (!customOptions) {
        throw new Error('Custom format requires customOptions parameter');
      }
      return dateObj.toLocaleString(locale, customOptions);

    default:
      return dateObj.toLocaleDateString(locale);
  }
}

/**
 * Format date to ISO string
 */
export function formatDateISO(date: Date | string | number): string {
  return formatDate(date, { format: 'iso' });
}

/**
 * Format date with custom locale options
 */
export function formatDateLocale(
  date: Date | string | number,
  locale: string = 'en-US',
  customOptions?: Intl.DateTimeFormatOptions
): string {
  return formatDate(date, { format: 'custom', locale, customOptions });
}

/**
 * Format relative time (e.g., "2 minutes ago")
 */
export function formatRelativeTime(
  date: Date | string | number,
  includeTime: boolean = false
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSeconds = Math.floor(Math.abs(diffMs) / 1000);

  const isFuture = diffMs < 0;
  const suffix = isFuture ? 'from now' : 'ago';

  if (diffSeconds < 60) {
    return 'just now';
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ${suffix}`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ${suffix}`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ${suffix}`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ${suffix}`;
  }

  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} year${diffYears !== 1 ? 's' : ''} ${suffix}`;
}

/**
 * Format duration in milliseconds to human readable
 */
export function formatDuration(ms: number, options: { short?: boolean } = {}): string {
  const { short = false } = options;

  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return short ? `${seconds}s` : `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    const sec = remainingSeconds > 0 ? `${remainingSeconds}${short ? 's' : ' sec'}` : '';
    return short
      ? `${minutes}m ${sec}`.trim()
      : `${minutes} minute${minutes !== 1 ? 's' : ''} ${sec}`.trim();
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    const min = remainingMinutes > 0 ? `${remainingMinutes}${short ? 'm' : ' min'}` : '';
    return short
      ? `${hours}h ${min}`.trim()
      : `${hours} hour${hours !== 1 ? 's' : ''} ${min}`.trim();
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  const hrs = remainingHours > 0 ? `${remainingHours}${short ? 'h' : ' hr'}` : '';
  return short
    ? `${days}d ${hrs}`.trim()
    : `${days} day${days !== 1 ? 's' : ''} ${hrs}`.trim();
}

/**
 * Get start of day for a date
 */
export function startOfDay(date: Date | string | number): Date {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const result = new Date(dateObj);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get end of day for a date
 */
export function endOfDay(date: Date | string | number): Date {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const result = new Date(dateObj);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Check if date is today
 */
export function isToday(date: Date | string | number): boolean {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const today = new Date();
  return (
    dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if date is in the past
 */
export function isPast(date: Date | string | number): boolean {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return dateObj.getTime() < Date.now();
}

/**
 * Check if date is in the future
 */
export function isFuture(date: Date | string | number): boolean {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return dateObj.getTime() > Date.now();
}
