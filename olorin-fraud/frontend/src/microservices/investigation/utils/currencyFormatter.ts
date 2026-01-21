/**
 * Currency Formatter Utility
 * Feature: 025-financial-analysis-frontend
 *
 * Configuration-driven currency formatting for financial displays.
 */

import { getFinancialConfig } from '../config/financialConfig';

/**
 * Safely convert value to a number, defaulting to 0 for null/undefined/NaN.
 */
function safeNumber(value: number | null | undefined): number {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 0;
  }
  return value;
}

/**
 * Format a number as currency using configured locale and currency code.
 */
export function formatCurrency(value: number | null | undefined): string {
  const config = getFinancialConfig();
  return new Intl.NumberFormat(config.currencyLocale, {
    style: 'currency',
    currency: config.currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safeNumber(value));
}

/**
 * Format a number as currency with decimal places for detailed views.
 */
export function formatCurrencyDetailed(value: number | null | undefined): string {
  const config = getFinancialConfig();
  return new Intl.NumberFormat(config.currencyLocale, {
    style: 'currency',
    currency: config.currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeNumber(value));
}

/**
 * Format a number as compact currency (e.g., $1.2M, $500K).
 */
export function formatCurrencyCompact(value: number | null | undefined): string {
  const config = getFinancialConfig();
  return new Intl.NumberFormat(config.currencyLocale, {
    style: 'currency',
    currency: config.currencyCode,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(safeNumber(value));
}

/**
 * Format a percentage value (0-1 range) as display percentage.
 */
export function formatPercentage(value: number | null | undefined): string {
  const config = getFinancialConfig();
  return new Intl.NumberFormat(config.currencyLocale, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(safeNumber(value));
}

/**
 * Format a number with thousands separators.
 */
export function formatNumber(value: number | null | undefined): string {
  const config = getFinancialConfig();
  return new Intl.NumberFormat(config.currencyLocale).format(safeNumber(value));
}

/**
 * Determine if a net value is positive, negative, or zero.
 */
export function getNetValueStatus(netValue: number | null | undefined): 'positive' | 'negative' | 'zero' {
  const safeValue = safeNumber(netValue);
  if (safeValue > 0) return 'positive';
  if (safeValue < 0) return 'negative';
  return 'zero';
}

/**
 * Get CSS class for net value display based on value.
 */
export function getNetValueColorClass(netValue: number | null | undefined): string {
  const status = getNetValueStatus(netValue);
  switch (status) {
    case 'positive':
      return 'text-green-600';
    case 'negative':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
}

/**
 * Get CSS class for confidence level badge.
 */
export function getConfidenceColorClass(level: 'high' | 'medium' | 'low'): string {
  switch (level) {
    case 'high':
      return 'bg-green-100 text-green-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'low':
      return 'bg-red-100 text-red-800';
  }
}
