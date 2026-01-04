/**
 * Date Utilities
 *
 * Constitutional Compliance:
 * - Type-safe date operations
 * - No hardcoded values
 * - No mocks or placeholders
 *
 * Usage:
 *   import { addDays, isAfter, parseDate } from '@api/utils/date';
 */

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Subtract days from a date
 */
export function subtractDays(date: Date, days: number): Date {
  return addDays(date, -days);
}

/**
 * Add hours to a date
 */
export function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

/**
 * Add minutes to a date
 */
export function addMinutes(date: Date, minutes: number): Date {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

/**
 * Check if date is after another date
 */
export function isAfter(date: Date, comparison: Date): boolean {
  return date.getTime() > comparison.getTime();
}

/**
 * Check if date is before another date
 */
export function isBefore(date: Date, comparison: Date): boolean {
  return date.getTime() < comparison.getTime();
}

/**
 * Check if date is same day as another date
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Check if date is in range
 */
export function isInDateRange(date: Date, start: Date, end: Date): boolean {
  const time = date.getTime();
  return time >= start.getTime() && time <= end.getTime();
}

/**
 * Get start of day
 */
export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get end of day
 */
export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Get start of month
 */
export function startOfMonth(date: Date): Date {
  const result = new Date(date);
  result.setDate(1);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get end of month
 */
export function endOfMonth(date: Date): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 1, 0);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Get difference in days
 */
export function differenceInDays(date1: Date, date2: Date): number {
  const diffMs = date1.getTime() - date2.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get difference in hours
 */
export function differenceInHours(date1: Date, date2: Date): number {
  const diffMs = date1.getTime() - date2.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60));
}

/**
 * Get difference in minutes
 */
export function differenceInMinutes(date1: Date, date2: Date): number {
  const diffMs = date1.getTime() - date2.getTime();
  return Math.floor(diffMs / (1000 * 60));
}

/**
 * Parse date string safely
 */
export function parseDate(dateString: string): Date | null {
  const parsed = new Date(dateString);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Get date range
 */
export function getDateRange(
  start: Date,
  end: Date,
  step: number = 1
): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + step);
  }

  return dates;
}

/**
 * Check if date is today
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/**
 * Check if date is tomorrow
 */
export function isTomorrow(date: Date): boolean {
  return isSameDay(date, addDays(new Date(), 1));
}

/**
 * Check if date is yesterday
 */
export function isYesterday(date: Date): boolean {
  return isSameDay(date, subtractDays(new Date(), 1));
}

/**
 * Check if date is in past
 */
export function isPast(date: Date): boolean {
  return isBefore(date, new Date());
}

/**
 * Check if date is in future
 */
export function isFuture(date: Date): boolean {
  return isAfter(date, new Date());
}

/**
 * Get age from birth date
 */
export function getAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}
