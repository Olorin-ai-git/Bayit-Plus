import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import he from './locales/he.json';

const resources = {
  en: { translation: en },
  he: { translation: he },
};

/**
 * Initialize i18n configuration
 * Factory function to prevent race conditions in multi-app scenarios
 * @returns Initialized i18n instance
 */
export const initI18n = () => {
  if (i18n.isInitialized) return i18n; // Idempotency guard

  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: true, // ✅ XSS protection enabled
      },
    });

  return i18n;
};

export default i18n;
