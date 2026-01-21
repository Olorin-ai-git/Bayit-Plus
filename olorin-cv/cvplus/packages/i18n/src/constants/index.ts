/**
 * @fileoverview Core constants for CVPlus i18n system
  */

import type { 
  SupportedLanguage, 
  LanguageConfigMap, 
  TranslationNamespace,
  PluralizationRule 
} from '../types';

// Core Language Configuration
export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  'en', 'es', 'fr', 'de', 'pt', 'ja', 'zh', 'ar', 'he', 'fa', 'ur', 'dv', 'ru', 'nl'
];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';
export const FALLBACK_LANGUAGE: SupportedLanguage = 'en';

export const LANGUAGE_CONFIG: LanguageConfigMap = {
  en: {
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    dir: 'ltr',
    locale: 'en-US',
    countryCode: 'US',
    dateFormat: 'MM/dd/yyyy',
    currency: 'USD',
    pluralRules: ['one', 'other'],
    rtlSupport: false,
  },
  es: {
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    dir: 'ltr',
    locale: 'es-ES',
    countryCode: 'ES',
    dateFormat: 'dd/MM/yyyy',
    currency: 'EUR',
    pluralRules: ['one', 'other'],
    rtlSupport: false,
  },
  fr: {
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    dir: 'ltr',
    locale: 'fr-FR',
    countryCode: 'FR',
    dateFormat: 'dd/MM/yyyy',
    currency: 'EUR',
    pluralRules: ['one', 'many', 'other'],
    rtlSupport: false,
  },
  de: {
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    dir: 'ltr',
    locale: 'de-DE',
    countryCode: 'DE',
    dateFormat: 'dd.MM.yyyy',
    currency: 'EUR',
    pluralRules: ['one', 'other'],
    rtlSupport: false,
  },
  pt: {
    name: 'Portuguese',
    nativeName: 'Português',
    flag: '🇧🇷',
    dir: 'ltr',
    locale: 'pt-BR',
    countryCode: 'BR',
    dateFormat: 'dd/MM/yyyy',
    currency: 'BRL',
    pluralRules: ['one', 'other'],
    rtlSupport: false,
  },
  ja: {
    name: 'Japanese',
    nativeName: '日本語',
    flag: '🇯🇵',
    dir: 'ltr',
    locale: 'ja-JP',
    countryCode: 'JP',
    dateFormat: 'yyyy/MM/dd',
    currency: 'JPY',
    pluralRules: ['other'],
    rtlSupport: false,
  },
  zh: {
    name: 'Chinese (Simplified)',
    nativeName: '简体中文',
    flag: '🇨🇳',
    dir: 'ltr',
    locale: 'zh-CN',
    countryCode: 'CN',
    dateFormat: 'yyyy/MM/dd',
    currency: 'CNY',
    pluralRules: ['other'],
    rtlSupport: false,
  },
  ar: {
    name: 'Arabic',
    nativeName: 'العربية',
    flag: '🇸🇦',
    dir: 'rtl',
    locale: 'ar-SA',
    countryCode: 'SA',
    dateFormat: 'dd/MM/yyyy',
    currency: 'SAR',
    pluralRules: ['zero', 'one', 'two', 'few', 'many', 'other'],
    rtlSupport: true,
  },
  he: {
    name: 'Hebrew',
    nativeName: 'עברית',
    flag: '🇮🇱',
    dir: 'rtl',
    locale: 'he-IL',
    countryCode: 'IL',
    dateFormat: 'dd/MM/yyyy',
    currency: 'ILS',
    pluralRules: ['one', 'two', 'many', 'other'],
    rtlSupport: true,
  },
  fa: {
    name: 'Persian',
    nativeName: 'فارسی',
    flag: '🇮🇷',
    dir: 'rtl',
    locale: 'fa-IR',
    countryCode: 'IR',
    dateFormat: 'yyyy/MM/dd',
    currency: 'IRR',
    pluralRules: ['one', 'other'],
    rtlSupport: true,
  },
  ur: {
    name: 'Urdu',
    nativeName: 'اردو',
    flag: '🇵🇰',
    dir: 'rtl',
    locale: 'ur-PK',
    countryCode: 'PK',
    dateFormat: 'dd/MM/yyyy',
    currency: 'PKR',
    pluralRules: ['one', 'other'],
    rtlSupport: true,
  },
  dv: {
    name: 'Divehi',
    nativeName: 'ދިވެހި',
    flag: '🇲🇻',
    dir: 'rtl',
    locale: 'dv-MV',
    countryCode: 'MV',
    dateFormat: 'dd/MM/yyyy',
    currency: 'MVR',
    pluralRules: ['one', 'other'],
    rtlSupport: true,
  },
  ru: {
    name: 'Russian',
    nativeName: 'Русский',
    flag: '🇷🇺',
    dir: 'ltr',
    locale: 'ru-RU',
    countryCode: 'RU',
    dateFormat: 'dd.MM.yyyy',
    currency: 'RUB',
    pluralRules: ['one', 'few', 'many', 'other'],
    rtlSupport: false,
  },
  nl: {
    name: 'Dutch',
    nativeName: 'Nederlands',
    flag: '🇳🇱',
    dir: 'ltr',
    locale: 'nl-NL',
    countryCode: 'NL',
    dateFormat: 'dd-MM-yyyy',
    currency: 'EUR',
    pluralRules: ['one', 'other'],
    rtlSupport: false,
  },
} as const;

// Translation Namespaces
export const TRANSLATION_NAMESPACES: TranslationNamespace[] = [
  'common',
  'cv',
  'features', 
  'forms',
  'premium',
  'errors',
  'success',
  'navigation',
  'auth',
  'onboarding',
  'dashboard',
  'settings',
  'templates',
  'analytics',
  'billing',
  'support',
  'roles',
  'skills',
  'industries',
  'validation'
];

export const DEFAULT_NAMESPACE: TranslationNamespace = 'common';

// RTL Languages  
export const RTL_LANGUAGES: SupportedLanguage[] = ['ar', 'he', 'fa', 'ur', 'dv'];

// Pluralization Rules
export const PLURALIZATION_RULES: Record<SupportedLanguage, PluralizationRule> = {
  en: {
    language: 'en',
    rule: (count: number) => count === 1 ? 'one' : 'other'
  },
  es: {
    language: 'es', 
    rule: (count: number) => count === 1 ? 'one' : 'other'
  },
  fr: {
    language: 'fr',
    rule: (count: number) => {
      if (count === 0 || count === 1) return 'one';
      if (count >= 1000000) return 'many';
      return 'other';
    }
  },
  de: {
    language: 'de',
    rule: (count: number) => count === 1 ? 'one' : 'other'
  },
  pt: {
    language: 'pt',
    rule: (count: number) => count === 1 ? 'one' : 'other'
  },
  ja: {
    language: 'ja',
    rule: () => 'other'
  },
  zh: {
    language: 'zh',
    rule: () => 'other'
  },
  ar: {
    language: 'ar',
    rule: (count: number) => {
      if (count === 0) return 'zero';
      if (count === 1) return 'one';
      if (count === 2) return 'two';
      if (count >= 3 && count <= 10) return 'few';
      if (count >= 11 && count <= 99) return 'many';
      return 'other';
    }
  },
  he: {
    language: 'he',
    rule: (count: number) => {
      if (count === 1) return 'one';
      if (count === 2) return 'two';
      if (count > 10 && count < 20) return 'many';
      return 'other';
    }
  },
  fa: {
    language: 'fa',
    rule: (count: number) => count === 1 ? 'one' : 'other'
  },
  ur: {
    language: 'ur',
    rule: (count: number) => count === 1 ? 'one' : 'other'
  },
  dv: {
    language: 'dv',
    rule: (count: number) => count === 1 ? 'one' : 'other'
  },
  ru: {
    language: 'ru',
    rule: (count: number) => {
      const lastDigit = count % 10;
      const lastTwoDigits = count % 100;
      
      if (lastDigit === 1 && lastTwoDigits !== 11) return 'one';
      if (lastDigit >= 2 && lastDigit <= 4 && !(lastTwoDigits >= 12 && lastTwoDigits <= 14)) return 'few';
      if (lastDigit === 0 || (lastDigit >= 5 && lastDigit <= 9) || (lastTwoDigits >= 11 && lastTwoDigits <= 14)) return 'many';
      return 'other';
    }
  },
  nl: {
    language: 'nl',
    rule: (count: number) => count === 1 ? 'one' : 'other'
  }
};

// Professional Domains
export const PROFESSIONAL_DOMAINS = [
  'technology',
  'healthcare', 
  'finance',
  'education',
  'marketing',
  'engineering',
  'legal',
  'consulting',
  'manufacturing',
  'retail',
  'media',
  'hospitality',
  'construction',
  'nonprofit',
  'government'
] as const;

// CV Sections
export const CV_SECTIONS = [
  'personalInfo',
  'summary',
  'experience',
  'education', 
  'skills',
  'certifications',
  'languages',
  'projects',
  'publications',
  'awards',
  'references',
  'volunteer',
  'interests',
  'achievements'
] as const;

// Form Field Types
export const FORM_FIELD_TYPES = [
  'text',
  'email',
  'password',
  'textarea',
  'select',
  'multiselect',
  'checkbox',
  'radio',
  'date',
  'phone',
  'url',
  'number',
  'file'
] as const;

// Email Template Types
export const EMAIL_TEMPLATE_TYPES = [
  'welcome',
  'cv-complete',
  'password-reset',
  'subscription-confirmation',
  'payment-receipt',
  'support-ticket',
  'feature-announcement',
  'trial-expiry',
  'invoice',
  'newsletter'
] as const;

// Skill Categories
export const SKILL_CATEGORIES = [
  'technical',
  'soft',
  'languages',
  'tools',
  'frameworks',
  'databases',
  'cloud',
  'methodologies',
  'certifications',
  'leadership'
] as const;

// Industry Specific Terms
export const INDUSTRY_TERMS = {
  technology: [
    'software-engineer',
    'full-stack-developer',
    'devops-engineer',
    'data-scientist',
    'product-manager',
    'ui-ux-designer',
    'system-architect',
    'security-analyst',
    'mobile-developer',
    'cloud-engineer'
  ],
  healthcare: [
    'registered-nurse',
    'physician',
    'medical-technician',
    'healthcare-administrator',
    'pharmacist',
    'physical-therapist',
    'medical-researcher',
    'healthcare-analyst',
    'clinical-coordinator',
    'medical-assistant'
  ],
  finance: [
    'financial-analyst',
    'investment-banker',
    'portfolio-manager',
    'risk-manager',
    'financial-advisor',
    'accountant',
    'auditor',
    'financial-planner',
    'insurance-agent',
    'credit-analyst'
  ]
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  LANGUAGE: 'cvplus-language',
  DIRECTION: 'cvplus-direction',
  TRANSLATIONS_CACHE: 'cvplus-translations-cache',
  USER_PREFERENCES: 'cvplus-user-preferences'
} as const;

// API Endpoints
export const I18N_ENDPOINTS = {
  TRANSLATIONS: '/api/i18n/translations',
  VALIDATE: '/api/i18n/validate',
  EXTRACT: '/api/i18n/extract',
  PROFESSIONAL_TERMS: '/api/i18n/professional-terms'
} as const;

// Cache Configuration
export const CACHE_CONFIG = {
  TTL: 24 * 60 * 60 * 1000, // 24 hours
  MAX_SIZE: 1000, // Maximum number of cached translations
  CLEANUP_INTERVAL: 60 * 60 * 1000 // 1 hour cleanup interval
} as const;

// Performance Thresholds
export const PERFORMANCE_THRESHOLDS = {
  LOAD_TIME_WARNING: 100, // ms
  LOAD_TIME_ERROR: 500, // ms
  CACHE_HIT_RATE_MIN: 0.8, // 80%
  BUNDLE_SIZE_MAX: 50000 // 50KB per language
} as const;

// Development Constants
export const DEV_CONFIG = {
  SHOW_KEYS: false,
  SHOW_MISSING: true,
  HIGHLIGHT_UNTRANSLATED: true,
  EXTRACTION_MODE: false,
  VALIDATION_MODE: true
} as const;

export default {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  FALLBACK_LANGUAGE,
  LANGUAGE_CONFIG,
  TRANSLATION_NAMESPACES,
  DEFAULT_NAMESPACE,
  RTL_LANGUAGES,
  PLURALIZATION_RULES,
  PROFESSIONAL_DOMAINS,
  CV_SECTIONS,
  FORM_FIELD_TYPES,
  EMAIL_TEMPLATE_TYPES,
  SKILL_CATEGORIES,
  INDUSTRY_TERMS,
  STORAGE_KEYS,
  I18N_ENDPOINTS,
  CACHE_CONFIG,
  PERFORMANCE_THRESHOLDS,
  DEV_CONFIG
};