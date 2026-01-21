/**
 * @fileoverview Default configuration for CVPlus i18n module
 * Provides sensible defaults for i18n setup
  */

import type { TranslationServiceConfig } from './types';
import { 
  DEFAULT_LANGUAGE, 
  FALLBACK_LANGUAGE, 
  SUPPORTED_LANGUAGES, 
  TRANSLATION_NAMESPACES,
  STORAGE_KEYS,
  CACHE_CONFIG 
} from './constants';

/**
 * Default i18n configuration for CVPlus applications
  */
export const defaultConfig: TranslationServiceConfig = {
  defaultLanguage: DEFAULT_LANGUAGE,
  fallbackLanguage: FALLBACK_LANGUAGE,
  supportedLanguages: SUPPORTED_LANGUAGES,
  namespaces: TRANSLATION_NAMESPACES,
  
  caching: {
    enabled: true,
    ttl: CACHE_CONFIG.TTL,
    maxSize: CACHE_CONFIG.MAX_SIZE,
  },
  
  detection: {
    order: ['localStorage', 'cookie', 'navigator', 'htmlTag'],
    caches: ['localStorage', 'cookie'],
    cookieOptions: {
      path: '/',
      sameSite: 'lax',
    },
  },
  
  loading: {
    strategy: 'lazy',
    preload: [DEFAULT_LANGUAGE],
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
      crossDomain: false,
      withCredentials: false,
    },
  },
};

/**
 * Production-optimized configuration
  */
export const productionConfig: Partial<TranslationServiceConfig> = {
  caching: {
    enabled: true,
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    maxSize: 2000,
  },
  loading: {
    strategy: 'eager',
    preload: ['en', 'es', 'fr'], // Preload most common languages
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
      crossDomain: true,
      withCredentials: false,
    },
  },
};

/**
 * Development configuration with debugging features
  */
export const developmentConfig: Partial<TranslationServiceConfig> = {
  caching: {
    enabled: false, // Disable caching for fresh translations during development
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 500,
  },
  loading: {
    strategy: 'lazy',
    preload: [DEFAULT_LANGUAGE],
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
      crossDomain: false,
      withCredentials: false,
    },
  },
};

/**
 * Test environment configuration
  */
export const testConfig: Partial<TranslationServiceConfig> = {
  defaultLanguage: 'en',
  fallbackLanguage: 'en',
  supportedLanguages: ['en', 'es'], // Minimal set for testing
  namespaces: ['common', 'test'],
  
  caching: {
    enabled: false,
    ttl: 1000,
    maxSize: 100,
  },
  
  loading: {
    strategy: 'eager',
    preload: ['en'],
    backend: {
      loadPath: '/test-locales/{{lng}}/{{ns}}.json',
      crossDomain: false,
      withCredentials: false,
    },
  },
};

/**
 * Minimal configuration for lightweight applications
  */
export const minimalConfig: Partial<TranslationServiceConfig> = {
  supportedLanguages: ['en', 'es', 'fr'],
  namespaces: ['common', 'forms'],
  
  caching: {
    enabled: true,
    ttl: 60 * 60 * 1000, // 1 hour
    maxSize: 500,
  },
  
  loading: {
    strategy: 'progressive',
    preload: ['en'],
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
  },
};

/**
 * Enterprise configuration with all features enabled
  */
export const enterpriseConfig: Partial<TranslationServiceConfig> = {
  supportedLanguages: SUPPORTED_LANGUAGES,
  namespaces: [...TRANSLATION_NAMESPACES, 'enterprise', 'compliance', 'audit'],
  
  caching: {
    enabled: true,
    ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxSize: 5000,
  },
  
  detection: {
    order: ['localStorage', 'cookie', 'navigator', 'htmlTag', 'subdomain'],
    caches: ['localStorage', 'cookie'],
    cookieOptions: {
      path: '/',
      domain: process.env.COOKIE_DOMAIN,
      sameSite: 'strict',
    },
  },
  
  loading: {
    strategy: 'progressive',
    preload: ['en', 'es', 'fr', 'de'],
    backend: {
      loadPath: process.env.I18N_CDN_URL + '/{{lng}}/{{ns}}.json',
      crossDomain: true,
      withCredentials: true,
    },
  },
};

/**
 * Get configuration based on environment
  */
export function getConfigForEnvironment(env?: string): TranslationServiceConfig {
  const environment = env || process.env.NODE_ENV || 'development';
  
  switch (environment) {
    case 'production':
      return { ...defaultConfig, ...productionConfig };
    case 'test':
      return { ...defaultConfig, ...testConfig };
    case 'minimal':
      return { ...defaultConfig, ...minimalConfig };
    case 'enterprise':
      return { ...defaultConfig, ...enterpriseConfig };
    case 'development':
    default:
      return { ...defaultConfig, ...developmentConfig };
  }
}

/**
 * Create custom configuration with overrides
  */
export function createConfig(overrides: Partial<TranslationServiceConfig> = {}): TranslationServiceConfig {
  return {
    ...defaultConfig,
    ...overrides,
    caching: {
      ...defaultConfig.caching,
      ...overrides.caching,
    },
    detection: {
      ...defaultConfig.detection,
      ...overrides.detection,
      cookieOptions: {
        ...defaultConfig.detection.cookieOptions,
        ...overrides.detection?.cookieOptions,
      },
    },
    loading: {
      ...defaultConfig.loading,
      ...overrides.loading,
      backend: {
        ...defaultConfig.loading.backend,
        ...overrides.loading?.backend,
      },
    },
  };
}

/**
 * Validate configuration
  */
export function validateConfig(config: TranslationServiceConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check required fields
  if (!config.defaultLanguage) {
    errors.push('defaultLanguage is required');
  }
  
  if (!config.fallbackLanguage) {
    errors.push('fallbackLanguage is required');
  }
  
  if (!config.supportedLanguages || config.supportedLanguages.length === 0) {
    errors.push('supportedLanguages must contain at least one language');
  }
  
  if (!config.namespaces || config.namespaces.length === 0) {
    errors.push('namespaces must contain at least one namespace');
  }
  
  // Check that default and fallback languages are in supported languages
  if (config.supportedLanguages && !config.supportedLanguages.includes(config.defaultLanguage)) {
    errors.push('defaultLanguage must be included in supportedLanguages');
  }
  
  if (config.supportedLanguages && !config.supportedLanguages.includes(config.fallbackLanguage)) {
    errors.push('fallbackLanguage must be included in supportedLanguages');
  }
  
  // Validate cache config
  if (config.caching.ttl <= 0) {
    errors.push('caching.ttl must be greater than 0');
  }
  
  if (config.caching.maxSize <= 0) {
    errors.push('caching.maxSize must be greater than 0');
  }
  
  // Validate loading config
  if (!config.loading.backend.loadPath) {
    errors.push('loading.backend.loadPath is required');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Export default configuration
export default defaultConfig;