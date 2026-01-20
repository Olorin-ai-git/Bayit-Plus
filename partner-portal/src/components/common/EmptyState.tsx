/**
 * Empty State Component
 *
 * Display when no data is available with optional action.
 */

import React from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  className = '',
}) => {
  return (
    <div
      className={`
        flex flex-col items-center justify-center
        py-12 px-6
        text-center
        ${className}
      `}
    >
      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-white/30">
          {icon}
        </div>
      )}

      <h3 className="text-lg font-medium text-white">{title}</h3>

      {description && (
        <p className="mt-2 max-w-sm text-sm text-white/50">{description}</p>
      )}

      {action && (
        <button
          onClick={action.onClick}
          className="
            mt-6 px-6 py-2.5
            rounded-xl
            bg-partner-primary text-white
            font-medium text-sm
            hover:bg-partner-primary/90
            focus:outline-none focus:ring-2 focus:ring-partner-primary/50
            transition-all duration-200
          "
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
