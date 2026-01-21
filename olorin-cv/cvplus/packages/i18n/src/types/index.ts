/**
 * @fileoverview Comprehensive TypeScript types for CVPlus i18n system
  */

// Core Language Types
export type SupportedLanguage = 
  | 'en' // English
  | 'es' // Spanish  
  | 'fr' // French
  | 'de' // German
  | 'pt' // Portuguese
  | 'ja' // Japanese
  | 'zh' // Chinese (Simplified)
  | 'ar' // Arabic
  | 'he' // Hebrew
  | 'fa' // Persian/Farsi
  | 'ur' // Urdu
  | 'dv' // Divehi
  | 'ru' // Russian
  | 'nl'; // Dutch

export type TextDirection = 'ltr' | 'rtl';

export interface LanguageConfig {
  name: string;
  nativeName: string;
  flag: string;
  dir: TextDirection;
  locale: string;
  countryCode: string;
  dateFormat: string;
  currency: string;
  pluralRules: string[];
  rtlSupport: boolean;
}

export type LanguageConfigMap = Record<SupportedLanguage, LanguageConfig>;

// Translation Types
export interface TranslationKey {
  key: string;
  namespace: string;
  context?: string;
  defaultValue?: string;
  description?: string;
  maxLength?: number;
  variables?: string[];
}

export type TranslationNamespace = 
  | 'common'
  | 'cv'
  | 'features'
  | 'forms'
  | 'premium'
  | 'errors'
  | 'success'
  | 'navigation'
  | 'auth'
  | 'onboarding'
  | 'dashboard'
  | 'settings'
  | 'templates'
  | 'analytics'
  | 'billing'
  | 'support'
  | 'roles'
  | 'skills'
  | 'industries'
  | 'validation'
  | 'test'
  | 'enterprise'
  | 'compliance'
  | 'audit';

export interface TranslationOptions {
  count?: number;
  context?: string;
  defaultValue?: string;
  replace?: Record<string, any>;
  lng?: SupportedLanguage;
  fallbackLng?: SupportedLanguage | SupportedLanguage[];
  ns?: TranslationNamespace | TranslationNamespace[];
  interpolation?: {
    escapeValue?: boolean;
    prefix?: string;
    suffix?: string;
  };
}

// Professional Content Types
export interface ProfessionalTerminology {
  jobTitles: Record<string, Record<SupportedLanguage, string>>;
  skills: Record<string, Record<SupportedLanguage, string>>;
  industries: Record<string, Record<SupportedLanguage, string>>;
  departments: Record<string, Record<SupportedLanguage, string>>;
  levels: Record<string, Record<SupportedLanguage, string>>;
  certifications: Record<string, Record<SupportedLanguage, string>>;
}

export interface CVSectionTranslations {
  personalInfo: Record<SupportedLanguage, string>;
  summary: Record<SupportedLanguage, string>;
  experience: Record<SupportedLanguage, string>;
  education: Record<SupportedLanguage, string>;
  skills: Record<SupportedLanguage, string>;
  certifications: Record<SupportedLanguage, string>;
  languages: Record<SupportedLanguage, string>;
  projects: Record<SupportedLanguage, string>;
  publications: Record<SupportedLanguage, string>;
  awards: Record<SupportedLanguage, string>;
  references: Record<SupportedLanguage, string>;
}

// Formatting Types
export interface DateFormatOptions extends Intl.DateTimeFormatOptions {
  format?: 'short' | 'medium' | 'long' | 'full';
  relative?: boolean;
}

export interface NumberFormatOptions extends Intl.NumberFormatOptions {
  format?: 'decimal' | 'currency' | 'percent';
  compact?: boolean;
}

export interface CurrencyFormatOptions {
  currency?: string;
  display?: 'symbol' | 'narrowSymbol' | 'code' | 'name';
  precision?: number;
}

export interface PhoneFormatOptions {
  format?: 'national' | 'international' | 'e164' | 'rfc3966';
  country?: string;
}

// Pluralization Types
export interface PluralizationRule {
  language: SupportedLanguage;
  rule: (count: number) => 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
}

export type PluralForm = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

export interface PluralizedTranslation {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

// RTL Types
export interface RTLConfig {
  supported: boolean;
  direction: TextDirection;
  cssProperties: Record<string, string>;
  componentMappings: Record<string, any>;
}

export interface RTLLayoutOptions {
  mirrorLayout?: boolean;
  flipIcons?: boolean;
  adjustSpacing?: boolean;
  transformText?: boolean;
}

// Context Types
export interface ContextualTranslation {
  key: string;
  contexts: Record<string, string>;
  gender?: 'masculine' | 'feminine' | 'neutral';
  formality?: 'formal' | 'informal';
  audience?: 'professional' | 'casual' | 'academic';
}

export interface GenderSpecificTranslation {
  masculine: string;
  feminine: string;
  neutral?: string;
}

// Validation Types
export interface TranslationValidation {
  isValid: boolean;
  errors: TranslationValidationError[];
  warnings: TranslationValidationWarning[];
  coverage: number;
  missingKeys: string[];
}

export interface TranslationValidationError {
  key: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  namespace: string;
  language?: SupportedLanguage;
}

export interface TranslationValidationWarning {
  key: string;
  message: string;
  suggestion?: string;
  namespace: string;
  language?: SupportedLanguage;
}

// Service Types
export interface TranslationServiceConfig {
  defaultLanguage: SupportedLanguage;
  fallbackLanguage: SupportedLanguage;
  supportedLanguages: SupportedLanguage[];
  namespaces: TranslationNamespace[];
  caching: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
  detection: {
    order: ('localStorage' | 'cookie' | 'navigator' | 'htmlTag' | 'subdomain')[];
    caches: ('localStorage' | 'cookie')[];
    cookieOptions: {
      path: string;
      domain?: string;
      sameSite: 'strict' | 'lax' | 'none';
    };
  };
  loading: {
    strategy: 'eager' | 'lazy' | 'progressive';
    preload: SupportedLanguage[];
    backend: {
      loadPath: string;
      crossDomain?: boolean;
      withCredentials?: boolean;
    };
  };
}

export interface I18nHookReturn {
  t: (key: string, options?: TranslationOptions) => string;
  i18n: any;
  changeLanguage: (language: SupportedLanguage) => Promise<void>;
  currentLanguage: SupportedLanguage;
  languages: LanguageConfigMap;
  isRTL: boolean;
  direction: TextDirection;
  locale: string;
  formatDate: (date: Date | string, options?: DateFormatOptions) => string;
  formatNumber: (num: number, options?: NumberFormatOptions) => string;
  formatCurrency: (amount: number, options?: CurrencyFormatOptions) => string;
  formatPhone: (phone: string, options?: PhoneFormatOptions) => string;
  formatPercentage: (value: number, decimals?: number) => string;
  formatRelativeTime: (date: Date | string, unit?: Intl.RelativeTimeFormatUnit) => string;
  isLoading: boolean;
  error: Error | null;
}

// Component Types
export interface LanguageSelectorProps {
  variant?: 'dropdown' | 'list' | 'flags' | 'compact';
  showFlags?: boolean;
  showNames?: boolean;
  filterLanguages?: SupportedLanguage[];
  onLanguageChange?: (language: SupportedLanguage) => void;
  className?: string;
  disabled?: boolean;
}

export interface TranslatedTextProps {
  i18nKey: string;
  options?: TranslationOptions;
  component?: React.ElementType;
  className?: string;
  fallback?: React.ReactNode;
  children?: React.ReactNode;
}

export interface RTLWrapperProps {
  children: React.ReactNode;
  className?: string;
  options?: RTLLayoutOptions;
}

// Professional Translation Types
export interface IndustryTerminology {
  technology: Record<SupportedLanguage, Record<string, string>>;
  healthcare: Record<SupportedLanguage, Record<string, string>>;
  finance: Record<SupportedLanguage, Record<string, string>>;
  education: Record<SupportedLanguage, Record<string, string>>;
  marketing: Record<SupportedLanguage, Record<string, string>>;
  engineering: Record<SupportedLanguage, Record<string, string>>;
  legal: Record<SupportedLanguage, Record<string, string>>;
  consulting: Record<SupportedLanguage, Record<string, string>>;
}

export interface RoleSpecificTranslations {
  [roleId: string]: {
    title: Record<SupportedLanguage, string>;
    description: Record<SupportedLanguage, string>;
    responsibilities: Record<SupportedLanguage, string[]>;
    requirements: Record<SupportedLanguage, string[]>;
    skills: Record<SupportedLanguage, string[]>;
  };
}

// Email Template Types
export interface EmailTemplateTranslation {
  subject: Record<SupportedLanguage, string>;
  preheader?: Record<SupportedLanguage, string>;
  greeting: Record<SupportedLanguage, string>;
  content: Record<SupportedLanguage, string>;
  closing: Record<SupportedLanguage, string>;
  signature: Record<SupportedLanguage, string>;
  variables: string[];
}

export type EmailTemplateType = 
  | 'welcome'
  | 'cv-complete'
  | 'password-reset'
  | 'subscription-confirmation'
  | 'payment-receipt'
  | 'support-ticket'
  | 'feature-announcement'
  | 'trial-expiry'
  | 'invoice'
  | 'newsletter';

// SEO Types
export interface SEOTranslation {
  title: Record<SupportedLanguage, string>;
  description: Record<SupportedLanguage, string>;
  keywords: Record<SupportedLanguage, string[]>;
  openGraph: {
    title: Record<SupportedLanguage, string>;
    description: Record<SupportedLanguage, string>;
    siteName: Record<SupportedLanguage, string>;
  };
  twitter: {
    title: Record<SupportedLanguage, string>;
    description: Record<SupportedLanguage, string>;
  };
}

// Error Types
export interface I18nError extends Error {
  code: string;
  namespace?: string;
  language?: SupportedLanguage;
  key?: string;
  details?: any;
}

export interface I18nErrorDetails {
  timestamp: Date;
  userAgent: string;
  language: SupportedLanguage;
  namespace: string;
  key: string;
  fallbackUsed: boolean;
}

// Performance Types
export interface I18nPerformanceMetrics {
  loadTime: number;
  cacheHitRate: number;
  translationCoverage: Record<SupportedLanguage, number>;
  errorRate: number;
  bundleSize: Record<SupportedLanguage, number>;
}

// Development Types
export interface I18nDevTools {
  showKeys: boolean;
  showMissing: boolean;
  highlightUntranslated: boolean;
  extractionMode: boolean;
  validationMode: boolean;
}

// Analytics Types
export interface I18nAnalytics {
  languageUsage: Record<SupportedLanguage, number>;
  mostUsedKeys: Array<{ key: string; count: number }>;
  translationErrors: Array<{ key: string; error: string; count: number }>;
  performanceMetrics: I18nPerformanceMetrics;
}

// No default export for types-only module