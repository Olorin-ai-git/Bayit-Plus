/**
 * CurrencyDisplay Component
 * Feature: 025-financial-analysis-frontend
 *
 * Displays formatted currency values with optional compact notation.
 * Uses configuration-driven locale and currency settings.
 */

import React from 'react';
import {
  formatCurrency,
  formatCurrencyCompact,
  formatCurrencyDetailed,
} from '../../utils/currencyFormatter';

interface CurrencyDisplayProps {
  /** The numeric value to display */
  value: number;
  /** Display format: 'standard' for full, 'compact' for abbreviated (e.g., $1.2M), 'detailed' with decimals */
  format?: 'standard' | 'compact' | 'detailed';
  /** Additional CSS classes */
  className?: string;
  /** Show positive values with a + prefix */
  showSign?: boolean;
  /** Aria label for accessibility */
  ariaLabel?: string;
}

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  value,
  format = 'standard',
  className = '',
  showSign = false,
  ariaLabel,
}) => {
  const getFormattedValue = (): string => {
    let formatted: string;
    switch (format) {
      case 'compact':
        formatted = formatCurrencyCompact(value);
        break;
      case 'detailed':
        formatted = formatCurrencyDetailed(value);
        break;
      default:
        formatted = formatCurrency(value);
    }

    if (showSign && value > 0) {
      return `+${formatted}`;
    }
    return formatted;
  };

  const formattedValue = getFormattedValue();
  const label = ariaLabel ?? `Currency value: ${formattedValue}`;

  return (
    <span className={`tabular-nums ${className}`} aria-label={label}>
      {formattedValue}
    </span>
  );
};
