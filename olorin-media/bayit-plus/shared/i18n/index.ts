/**
 * Platform-agnostic i18n initialization for @olorin/i18n.
 *
 * This module provides the core i18next initialization with all supported languages.
 * Platform-specific initialization should use:
 *
 * - Web: import { initWebI18n } from '@olorin/i18n/web'
 * - React Native: import { initNativeI18n } from '@olorin/i18n/native'
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import he from './locales/he.json';
import en from './locales/en.json';
import es from './locales/es.json';
import zh from './locales/zh.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import hi from './locales/hi.json';
import ta from './locales/ta.json';
import bn from './locales/bn.json';
import ja from './locales/ja.json';

// Web-specific search translations are now merged into main translation files

import type { LanguageCode, LanguageInfo } from './types';
import { getInitialLanguageWeb } from './web';

// Language metadata matching Olorin ecosystem standards
export const languages: LanguageInfo[] = [
  { code: 'he', name: 'עברית', flag: '🇮🇱', rtl: true },
  { code: 'en', name: 'English', flag: '🇺🇸', rtl: false },
  { code: 'es', name: 'Español', flag: '🇪🇸', rtl: false },
  { code: 'zh', name: '中文', flag: '🇨🇳', rtl: false },
  { code: 'fr', name: 'Français', flag: '🇫🇷', rtl: false },
  { code: 'it', name: 'Italiano', flag: '🇮🇹', rtl: false },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳', rtl: false },
  { code: 'ta', name: 'தமிழ्', flag: '🇮🇳', rtl: false },
  { code: 'bn', name: 'বাংলা', flag: '🇧🇩', rtl: false },
  { code: 'ja', name: '日本語', flag: '🇯🇵', rtl: false },
];

// Translation resources for all supported languages
const resources = {
  he: { translation: he },
  en: { translation: en },
  es: { translation: es },
  zh: { translation: zh },
  fr: { translation: fr },
  it: { translation: it },
  hi: { translation: hi },
  ta: { translation: ta },
  bn: { translation: bn },
  ja: { translation: ja },
} as const;

// Initialize i18next with sensible defaults
// Note: Language is set to 'he' by default, platform-specific init will update it
const initialLang = getInitialLanguageWeb();
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLang,
    fallbackLng: 'he',
    ns: ['translation'],
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
    // Use v4 format (default in i18next v24+)
    compatibilityJSON: 'v4',
  });

/**
 * Load saved language preference from storage.
 * This function is platform-aware and works on both web and native.
 *
 * For web: uses localStorage
 * For React Native: uses AsyncStorage (requires platform-specific init)
 *
 * @deprecated Use initWebI18n() for web or initNativeI18n() for React Native
 */
export const loadSavedLanguage = async (): Promise<void> => {
  try {
    let savedLang: string | null = null;

    // Try web first
    if (typeof window !== 'undefined' && window.localStorage) {
      savedLang = window.localStorage.getItem('@olorin_language');
    } else {
      // Try AsyncStorage for React Native
      try {
        const AsyncStorage = (await import(/* webpackIgnore: true */ '@react-native-async-storage/async-storage')).default;
        savedLang = await AsyncStorage.getItem('@olorin_language');
      } catch {
        // AsyncStorage not available
      }
    }

    if (savedLang) {
      const validLanguages: LanguageCode[] = ['he', 'en', 'es', 'zh', 'fr', 'it', 'hi', 'ta', 'bn', 'ja'];
      if (validLanguages.includes(savedLang as LanguageCode)) {
        await i18n.changeLanguage(savedLang);
      }
    }
  } catch (error) {
    console.warn('Error loading saved language:', error);
  }
};

/**
 * Save language preference to storage.
 * This function is platform-aware and works on both web and native.
 *
 * For web: uses localStorage
 * For React Native: uses AsyncStorage (requires platform-specific init)
 *
 * @deprecated Use saveLanguageWeb() for web or saveLanguageNative() for React Native
 */
export const saveLanguage = async (lang: LanguageCode): Promise<void> => {
  try {
    // Try web first
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('@olorin_language', lang);
    } else {
      // Try AsyncStorage for React Native
      try {
        const AsyncStorage = (await import(/* webpackIgnore: true */ '@react-native-async-storage/async-storage')).default;
        await AsyncStorage.setItem('@olorin_language', lang);
      } catch {
        // AsyncStorage not available
      }
    }

    await i18n.changeLanguage(lang);
  } catch (error) {
    console.warn('Error saving language:', error);
  }
};

/**
 * Get current language information.
 * @returns Language info object with code, name, flag, RTL status
 */
export const getCurrentLanguage = (): LanguageInfo => {
  const current = languages.find(l => l.code === (i18n.language as LanguageCode));
  return current || languages[0];
};

/**
 * Check if current language is RTL.
 * @returns True if current language is right-to-left
 */
export const isRTL = (): boolean => {
  return getCurrentLanguage().rtl;
};

export default i18n;
