/**
 * HyperGauge Type Definitions
 * Task: T026 (refactored from HyperGauge.tsx)
 * Feature: 002-visualization-microservice
 *
 * Type definitions for HyperGauge component and related utilities.
 */

import { RiskZone } from '../../types/AgentRiskGauges';

/**
 * HyperGauge component props
 */
export interface HyperGaugeProps {
  /** Gauge size in pixels (width and height) */
  size?: number;

  /** Current value to display */
  value: number;

  /** Maximum value on the scale */
  max: number;

  /** Label text */
  label: string;

  /** Optional subtitle text */
  subtitle?: string;

  /** Start angle in degrees (default: -120) */
  startAngle?: number;

  /** End angle in degrees (default: 120) */
  endAngle?: number;

  /** Primary color for gauge (hex) */
  color: string;

  /** Show risk zone arcs */
  showZones?: boolean;

  /** Risk zone definitions */
  zones?: RiskZone[];

  /** Custom value formatter function */
  valueFormatter?: (value: number) => string;

  /** Enable realistic glass/bezel effects */
  realistic?: boolean;

  /** Show tick mark numbers */
  showNumbers?: boolean;

  /** Enable continuous arc fill from start to current value */
  continuousFill?: boolean;

  /** Enable pulse animation (for severe warnings) */
  warnPulse?: boolean;

  /** Animation duration in milliseconds (for ease mode) */
  animationMs?: number;

  /** Needle animation mode: 'spring' (physics-based) or 'ease' (easing function) */
  needleMode?: 'spring' | 'ease';
}

/**
 * Tick mark structure for gauge dial
 */
export interface TickMark {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thick: boolean;
  label?: {
    x: number;
    y: number;
    text: string;
  };
}

/**
 * Validated gauge parameters
 */
export interface ValidatedGaugeParams {
  size: number;
  value: number;
  max: number;
  startAngle: number;
  endAngle: number;
}
