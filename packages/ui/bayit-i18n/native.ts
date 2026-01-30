/**
 * @bayit/i18n/native - React Native Platform Initialization
 *
 * Merges @olorin/shared-i18n (74 core keys) + @bayit/i18n (8 platform keys)
 * at runtime using AsyncStorage for persistence.
 *
 * Supports: iOS, Android, tvOS
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import olorinI18n from '@olorin/shared-i18n';
import { bayitResources, type BayitLanguage } from './index';

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
    return saved as BayitLanguage | null;
  } catch (error) {
    console.warn('Failed to load language preference:', error);
    return null;
  }
}

/**
 * Initialize Bayit+ i18n for React Native platforms
 *
 * Merges Olorin core translations + Bayit+ platform translations
 * into a single i18n instance with unified namespace.
 *
 * @returns Initialized i18next instance
 */
export async function initBayitI18nNative(): Promise<typeof i18n> {
  const olorinResources = olorinI18n.options.resources || {};

  // Merge Olorin core + Bayit+ resources
  const mergedResources: Record<string, any> = {};

  for (const lang of Object.keys(olorinResources)) {
    const olorinTranslation = olorinResources[lang]?.translation;
    const bayitTranslation = bayitResources[lang as BayitLanguage]?.bayit;

    mergedResources[lang] = {
      translation: {
        // 74 core keys from @olorin/shared-i18n
        ...(typeof olorinTranslation === 'object' && olorinTranslation !== null ? olorinTranslation : {}),
        // 8 platform keys from @bayit/i18n
        ...(typeof bayitTranslation === 'object' && bayitTranslation !== null ? bayitTranslation : {}),
      },
    };
  }

  // Determine initial language (AsyncStorage > Olorin default > 'he')
  const savedLanguage = await loadLanguageNative();
  const initialLanguage = savedLanguage || olorinI18n.language || 'he';

  await i18n.use(initReactI18next).init({
    resources: mergedResources,
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
