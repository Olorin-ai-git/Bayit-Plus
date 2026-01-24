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
import omenEn from './locales/omen.en.json';
import omenHe from './locales/omen.he.json';

const resources = {
  en: { translation: sharedEn, omen: omenEn },
  he: { translation: sharedHe, omen: omenHe },
  es: { translation: sharedEs, omen: {} },
  zh: { translation: sharedZh, omen: {} },
  fr: { translation: sharedFr, omen: {} },
  it: { translation: sharedIt, omen: {} },
  hi: { translation: sharedHi, omen: {} },
  ta: { translation: sharedTa, omen: {} },
  bn: { translation: sharedBn, omen: {} },
  ja: { translation: sharedJa, omen: {} },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'omen',
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
