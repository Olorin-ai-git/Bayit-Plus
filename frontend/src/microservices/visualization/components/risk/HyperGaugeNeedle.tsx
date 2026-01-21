/**
 * HyperGauge Needle Component
 * Task: T026 (extracted from HyperGauge.tsx)
 * Feature: 002-visualization-microservice
 *
 * Renders animated needle pointer with center hub.
 */

import React from 'react';

export interface HyperGaugeNeedleProps {
  /** Center X coordinate */
  cx: number;

  /** Center Y coordinate */
  cy: number;

  /** Needle tip X coordinate */
  nx: number;

  /** Needle tip Y coordinate */
  ny: number;

  /** Needle color */
  color: string;
}

/**
 * Animated needle pointer with glow effect and center hub
 */
export const HyperGaugeNeedle: React.FC<HyperGaugeNeedleProps> = ({
  cx,
  cy,
  nx,
  ny,
  color,
}) => {
  return (
    <g>
      {/* Needle with glow */}
      <g filter="url(#needle-glow)">
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth={3.5} />
        <circle cx={cx} cy={cy} r={7} fill={color} />
      </g>

      {/* Center hub */}
      <circle cx={cx} cy={cy} r={11} fill="#0b1220" stroke="#2a3347" strokeWidth={2.5} />
      <circle cx={cx} cy={cy} r={5} fill="#0b1220" stroke="#435068" strokeWidth={1.5} />
    </g>
  );
};

HyperGaugeNeedle.displayName = 'HyperGaugeNeedle';
