/**
 * @bayit/i18n/native - React Native Platform Initialization
 *
 * Bayit+ unified i18n with all translations in a single source.
 * Uses AsyncStorage for language persistence.
 *
 * Supports: iOS, Android, tvOS
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { bayitResources, supportedLanguages, type BayitLanguage } from './index';

const LANGUAGE_KEY = '@bayit_language';

/**
 * Save language preference to AsyncStorage
 */
export async function saveLanguageNative(language: BayitLanguage): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  } catch (error) {
    console.warn('Failed to save language preference:', error);
  }
}

/**
 * Load language preference from AsyncStorage
 */
export async function loadLanguageNative(): Promise<BayitLanguage | null> {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (saved && supportedLanguages.includes(saved as BayitLanguage)) {
      return saved as BayitLanguage;
    }
    return null;
  } catch (error) {
    console.warn('Failed to load language preference:', error);
    return null;
  }
}

/**
 * Initialize Bayit+ i18n for React Native platforms
 *
 * @returns Initialized i18next instance
 */
export async function initBayitI18nNative(): Promise<typeof i18n> {
  // Build resources from bayit-i18n locales (single source of truth)
  const resources: Record<string, { translation: Record<string, unknown> }> = {};

  for (const lang of supportedLanguages) {
    const translations = bayitResources[lang]?.bayit;
    if (translations) {
      resources[lang] = {
        translation: translations as Record<string, unknown>,
      };
    }
  }

  // Determine initial language (AsyncStorage > 'he')
  const savedLanguage = await loadLanguageNative();
  const initialLanguage = savedLanguage || 'he';

  await i18n.use(initReactI18next).init({
    resources,
    lng: initialLanguage,
    fallbackLng: 'he',
    compatibilityJSON: 'v4', // i18next v25+ uses v4 format
    interpolation: {
      escapeValue: false, // React Native already escapes
    },
    react: {
      useSuspense: false,
    },
  });

  // Listen for language changes and persist
  i18n.on('languageChanged', (lng: string) => {
    saveLanguageNative(lng as BayitLanguage);
  });

  return i18n;
}
