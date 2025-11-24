/**
 * Risk Visualization Components - Barrel Export
 * Task: T034 - Phase 3: Risk Visualization
 * Feature: 002-visualization-microservice
 *
 * Centralized exports for all risk gauge components and types.
 */

// Main risk gauge components
export { HyperGauge } from './HyperGauge';
export { RiskGauge } from './RiskGauge';
export { RiskGaugeCard } from './RiskGaugeCard';
export { RiskDashboard } from './RiskDashboard';

// HyperGauge sub-components
export { HyperGaugeBackground } from './HyperGaugeBackground';
export { HyperGaugeNeedle } from './HyperGaugeNeedle';
export { HyperGaugeReadouts } from './HyperGaugeReadouts';
export { HyperGaugeSVGFilters } from './HyperGaugeSVGFilters';
export { HyperGaugeTicks } from './HyperGaugeTicks';
export { HyperGaugeZones } from './HyperGaugeZones';

// Types
export type {
  HyperGaugeProps,
  RiskZone,
  TickMark,
  ValidatedGaugeParams,
} from './HyperGaugeTypes';

// Helper functions
export {
  valueToAngle,
  arcPath,
  polarToCartesian,
  validateGaugeParams,
  generateTickMarks,
  useAnimatedValue,
} from './HyperGaugeHelpers';
