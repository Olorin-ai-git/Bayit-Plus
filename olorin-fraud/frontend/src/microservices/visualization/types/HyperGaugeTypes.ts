/**
 * TypeScript Types for HyperGauge Component
 *
 * Extracted from HyperGauge.tsx for file size compliance (<200 lines per file).
 * Contains all type definitions for the SVG-based circular gauge with needle.
 *
 * NO HARDCODED VALUES - All configuration sourced from environment/defaults.
 */

import { RiskZone } from '@shared/types/AgentRiskGauges';

/**
 * Main props interface for HyperGauge component
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
 * Tick mark definition for gauge scale
 */
export interface TickMark {
  /** Starting X coordinate */
  x1: number;

  /** Starting Y coordinate */
  y1: number;

  /** Ending X coordinate */
  x2: number;

  /** Ending Y coordinate */
  y2: number;

  /** Whether this is a thick (major) tick mark */
  thick: boolean;

  /** Optional label for major tick marks */
  label?: {
    /** Label X coordinate */
    x: number;

    /** Label Y coordinate */
    y: number;

    /** Label text content */
    text: string;
  };
}

/**
 * Cartesian coordinate point
 */
export interface Point {
  /** X coordinate */
  x: number;

  /** Y coordinate */
  y: number;
}
