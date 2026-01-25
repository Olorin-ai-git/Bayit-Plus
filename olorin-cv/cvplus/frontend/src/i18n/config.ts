/**
 * i18n Configuration
 *
 * Configures internationalization with:
 * - Shared translations from @olorin/shared-i18n (10 languages)
 * - CVPlus-specific translations (en, he)
 * - Namespace-based structure (translation + cvplus)
 * - Language detection (browser, localStorage)
 * - RTL support for Hebrew, Arabic
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import shared translations (10 languages) from shared-i18n package
import sharedEn from '@olorin/shared-i18n/locales/en.json';
import sharedHe from '@olorin/shared-i18n/locales/he.json';
import sharedEs from '@olorin/shared-i18n/locales/es.json';
import sharedZh from '@olorin/shared-i18n/locales/zh.json';
import sharedFr from '@olorin/shared-i18n/locales/fr.json';
import sharedIt from '@olorin/shared-i18n/locales/it.json';
import sharedHi from '@olorin/shared-i18n/locales/hi.json';
import sharedTa from '@olorin/shared-i18n/locales/ta.json';
import sharedBn from '@olorin/shared-i18n/locales/bn.json';
import sharedJa from '@olorin/shared-i18n/locales/ja.json';

// Import CVPlus-specific translations
import cvplusEn from './locales/en.json';
import cvplusHe from './locales/he.json';

const resources = {
  en: { translation: sharedEn, cvplus: cvplusEn },
  he: { translation: sharedHe, cvplus: cvplusHe },
  es: { translation: sharedEs, cvplus: {} },
  zh: { translation: sharedZh, cvplus: {} },
  fr: { translation: sharedFr, cvplus: {} },
  it: { translation: sharedIt, cvplus: {} },
  hi: { translation: sharedHi, cvplus: {} },
  ta: { translation: sharedTa, cvplus: {} },
  bn: { translation: sharedBn, cvplus: {} },
  ja: { translation: sharedJa, cvplus: {} },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'cvplus',
    fallbackNS: 'translation',
    debug: import.meta.env.DEV,

    interpolation: {
      escapeValue: false, // React already escapes
    },

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
