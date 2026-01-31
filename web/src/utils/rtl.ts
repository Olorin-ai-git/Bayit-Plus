/**
 * RTL (Right-to-Left) utilities for Hebrew and other RTL languages
 */

/**
 * RTL language codes
 */
export const RTL_LANGUAGES = ['he', 'ar', 'fa', 'ur', 'yi'] as const

export type RTLLanguage = typeof RTL_LANGUAGES[number]

/**
 * Check if a language code is RTL
 */
export function isRTL(languageCode: string): boolean {
  return RTL_LANGUAGES.includes(languageCode as RTLLanguage)
}

/**
 * Get text direction for a language code
 */
export function getTextDirection(languageCode: string): 'ltr' | 'rtl' {
  return isRTL(languageCode) ? 'rtl' : 'ltr'
}

/**
 * Get alignment for a language code (opposite of LTR for RTL)
 */
export function getTextAlign(languageCode: string): 'left' | 'right' {
  return isRTL(languageCode) ? 'right' : 'left'
}

/**
 * Check if text contains Hebrew characters
 */
export function containsHebrew(text: string): boolean {
  // Hebrew Unicode range: \u0590-\u05FF
  return /[\u0590-\u05FF]/.test(text)
}

/**
 * Check if text contains Arabic characters
 */
export function containsArabic(text: string): boolean {
  // Arabic Unicode ranges: \u0600-\u06FF, \u0750-\u077F, \uFB50-\uFDFF, \uFE70-\uFEFF
  return /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)
}

/**
 * Auto-detect text direction based on content
 */
export function detectTextDirection(text: string): 'ltr' | 'rtl' {
  if (containsHebrew(text) || containsArabic(text)) {
    return 'rtl'
  }
  return 'ltr'
}

/**
 * Get Tailwind class for text alignment based on language
 */
export function getTailwindTextAlign(languageCode: string): string {
  return isRTL(languageCode) ? 'text-right' : 'text-left'
}

/**
 * Get Tailwind class for flex direction based on language
 */
export function getTailwindFlexDirection(languageCode: string): string {
  return isRTL(languageCode) ? 'flex-row-reverse' : 'flex-row'
}
