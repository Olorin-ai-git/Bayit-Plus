/**
 * Type Definitions for Event Routing System
 *
 * Defines interfaces and types for intelligent event routing between
 * Olorin microservices. Supports conditional routing, data transformation,
 * and metrics tracking.
 *
 * @module routing/types
 */

/**
 * Routing rule configuration
 * Defines how events are routed from source to target services
 */
export interface RoutingRule {
  /** Unique rule identifier */
  id: string;
  /** Human-readable rule name */
  name: string;
  /** Rule description */
  description: string;
  /** Source event pattern */
  sourceEvent: string;
  /** Source service identifier */
  sourceService: string;
  /** Target events to emit */
  targetEvents: TargetEvent[];
  /** Optional routing conditions */
  conditions?: RoutingCondition[];
  /** Optional data transformation */
  transform?: EventTransform;
  /** Route priority level */
  priority: RoutePriority;
  /** Whether rule is enabled */
  enabled: boolean;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Target event configuration
 * Defines where and how to emit routed events
 */
export interface TargetEvent {
  /** Target event name */
  event: string;
  /** Target service identifier */
  service: string;
  /** Whether emission is required */
  required: boolean;
  /** Optional delay before emission (ms) */
  delay?: number;
  /** Optional target-specific conditions */
  conditions?: RoutingCondition[];
}

/**
 * Routing condition for conditional event routing
 */
export interface RoutingCondition {
  /** Field path to evaluate (dot notation supported) */
  field: string;
  /** Comparison operator */
  operator: ConditionOperator;
  /** Expected value */
  value: any;
  /** Context type for field extraction */
  type: 'data' | 'metadata' | 'service' | 'timestamp';
}

/**
 * Supported condition operators
 */
export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'exists'
  | 'not_exists';

/**
 * Event data transformation configuration
 */
export interface EventTransform {
  /** Transformation type */
  type: 'map' | 'filter' | 'aggregate' | 'split';
  /** Field mapping for 'map' type */
  mapping?: Record<string, string>;
  /** Filters for 'filter' type */
  filter?: RoutingCondition[];
  /** Aggregation config for 'aggregate' type */
  aggregation?: AggregationConfig;
  /** Split field for 'split' type */
  splitField?: string;
}

/**
 * Data aggregation configuration
 */
export interface AggregationConfig {
  /** Field to group by */
  groupBy: string;
  /** Fields to aggregate with operations */
  aggregateFields: { field: string; operation: 'sum' | 'avg' | 'count' | 'max' | 'min' }[];
  /** Optional time window size (ms) */
  windowSize?: number;
}

/**
 * Route priority levels
 * Higher priority routes execute first
 */
export type RoutePriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Routing metrics for monitoring
 */
export interface RoutingMetrics {
  /** Rule identifier */
  ruleId: string;
  /** Total execution count */
  executionCount: number;
  /** Successful execution count */
  successCount: number;
  /** Failed execution count */
  failureCount: number;
  /** Average latency in milliseconds */
  averageLatency: number;
  /** Last execution timestamp */
  lastExecuted?: Date;
  /** Error history */
  errors: RoutingError[];
}

/**
 * Routing error record
 */
export interface RoutingError {
  /** Error timestamp */
  timestamp: Date;
  /** Error message */
  error: string;
  /** Event data that caused error */
  eventData: any;
  /** Target service (if applicable) */
  targetService?: string;
}

/**
 * Routing context for event processing
 * Contains all information needed to route an event
 */
export interface RoutingContext {
  /** Source event name */
  sourceEvent: string;
  /** Source service identifier */
  sourceService: string;
  /** Event payload data */
  eventData: any;
  /** Event metadata */
  metadata: Record<string, any>;
  /** Event timestamp */
  timestamp: Date;
  /** Correlation ID for tracing */
  correlationId: string;
}
