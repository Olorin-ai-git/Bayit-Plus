/**
 * KPI Tile Component - Glassmorphic card with gradient for metrics
 * Uses Olorin glassmorphic styling with dark/neon theme
 */

import React from 'react';

export interface KpiTileProps {
  label: string;
  value: string | number;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
  onClick?: () => void;
}

export const KpiTile: React.FC<KpiTileProps> = ({
  label,
  value,
  description,
  trend,
  trendValue,
  className = '',
  onClick,
}) => {
  const trendColors = {
    up: 'text-green-400',
    down: 'text-red-400',
    neutral: 'text-corporate-textSecondary',
  };

  const trendIcon = {
    up: '↑',
    down: '↓',
    neutral: '→',
  };

  const tileClasses = `
    glass-md rounded-lg border border-corporate-borderPrimary/40 p-4
    transition-all duration-200
    ${onClick ? 'cursor-pointer hover:border-corporate-accentPrimary/60 hover:shadow-lg hover:shadow-corporate-accentPrimary/10' : ''}
    ${className}
  `;

  const content = (
    <>
      <div className="flex items-start justify-between mb-2">
        <div className="text-sm font-medium text-corporate-textSecondary">
          {label}
        </div>
        {trend && trendValue && (
          <div className={`text-xs flex items-center gap-1 ${trendColors[trend]}`}>
            <span>{trendIcon[trend]}</span>
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-corporate-textPrimary mb-1">
        {value}
      </div>
      {description && (
        <div className="text-xs text-corporate-textTertiary">
          {description}
        </div>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={tileClasses}
        aria-label={`${label}: ${value}`}
      >
        {content}
      </button>
    );
  }

  return <div className={tileClasses}>{content}</div>;
};

