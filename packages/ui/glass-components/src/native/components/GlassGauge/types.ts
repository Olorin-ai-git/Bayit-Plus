/**
 * GlassGauge Types
 *
 * Type definitions for circular gauge component
 */

export interface RiskZone {
  start: number;
  end: number;
  color: string;
}

export interface GlassGaugeProps {
  /** Current value to display */
  value: number;
  /** Maximum value on the scale */
  max: number;
  /** Label text */
  label: string;
  /** Primary color for gauge */
  color: string;
  /** Show risk zone arcs */
  showZones?: boolean;
  /** Risk zone definitions */
  zones?: RiskZone[];
  /** Gauge size in pixels */
  size?: number;
  /** Test ID for testing */
  testID?: string;
}
