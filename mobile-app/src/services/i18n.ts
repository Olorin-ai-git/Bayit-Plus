/**
 * Bayit+ Internationalization (i18n) Service
 * Uses @bayit/i18n/native which merges:
 * - 74 core keys from @olorin/shared-i18n
 * - 8 platform keys from @bayit/i18n
 * Supports: Hebrew (RTL), English, Spanish, Chinese, French, Italian, Hindi, Tamil, Bengali, Japanese
 */

import { initBayitI18nNative, saveLanguageNative, loadLanguageNative } from '@bayit/i18n/native';
import type { TFunction } from 'i18next';
import type { BayitLanguage } from '@bayit/i18n';
import { logger } from '../utils/logger';

// i18n instance (initialized on first call)
let i18n: Awaited<ReturnType<typeof initBayitI18nNative>> | null = null;

/**
 * Initialize i18n for React Native mobile app
 * Loads user's preferred language from AsyncStorage
 * Falls back to Hebrew (default)
 */
export async function initializeI18n(): Promise<void> {
  try {
    // Initialize with merged resources (Olorin core + Bayit+ platform)
    i18n = await initBayitI18nNative();

    // Note: initBayitI18nNative() already loads saved language from AsyncStorage
    // and sets it as the initial language, so no additional loading needed
  } catch (error) {
    logger.error('Failed to initialize i18n', 'I18nService', error);
    throw error; // Re-throw to let caller handle
  }
}

/**
 * Change app language and persist preference
 */
export async function setLanguage(languageCode: string): Promise<boolean> {
  try {
    if (!i18n) {
      logger.error('i18n not initialized. Call initializeI18n() first.', 'I18nService');
      return false;
    }

    if (!isSupportedLanguage(languageCode)) {
      logger.warn(`Unsupported language: ${languageCode}`, 'I18nService');
      return false;
    }

    await i18n.changeLanguage(languageCode);
    await saveLanguageNative(languageCode as BayitLanguage);
    return true;
  } catch (error) {
    logger.error('Failed to set language', 'I18nService', error);
    return false;
  }
}

/**
 * Get current language
 */
export function getCurrentLanguage(): string {
  return i18n?.language || 'he'; // Default to Hebrew (Bayit+ default)
}

/**
 * Check if language is RTL (Right-to-Left)
 */
export function isRTL(language?: string): boolean {
  const lang = language || getCurrentLanguage();
  return lang === 'he'; // Hebrew is RTL
}

/**
 * Get direction for current language
 */
export function getDirection(): 'ltr' | 'rtl' {
  return isRTL() ? 'rtl' : 'ltr';
}

/**
 * Supported languages in Bayit+
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', rtl: false },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', rtl: true },
  { code: 'es', name: 'Spanish', nativeName: 'Español', rtl: false },
  { code: 'zh', name: 'Chinese', nativeName: '中文', rtl: false },
  { code: 'fr', name: 'French', nativeName: 'Français', rtl: false },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', rtl: false },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', rtl: false },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', rtl: false },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', rtl: false },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', rtl: false },
];

/**
 * Check if language code is supported
 */
export function isSupportedLanguage(code: string): boolean {
  return SUPPORTED_LANGUAGES.some((lang) => lang.code === code);
}

/**
 * Get translation function (same as i18n.t)
 */
export function t(key: string, options?: Record<string, any>): string {
  if (!i18n) {
    logger.warn('i18n not initialized. Returning key as-is.', 'I18nService');
    return key;
  }
  return i18n.t(key, options) as string;
}

/**
 * Get i18n instance for advanced usage
 */
export function getI18n() {
  if (!i18n) {
    throw new Error('i18n not initialized. Call initializeI18n() first.');
  }
  return i18n;
}

/**
 * Translate with namespace
 */
export function tNS(namespace: string, key: string, options?: Record<string, any>): string {
  if (!i18n) {
    logger.warn('i18n not initialized. Returning key as-is.', 'I18nService');
    return `${namespace}:${key}`;
  }
  return i18n.t(`${namespace}:${key}`, options) as string;
}

/**
 * Check if translation key exists
 */
export function hasTranslation(key: string): boolean {
  if (!i18n) return false;
  return i18n.exists(key);
}

/**
 * Get all translations for a namespace
 */
export function getNamespaceTranslations(namespace: string): Record<string, any> {
  if (!i18n) return {};
  const resources = i18n.getResourceBundle(getCurrentLanguage(), namespace);
  return resources || {};
}

/**
 * Format date according to current language
 */
export function formatDate(date: Date, format?: 'short' | 'long'): string {
  const lang = getCurrentLanguage();
  const formatter = new Intl.DateTimeFormat(lang === 'he' ? 'he-IL' : lang === 'zh' ? 'zh-CN' : `${lang}-${lang.toUpperCase()}`, {
    year: 'numeric',
    month: format === 'long' ? 'long' : 'numeric',
    day: 'numeric',
  });
  return formatter.format(date);
}

/**
 * Format time according to current language
 */
export function formatTime(date: Date): string {
  const lang = getCurrentLanguage();
  const formatter = new Intl.DateTimeFormat(lang === 'he' ? 'he-IL' : lang === 'zh' ? 'zh-CN' : `${lang}-${lang.toUpperCase()}`, {
    hour: '2-digit',
    minute: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Format number according to current language
 */
export function formatNumber(num: number): string {
  const lang = getCurrentLanguage();
  const formatter = new Intl.NumberFormat(lang === 'he' ? 'he-IL' : lang === 'zh' ? 'zh-CN' : `${lang}-${lang.toUpperCase()}`);
  return formatter.format(num);
}

/**
 * Format currency according to current language
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  const lang = getCurrentLanguage();
  const formatter = new Intl.NumberFormat(lang === 'he' ? 'he-IL' : lang === 'zh' ? 'zh-CN' : `${lang}-${lang.toUpperCase()}`, {
    style: 'currency',
    currency,
  });
  return formatter.format(amount);
}

/**
 * Note: No default export. Use getI18n() after calling initializeI18n()
 * or use the exported utility functions (t, setLanguage, etc.)
 */
