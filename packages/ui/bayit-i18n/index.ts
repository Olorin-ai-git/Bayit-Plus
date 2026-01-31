/**
 * @bayit/i18n - Bayit+ Platform-Specific Internationalization
 *
 * Contains 8 Bayit+-specific translation namespaces:
 * - auth: Authentication flows
 * - channelChat: Live TV channel chat
 * - email: Email templates and communication
 * - greeting: Time-based greetings and welcome messages
 * - location: Geographic and location-based content
 * - payment: Payment flows and billing
 * - portal: Partner portal B2B interface
 * - uploads: Content upload and management
 *
 * Usage:
 *   import { getBayitTranslations, bayitResources } from '@bayit/i18n';
 *   import { initBayitI18nWeb } from '@bayit/i18n/web';
 *   import { initBayitI18nNative } from '@bayit/i18n/native';
 */

import enTranslations from './locales/en.json';
import heTranslations from './locales/he.json';
import esTranslations from './locales/es.json';
import zhTranslations from './locales/zh.json';
import frTranslations from './locales/fr.json';
import itTranslations from './locales/it.json';
import hiTranslations from './locales/hi.json';
import taTranslations from './locales/ta.json';
import bnTranslations from './locales/bn.json';
import jaTranslations from './locales/ja.json';

export type BayitLanguage = 'en' | 'he' | 'es' | 'zh' | 'fr' | 'it' | 'hi' | 'ta' | 'bn' | 'ja';

export type BayitTranslations = Record<string, unknown>;

/**
 * Get Bayit+-specific translations for a given language
 */
export function getBayitTranslations(language: BayitLanguage): BayitTranslations {
  const translations: Record<BayitLanguage, BayitTranslations> = {
    en: enTranslations,
    he: heTranslations,
    es: esTranslations,
    zh: zhTranslations,
    fr: frTranslations,
    it: itTranslations,
    hi: hiTranslations,
    ta: taTranslations,
    bn: bnTranslations,
    ja: jaTranslations,
  };

  return translations[language] || translations.en;
}

/**
 * Bayit+ resources in i18next format
 */
export const bayitResources: Record<BayitLanguage, { bayit: Record<string, unknown> }> = {
  en: { bayit: enTranslations },
  he: { bayit: heTranslations },
  es: { bayit: esTranslations },
  zh: { bayit: zhTranslations },
  fr: { bayit: frTranslations },
  it: { bayit: itTranslations },
  hi: { bayit: hiTranslations },
  ta: { bayit: taTranslations },
  bn: { bayit: bnTranslations },
  ja: { bayit: jaTranslations },
};

/**
 * List of supported languages
 */
export const supportedLanguages: BayitLanguage[] = [
  'en',
  'he',
  'es',
  'zh',
  'fr',
  'it',
  'hi',
  'ta',
  'bn',
  'ja',
];

/**
 * Language metadata
 */
export const languageNames: Record<BayitLanguage, { native: string; english: string; rtl: boolean }> = {
  en: { native: 'English', english: 'English', rtl: false },
  he: { native: 'עברית', english: 'Hebrew', rtl: true },
  es: { native: 'Español', english: 'Spanish', rtl: false },
  zh: { native: '中文', english: 'Chinese', rtl: false },
  fr: { native: 'Français', english: 'French', rtl: false },
  it: { native: 'Italiano', english: 'Italian', rtl: false },
  hi: { native: 'हिन्दी', english: 'Hindi', rtl: false },
  ta: { native: 'தமிழ்', english: 'Tamil', rtl: false },
  bn: { native: 'বাংলা', english: 'Bengali', rtl: false },
  ja: { native: '日本語', english: 'Japanese', rtl: false },
};

/**
 * Backward compatibility exports from old @bayit/shared-i18n
 */

export type LanguageCode = BayitLanguage;

export interface LanguageInfo {
  code: BayitLanguage;
  name: string;
  flag: string;
  rtl: boolean;
}

export const languages: LanguageInfo[] = [
  { code: 'he', name: 'עברית', flag: '🇮🇱', rtl: true },
  { code: 'en', name: 'English', flag: '🇺🇸', rtl: false },
  { code: 'es', name: 'Español', flag: '🇪🇸', rtl: false },
  { code: 'zh', name: '中文', flag: '🇨🇳', rtl: false },
  { code: 'fr', name: 'Français', flag: '🇫🇷', rtl: false },
  { code: 'it', name: 'Italiano', flag: '🇮🇹', rtl: false },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳', rtl: false },
  { code: 'ta', name: 'தமிழ்', flag: '🇮🇳', rtl: false },
  { code: 'bn', name: 'বাংলা', flag: '🇧🇩', rtl: false },
  { code: 'ja', name: '日本語', flag: '🇯🇵', rtl: false },
];
