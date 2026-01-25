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

// Streaming-specific translations (minimal - most content uses portal namespace)
const streamingEn = {
  features: {
    mediaEnrichment: {
      title: 'Media Enrichment',
      description: 'AI-powered metadata enhancement and content tagging',
    },
  },
};

const streamingHe = {
  features: {
    mediaEnrichment: {
      title: 'העשרת מדיה',
      description: 'שיפור מטא-נתונים ותיוג תוכן מונע AI',
    },
  },
};

const resources = {
  en: { translation: sharedEn, streaming: streamingEn, portal: sharedEn.portal || {} },
  he: { translation: sharedHe, streaming: streamingHe, portal: sharedHe.portal || {} },
  es: { translation: sharedEs, streaming: {}, portal: sharedEs.portal || {} },
  zh: { translation: sharedZh, streaming: {}, portal: sharedZh.portal || {} },
  fr: { translation: sharedFr, streaming: {}, portal: sharedFr.portal || {} },
  it: { translation: sharedIt, streaming: {}, portal: sharedIt.portal || {} },
  hi: { translation: sharedHi, streaming: {}, portal: sharedHi.portal || {} },
  ta: { translation: sharedTa, streaming: {}, portal: sharedTa.portal || {} },
  bn: { translation: sharedBn, streaming: {}, portal: sharedBn.portal || {} },
  ja: { translation: sharedJa, streaming: {}, portal: sharedJa.portal || {} },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'streaming',
    fallbackNS: ['portal', 'translation'],
    debug: process.env.NODE_ENV === 'development',
    interpolation: {
      escapeValue: true, // XSS protection enabled
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

export default i18n;
