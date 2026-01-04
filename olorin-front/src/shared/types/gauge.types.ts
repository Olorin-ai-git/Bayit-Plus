/**
 * Gauge Component Types
 * Feature: 004-new-olorin-frontend
 *
 * Type definitions for comprehensive gauge visualization system.
 */

export type GaugeSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type GaugeVariant = 'circular' | 'semicircular' | 'linear' | 'radial';
export type GaugeThreshold = 'low' | 'medium' | 'high' | 'critical';

/**
 * Base gauge metric data
 */
export interface GaugeMetric {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  threshold?: GaugeThreshold;
  icon?: string;
}

/**
 * Gauge color configuration
 */
export interface GaugeColorConfig {
  low: string;
  medium: string;
  high: string;
  critical: string;
  background: string;
}

/**
 * Gauge threshold configuration
 */
export interface GaugeThresholdConfig {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

/**
 * Animated gauge state
 */
export interface AnimatedGaugeState {
  currentValue: number;
  targetValue: number;
  isAnimating: boolean;
  animationProgress: number;
}

/**
 * Multi-metric gauge panel data
 */
export interface MetricsGaugePanelData {
  title: string;
  description?: string;
  metrics: GaugeMetric[];
  layout?: 'grid' | 'flex' | 'stack';
}
