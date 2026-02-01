/**
 * Shared formatting utilities for live feature components
 */

/**
 * Format ISO timestamp to localized time string
 * @param timestamp - ISO timestamp string
 * @param isHebrew - Whether to use Hebrew locale
 * @param includeSeconds - Whether to include seconds in output
 * @returns Formatted time string (e.g., "14:30" or "14:30:45")
 */
export function formatISOTimestamp(
  timestamp: string,
  isHebrew: boolean,
  includeSeconds = true
): string {
  const date = new Date(timestamp)
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
  }
  if (includeSeconds) {
    options.second = '2-digit'
  }
  return date.toLocaleTimeString(isHebrew ? 'he-IL' : 'en-US', options)
}

/**
 * Language code to display label mapping
 */
const LANGUAGE_LABELS: Record<string, string> = {
  he: 'HE',
  en: 'EN',
  es: 'ES',
  ar: 'AR',
  zh: 'ZH',
  fr: 'FR',
  ru: 'RU',
  it: 'IT',
  ja: 'JA',
}

/**
 * Get display label for a language code
 * @param lang - ISO language code
 * @returns Upper-cased language label
 */
export function getLanguageLabel(lang: string): string {
  return LANGUAGE_LABELS[lang] || lang.toUpperCase()
}

/**
 * Format confidence score as percentage
 * @param confidence - Confidence score between 0 and 1
 * @returns Formatted percentage string (e.g., "85%")
 */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`
}
