/**
 * Event Routing System - Barrel Export
 * Central export point for all routing functionality
 */

export { EventRouter } from './router';
export { RoutingEngine } from './routing-engine';
export { DataTransform } from './data-transform';
export { createDefaultRules } from './default-rules';
export type {
  RoutingRule,
  TargetEvent,
  RoutingCondition,
  ConditionOperator,
  EventTransform,
  AggregationConfig,
  RoutePriority,
  RoutingMetrics,
  RoutingError,
  RoutingContext
} from './types';
