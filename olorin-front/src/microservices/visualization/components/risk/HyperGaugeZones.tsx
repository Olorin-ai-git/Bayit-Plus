/**
 * HyperGauge Risk Zones Component
 * Task: T026 (extracted from HyperGauge.tsx)
 * Feature: 002-visualization-microservice
 *
 * Renders color-coded risk zone arcs on the gauge.
 */

import React from 'react';
import { RiskZone } from '@shared/types/AgentRiskGauges';
import { arcPath, valueToAngle } from './HyperGaugeHelpers';

export interface HyperGaugeZonesProps {
  /** Center X coordinate */
  cx: number;

  /** Center Y coordinate */
  cy: number;

  /** Gauge radius */
  radius: number;

  /** Gauge size for stroke width calculation */
  size: number;

  /** Maximum value on the scale */
  max: number;

  /** Start angle in degrees */
  startAngle: number;

  /** End angle in degrees */
  endAngle: number;

  /** Risk zone definitions */
  zones: RiskZone[];
}

/**
 * Renders color-coded risk zone arcs
 * Each zone is displayed as a colored arc segment
 */
export const HyperGaugeZones: React.FC<HyperGaugeZonesProps> = ({
  cx,
  cy,
  radius,
  size,
  max,
  startAngle,
  endAngle,
  zones,
}) => {
  return (
    <>
      {zones.map((z, i) => (
        <path
          key={i}
          d={arcPath(
            cx,
            cy,
            radius,
            valueToAngle(z.start, max, startAngle, endAngle),
            valueToAngle(z.end, max, startAngle, endAngle)
          )}
          stroke={z.color}
          strokeWidth={size * 0.065}
          strokeLinecap="round"
          fill="none"
          opacity={0.6}
        />
      ))}
    </>
  );
};

HyperGaugeZones.displayName = 'HyperGaugeZones';
