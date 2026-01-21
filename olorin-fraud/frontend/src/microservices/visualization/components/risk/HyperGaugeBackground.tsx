/**
 * HyperGauge Background Component
 * Task: T026 (extracted from HyperGauge.tsx)
 * Feature: 002-visualization-microservice
 *
 * SVG background circles, bezel effects, and gauge track rendering.
 */

import React from 'react';
import { arcPath } from './HyperGaugeHelpers';

export interface HyperGaugeBackgroundProps {
  /** Center X coordinate */
  cx: number;

  /** Center Y coordinate */
  cy: number;

  /** Gauge size in pixels */
  size: number;

  /** Gauge radius */
  radius: number;

  /** Start angle in degrees */
  startAngle: number;

  /** End angle in degrees */
  endAngle: number;

  /** Enable realistic glass/bezel effects */
  realistic?: boolean;
}

/**
 * SVG background and track for HyperGauge
 * Includes bezel gradient, noise filter, and gauge track arc
 */
export const HyperGaugeBackground: React.FC<HyperGaugeBackgroundProps> = ({
  cx,
  cy,
  size,
  radius,
  startAngle,
  endAngle,
  realistic = true,
}) => {
  return (
    <g>
      {/* Background circle */}
      <circle cx={cx} cy={cy} r={size * 0.49} fill="#070b14" />

      {/* Bezel gradient with optional bloom filter */}
      <circle
        cx={cx}
        cy={cy}
        r={size * 0.49}
        fill="url(#bezelGrad)"
        filter={realistic ? 'url(#bloom)' : undefined}
      />

      {/* Noise texture overlay */}
      <circle cx={cx} cy={cy} r={size * 0.49} filter="url(#noise)" />

      {/* Gauge track arc */}
      <path
        d={arcPath(cx, cy, radius, startAngle, endAngle)}
        stroke="url(#trackGrad)"
        strokeWidth={size * 0.1}
        fill="none"
        opacity={0.95}
      />
    </g>
  );
};

HyperGaugeBackground.displayName = 'HyperGaugeBackground';
