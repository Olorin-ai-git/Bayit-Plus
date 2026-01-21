/**
 * @fileoverview Core Translation Service for CVPlus i18n system
 * Provides comprehensive translation management, caching, and validation
  */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';
import { logger } from '@cvplus/core';
// NOTE: Missing dependency - install i18next-icu
// import ICU from 'i18next-icu';
const ICU = null as any; // Placeholder

import type {
  SupportedLanguage,
  TranslationOptions,
  TranslationServiceConfig,
  TranslationValidation,
  I18nError,
  ProfessionalTerminology
} from '../types';

import {
  DEFAULT_LANGUAGE,
  FALLBACK_LANGUAGE,
  SUPPORTED_LANGUAGES,
  LANGUAGE_CONFIG,
  TRANSLATION_NAMESPACES,
  DEFAULT_NAMESPACE,
  STORAGE_KEYS,
  CACHE_CONFIG
} from '../constants';

export class TranslationService {
  private static instance: TranslationService;
  private initialized = false;
  private translationCache = new Map<string, Map<string, string>>();
  private professionalTerms: ProfessionalTerminology | null = null;
  private config: TranslationServiceConfig;

  private constructor(config?: Partial<TranslationServiceConfig>) {
    this.config = {
      defaultLanguage: DEFAULT_LANGUAGE,
      fallbackLanguage: FALLBACK_LANGUAGE,
      supportedLanguages: SUPPORTED_LANGUAGES,
      namespaces: TRANSLATION_NAMESPACES,
      caching: {
        enabled: true,
        ttl: CACHE_CONFIG.TTL,
        maxSize: CACHE_CONFIG.MAX_SIZE
      },
      detection: {
        order: ['localStorage', 'cookie', 'navigator', 'htmlTag'],
        caches: ['localStorage', 'cookie'],
        cookieOptions: {
          path: '/',
          sameSite: 'lax'
        }
      },
      loading: {
        strategy: 'lazy',
        preload: [DEFAULT_LANGUAGE],
        backend: {
          loadPath: '/locales/{{lng}}/{{ns}}.json',
          crossDomain: false,
          withCredentials: false
        }
      },
      ...config
    };
  }

  /**
   * Get singleton instance
    */
  static getInstance(config?: Partial<TranslationServiceConfig>): TranslationService {
    if (!TranslationService.instance) {
      TranslationService.instance = new TranslationService(config);
    }
    return TranslationService.instance;
  }

  /**
   * Initialize the translation service
    */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await i18n
        .use(Backend)
        .use(LanguageDetector)
        .use(initReactI18next)
        .use(ICU)
        .init({
          lng: this.config.defaultLanguage,
          fallbackLng: this.config.fallbackLanguage,
          supportedLngs: this.config.supportedLanguages,
          
          ns: this.config.namespaces,
          defaultNS: DEFAULT_NAMESPACE,
          
          debug: process.env.NODE_ENV === 'development',
          
          interpolation: {
            escapeValue: false, // React already escapes
            format: (value: any, format?: string, lng?: string) => {
              return this.formatValue(value, format || '', lng as SupportedLanguage || this.config.defaultLanguage);
            }
          },
          
          backend: {
            loadPath: this.config.loading.backend.loadPath,
            crossDomain: this.config.loading.backend.crossDomain,
            withCredentials: this.config.loading.backend.withCredentials,
            queryStringParams: {
              v: process.env.PACKAGE_VERSION || '1.0.0'
            }
          },
          
          detection: {
            order: this.config.detection.order,
            caches: this.config.detection.caches,
            lookupLocalStorage: STORAGE_KEYS.LANGUAGE,
            lookupCookie: STORAGE_KEYS.LANGUAGE,
            cookieOptions: this.config.detection.cookieOptions
          },
          
          react: {
            useSuspense: true,
            bindI18n: 'languageChanged',
            bindI18nStore: 'added removed',
            transEmptyNodeValue: '',
            transSupportBasicHtmlNodes: true,
            transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'em', 'b']
          },
          
          preload: this.config.loading.preload,
          
          keySeparator: '.',
          nsSeparator: ':',
          
          // Custom post processor for professional terms
          postProcess: ['professionalTerms']
        } as any);

      // Register custom post processor
      if (i18n.services && (i18n.services as any).postProcessor) {
        (i18n.services as any).postProcessor.addPostProcessor('professionalTerms', {
          type: 'postProcessor',
          process: (value: string, key?: string, options?: any, translator?: any) => {
            return this.processWithProfessionalTerms(value, options?.lng);
          }
        });
      }

      this.initialized = true;
      
      // Load professional terminology
      await this.loadProfessionalTerminology();
      
      // Setup RTL support
      this.setupRTLSupport();
      
      // Setup cache cleanup
      this.setupCacheCleanup();
      
    } catch (error) {
      const i18nError = new Error(`Failed to initialize i18n: ${error}`) as I18nError;
      i18nError.code = 'INIT_FAILED';
      throw i18nError;
    }
  }

  /**
   * Translate a key with comprehensive options
    */
  translate(key: string, options: TranslationOptions = {}): string {
    try {
      const cacheKey = this.getCacheKey(key, options);
      
      // Check cache first
      if (this.config.caching.enabled && this.translationCache.has(cacheKey)) {
        const cachedValue = this.translationCache.get(cacheKey);
        if (cachedValue?.has('value')) {
          return cachedValue.get('value') || key;
        }
      }
      
      // Use i18next for translation
      const translation = i18n.t(key, {
        ...options,
        defaultValue: options.defaultValue || key,
        count: options.count,
        context: options.context,
        replace: options.replace,
        lng: options.lng,
        fallbackLng: options.fallbackLng,
        ns: options.ns,
        interpolation: options.interpolation
      });
      
      // Cache the result
      if (this.config.caching.enabled && translation !== key) {
        this.cacheTranslation(cacheKey, translation);
      }
      
      return translation;
      
    } catch (error) {
      logger.warn(`Translation error for key "${key}":`, error);
      return options.defaultValue || key;
    }
  }

  /**
   * Translate with namespace shorthand
    */
  t = this.translate.bind(this);

  /**
   * Change language with RTL support
    */
  async changeLanguage(language: SupportedLanguage): Promise<void> {
    if (!this.config.supportedLanguages.includes(language)) {
      throw new Error(`Language "${language}" is not supported`);
    }

    try {
      await i18n.changeLanguage(language);
      
      // Update HTML attributes
      const langConfig = LANGUAGE_CONFIG[language];
      document.documentElement.lang = language;
      document.documentElement.dir = langConfig.dir;
      
      // Update CSS classes for RTL
      if (langConfig.rtlSupport) {
        document.documentElement.classList.add('rtl');
        document.documentElement.classList.remove('ltr');
      } else {
        document.documentElement.classList.add('ltr');
        document.documentElement.classList.remove('rtl');
      }
      
      // Store preference
      localStorage.setItem(STORAGE_KEYS.LANGUAGE, language);
      
      // Clear cache for fresh translations
      this.clearCache();
      
      // Emit custom event
      window.dispatchEvent(new CustomEvent('languageChanged', {
        detail: { language, config: langConfig }
      }));
      
    } catch (error) {
      const i18nError = new Error(`Failed to change language to "${language}": ${error}`) as I18nError;
      i18nError.code = 'LANGUAGE_CHANGE_FAILED';
      i18nError.language = language;
      throw i18nError;
    }
  }

  /**
   * Get current language
    */
  getCurrentLanguage(): SupportedLanguage {
    return (i18n.language || this.config.defaultLanguage) as SupportedLanguage;
  }

  /**
   * Check if language is RTL
    */
  isRTL(language?: SupportedLanguage): boolean {
    const lang = language || this.getCurrentLanguage();
    return LANGUAGE_CONFIG[lang]?.dir === 'rtl';
  }

  /**
   * Get text direction
    */
  getDirection(language?: SupportedLanguage): 'ltr' | 'rtl' {
    const lang = language || this.getCurrentLanguage();
    return LANGUAGE_CONFIG[lang]?.dir || 'ltr';
  }

  /**
   * Get locale for Intl APIs
    */
  getLocale(language?: SupportedLanguage): string {
    const lang = language || this.getCurrentLanguage();
    return LANGUAGE_CONFIG[lang]?.locale || 'en-US';
  }

  /**
   * Translate CV section
    */
  translateCVSection(section: string, language?: SupportedLanguage): string {
    const sectionKey = `cv.sections.${section}`;
    return this.translate(sectionKey, { lng: language });
  }

  /**
   * Translate professional role
    */
  translateRole(role: string, industry?: string, language?: SupportedLanguage): string {
    const baseKey = `roles.${role.toLowerCase().replace(/\s+/g, '_')}`;
    const industryKey = industry ? `${baseKey}.${industry}` : baseKey;
    
    // Try industry-specific first, then fallback to general
    let translation = this.translate(industryKey, { lng: language });
    if (translation === industryKey) {
      translation = this.translate(baseKey, { lng: language });
    }
    
    return translation !== baseKey ? translation : role;
  }

  /**
   * Translate skill with category context
    */
  translateSkill(skill: string, category?: string, language?: SupportedLanguage): string {
    const baseKey = `skills.items.${skill.toLowerCase().replace(/\s+/g, '_')}`;
    const categoryKey = category ? `skills.categories.${category}.${skill.toLowerCase().replace(/\s+/g, '_')}` : baseKey;
    
    let translation = this.translate(categoryKey, { lng: language });
    if (translation === categoryKey) {
      translation = this.translate(baseKey, { lng: language });
    }
    
    return translation !== baseKey ? translation : skill;
  }

  /**
   * Translate error message
    */
  translateError(errorCode: string, variables?: Record<string, any>, language?: SupportedLanguage): string {
    const errorKey = `errors.${errorCode}`;
    return this.translate(errorKey, { lng: language, replace: variables });
  }

  /**
   * Translate form field labels and validation messages
    */
  translateForm(fieldKey: string, type: 'label' | 'placeholder' | 'validation' | 'help', language?: SupportedLanguage): string {
    const formKey = `forms.${fieldKey}.${type}`;
    return this.translate(formKey, { lng: language });
  }

  /**
   * Load professional terminology
    */
  private async loadProfessionalTerminology(): Promise<void> {
    try {
      // In a real implementation, this would load from API or local files
      // For now, we'll use a placeholder structure
      this.professionalTerms = {
        jobTitles: {},
        skills: {},
        industries: {},
        departments: {},
        levels: {},
        certifications: {}
      };
    } catch (error) {
      logger.warn('Failed to load professional terminology:', error);
    }
  }

  /**
   * Process text with professional terms replacement
    */
  private processWithProfessionalTerms(value: string, language: SupportedLanguage): string {
    if (!this.professionalTerms || !value) return value;
    
    // Implementation would replace professional terms in the text
    // This is a placeholder for the actual implementation
    return value;
  }

  /**
   * Format value based on type and locale
    */
  private formatValue(value: any, format: string, language: SupportedLanguage): string {
    const locale = this.getLocale(language);
    
    try {
      switch (format) {
        case 'number':
          return new Intl.NumberFormat(locale).format(value);
        case 'currency':
          return new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(value);
        case 'percent':
          return new Intl.NumberFormat(locale, { style: 'percent' }).format(value / 100);
        case 'date':
          return new Intl.DateTimeFormat(locale).format(new Date(value));
        case 'time':
          return new Intl.DateTimeFormat(locale, { timeStyle: 'medium' }).format(new Date(value));
        case 'datetime':
          return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
        case 'relative':
          return new Intl.RelativeTimeFormat(locale).format(value.value, value.unit);
        default:
          return String(value);
      }
    } catch (error) {
      logger.warn(`Formatting error for value "${value}" with format "${format}":`, error);
      return String(value);
    }
  }

  /**
   * Setup RTL support
    */
  private setupRTLSupport(): void {
    const currentLang = this.getCurrentLanguage();
    const langConfig = LANGUAGE_CONFIG[currentLang];
    
    if (langConfig) {
      document.documentElement.dir = langConfig.dir;
      document.documentElement.classList.toggle('rtl', langConfig.rtlSupport);
      document.documentElement.classList.toggle('ltr', !langConfig.rtlSupport);
    }
  }

  /**
   * Generate cache key
    */
  private getCacheKey(key: string, options: TranslationOptions): string {
    const parts = [
      key,
      options.lng || this.getCurrentLanguage(),
      options.ns || DEFAULT_NAMESPACE,
      options.context || '',
      options.count?.toString() || '',
      JSON.stringify(options.replace || {})
    ];
    return parts.join('|');
  }

  /**
   * Cache translation
    */
  private cacheTranslation(cacheKey: string, value: string): void {
    if (this.translationCache.size >= this.config.caching.maxSize) {
      // Remove oldest entries
      const keysToRemove = Array.from(this.translationCache.keys()).slice(0, 100);
      keysToRemove.forEach(key => this.translationCache.delete(key));
    }
    
    const entry = new Map([
      ['value', value],
      ['timestamp', Date.now().toString()]
    ]);
    
    this.translationCache.set(cacheKey, entry);
  }

  /**
   * Clear translation cache
    */
  clearCache(): void {
    this.translationCache.clear();
  }

  /**
   * Setup cache cleanup
    */
  private setupCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const expiredKeys: string[] = [];
      
      this.translationCache.forEach((entry, key) => {
        const timestamp = parseInt(entry.get('timestamp') || '0');
        if (now - timestamp > this.config.caching.ttl) {
          expiredKeys.push(key);
        }
      });
      
      expiredKeys.forEach(key => this.translationCache.delete(key));
    }, CACHE_CONFIG.CLEANUP_INTERVAL);
  }

  /**
   * Validate translations for completeness
    */
  async validateTranslations(languages?: SupportedLanguage[]): Promise<TranslationValidation> {
    const langs = languages || this.config.supportedLanguages;
    const validation: TranslationValidation = {
      isValid: true,
      errors: [],
      warnings: [],
      coverage: 0,
      missingKeys: []
    };
    
    // Implementation would check for missing translations, format issues, etc.
    // This is a placeholder for the actual validation logic
    
    return validation;
  }

  /**
   * Preload language translations
    */
  async preloadLanguage(language: SupportedLanguage): Promise<void> {
    try {
      await i18n.loadLanguages(language);
    } catch (error) {
      logger.warn(`Failed to preload language ${language}:`, error);
    }
  }

  /**
   * Get loading state
    */
  isLoading(): boolean {
    return !this.initialized;
  }

  /**
   * Get available languages
    */
  getAvailableLanguages(): SupportedLanguage[] {
    return this.config.supportedLanguages;
  }

  /**
   * Get language configuration
    */
  getLanguageConfig(language?: SupportedLanguage) {
    const lang = language || this.getCurrentLanguage();
    return LANGUAGE_CONFIG[lang];
  }

  /**
   * Check if translation exists
    */
  exists(key: string, options?: { lng?: SupportedLanguage; ns?: string }): boolean {
    return i18n.exists(key, options);
  }

  /**
   * Get raw translation resource
    */
  getResource(language: SupportedLanguage, namespace: string, key: string): any {
    return i18n.getResource(language, namespace, key);
  }

  /**
   * Add translation resource
    */
  addResource(language: SupportedLanguage, namespace: string, key: string, value: any): void {
    i18n.addResource(language, namespace, key, value);
  }

  /**
   * Remove translation resource
    */
  removeResource(language: SupportedLanguage, namespace: string, key: string): void {
    i18n.removeResourceBundle(language, namespace);
  }

  /**
   * Get the underlying i18n instance for advanced use cases
    */
  get i18n() {
    return i18n;
  }
}

// Export singleton instance
export const translationService = TranslationService.getInstance();
export default TranslationService;