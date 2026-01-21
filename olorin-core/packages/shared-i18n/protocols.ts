/**
 * Protocol definitions for i18n services following Olorin design patterns.
 *
 * These protocols define the interfaces for i18n service implementations
 * across different platforms (Web, React Native, etc.).
 */

import type { LanguageCode, LanguageInfo } from './types';

/**
 * Language selector protocol for changing and getting current language.
 */
export interface LanguageSelector {
  /**
   * Get current language code.
   */
  getCurrentLanguage(): LanguageCode;

  /**
   * Change the current language.
   * @param langCode Language code to switch to
   */
  changeLanguage(langCode: LanguageCode): Promise<void>;

  /**
   * Load saved language preference from storage.
   */
  loadSavedLanguage(): Promise<void>;

  /**
   * Save language preference to storage.
   * @param langCode Language code to save
   */
  saveLanguage(langCode: LanguageCode): Promise<void>;
}

/**
 * Translation provider protocol for getting translations.
 */
export interface TranslationProvider {
  /**
   * Get translation for a key.
   * @param key Translation key using dot notation
   * @param defaultValue Fallback value if key not found
   */
  getTranslation(key: string, defaultValue?: string): string;

  /**
   * Get all languages.
   */
  getLanguages(): LanguageInfo[];

  /**
   * Get current language info.
   */
  getCurrentLanguageInfo(): LanguageInfo;

  /**
   * Check if current language is RTL.
   */
  isRTL(): boolean;

  /**
   * Check if specific language is RTL.
   * @param langCode Language code to check
   */
  isLanguageRTL(langCode: LanguageCode): boolean;
}

/**
 * I18n service combining language selection and translation provision.
 */
export interface I18nService extends LanguageSelector, TranslationProvider {
  /**
   * Language list.
   */
  languages: LanguageInfo[];
}
