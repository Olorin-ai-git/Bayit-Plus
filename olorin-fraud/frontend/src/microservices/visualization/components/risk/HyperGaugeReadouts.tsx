/**
 * HyperGauge Readouts Component
 * Task: T026 (extracted from HyperGauge.tsx)
 * Feature: 002-visualization-microservice
 *
 * SVG text elements for gauge value display, label, and optional subtitle.
 */

import React from 'react';

export interface HyperGaugeReadoutsProps {
  /** Center X coordinate */
  cx: number;

  /** Center Y coordinate */
  cy: number;

  /** Gauge size in pixels */
  size: number;

  /** Primary color for value display */
  color: string;

  /** Formatted display value */
  display: string;

  /** Label text */
  label: string;

  /** Optional subtitle text */
  subtitle?: string;
}

/**
 * SVG text readouts for HyperGauge
 * Displays value, label, and optional subtitle with color-coded styling
 */
export const HyperGaugeReadouts: React.FC<HyperGaugeReadoutsProps> = ({
  cx,
  cy,
  size,
  color,
  display,
  label,
  subtitle,
}) => {
  return (
    <g>
      {/* Value display */}
      <text
        x={cx}
        y={cy + size * 0.22}
        textAnchor="middle"
        fontSize={size * 0.1}
        fontWeight={800}
        fill={color}
        filter="url(#outer-glow)"
      >
        {display}
      </text>

      {/* Label */}
      <text
        x={cx}
        y={cy + size * 0.32}
        textAnchor="middle"
        fontSize={size * 0.08}
        fill="#b6c2d9"
        opacity={0.85}
      >
        {label}
      </text>

      {/* Optional subtitle */}
      {subtitle && (
        <text
          x={cx}
          y={cy + size * 0.39}
          textAnchor="middle"
          fontSize={size * 0.05}
          fill="#8aa0c5"
          opacity={0.8}
        >
          {subtitle}
        </text>
      )}
    </g>
  );
};

HyperGaugeReadouts.displayName = 'HyperGaugeReadouts';
