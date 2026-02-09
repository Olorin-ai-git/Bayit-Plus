/**
 * @bayit/i18n/web - Web Platform Initialization
 *
 * Bayit+ unified i18n with all translations in a single source.
 * Uses localStorage for language persistence.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { bayitResources, supportedLanguages, type BayitLanguage } from './index';

/** Package-scoped logger for i18n warnings */
const i18nLogger = {
  warn: (message: string, data?: unknown) => {
    if (process.env.NODE_ENV !== 'production' && typeof console !== 'undefined') {
      console.warn(`[bayit-i18n] ${message}`, data ?? ''); // eslint-disable-line no-console
    }
  },
};

const LANGUAGE_KEY = 'bayit_language';

/**
 * Save language preference to localStorage
 */
export function saveLanguageWeb(language: BayitLanguage): void {
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
  } catch (error) {
    i18nLogger.warn('Failed to save language preference', error);
  }
}

/**
 * Load language preference from localStorage
 */
export function loadLanguageWeb(): BayitLanguage | null {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (saved && supportedLanguages.includes(saved as BayitLanguage)) {
      return saved as BayitLanguage;
    }
    return null;
  } catch (error) {
    i18nLogger.warn('Failed to load language preference', error);
    return null;
  }
}

/**
 * Initialize Bayit+ i18n for web platform
 *
 * @returns Initialized i18next instance
 */
export async function initBayitI18nWeb(): Promise<typeof i18n> {
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

  // Determine initial language (localStorage > 'en')
  const savedLanguage = loadLanguageWeb();
  const initialLanguage = savedLanguage || 'en';

  await i18n.use(initReactI18next).init({
    resources,
    lng: initialLanguage,
    fallbackLng: 'en',
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
  document.documentElement.lang = initialLanguage;
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
