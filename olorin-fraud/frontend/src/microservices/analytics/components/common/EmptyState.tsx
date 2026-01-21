/**
 * Empty State Component for Analytics Microservice.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import React from 'react';

export interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  icon,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-12 text-center ${className}`}
      role="status"
      aria-label={title}
    >
      {icon && (
        <div
          className="mb-4 text-corporate-textTertiary opacity-50"
          aria-hidden="true"
        >
          {icon}
        </div>
      )}

      <h3 className="text-xl font-semibold text-corporate-textPrimary mb-2">
        {title}
      </h3>

      {message && (
        <p className="text-sm text-corporate-textSecondary max-w-md mb-6">
          {message}
        </p>
      )}

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-2 bg-corporate-accentPrimary text-white rounded-lg font-medium hover:bg-corporate-accentPrimaryHover transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-corporate-accentPrimary focus:ring-offset-2"
          aria-label={actionLabel}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;

