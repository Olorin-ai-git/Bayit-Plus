/**
 * @bayit/i18n/web - Web Platform Initialization
 *
 * Merges @olorin/shared-i18n (74 core keys) + @bayit/i18n (8 platform keys)
 * at runtime using localStorage for persistence.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import olorinI18n from '@olorin/shared-i18n';
import { bayitResources, type BayitLanguage } from './index';

const LANGUAGE_KEY = 'bayit_language';

/**
 * Save language preference to localStorage
 */
export function saveLanguageWeb(language: BayitLanguage): void {
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
  } catch (error) {
    console.warn('Failed to save language preference:', error);
  }
}

/**
 * Load language preference from localStorage
 */
export function loadLanguageWeb(): BayitLanguage | null {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    return saved as BayitLanguage | null;
  } catch (error) {
    console.warn('Failed to load language preference:', error);
    return null;
  }
}

/**
 * Initialize Bayit+ i18n for web platform
 *
 * Merges Olorin core translations + Bayit+ platform translations
 * into a single i18n instance with unified namespace.
 *
 * @returns Initialized i18next instance
 */
export async function initBayitI18nWeb(): Promise<typeof i18n> {
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

  // Determine initial language (localStorage > Olorin default > 'he')
  const savedLanguage = loadLanguageWeb();
  const initialLanguage = savedLanguage || olorinI18n.language || 'he';

  await i18n.use(initReactI18next).init({
    resources: mergedResources,
    lng: initialLanguage,
    fallbackLng: 'he',
    interpolation: {
      escapeValue: false, // React already escapes
    },
    react: {
      useSuspense: false,
    },
  });

  // Listen for language changes and persist
  i18n.on('languageChanged', (lng: string) => {
    saveLanguageWeb(lng as BayitLanguage);
    document.documentElement.lang = lng;
    document.documentElement.dir = lng === 'he' ? 'rtl' : 'ltr';
  });

  // Set initial dir attribute
  document.documentElement.dir = initialLanguage === 'he' ? 'rtl' : 'ltr';

  return i18n;
}

/**
 * Check if current language is RTL
 * @returns True if current language uses right-to-left layout
 */
export function isRTL(): boolean {
  return i18n.language === 'he';
}
