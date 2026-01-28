/**
 * Bayit+ Internationalization (i18n) Service
 * Wraps @olorin/shared-i18n for mobile app integration
 * Supports: Hebrew (RTL), English, Spanish, Chinese, French, Italian, Hindi, Tamil, Bengali, Japanese
 */

import i18n from '@olorin/shared-i18n';
import type { TFunction } from 'i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Initialize i18n for React Native mobile app
 * Loads user's preferred language from AsyncStorage
 * Falls back to device locale, then English
 */
export async function initializeI18n(): Promise<void> {
  try {
    // Load saved language preference
    const savedLanguage = await AsyncStorage.getItem('bayit_language');

    if (savedLanguage && isSupportedLanguage(savedLanguage)) {
      await i18n.changeLanguage(savedLanguage);
    } else {
      // Default to English if no preference saved
      await i18n.changeLanguage('en');
    }
  } catch (error) {
    console.error('Failed to initialize i18n:', error);
    // Gracefully fallback to English
    await i18n.changeLanguage('en');
  }
}

/**
 * Change app language and persist preference
 */
export async function setLanguage(languageCode: string): Promise<boolean> {
  try {
    if (!isSupportedLanguage(languageCode)) {
      console.warn(`Unsupported language: ${languageCode}`);
      return false;
    }

    await i18n.changeLanguage(languageCode);
    await AsyncStorage.setItem('bayit_language', languageCode);
    return true;
  } catch (error) {
    console.error('Failed to set language:', error);
    return false;
  }
}

/**
 * Get current language
 */
export function getCurrentLanguage(): string {
  return i18n.language || 'en';
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
  return i18n.t(key, options) as string;
}

/**
 * Get i18n instance for advanced usage
 */
export function getI18n() {
  return i18n;
}

/**
 * Translate with namespace
 */
export function tNS(namespace: string, key: string, options?: Record<string, any>): string {
  return i18n.t(`${namespace}:${key}`, options) as string;
}

/**
 * Check if translation key exists
 */
export function hasTranslation(key: string): boolean {
  return i18n.exists(key);
}

/**
 * Get all translations for a namespace
 */
export function getNamespaceTranslations(namespace: string): Record<string, any> {
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

export default i18n;
