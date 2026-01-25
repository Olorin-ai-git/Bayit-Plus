import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import shared translations (10 languages)
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

// Import portal-specific translations
import radioEn from './locales/en.json';

const resources = {
  en: { translation: sharedEn, radio: radioEn },
  he: { translation: sharedHe, radio: {} },
  es: { translation: sharedEs, radio: {} },
  zh: { translation: sharedZh, radio: {} },
  fr: { translation: sharedFr, radio: {} },
  it: { translation: sharedIt, radio: {} },
  hi: { translation: sharedHi, radio: {} },
  ta: { translation: sharedTa, radio: {} },
  bn: { translation: sharedBn, radio: {} },
  ja: { translation: sharedJa, radio: {} },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'radio',
    fallbackNS: 'translation',
    debug: process.env.NODE_ENV === 'development',
    interpolation: {
      escapeValue: true, // XSS protection enabled
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    }
  });

export default i18n;
