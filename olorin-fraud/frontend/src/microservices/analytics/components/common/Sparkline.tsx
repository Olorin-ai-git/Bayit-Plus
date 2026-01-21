/**
 * Sparkline Component - Mini trend chart using SVG
 * Uses Olorin glassmorphic styling with dark/neon theme
 */

import React, { useMemo } from 'react';

export interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 100,
  height = 30,
  color = '#A855F7',
  strokeWidth = 2,
  className = '',
}) => {
  const path = useMemo(() => {
    if (data.length === 0) return '';

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => {
      const x = (index / (data.length - 1 || 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  }, [data, width, height]);

  if (data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ width, height }}
        aria-label="No data"
      >
        <span className="text-xs text-corporate-textTertiary">No data</span>
      </div>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      className={className}
      aria-label="Trend sparkline"
      role="img"
    >
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

