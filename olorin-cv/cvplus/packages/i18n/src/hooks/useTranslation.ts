/**
 * @fileoverview Enhanced useTranslation hook with comprehensive i18n features
 * Provides React integration for CVPlus i18n system with formatting and RTL support
  */

import { useCallback, useMemo, useState, useEffect } from 'react';
import { useTranslation as useI18nTranslation } from 'react-i18next';
import { logger } from '@cvplus/core';

import type {
  SupportedLanguage,
  I18nHookReturn,
  TranslationOptions,
  DateFormatOptions,
  NumberFormatOptions,
  CurrencyFormatOptions,
  PhoneFormatOptions
} from '../types';

import { translationService } from '../services/translation.service';
import { LANGUAGE_CONFIG } from '../constants';
import { formatPhoneNumber } from '../utils/formatters';

export function useTranslation(namespace?: string): I18nHookReturn {
  const { t: i18nT, i18n } = useI18nTranslation(namespace);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const currentLanguage = (i18n.language || 'en') as SupportedLanguage;
  const currentLangConfig = LANGUAGE_CONFIG[currentLanguage] || LANGUAGE_CONFIG.en;
  const isRTL = currentLangConfig.dir === 'rtl';
  const locale = currentLangConfig.locale;

  /**
   * Enhanced translation function with error handling
    */
  const t = useCallback((key: string, options?: TranslationOptions): string => {
    try {
      setError(null);
      return translationService.translate(key, options);
    } catch (err) {
      setError(err as Error);
      logger.warn(`Translation error for key "${key}":`, err);
      return options?.defaultValue || key;
    }
  }, []);

  /**
   * Change language with loading state management
    */
  const changeLanguage = useCallback(async (language: SupportedLanguage): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      await translationService.changeLanguage(language);
      
      // Update document attributes
      const langConfig = LANGUAGE_CONFIG[language];
      document.documentElement.dir = langConfig.dir;
      document.documentElement.lang = language;
      
      // Add/remove RTL class for styling
      if (langConfig.dir === 'rtl') {
        document.documentElement.classList.add('rtl');
        document.documentElement.classList.remove('ltr');
      } else {
        document.documentElement.classList.add('ltr');
        document.documentElement.classList.remove('rtl');
      }
      
      // Store preference
      localStorage.setItem('cvplus-language', language);
      
    } catch (err) {
      setError(err as Error);
      logger.error('Failed to change language:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Format date with locale-specific options
    */
  const formatDate = useCallback((
    date: Date | string,
    options?: DateFormatOptions
  ): string => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      if (options?.relative) {
        const now = new Date();
        const diffMs = dateObj.getTime() - now.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        
        return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
          .format(diffDays, 'day');
      }
      
      const formatOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        ...options
      };
      
      // Use format shortcuts
      if (options?.format) {
        switch (options.format) {
          case 'short':
            formatOptions.dateStyle = 'short';
            break;
          case 'medium':
            formatOptions.dateStyle = 'medium';
            break;
          case 'long':
            formatOptions.dateStyle = 'long';
            break;
          case 'full':
            formatOptions.dateStyle = 'full';
            break;
        }
      }
      
      return new Intl.DateTimeFormat(locale, formatOptions).format(dateObj);
    } catch (error) {
      logger.error('Date formatting error:', error);
      const fallbackDate = typeof date === 'string' ? new Date(date) : date;
      return fallbackDate.toLocaleDateString();
    }
  }, [locale]);

  /**
   * Format number with locale-specific options
    */
  const formatNumber = useCallback((
    num: number,
    options?: NumberFormatOptions
  ): string => {
    try {
      const formatOptions: Intl.NumberFormatOptions = { ...options };
      
      if (options?.format) {
        switch (options.format) {
          case 'currency':
            formatOptions.style = 'currency';
            formatOptions.currency = formatOptions.currency || currentLangConfig.currency;
            break;
          case 'percent':
            formatOptions.style = 'percent';
            break;
          case 'decimal':
            formatOptions.style = 'decimal';
            break;
        }
      }
      
      if (options?.compact) {
        formatOptions.notation = 'compact';
        formatOptions.compactDisplay = 'short';
      }
      
      return new Intl.NumberFormat(locale, formatOptions).format(num);
    } catch (error) {
      logger.error('Number formatting error:', error);
      return num.toString();
    }
  }, [locale, currentLangConfig.currency]);

  /**
   * Format currency with locale-specific options
    */
  const formatCurrency = useCallback((
    amount: number,
    options?: CurrencyFormatOptions
  ): string => {
    try {
      const currency = options?.currency || currentLangConfig.currency;
      const precision = options?.precision;
      
      const formatOptions: Intl.NumberFormatOptions = {
        style: 'currency',
        currency,
        currencyDisplay: options?.display || 'symbol'
      };
      
      if (precision !== undefined) {
        formatOptions.minimumFractionDigits = precision;
        formatOptions.maximumFractionDigits = precision;
      } else {
        // Smart precision based on amount
        if (amount >= 1000000) {
          formatOptions.minimumFractionDigits = 0;
          formatOptions.maximumFractionDigits = 0;
        } else if (amount >= 100) {
          formatOptions.minimumFractionDigits = 0;
          formatOptions.maximumFractionDigits = 2;
        } else {
          formatOptions.minimumFractionDigits = 2;
          formatOptions.maximumFractionDigits = 2;
        }
      }
      
      return new Intl.NumberFormat(locale, formatOptions).format(amount);
    } catch (error) {
      logger.error('Currency formatting error:', error);
      const currency = options?.currency || currentLangConfig.currency;
      return `${currency} ${amount}`;
    }
  }, [locale, currentLangConfig.currency]);

  /**
   * Format phone number with international standards
    */
  const formatPhone = useCallback((
    phone: string,
    options?: PhoneFormatOptions
  ): string => {
    try {
      const country = options?.country || currentLangConfig.countryCode;
      const format = options?.format || 'national';
      
      return formatPhoneNumber(phone, country, format);
    } catch (error) {
      logger.error('Phone formatting error:', error);
      return phone;
    }
  }, [currentLangConfig.countryCode]);

  /**
   * Format percentage with locale-specific options
    */
  const formatPercentage = useCallback((
    value: number,
    decimals = 1
  ): string => {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value / 100);
    } catch (error) {
      logger.error('Percentage formatting error:', error);
      return `${value}%`;
    }
  }, [locale]);

  /**
   * Format relative time (e.g., "2 days ago", "in 3 hours")
    */
  const formatRelativeTime = useCallback((
    date: Date | string,
    unit?: Intl.RelativeTimeFormatUnit
  ): string => {
    try {
      const targetDate = typeof date === 'string' ? new Date(date) : date;
      const now = new Date();
      const diffMs = targetDate.getTime() - now.getTime();
      
      let value: number;
      let resolvedUnit: Intl.RelativeTimeFormatUnit;
      
      if (unit) {
        resolvedUnit = unit;
        switch (unit) {
          case 'second':
            value = Math.round(diffMs / 1000);
            break;
          case 'minute':
            value = Math.round(diffMs / (1000 * 60));
            break;
          case 'hour':
            value = Math.round(diffMs / (1000 * 60 * 60));
            break;
          case 'day':
            value = Math.round(diffMs / (1000 * 60 * 60 * 24));
            break;
          case 'week':
            value = Math.round(diffMs / (1000 * 60 * 60 * 24 * 7));
            break;
          case 'month':
            value = Math.round(diffMs / (1000 * 60 * 60 * 24 * 30));
            break;
          case 'year':
            value = Math.round(diffMs / (1000 * 60 * 60 * 24 * 365));
            break;
          default:
            value = Math.round(diffMs / 1000);
            resolvedUnit = 'second';
        }
      } else {
        // Auto-select appropriate unit
        const absDiffMs = Math.abs(diffMs);
        
        if (absDiffMs < 60000) { // < 1 minute
          value = Math.round(diffMs / 1000);
          resolvedUnit = 'second';
        } else if (absDiffMs < 3600000) { // < 1 hour
          value = Math.round(diffMs / (1000 * 60));
          resolvedUnit = 'minute';
        } else if (absDiffMs < 86400000) { // < 1 day
          value = Math.round(diffMs / (1000 * 60 * 60));
          resolvedUnit = 'hour';
        } else if (absDiffMs < 2592000000) { // < 30 days
          value = Math.round(diffMs / (1000 * 60 * 60 * 24));
          resolvedUnit = 'day';
        } else if (absDiffMs < 31536000000) { // < 1 year
          value = Math.round(diffMs / (1000 * 60 * 60 * 24 * 30));
          resolvedUnit = 'month';
        } else {
          value = Math.round(diffMs / (1000 * 60 * 60 * 24 * 365));
          resolvedUnit = 'year';
        }
      }
      
      return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
        .format(value, resolvedUnit);
    } catch (error) {
      logger.error('Relative time formatting error:', error);
      return formatDate(date);
    }
  }, [locale, formatDate]);

  // Setup error handling
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.error && event.error.code?.startsWith('I18N_')) {
        setError(event.error);
      }
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Return memoized hook result
  return useMemo(() => ({
    t,
    i18n,
    changeLanguage,
    currentLanguage,
    languages: LANGUAGE_CONFIG,
    isRTL,
    direction: currentLangConfig.dir,
    locale,
    formatDate,
    formatNumber,
    formatCurrency,
    formatPhone,
    formatPercentage,
    formatRelativeTime,
    isLoading,
    error,
  }), [
    t,
    i18n,
    changeLanguage,
    currentLanguage,
    isRTL,
    currentLangConfig.dir,
    locale,
    formatDate,
    formatNumber,
    formatCurrency,
    formatPhone,
    formatPercentage,
    formatRelativeTime,
    isLoading,
    error,
  ]);
}

export default useTranslation;