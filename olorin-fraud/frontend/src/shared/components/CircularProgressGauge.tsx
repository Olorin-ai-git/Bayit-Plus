/**
 * CircularProgressGauge Component
 * Feature: 004-new-olorin-frontend
 *
 * Full circular gauge with customizable colors, thresholds, and animations.
 * Displays progress from 0-100% with gradient fills and smooth transitions.
 */

import React, { useMemo } from 'react';
import type { GaugeSize, GaugeThreshold } from '@shared/types/gauge.types';

export interface CircularProgressGaugeProps {
  value: number;
  min?: number;
  max?: number;
  size?: GaugeSize;
  thickness?: number;
  showValue?: boolean;
  showLabel?: boolean;
  label?: string;
  unit?: string;
  threshold?: GaugeThreshold;
  animated?: boolean;
  className?: string;
}

/**
 * Circular progress gauge with threshold-based coloring
 */
export const CircularProgressGauge: React.FC<CircularProgressGaugeProps> = ({
  value,
  min = 0,
  max = 100,
  size = 'md',
  thickness = 8,
  showValue = true,
  showLabel = true,
  label,
  unit = '',
  threshold,
  animated = true,
  className = ''
}) => {
  const sizeConfig = {
    xs: { diameter: 64, text: 'text-lg', label: 'text-xs' },
    sm: { diameter: 96, text: 'text-2xl', label: 'text-sm' },
    md: { diameter: 128, text: 'text-3xl', label: 'text-sm' },
    lg: { diameter: 160, text: 'text-4xl', label: 'text-base' },
    xl: { diameter: 192, text: 'text-5xl', label: 'text-lg' }
  };

  const config = sizeConfig[size];
  const radius = (config.diameter - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = ((value - min) / (max - min)) * 100;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getThresholdColor = (): string => {
    if (threshold) {
      const thresholdColors = {
        low: '#10B981',
        medium: '#F59E0B',
        high: '#EF4444',
        critical: '#DC2626'
      };
      return thresholdColors[threshold];
    }

    if (percentage >= 80) return '#DC2626';
    if (percentage >= 60) return '#EF4444';
    if (percentage >= 40) return '#F59E0B';
    return '#10B981';
  };

  const color = getThresholdColor();

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div
        className="relative"
        style={{ width: config.diameter, height: config.diameter }}
      >
        <svg className="transform -rotate-90" width={config.diameter} height={config.diameter}>
          <defs>
            <linearGradient id={`gradient-${value}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity={1} />
              <stop offset="100%" stopColor={color} stopOpacity={0.6} />
            </linearGradient>
          </defs>

          <circle
            cx={config.diameter / 2}
            cy={config.diameter / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={thickness}
            fill="none"
            className="text-corporate-borderPrimary opacity-30"
          />

          <circle
            cx={config.diameter / 2}
            cy={config.diameter / 2}
            r={radius}
            stroke={`url(#gradient-${value})`}
            strokeWidth={thickness}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={animated ? 'transition-all duration-1000 ease-out' : ''}
            style={{ filter: 'drop-shadow(0 0 6px rgba(255, 102, 0, 0.3))' }}
          />
        </svg>

        {showValue && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={`${config.text} font-bold`}
              style={{ color }}
            >
              {Math.round(value)}
            </span>
            {unit && (
              <span className="text-xs text-corporate-textTertiary font-medium">
                {unit}
              </span>
            )}
          </div>
        )}
      </div>

      {showLabel && label && (
        <div className="text-center">
          <p className={`${config.label} font-semibold text-corporate-textPrimary`}>
            {label}
          </p>
          <p className="text-xs text-corporate-textTertiary mt-1">
            {min} - {max} range
          </p>
        </div>
      )}
    </div>
  );
};

export default CircularProgressGauge;
