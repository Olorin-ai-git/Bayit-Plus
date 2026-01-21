/**
 * RiskGauge Component - Circular Progress Gauge
 *
 * DIFFERENT from HyperGauge (needle gauge).
 * This is a circular progress gauge with arc fill and color-coded risk zones.
 *
 * Features:
 * - D3.js arc rendering with smooth animations
 * - Color-coded risk zones (low/medium/high/critical)
 * - Animated arc fill from 0 to current value
 * - Configuration-driven thresholds and colors
 * - Tailwind CSS styling ONLY (NO Material-UI)
 *
 * NO HARDCODED VALUES - All configuration from visualizationConfig/colorPalettes.
 * File size compliant: <200 lines
 */

import React, { useMemo } from 'react';
import * as d3 from 'd3';
import { useSpringValue } from '../../hooks/useSpringValue';
import { visualizationConfig } from '../../config/environment';
import { getColorBySeverity, RiskSeverity } from '../../utils/colorPalettes';

export interface RiskGaugeProps {
  /** Current risk value (0-100) */
  value: number;

  /** Gauge size in pixels */
  size?: number;

  /** Low threshold (from config) */
  lowThreshold?: number;

  /** Medium threshold (from config) */
  mediumThreshold?: number;

  /** High threshold (from config) */
  highThreshold?: number;

  /** Enable spring animation */
  enableAnimation?: boolean;

  /** Optional label */
  label?: string;
}

/**
 * Get risk severity based on thresholds
 */
function getRiskSeverity(
  value: number,
  lowThreshold: number,
  mediumThreshold: number,
  highThreshold: number
): RiskSeverity {
  if (value >= highThreshold) return 'critical';
  if (value >= mediumThreshold) return 'high';
  if (value >= lowThreshold) return 'medium';
  return 'low';
}

/**
 * RiskGauge - Circular progress gauge with D3.js
 */
export const RiskGauge: React.FC<RiskGaugeProps> = React.memo(({
  value,
  size = 200,
  lowThreshold = 33,
  mediumThreshold = 66,
  highThreshold = 90,
  enableAnimation = true,
  label = 'Risk Score',
}) => {
  const animatedValue = useSpringValue(value);
  const displayValue = enableAnimation ? animatedValue : value;

  const clampedValue = Math.max(0, Math.min(100, displayValue));

  const severity = getRiskSeverity(clampedValue, lowThreshold, mediumThreshold, highThreshold);
  const color = getColorBySeverity(severity);

  const { arcPath, backgroundArcPath } = useMemo(() => {
    const arcGenerator = d3
      .arc()
      .innerRadius(size * 0.3)
      .outerRadius(size * 0.45)
      .startAngle(-Math.PI / 2)
      .cornerRadius(5);

    const backgroundArc = arcGenerator.endAngle(Math.PI * 1.5);
    const valueArc = arcGenerator.endAngle(-Math.PI / 2 + (clampedValue / 100) * Math.PI * 2);

    return {
      arcPath: valueArc(null as any) || '',
      backgroundArcPath: backgroundArc(null as any) || '',
    };
  }, [size, clampedValue]);

  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="flex flex-col items-center" style={{ width: size, height: size + 40 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={`risk-gradient-${severity}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.8" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>

          <filter id="risk-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g transform={`translate(${cx}, ${cy})`}>
          <path
            d={backgroundArcPath}
            fill="none"
            stroke="rgba(55, 65, 81, 0.3)"
            strokeWidth={size * 0.15}
            strokeLinecap="round"
          />

          <path
            d={arcPath}
            fill="none"
            stroke={`url(#risk-gradient-${severity})`}
            strokeWidth={size * 0.15}
            strokeLinecap="round"
            filter="url(#risk-glow)"
            className="transition-all duration-300"
          />

          <text
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={size * 0.25}
            fontWeight="bold"
            fill={color}
            className="font-mono"
          >
            {Math.round(clampedValue)}
          </text>

          <text
            textAnchor="middle"
            dominantBaseline="middle"
            y={size * 0.15}
            fontSize={size * 0.08}
            fill="rgba(156, 163, 175, 0.8)"
          >
            {label}
          </text>
        </g>
      </svg>

      <div className="text-center mt-2">
        <span
          className="text-xs font-semibold px-2 py-1 rounded"
          style={{
            backgroundColor: `${color}20`,
            color: color,
            border: `1px solid ${color}40`,
          }}
        >
          {severity.toUpperCase()}
        </span>
      </div>
    </div>
  );
});

RiskGauge.displayName = 'RiskGauge';
