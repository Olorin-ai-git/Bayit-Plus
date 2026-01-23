import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import he from './locales/he.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      he: { translation: he },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes JSX, set to false per react-i18next docs
      // SECURITY WARNING:
      // - React escapes JSX by default, so escapeValue: false is correct
      // - NEVER interpolate unsanitized user input in translation keys
    },
    detection: {
      order: ['querystring', 'localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
