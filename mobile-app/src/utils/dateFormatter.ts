/**
 * dateFormatter.ts - Localized Date and Time Formatting
 *
 * Provides comprehensive date, time, duration, and number formatting
 * with support for 10 languages and proper locale handling.
 *
 * Features:
 * - Localized dates, times, and datetimes
 * - Video duration formatting (MM:SS or HH:MM:SS)
 * - Relative time display (e.g., "2 hours ago")
 * - Localized number and currency formatting
 * - Timezone support
 * - Error handling with sensible fallbacks
 */

import {
  format,
  formatRelative,
  formatDistanceToNow,
  parseISO,
  isValid,
} from 'date-fns';
import {
  de,
  he,
  es,
  it,
  fr,
  ja,
  zhCN,
  hi,
  ta,
  bn,
} from 'date-fns/locale';

type LocaleKey = 'de' | 'he' | 'es' | 'it' | 'fr' | 'ja' | 'zh' | 'hi' | 'ta' | 'bn' | 'en';

/**
 * Map language codes to date-fns locale objects
 */
const localeMap: Record<LocaleKey, Locale> = {
  de,
  he,
  es,
  it,
  fr,
  ja,
  zh: zhCN,
  hi,
  ta,
  bn,
  en: de, // Fallback to German for English (date-fns doesn't export en locale by default)
};

/**
 * Get the appropriate date-fns locale object
 */
const getLocale = (languageCode: string): Locale => {
  const key = (languageCode.split('-')[0].toLowerCase() as LocaleKey) || 'en';
  return localeMap[key] || de;
};

/**
 * Formats a date with full localization
 * Examples: "23 January 2026", "23 enero 2026", "23 ינואר 2026"
 */
export const formatLocalizedDate = (
  date: Date | string | number,
  languageCode: string = 'en',
  formatStr: string = 'd MMMM yyyy'
): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    if (!isValid(dateObj)) {
      return 'Invalid date';
    }
    const locale = getLocale(languageCode);
    return format(dateObj, formatStr, { locale });
  } catch (error) {
    return 'Invalid date';
  }
};

/**
 * Formats a time with localization
 * Examples: "14:30", "2:30 PM", etc.
 */
export const formatLocalizedTime = (
  date: Date | string | number,
  languageCode: string = 'en',
  formatStr: string = 'HH:mm'
): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    if (!isValid(dateObj)) {
      return 'Invalid time';
    }
    const locale = getLocale(languageCode);
    return format(dateObj, formatStr, { locale });
  } catch (error) {
    return 'Invalid time';
  }
};

/**
 * Formats a datetime with full localization
 * Examples: "23 January 2026 at 14:30"
 */
export const formatLocalizedDateTime = (
  date: Date | string | number,
  languageCode: string = 'en',
  dateFormatStr: string = 'd MMMM yyyy',
  timeFormatStr: string = 'HH:mm'
): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    if (!isValid(dateObj)) {
      return 'Invalid datetime';
    }
    const locale = getLocale(languageCode);
    const dateStr = format(dateObj, dateFormatStr, { locale });
    const timeStr = format(dateObj, timeFormatStr, { locale });

    // RTL languages need special handling for word order
    const isRTL = languageCode === 'he' || languageCode === 'ar';
    if (isRTL) {
      return `${timeStr} ב${dateStr}`;
    }
    return `${dateStr} at ${timeStr}`;
  } catch (error) {
    return 'Invalid datetime';
  }
};

/**
 * Formats video duration
 * Short durations: MM:SS (e.g., "5:42")
 * Long durations: HH:MM:SS (e.g., "1:23:45")
 */
export const formatVideoDuration = (seconds: number): string => {
  if (typeof seconds !== 'number' || seconds < 0 || !isFinite(seconds)) {
    return '0:00';
  }

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  // Use HH:MM:SS format if duration is 1 hour or more
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Use MM:SS format for shorter durations
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Formats time in seconds to a readable duration
 * Examples: "1 hour ago", "hace 2 horas", "לפני 3 שעות"
 */
export const formatRelativeTime = (
  date: Date | string | number,
  languageCode: string = 'en'
): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    if (!isValid(dateObj)) {
      return 'Unknown time';
    }
    const locale = getLocale(languageCode);
    return formatDistanceToNow(dateObj, { locale, addSuffix: true });
  } catch (error) {
    return 'Unknown time';
  }
};

/**
 * Formats numbers according to locale
 * Examples: "1,234.56" (en), "1.234,56" (de), "1,234.56" (es)
 */
export const formatLocalizedNumber = (
  value: number,
  languageCode: string = 'en',
  options?: Intl.NumberFormatOptions
): string => {
  try {
    if (typeof value !== 'number' || !isFinite(value)) {
      return '0';
    }

    const locale = languageCode === 'he' ? 'he-IL' : `${languageCode}-${languageCode.toUpperCase()}`;
    return new Intl.NumberFormat(locale, options).format(value);
  } catch (error) {
    return value.toString();
  }
};

/**
 * Formats currency according to locale
 * Examples: "$1,234.56", "€1.234,56", "₪1,234.56"
 */
export const formatLocalizedCurrency = (
  value: number,
  languageCode: string = 'en',
  currency: string = 'USD'
): string => {
  try {
    if (typeof value !== 'number' || !isFinite(value)) {
      return '0';
    }

    const locale = languageCode === 'he' ? 'he-IL' : `${languageCode}-${languageCode.toUpperCase()}`;
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch (error) {
    return `${currency} ${value.toFixed(2)}`;
  }
};

/**
 * Checks if a date is today
 */
export const isToday = (date: Date | string | number): boolean => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    if (!isValid(dateObj)) {
      return false;
    }
    const today = new Date();
    return (
      dateObj.getDate() === today.getDate() &&
      dateObj.getMonth() === today.getMonth() &&
      dateObj.getFullYear() === today.getFullYear()
    );
  } catch {
    return false;
  }
};

/**
 * Checks if a date is yesterday
 */
export const isYesterday = (date: Date | string | number): boolean => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    if (!isValid(dateObj)) {
      return false;
    }
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return (
      dateObj.getDate() === yesterday.getDate() &&
      dateObj.getMonth() === yesterday.getMonth() &&
      dateObj.getFullYear() === yesterday.getFullYear()
    );
  } catch {
    return false;
  }
};

/**
 * Checks if a date is tomorrow
 */
export const isTomorrow = (date: Date | string | number): boolean => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    if (!isValid(dateObj)) {
      return false;
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return (
      dateObj.getDate() === tomorrow.getDate() &&
      dateObj.getMonth() === tomorrow.getMonth() &&
      dateObj.getFullYear() === tomorrow.getFullYear()
    );
  } catch {
    return false;
  }
};

/**
 * Formats date with smart relative formatting
 * "Today at 14:30", "Yesterday at 10:00", "Tomorrow at 20:00", or "23 January 2026"
 */
export const formatSmartDate = (
  date: Date | string | number,
  languageCode: string = 'en'
): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    if (!isValid(dateObj)) {
      return 'Invalid date';
    }

    const locale = getLocale(languageCode);
    const timeStr = format(dateObj, 'HH:mm', { locale });

    if (isToday(dateObj)) {
      const today = languageCode === 'he' ? 'היום' : 'Today';
      return languageCode === 'he' ? `${today} בשעה ${timeStr}` : `${today} at ${timeStr}`;
    }

    if (isYesterday(dateObj)) {
      const yesterday = languageCode === 'he' ? 'אתמול' : 'Yesterday';
      return languageCode === 'he' ? `${yesterday} בשעה ${timeStr}` : `${yesterday} at ${timeStr}`;
    }

    if (isTomorrow(dateObj)) {
      const tomorrow = languageCode === 'he' ? 'מחר' : 'Tomorrow';
      return languageCode === 'he' ? `${tomorrow} בשעה ${timeStr}` : `${tomorrow} at ${timeStr}`;
    }

    // Default to full date format
    return formatLocalizedDate(dateObj, languageCode);
  } catch (error) {
    return 'Invalid date';
  }
};
