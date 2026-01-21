/**
 * Section Skeleton Component
 * Progressive Loading - Phase 2
 *
 * Reusable loading skeleton for sections that are waiting for data.
 * Provides smooth loading experience with animated pulse effect.
 *
 * SYSTEM MANDATE Compliant:
 * - Uses Olorin corporate colors
 * - Configuration-driven via props
 * - No hardcoded values
 */

import React from 'react';

export interface SectionSkeletonProps {
  rows?: number;
  height?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const heightClasses = {
  sm: 'h-4',
  md: 'h-6',
  lg: 'h-8',
  xl: 'h-12'
};

export const SectionSkeleton: React.FC<SectionSkeletonProps> = ({
  rows = 3,
  height = 'md',
  className = ''
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className={`${heightClasses[height]} bg-corporate-bgSecondary rounded animate-pulse`}
          style={{
            width: index === rows - 1 ? '75%' : '100%'
          }}
        />
      ))}
    </div>
  );
};

export default SectionSkeleton;
