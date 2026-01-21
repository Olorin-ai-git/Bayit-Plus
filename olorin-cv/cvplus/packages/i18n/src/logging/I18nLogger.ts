/**
 * T029: i18n package logging integration in packages/i18n/src/logging/I18nLogger.ts
 *
 * Specialized logger for internationalization and localization events
 * Tracks translation usage, missing keys, locale changes, and content adaptation
  */

import {
  LoggerFactory,
  LogLevel,
  LogDomain,
  type ILogger
} from '@cvplus/logging/backend';

// Helper function for correlation ID
function getCurrentCorrelationId(): string | null {
  // Simple placeholder - correlation tracking to be implemented
  return null;
}

/**
 * i18n event types
  */
export enum I18nEventType {
  LOCALE_CHANGE = 'i18n.locale.change',
  TRANSLATION_REQUEST = 'i18n.translation.request',
  TRANSLATION_MISS = 'i18n.translation.miss',
  TRANSLATION_FALLBACK = 'i18n.translation.fallback',
  CONTENT_LOAD = 'i18n.content.load',
  CONTENT_CACHE = 'i18n.content.cache',
  PLURALIZATION = 'i18n.pluralization',
  INTERPOLATION = 'i18n.interpolation',
  NAMESPACE_LOAD = 'i18n.namespace.load',
  LANGUAGE_DETECTION = 'i18n.language.detection',
  REGION_DETECTION = 'i18n.region.detection',
  CURRENCY_FORMAT = 'i18n.currency.format',
  DATE_FORMAT = 'i18n.date.format',
  NUMBER_FORMAT = 'i18n.number.format'
}

/**
 * Translation context interface
  */
export interface I18nContext {
  userId?: string;
  sessionId?: string;
  currentLocale?: string;
  requestedLocale?: string;
  fallbackLocale?: string;
  namespace?: string;
  key?: string;
  interpolationParams?: Record<string, any>;
  pluralCount?: number;
  detectedLanguage?: string;
  detectedRegion?: string;
  userAgent?: string;
  acceptLanguage?: string;
  timezone?: string;
  region?: string;
  currency?: string;
}

/**
 * Translation miss tracking
  */
export interface TranslationMiss {
  key: string;
  namespace: string;
  locale: string;
  context?: Record<string, any>;
  timestamp: Date;
  userId?: string;
  url?: string;
}

/**
 * Specialized internationalization logger
  */
export class I18nLogger {
  private readonly logger: ILogger;
  private readonly packageName = '@cvplus/i18n';
  private readonly translationMisses: Map<string, TranslationMiss> = new Map();

  constructor() {
    this.logger = LoggerFactory.createLogger(this.packageName, {
      level: LogLevel.INFO,
      enableConsole: true,
      enableFirebase: true,
      enablePiiRedaction: true
    });
  }

  /**
   * Log locale change
    */
  localeChange(context: I18nContext, reason?: string): void {
    const correlationId = getCurrentCorrelationId();

    this.logger.info('Locale changed', {
      event: I18nEventType.LOCALE_CHANGE,
      userId: context.userId,
      sessionId: context.sessionId,
      fromLocale: context.currentLocale,
      toLocale: context.requestedLocale,
      reason,
      correlationId
    });
  }

  /**
   * Log translation request
    */
  translationRequest(context: I18nContext): void {
    const correlationId = getCurrentCorrelationId();

    this.logger.debug('Translation requested', {
      event: I18nEventType.TRANSLATION_REQUEST,
      locale: context.currentLocale,
      namespace: context.namespace,
      key: context.key,
      hasInterpolation: !!context.interpolationParams,
      pluralCount: context.pluralCount,
      correlationId
    });
  }

  /**
   * Log missing translation
    */
  translationMiss(context: I18nContext): void {
    const correlationId = getCurrentCorrelationId();
    const missKey = `${context.currentLocale}_${context.namespace}_${context.key}`;

    // Track missing translations for analytics
    if (!this.translationMisses.has(missKey)) {
      this.translationMisses.set(missKey, {
        key: context.key!,
        namespace: context.namespace!,
        locale: context.currentLocale!,
        context: {
          interpolationParams: context.interpolationParams,
          pluralCount: context.pluralCount
        },
        timestamp: new Date(),
        userId: context.userId
      });
    }

    this.logger.warn('Translation missing', {
      event: I18nEventType.TRANSLATION_MISS,
      locale: context.currentLocale,
      namespace: context.namespace,
      key: context.key,
      fallbackLocale: context.fallbackLocale,
      correlationId
    });
  }

  /**
   * Log translation fallback usage
    */
  translationFallback(context: I18nContext): void {
    const correlationId = getCurrentCorrelationId();

    this.logger.debug('Using translation fallback', {
      event: I18nEventType.TRANSLATION_FALLBACK,
      requestedLocale: context.requestedLocale,
      fallbackLocale: context.fallbackLocale,
      namespace: context.namespace,
      key: context.key,
      correlationId
    });
  }

  /**
   * Log content loading
    */
  contentLoad(context: I18nContext, success: boolean, loadTime?: number, error?: Error): void {
    const correlationId = getCurrentCorrelationId();

    if (success) {
      this.logger.debug('Content loaded successfully', {
        event: I18nEventType.CONTENT_LOAD,
        locale: context.currentLocale,
        namespace: context.namespace,
        loadTimeMs: loadTime,
        correlationId
      });
    } else {
      this.logger.error('Content loading failed', {
        event: I18nEventType.CONTENT_LOAD,
        locale: context.currentLocale,
        namespace: context.namespace,
        correlationId,
        error: error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : undefined
      });
    }
  }

  /**
   * Log content caching
    */
  contentCache(context: I18nContext, cacheHit: boolean): void {
    const correlationId = getCurrentCorrelationId();

    this.logger.debug('Content cache access', {
      event: I18nEventType.CONTENT_CACHE,
      locale: context.currentLocale,
      namespace: context.namespace,
      cacheHit,
      correlationId
    });
  }

  /**
   * Log language detection
    */
  languageDetection(context: I18nContext, method: 'header' | 'cookie' | 'path' | 'subdomain' | 'query'): void {
    const correlationId = getCurrentCorrelationId();

    this.logger.info('Language detected', {
      event: I18nEventType.LANGUAGE_DETECTION,
      detectedLanguage: context.detectedLanguage,
      detectedRegion: context.detectedRegion,
      method,
      userAgent: context.userAgent,
      acceptLanguage: context.acceptLanguage,
      correlationId
    });
  }

  /**
   * Log pluralization
    */
  pluralization(context: I18nContext, rule: string): void {
    const correlationId = getCurrentCorrelationId();

    this.logger.debug('Pluralization applied', {
      event: I18nEventType.PLURALIZATION,
      locale: context.currentLocale,
      key: context.key,
      count: context.pluralCount,
      rule,
      correlationId
    });
  }

  /**
   * Log interpolation
    */
  interpolation(context: I18nContext, paramCount: number): void {
    const correlationId = getCurrentCorrelationId();

    this.logger.debug('String interpolation performed', {
      event: I18nEventType.INTERPOLATION,
      locale: context.currentLocale,
      key: context.key,
      paramCount,
      correlationId
    });
  }

  /**
   * Log currency formatting
    */
  currencyFormat(context: I18nContext, amount: number, result: string): void {
    const correlationId = getCurrentCorrelationId();

    this.logger.debug('Currency formatted', {
      event: I18nEventType.CURRENCY_FORMAT,
      locale: context.currentLocale,
      currency: context.currency,
      amount,
      result,
      correlationId
    });
  }

  /**
   * Log date formatting
    */
  dateFormat(context: I18nContext, date: Date, format: string, result: string): void {
    const correlationId = getCurrentCorrelationId();

    this.logger.debug('Date formatted', {
      event: I18nEventType.DATE_FORMAT,
      locale: context.currentLocale,
      timezone: context.timezone,
      format,
      result,
      correlationId
    });
  }

  /**
   * Log number formatting
    */
  numberFormat(context: I18nContext, number: number, result: string): void {
    const correlationId = getCurrentCorrelationId();

    this.logger.debug('Number formatted', {
      event: I18nEventType.NUMBER_FORMAT,
      locale: context.currentLocale,
      number,
      result,
      correlationId
    });
  }

  /**
   * Log namespace loading
    */
  namespaceLoad(context: I18nContext, success: boolean, keyCount?: number, error?: Error): void {
    const correlationId = getCurrentCorrelationId();

    if (success) {
      this.logger.info('Namespace loaded', {
        event: I18nEventType.NAMESPACE_LOAD,
        locale: context.currentLocale,
        namespace: context.namespace,
        keyCount,
        correlationId
      });
    } else {
      this.logger.error('Namespace loading failed', {
        event: I18nEventType.NAMESPACE_LOAD,
        locale: context.currentLocale,
        namespace: context.namespace,
        correlationId,
        error: error ? {
          name: error.name,
          message: error.message
        } : undefined
      });
    }
  }

  /**
   * Get translation miss statistics
    */
  getTranslationMissStats(): {
    totalMisses: number;
    missesByLocale: Record<string, number>;
    missesByNamespace: Record<string, number>;
    recentMisses: TranslationMiss[];
  } {
    const misses = Array.from(this.translationMisses.values());
    const missesByLocale: Record<string, number> = {};
    const missesByNamespace: Record<string, number> = {};

    misses.forEach(miss => {
      missesByLocale[miss.locale] = (missesByLocale[miss.locale] || 0) + 1;
      missesByNamespace[miss.namespace] = (missesByNamespace[miss.namespace] || 0) + 1;
    });

    // Get recent misses (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentMisses = misses.filter(miss => miss.timestamp > oneDayAgo);

    return {
      totalMisses: misses.length,
      missesByLocale,
      missesByNamespace,
      recentMisses
    };
  }

  /**
   * Clear translation miss tracking
    */
  clearTranslationMisses(): number {
    const count = this.translationMisses.size;
    this.translationMisses.clear();
    this.logger.info('Translation misses cleared', { count });
    return count;
  }

  /**
   * Log with correlation context
    */
  withCorrelation<T>(correlationId: string, callback: () => T): T {
    // Note: Implementation pending for correlation tracking
    return callback();
  }

  /**
   * Get logger statistics
    */
  getStats(): {
    totalLogs: number;
    translationMisses: number;
    supportedLocales: string[];
    mostUsedLocale: string;
  } {
    const missStats = this.getTranslationMissStats();
    const locales = Object.keys(missStats.missesByLocale);
    const mostUsedLocale = locales.reduce((prev, current) =>
      (missStats.missesByLocale[prev] || 0) > (missStats.missesByLocale[current] || 0) ? prev : current
    , locales[0] || 'en');

    return {
      totalLogs: 0, // Would be tracked in a full implementation
      translationMisses: missStats.totalMisses,
      supportedLocales: locales,
      mostUsedLocale
    };
  }
}

/**
 * Global i18n logger instance
  */
export const i18nLogger = new I18nLogger();

/**
 * Convenience functions for common i18n logging scenarios
  */
export const i18nLogging = {
  /**
   * Log missing translation key
    */
  missingKey: (key: string, locale: string, namespace: string = 'common') => {
    i18nLogger.translationMiss({
      key,
      currentLocale: locale,
      namespace
    });
  },

  /**
   * Log locale switch
    */
  switchLocale: (fromLocale: string, toLocale: string, userId?: string) => {
    i18nLogger.localeChange({
      currentLocale: fromLocale,
      requestedLocale: toLocale,
      userId
    }, 'user_selection');
  },

  /**
   * Log content loading performance
    */
  loadPerformance: (locale: string, namespace: string, loadTime: number) => {
    i18nLogger.contentLoad({ currentLocale: locale, namespace }, true, loadTime);
  },

  /**
   * Log format operation
    */
  formatOperation: (type: 'currency' | 'date' | 'number', locale: string, value: any, result: string) => {
    const context = { currentLocale: locale };

    switch (type) {
      case 'currency':
        i18nLogger.currencyFormat(context, value, result);
        break;
      case 'date':
        i18nLogger.dateFormat(context, value, 'default', result);
        break;
      case 'number':
        i18nLogger.numberFormat(context, value, result);
        break;
    }
  }
};

/**
 * i18n logger middleware for Express
  */
export const i18nLoggerMiddleware = (req: any, res: any, next: any) => {
  // Add i18n context to request
  req.i18nLogger = i18nLogger;
  req.i18nContext = {
    sessionId: req.sessionID,
    userId: req.user?.id,
    userAgent: req.get('User-Agent'),
    acceptLanguage: req.get('Accept-Language'),
    currentLocale: req.locale || req.language
  };

  next();
};

/**
 * React hook for i18n logging (if using in frontend)
  */
export const useI18nLogging = () => {
  return {
    logMissingKey: i18nLogging.missingKey,
    logLocaleSwitch: i18nLogging.switchLocale,
    logFormatOperation: i18nLogging.formatOperation
  };
};

/**
 * Default export
  */
export default I18nLogger;