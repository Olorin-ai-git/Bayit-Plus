/**
 * Loading Spinner Component
 *
 * Animated loading indicator with glass styling.
 * Includes accessibility: role="status" and aria-label for screen readers.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fullScreen?: boolean;
  /** Accessible label for screen readers. Defaults to i18n loading key. */
  label?: string;
}

const sizeClasses = {
  sm: 'w-5 h-5 border-2',
  md: 'w-8 h-8 border-3',
  lg: 'w-12 h-12 border-4',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className = '',
  fullScreen = false,
  label,
}) => {
  const { t } = useTranslation();
  const accessibleLabel = label || t('common.loading');

  const spinner = (
    <div
      role="status"
      aria-label={accessibleLabel}
      aria-live="polite"
      className={`
        ${sizeClasses[size]}
        rounded-full
        border-partner-primary/30
        border-t-partner-primary
        animate-spin
        ${className}
      `}
    >
      <span className="sr-only">{accessibleLabel}</span>
    </div>
  );

  if (fullScreen) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-glass-bg/80 backdrop-blur-sm"
        aria-busy="true"
      >
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
