import { logger } from '@cvplus/core';

/**
 * @fileoverview Comprehensive formatting utilities for CVPlus i18n
 * Provides locale-aware formatting for various data types
  */

// NOTE: Missing dependency - install libphonenumber-js
// import { parsePhoneNumber, AsYouType, getCountryCallingCode } from 'libphonenumber-js';
const parsePhoneNumber = null as any; // Placeholder
const AsYouType = null as any; // Placeholder
const getCountryCallingCode = null as any; // Placeholder
import type { SupportedLanguage } from '../types';
import { LANGUAGE_CONFIG } from '../constants';

/**
 * Format phone number with international standards
  */
export function formatPhoneNumber(
  phone: string, 
  country: string, 
  format: 'national' | 'international' | 'e164' | 'rfc3966' = 'national'
): string {
  try {
    const phoneNumber = parsePhoneNumber(phone, country as any);
    
    if (!phoneNumber?.isValid()) {
      return phone;
    }
    
    switch (format) {
      case 'international':
        return phoneNumber.formatInternational();
      case 'e164':
        return phoneNumber.format('E.164');
      case 'rfc3966':
        return phoneNumber.format('RFC3966');
      case 'national':
      default:
        return phoneNumber.formatNational();
    }
  } catch (error) {
    logger.warn('Phone number formatting error:', error);
    return phone;
  }
}

/**
 * Format phone number as user types
  */
export function formatPhoneAsYouType(
  phone: string,
  country: string
): string {
  try {
    const formatter = new AsYouType(country as any);
    return formatter.input(phone);
  } catch (error) {
    logger.warn('Phone number as-you-type formatting error:', error);
    return phone;
  }
}

/**
 * Format address based on country conventions
  */
export function formatAddress(
  address: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  },
  countryCode: string,
  format: 'single-line' | 'multi-line' = 'multi-line'
): string {
  const { street, city, state, postalCode, country } = address;
  
  const parts: string[] = [];
  
  // Different countries have different address formats
  switch (countryCode.toUpperCase()) {
    case 'US':
    case 'CA':
      // North American format
      if (street) parts.push(street);
      const cityStateZip = [city, state, postalCode].filter(Boolean).join(', ');
      if (cityStateZip) parts.push(cityStateZip);
      if (country && country !== countryCode) parts.push(country);
      break;
      
    case 'GB':
      // UK format
      if (street) parts.push(street);
      if (city) parts.push(city);
      if (postalCode) parts.push(postalCode);
      if (country && country !== countryCode) parts.push(country);
      break;
      
    case 'DE':
    case 'AT':
    case 'CH':
      // German-speaking countries format
      if (street) parts.push(street);
      const zipCity = [postalCode, city].filter(Boolean).join(' ');
      if (zipCity) parts.push(zipCity);
      if (country && country !== countryCode) parts.push(country);
      break;
      
    case 'FR':
      // French format
      if (street) parts.push(street);
      const zipCityFr = [postalCode, city].filter(Boolean).join(' ');
      if (zipCityFr) parts.push(zipCityFr);
      if (country && country !== countryCode) parts.push(country);
      break;
      
    case 'JP':
      // Japanese format (reverse order)
      if (country && country !== countryCode) parts.push(country);
      const zipPrefCity = [postalCode, state, city].filter(Boolean).join(' ');
      if (zipPrefCity) parts.push(zipPrefCity);
      if (street) parts.push(street);
      break;
      
    default:
      // Default international format
      if (street) parts.push(street);
      if (city) parts.push(city);
      if (state) parts.push(state);
      if (postalCode) parts.push(postalCode);
      if (country) parts.push(country);
  }
  
  return format === 'single-line' ? parts.join(', ') : parts.join('\n');
}

/**
 * Format name based on cultural conventions
  */
export function formatName(
  name: {
    first?: string;
    middle?: string;
    last?: string;
    prefix?: string;
    suffix?: string;
  },
  language: SupportedLanguage,
  format: 'full' | 'first-last' | 'last-first' | 'initials' = 'full'
): string {
  const { first, middle, last, prefix, suffix } = name;
  
  const parts: string[] = [];
  
  switch (format) {
    case 'full':
      if (prefix) parts.push(prefix);
      if (first) parts.push(first);
      if (middle) parts.push(middle);
      if (last) parts.push(last);
      if (suffix) parts.push(suffix);
      break;
      
    case 'first-last':
      if (first) parts.push(first);
      if (last) parts.push(last);
      break;
      
    case 'last-first':
      // Common in East Asian cultures
      if (language === 'zh' || language === 'ja') {
        if (last) parts.push(last);
        if (first) parts.push(first);
      } else {
        if (last) parts.push(`${last},`);
        if (first) parts.push(first);
      }
      break;
      
    case 'initials':
      if (first) parts.push(first.charAt(0).toUpperCase() + '.');
      if (middle) parts.push(middle.charAt(0).toUpperCase() + '.');
      if (last) parts.push(last.charAt(0).toUpperCase() + '.');
      break;
  }
  
  return parts.join(' ');
}

/**
 * Format file size with locale-appropriate units
  */
export function formatFileSize(
  bytes: number,
  language: SupportedLanguage,
  decimals = 2
): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  const value = parseFloat((bytes / Math.pow(k, i)).toFixed(decimals));
  const locale = LANGUAGE_CONFIG[language]?.locale || 'en-US';
  
  const formattedValue = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
  
  return `${formattedValue} ${sizes[i]}`;
}

/**
 * Format duration (seconds) into human-readable time
  */
export function formatDuration(
  seconds: number,
  language: SupportedLanguage,
  format: 'short' | 'long' = 'short'
): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  const locale = LANGUAGE_CONFIG[language]?.locale || 'en-US';
  
  if (format === 'long') {
    const parts: string[] = [];
    
    if (hours > 0) {
      const hourFormat = new Intl.NumberFormat(locale, { style: 'unit', unit: 'hour' });
      parts.push(hourFormat.format(hours));
    }
    
    if (minutes > 0) {
      const minuteFormat = new Intl.NumberFormat(locale, { style: 'unit', unit: 'minute' });
      parts.push(minuteFormat.format(minutes));
    }
    
    if (remainingSeconds > 0 || parts.length === 0) {
      const secondFormat = new Intl.NumberFormat(locale, { style: 'unit', unit: 'second' });
      parts.push(secondFormat.format(remainingSeconds));
    }
    
    return parts.join(', ');
  } else {
    // Short format (HH:MM:SS or MM:SS)
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  }
}

/**
 * Format list of items with locale-appropriate conjunctions
  */
export function formatList(
  items: string[],
  language: SupportedLanguage,
  style: 'conjunction' | 'disjunction' = 'conjunction'
): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0] || '';
  
  const locale = LANGUAGE_CONFIG[language]?.locale || 'en-US';
  
  try {
    // Check if Intl.ListFormat is available
    if (typeof (Intl as any).ListFormat === 'function') {
      return new (Intl as any).ListFormat(locale, {
        style: 'long',
        type: style === 'conjunction' ? 'conjunction' : 'disjunction'
      }).format(items);
    }
  } catch (error) {
    // Fall through to fallback
  }
  
  // Fallback for older browsers or when Intl.ListFormat is not available
  const itemsCopy = [...items];
  const lastItem = itemsCopy.pop()!;
  const connector = style === 'conjunction' ? ' and ' : ' or ';
  return itemsCopy.length > 0 ? `${itemsCopy.join(', ')}${connector}${lastItem}` : lastItem;
}

/**
 * Format number ranges (e.g., "1-5", "1 to 5")
  */
export function formatRange(
  min: number,
  max: number,
  language: SupportedLanguage,
  options?: Intl.NumberFormatOptions
): string {
  const locale = LANGUAGE_CONFIG[language]?.locale || 'en-US';
  
  try {
    const formatter = new Intl.NumberFormat(locale, options);
    
    // Use Intl.NumberFormat.formatRange if available
    if ('formatRange' in formatter) {
      return (formatter as any).formatRange(min, max);
    }
    
    // Fallback
    const formattedMin = formatter.format(min);
    const formattedMax = formatter.format(max);
    
    // Use appropriate range separator based on locale
    const separator = language === 'de' ? ' bis ' : 
                     language === 'fr' ? ' à ' :
                     language === 'es' ? ' a ' :
                     language === 'pt' ? ' a ' :
                     language === 'ru' ? ' до ' :
                     ' to ';
    
    return `${formattedMin}${separator}${formattedMax}`;
  } catch (error) {
    logger.warn('Range formatting error:', error);
    return `${min} - ${max}`;
  }
}

/**
 * Format percentile (e.g., "95th percentile")
  */
export function formatPercentile(
  percentile: number,
  language: SupportedLanguage
): string {
  const locale = LANGUAGE_CONFIG[language]?.locale || 'en-US';
  
  try {
    return new Intl.NumberFormat(locale, { 
      style: 'unit', 
      unit: 'percent' 
    }).format(percentile);
  } catch (error) {
    // Fallback with ordinal indicators
    const ordinalRules = new Intl.PluralRules(locale, { type: 'ordinal' });
    const ordinalSuffixes: Record<string, Record<string, string>> = {
      en: { one: 'st', two: 'nd', few: 'rd', other: 'th' },
      // Add more languages as needed
    };
    
    const rule = ordinalRules.select(percentile);
    const suffix = ordinalSuffixes[language]?.[rule] || 'th';
    
    return `${percentile}${suffix} percentile`;
  }
}

/**
 * Format coordinate (latitude/longitude)
  */
export function formatCoordinate(
  coordinate: number,
  type: 'latitude' | 'longitude',
  language: SupportedLanguage,
  format: 'decimal' | 'dms' = 'decimal'
): string {
  if (format === 'decimal') {
    const locale = LANGUAGE_CONFIG[language]?.locale || 'en-US';
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 6,
      maximumFractionDigits: 6,
    }).format(coordinate);
  }
  
  // Degrees, Minutes, Seconds format
  const abs = Math.abs(coordinate);
  const degrees = Math.floor(abs);
  const minutes = Math.floor((abs - degrees) * 60);
  const seconds = Math.round(((abs - degrees) * 60 - minutes) * 60 * 100) / 100;
  
  const direction = type === 'latitude' 
    ? (coordinate >= 0 ? 'N' : 'S')
    : (coordinate >= 0 ? 'E' : 'W');
  
  return `${degrees}°${minutes}'${seconds}"${direction}`;
}

/**
 * Smart truncate text with locale-aware ellipsis
  */
export function formatTruncate(
  text: string,
  maxLength: number,
  language: SupportedLanguage,
  wordBoundary = true
): string {
  if (text.length <= maxLength) return text;
  
  const ellipsis = language === 'zh' || language === 'ja' ? '…' : '...';
  const targetLength = maxLength - ellipsis.length;
  
  if (!wordBoundary) {
    return text.substring(0, targetLength) + ellipsis;
  }
  
  // Find last word boundary
  const truncated = text.substring(0, targetLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > 0) {
    return truncated.substring(0, lastSpace) + ellipsis;
  }
  
  return truncated + ellipsis;
}

export default {
  formatPhoneNumber,
  formatPhoneAsYouType,
  formatAddress,
  formatName,
  formatFileSize,
  formatDuration,
  formatList,
  formatRange,
  formatPercentile,
  formatCoordinate,
  formatTruncate,
};