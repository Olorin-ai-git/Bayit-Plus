/**
 * WizardButton Component
 * Feature: 004-new-olorin-frontend
 *
 * Reusable button component for Investigation Wizard with Olorin corporate styling.
 * Supports primary/secondary variants and all interaction states.
 */

import React from 'react';
import { olorinColors } from '@shared/styles/olorin-palette';

export type WizardButtonVariant = 'primary' | 'secondary';
export type WizardButtonSize = 'sm' | 'md' | 'lg';

export interface WizardButtonProps {
  /** Button text content */
  children: React.ReactNode;
  /** Button variant (primary = purple accent, secondary = gray) */
  variant?: WizardButtonVariant;
  /** Button size */
  size?: WizardButtonSize;
  /** Click handler */
  onClick?: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Loading state (shows spinner) */
  loading?: boolean;
  /** Full width button */
  fullWidth?: boolean;
  /** Button type for forms */
  type?: 'button' | 'submit' | 'reset';
  /** Additional CSS classes */
  className?: string;
}

/**
 * WizardButton component with Olorin purple styling
 */
export const WizardButton: React.FC<WizardButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false,
  loading = false,
  fullWidth = false,
  type = 'button',
  className = ''
}) => {
  // Base classes (always applied)
  const baseClasses = 'transition-all duration-200 font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2';

  // Variant classes
  const variantClasses = {
    primary: `
      bg-corporate-accentPrimary hover:bg-corporate-accentPrimaryHover
      text-corporate-textPrimary border-2 border-corporate-accentPrimary
      focus:ring-corporate-accentPrimary
      active:scale-95 hover:scale-105 hover:brightness-110
    `,
    secondary: `
      bg-black/30 backdrop-blur hover:bg-corporate-borderSecondary
      text-corporate-textSecondary border-2 border-corporate-borderPrimary
      focus:ring-corporate-borderPrimary
      active:scale-95 hover:scale-105
    `
  };

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  // Width classes
  const widthClasses = fullWidth ? 'w-full' : '';

  // Disabled/Loading classes
  const stateClasses = (disabled || loading)
    ? 'opacity-50 cursor-not-allowed'
    : '';

  // Loading animation classes
  const loadingClasses = loading ? 'animate-pulse' : '';

  // Combine all classes
  const combinedClasses = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    widthClasses,
    stateClasses,
    loadingClasses,
    className
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={combinedClasses}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>{children}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
};
