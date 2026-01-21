/**
 * Panel Component - Glassmorphic container with backdrop blur
 * Uses Olorin glassmorphic styling with dark/neon theme
 */

import React, { useState } from 'react';

export interface PanelProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  title?: string;
  subtitle?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export const Panel: React.FC<PanelProps> = ({
  children,
  className = '',
  variant = 'default',
  padding = 'md',
  title,
  subtitle,
  collapsible = false,
  defaultCollapsed = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  
  const baseStyles = 'rounded-lg border transition-all duration-200';

  const variantStyles = {
    default: 'glass border-corporate-borderPrimary/40',
    elevated: 'glass-md border-corporate-borderPrimary/60 shadow-lg shadow-corporate-accentPrimary/10',
    outlined: 'glass-lg border-2 border-corporate-accentPrimary/40',
  };

  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const panelClasses = `${baseStyles} ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`;

  return (
    <div className={panelClasses}>
      {(title || subtitle || collapsible) && (
        <div className={`flex items-center justify-between ${collapsible ? 'cursor-pointer' : ''}`} onClick={() => collapsible && setIsCollapsed(!isCollapsed)}>
          <div className="flex-1">
            {title && (
              <h3 className="text-lg font-semibold text-corporate-textPrimary">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-corporate-textSecondary mt-1">
                {subtitle}
              </p>
            )}
          </div>
          {collapsible && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsCollapsed(!isCollapsed);
              }}
              className="ml-4 px-2 py-1 text-corporate-textSecondary hover:text-corporate-textPrimary transition-colors"
              aria-label={isCollapsed ? 'Expand' : 'Collapse'}
            >
              {isCollapsed ? '▼' : '▲'}
            </button>
          )}
        </div>
      )}
      {!isCollapsed && children}
    </div>
  );
};

