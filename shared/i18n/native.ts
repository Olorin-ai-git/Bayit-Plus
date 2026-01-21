/**
 * React Native-specific i18n utilities using AsyncStorage and I18nManager for RTL support.
 *
 * Use this module in React Native applications (Mobile, TV, tvOS):
 *
 *   import { initNativeI18n, saveLanguageNative } from '@olorin/i18n/native';
 *   import i18n from '@olorin/i18n';
 *   import { useTranslation } from 'react-i18next';
 *
 *   // In your app initialization
 *   useEffect(() => {
 *     initNativeI18n();
 *   }, []);
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';

import type { LanguageCode } from './types';

const LANGUAGE_KEY = '@olorin_language';

/**
 * Get initial language for React Native.
 * Loads from AsyncStorage synchronously is not possible,
 * so we default to Hebrew and load async in useEffect.
 */
export function getInitialLanguageNative(): LanguageCode {
  return 'he';
}

/**
 * Save language preference to AsyncStorage.
 * @param langCode Language code to save
 */
export async function saveLanguageNative(langCode: LanguageCode): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, langCode);
    // Update i18n
    const i18n = (await import('./index')).default;
    await i18n.changeLanguage(langCode);
    // Update native RTL
    updateNativeRTL(langCode);
  } catch (error) {
    console.warn('Failed to save language:', error);
  }
}

/**
 * Load saved language preference from AsyncStorage.
 * @returns Saved language code or Hebrew if none found
 */
export async function loadSavedLanguageNative(): Promise<LanguageCode> {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
    const validLanguages: LanguageCode[] = ['he', 'en', 'es', 'zh', 'fr', 'it', 'hi', 'ta', 'bn', 'ja'];
    if (saved && validLanguages.includes(saved as LanguageCode)) {
      return saved as LanguageCode;
    }
  } catch (error) {
    console.warn('Failed to load saved language:', error);
  }
  return 'he';
}

/**
 * Initialize React Native-specific i18n configuration.
 *
 * Call this function in your app's App.tsx:
 *
 *   useEffect(() => {
 *     initNativeI18n();
 *   }, []);
 */
export async function initNativeI18n(): Promise<void> {
  try {
    const savedLang = await loadSavedLanguageNative();
    const i18n = (await import('./index')).default;

    if (savedLang) {
      await i18n.changeLanguage(savedLang);
      updateNativeRTL(savedLang);
    }

    // Listen for language changes
    i18n.on('languageChanged', (lng: LanguageCode) => {
      updateNativeRTL(lng);
    });
  } catch (error) {
    console.warn('Failed to initialize native i18n:', error);
  }
}

/**
 * Update React Native's I18nManager for RTL layout.
 * This forces the entire app to use RTL or LTR layout mode.
 * @param langCode Language code to set RTL for
 */
function updateNativeRTL(langCode: LanguageCode): void {
  try {
    const isRTL = langCode === 'he';
    I18nManager.forceRTL(isRTL);

    // Note: On iOS, changing I18nManager.forceRTL requires app restart
    // On Android, it takes effect immediately
    if (isRTL && !I18nManager.isRTL) {
      // Android case - layout direction changed
      I18nManager.forceRTL(true);
    } else if (!isRTL && I18nManager.isRTL) {
      // Android case - layout direction changed
      I18nManager.forceRTL(false);
    }
  } catch (error) {
    console.warn('Failed to update native RTL:', error);
  }
}

/**
 * Get storage key for language preference.
 * Useful for testing or direct AsyncStorage access.
 */
export function getLanguageStorageKeyNative(): string {
  return LANGUAGE_KEY;
}

/**
 * Clear all saved i18n preferences.
 * Useful for logout or reset scenarios.
 */
export async function clearI18nPreferences(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LANGUAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear i18n preferences:', error);
  }
}

/**
 * Check if current device is using RTL.
 */
export function isNativeRTL(): boolean {
  return I18nManager.isRTL;
}
