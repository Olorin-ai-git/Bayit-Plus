/**
 * SkeletonLoader Component - Loading skeleton for tables/charts
 * Uses Olorin glassmorphic styling with dark/neon theme
 */

import React from 'react';

export interface SkeletonLoaderProps {
  variant?: 'table' | 'chart' | 'tile' | 'text';
  rows?: number;
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'text',
  rows = 3,
  className = '',
}) => {
  if (variant === 'table') {
    return (
      <div className={`glass-md rounded-lg border border-corporate-borderPrimary/40 p-4 ${className}`}>
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              className="h-12 bg-corporate-bgTertiary/50 rounded animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'chart') {
    return (
      <div className={`glass-md rounded-lg border border-corporate-borderPrimary/40 p-4 ${className}`}>
        <div className="h-64 bg-corporate-bgTertiary/50 rounded animate-pulse" />
      </div>
    );
  }

  if (variant === 'tile') {
    return (
      <div className={`glass-md rounded-lg border border-corporate-borderPrimary/40 p-4 ${className}`}>
        <div className="h-20 bg-corporate-bgTertiary/50 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-corporate-bgTertiary/50 rounded animate-pulse"
          style={{ width: i === rows - 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  );
};

