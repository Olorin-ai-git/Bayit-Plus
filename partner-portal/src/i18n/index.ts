/**
 * B2B Partner Portal i18n Configuration
 *
 * Standalone i18n configuration for the B2B Partner Portal.
 * Uses environment configuration for default language.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import partnerEn from './locales/en.json';
import partnerHe from './locales/he.json';
import partnerEs from './locales/es.json';
import { getB2BConfig } from '../config/env';

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  rtl: boolean;
}

export const languages: Language[] = [
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', rtl: true },
  { code: 'en', name: 'English', nativeName: 'English', rtl: false },
  { code: 'es', name: 'Spanish', nativeName: 'Español', rtl: false },
];

const LANGUAGE_KEY = '@bayit_partner_language';

function getInitialLanguage(): string {
  // First, check if user has a saved preference
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(LANGUAGE_KEY);
      if (saved && ['he', 'en', 'es'].includes(saved)) {
        return saved;
      }
    }
  } catch {
    // Ignore localStorage errors
  }
  // Fall back to configured default language
  return getB2BConfig().defaultLanguage;
}

export function initializeI18n() {
  const initialLanguage = getInitialLanguage();

  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: partnerEn },
      he: { translation: partnerHe },
      es: { translation: partnerEs },
    },
    lng: initialLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

  return i18n;
}

export function changeLanguage(lang: string) {
  if (['he', 'en', 'es'].includes(lang)) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(LANGUAGE_KEY, lang);
      }
    } catch {
      // Ignore errors
    }
    i18n.changeLanguage(lang);
  }
}

export function getCurrentLanguage() {
  return languages.find((l) => l.code === i18n.language) || languages[0];
}

export function isRTL() {
  return getCurrentLanguage().rtl;
}

export { i18n };
