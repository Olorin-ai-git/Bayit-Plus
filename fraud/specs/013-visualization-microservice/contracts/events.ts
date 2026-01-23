/**
 * Event Bus Contracts for Visualization Microservice
 *
 * This file defines all events that the visualization service:
 * - CONSUMES (listens to from other microservices)
 * - PUBLISHES (emits for other microservices to consume)
 *
 * Event Naming Convention: {source-service}:{entity}:{action}
 * Example: investigation:risk-updated, visualization:node-selected
 */

import { z } from 'zod';
import {
  RiskScoreSchema,
  NetworkDataSchema,
  TimelineEventSchema,
  LocationMarkerSchema,
  EKGMonitorDataSchema,
  TPSSparklineDataSchema,
} from '../data-model';

// =============================================================================
// EVENTS CONSUMED BY VISUALIZATION SERVICE
// =============================================================================

/**
 * Investigation Service Events
 * Source: Investigation microservice
 */

// Investigation risk score updated
export const InvestigationRiskUpdatedEventSchema = z.object({
  event: z.literal('investigation:risk-updated'),
  timestamp: z.string().datetime(),
  data: z.object({
    investigationId: z.string(),
    agentId: z.string(),
    agentName: z.string(),
    riskScore: RiskScoreSchema,
  }),
});

export type InvestigationRiskUpdatedEvent = z.infer<typeof InvestigationRiskUpdatedEventSchema>;

// Entity relationship discovered
export const InvestigationEntityDiscoveredEventSchema = z.object({
  event: z.literal('investigation:entity-discovered'),
  timestamp: z.string().datetime(),
  data: z.object({
    investigationId: z.string(),
    networkData: NetworkDataSchema,
  }),
});

export type InvestigationEntityDiscoveredEvent = z.infer<typeof InvestigationEntityDiscoveredEventSchema>;

// Location detected
export const InvestigationLocationDetectedEventSchema = z.object({
  event: z.literal('investigation:location-detected'),
  timestamp: z.string().datetime(),
  data: z.object({
    investigationId: z.string(),
    location: LocationMarkerSchema,
  }),
});

export type InvestigationLocationDetectedEvent = z.infer<typeof InvestigationLocationDetectedEventSchema>;

// Investigation progress update
export const InvestigationProgressUpdatedEventSchema = z.object({
  event: z.literal('investigation:progress-updated'),
  timestamp: z.string().datetime(),
  data: z.object({
    investigationId: z.string(),
    phase: z.string(),
    progress: z.number().min(0).max(100),
    status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
  }),
});

export type InvestigationProgressUpdatedEvent = z.infer<typeof InvestigationProgressUpdatedEventSchema>;

// Investigation completed
export const InvestigationCompletedEventSchema = z.object({
  event: z.literal('investigation:completed'),
  timestamp: z.string().datetime(),
  data: z.object({
    investigationId: z.string(),
    overallRiskScore: z.number().min(0).max(100),
    totalEvents: z.number(),
    duration: z.number(), // milliseconds
  }),
});

export type InvestigationCompletedEvent = z.infer<typeof InvestigationCompletedEventSchema>;

/**
 * Agent Analytics Service Events
 * Source: Agent Analytics microservice
 */

// Tool execution started
export const AgentToolExecutionStartedEventSchema = z.object({
  event: z.literal('agent:tool-execution-started'),
  timestamp: z.string().datetime(),
  data: z.object({
    investigationId: z.string(),
    agentId: z.string(),
    toolName: z.string(),
    executionId: z.string(),
  }),
});

export type AgentToolExecutionStartedEvent = z.infer<typeof AgentToolExecutionStartedEventSchema>;

// Tool execution completed
export const AgentToolExecutionCompletedEventSchema = z.object({
  event: z.literal('agent:tool-execution-completed'),
  timestamp: z.string().datetime(),
  data: z.object({
    investigationId: z.string(),
    agentId: z.string(),
    toolName: z.string(),
    executionId: z.string(),
    duration: z.number(), // milliseconds
    success: z.boolean(),
    result: z.record(z.unknown()).optional(),
  }),
});

export type AgentToolExecutionCompletedEvent = z.infer<typeof AgentToolExecutionCompletedEventSchema>;

// Real-time heartbeat
export const AgentHeartbeatEventSchema = z.object({
  event: z.literal('agent:heartbeat'),
  timestamp: z.string().datetime(),
  data: z.object({
    investigationId: z.string(),
    heartbeatData: EKGMonitorDataSchema,
  }),
});

export type AgentHeartbeatEvent = z.infer<typeof AgentHeartbeatEventSchema>;

// Tools per second update
export const AgentTPSUpdatedEventSchema = z.object({
  event: z.literal('agent:tps-updated'),
  timestamp: z.string().datetime(),
  data: z.object({
    investigationId: z.string(),
    tpsData: TPSSparklineDataSchema,
  }),
});

export type AgentTPSUpdatedEvent = z.infer<typeof AgentTPSUpdatedEventSchema>;

/**
 * Investigation Log Events
 * Source: Investigation microservice
 */

// Log entry added
export const InvestigationLogEntryEventSchema = z.object({
  event: z.literal('investigation:log-entry'),
  timestamp: z.string().datetime(),
  data: z.object({
    investigationId: z.string(),
    logEntry: TimelineEventSchema,
  }),
});

export type InvestigationLogEntryEvent = z.infer<typeof InvestigationLogEntryEventSchema>;

/**
 * Union type of all consumed events
 */
export const ConsumedEventSchema = z.discriminatedUnion('event', [
  InvestigationRiskUpdatedEventSchema,
  InvestigationEntityDiscoveredEventSchema,
  InvestigationLocationDetectedEventSchema,
  InvestigationProgressUpdatedEventSchema,
  InvestigationCompletedEventSchema,
  AgentToolExecutionStartedEventSchema,
  AgentToolExecutionCompletedEventSchema,
  AgentHeartbeatEventSchema,
  AgentTPSUpdatedEventSchema,
  InvestigationLogEntryEventSchema,
]);

export type ConsumedEvent = z.infer<typeof ConsumedEventSchema>;

// =============================================================================
// EVENTS PUBLISHED BY VISUALIZATION SERVICE
// =============================================================================

/**
 * Network Graph Interaction Events
 */

// Network node selected
export const VisualizationNodeSelectedEventSchema = z.object({
  event: z.literal('visualization:node-selected'),
  timestamp: z.string().datetime(),
  data: z.object({
    investigationId: z.string(),
    nodeId: z.string(),
    nodeType: z.enum(['account', 'device', 'location', 'transaction', 'person']),
    metadata: z.record(z.unknown()).optional(),
  }),
});

export type VisualizationNodeSelectedEvent = z.infer<typeof VisualizationNodeSelectedEventSchema>;

// Network edge selected
export const VisualizationEdgeSelectedEventSchema = z.object({
  event: z.literal('visualization:edge-selected'),
  timestamp: z.string().datetime(),
  data: z.object({
    investigationId: z.string(),
    edgeId: z.string(),
    sourceNodeId: z.string(),
    targetNodeId: z.string(),
    relationshipType: z.string(),
  }),
});

export type VisualizationEdgeSelectedEvent = z.infer<typeof VisualizationEdgeSelectedEventSchema>;

/**
 * Map Interaction Events
 */

// Location marker clicked
export const VisualizationLocationClickedEventSchema = z.object({
  event: z.literal('visualization:location-clicked'),
  timestamp: z.string().datetime(),
  data: z.object({
    investigationId: z.string(),
    locationId: z.string(),
    locationType: z.enum(['customer', 'business', 'device', 'transaction', 'risk']),
    coordinates: z.object({
      latitude: z.number(),
      longitude: z.number(),
    }),
  }),
});

export type VisualizationLocationClickedEvent = z.infer<typeof VisualizationLocationClickedEventSchema>;

// Map view changed
export const VisualizationMapViewChangedEventSchema = z.object({
  event: z.literal('visualization:map-view-changed'),
  timestamp: z.string().datetime(),
  data: z.object({
    investigationId: z.string(),
    center: z.object({
      latitude: z.number(),
      longitude: z.number(),
    }),
    zoom: z.number(),
    bounds: z.object({
      north: z.number(),
      south: z.number(),
      east: z.number(),
      west: z.number(),
    }),
  }),
});

export type VisualizationMapViewChangedEvent = z.infer<typeof VisualizationMapViewChangedEventSchema>;

/**
 * Timeline Interaction Events
 */

// Timeline event expanded
export const VisualizationTimelineEventExpandedEventSchema = z.object({
  event: z.literal('visualization:timeline-event-expanded'),
  timestamp: z.string().datetime(),
  data: z.object({
    investigationId: z.string(),
    eventId: z.string(),
  }),
});

export type VisualizationTimelineEventExpandedEvent = z.infer<typeof VisualizationTimelineEventExpandedEventSchema>;

// Timeline filtered
export const VisualizationTimelineFilteredEventSchema = z.object({
  event: z.literal('visualization:timeline-filtered'),
  timestamp: z.string().datetime(),
  data: z.object({
    investigationId: z.string(),
    filters: z.object({
      types: z.array(z.enum(['info', 'warning', 'critical', 'success'])),
      severities: z.array(z.enum(['low', 'medium', 'high', 'critical'])),
      dateRange: z.object({
        start: z.string().datetime().optional(),
        end: z.string().datetime().optional(),
      }).optional(),
      searchQuery: z.string().optional(),
    }),
    resultCount: z.number(),
  }),
});

export type VisualizationTimelineFilteredEvent = z.infer<typeof VisualizationTimelineFilteredEventSchema>;

/**
 * Export Events
 */

// Export started
export const VisualizationExportStartedEventSchema = z.object({
  event: z.literal('visualization:export-started'),
  timestamp: z.string().datetime(),
  data: z.object({
    investigationId: z.string(),
    visualizationType: z.string(),
    format: z.enum(['png', 'svg', 'json']),
    exportId: z.string(),
  }),
});

export type VisualizationExportStartedEvent = z.infer<typeof VisualizationExportStartedEventSchema>;

// Export completed
export const VisualizationExportCompletedEventSchema = z.object({
  event: z.literal('visualization:export-completed'),
  timestamp: z.string().datetime(),
  data: z.object({
    investigationId: z.string(),
    exportId: z.string(),
    format: z.enum(['png', 'svg', 'json']),
    filename: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
});

export type VisualizationExportCompletedEvent = z.infer<typeof VisualizationExportCompletedEventSchema>;

/**
 * Chart Builder Events
 */

// Chart created
export const VisualizationChartCreatedEventSchema = z.object({
  event: z.literal('visualization:chart-created'),
  timestamp: z.string().datetime(),
  data: z.object({
    investigationId: z.string(),
    chartId: z.string(),
    chartType: z.enum([
      'line', 'bar', 'pie', 'doughnut', 'area', 'scatter', 'bubble',
      'radar', 'polar', 'histogram', 'heatmap', 'treemap', 'funnel',
      'gauge', 'waterfall'
    ]),
  }),
});

export type VisualizationChartCreatedEvent = z.infer<typeof VisualizationChartCreatedEventSchema>;

/**
 * Dashboard Events
 */

// Dashboard view changed
export const VisualizationDashboardViewChangedEventSchema = z.object({
  event: z.literal('visualization:dashboard-view-changed'),
  timestamp: z.string().datetime(),
  data: z.object({
    investigationId: z.string(),
    previousView: z.enum(['overview', 'risk-analysis', 'geographic', 'trends']),
    currentView: z.enum(['overview', 'risk-analysis', 'geographic', 'trends']),
  }),
});

export type VisualizationDashboardViewChangedEvent = z.infer<typeof VisualizationDashboardViewChangedEventSchema>;

/**
 * Union type of all published events
 */
export const PublishedEventSchema = z.discriminatedUnion('event', [
  VisualizationNodeSelectedEventSchema,
  VisualizationEdgeSelectedEventSchema,
  VisualizationLocationClickedEventSchema,
  VisualizationMapViewChangedEventSchema,
  VisualizationTimelineEventExpandedEventSchema,
  VisualizationTimelineFilteredEventSchema,
  VisualizationExportStartedEventSchema,
  VisualizationExportCompletedEventSchema,
  VisualizationChartCreatedEventSchema,
  VisualizationDashboardViewChangedEventSchema,
]);

export type PublishedEvent = z.infer<typeof PublishedEventSchema>;

// =============================================================================
// EVENT BUS UTILITIES
// =============================================================================

/**
 * Type-safe event subscription helper
 */
export type EventHandler<T> = (event: T) => void | Promise<void>;

/**
 * Event subscription map for type safety
 */
export interface EventSubscriptionMap {
  // Consumed events
  'investigation:risk-updated': EventHandler<InvestigationRiskUpdatedEvent>;
  'investigation:entity-discovered': EventHandler<InvestigationEntityDiscoveredEvent>;
  'investigation:location-detected': EventHandler<InvestigationLocationDetectedEvent>;
  'investigation:progress-updated': EventHandler<InvestigationProgressUpdatedEvent>;
  'investigation:completed': EventHandler<InvestigationCompletedEvent>;
  'agent:tool-execution-started': EventHandler<AgentToolExecutionStartedEvent>;
  'agent:tool-execution-completed': EventHandler<AgentToolExecutionCompletedEvent>;
  'agent:heartbeat': EventHandler<AgentHeartbeatEvent>;
  'agent:tps-updated': EventHandler<AgentTPSUpdatedEvent>;
  'investigation:log-entry': EventHandler<InvestigationLogEntryEvent>;

  // Published events
  'visualization:node-selected': EventHandler<VisualizationNodeSelectedEvent>;
  'visualization:edge-selected': EventHandler<VisualizationEdgeSelectedEvent>;
  'visualization:location-clicked': EventHandler<VisualizationLocationClickedEvent>;
  'visualization:map-view-changed': EventHandler<VisualizationMapViewChangedEvent>;
  'visualization:timeline-event-expanded': EventHandler<VisualizationTimelineEventExpandedEvent>;
  'visualization:timeline-filtered': EventHandler<VisualizationTimelineFilteredEvent>;
  'visualization:export-started': EventHandler<VisualizationExportStartedEvent>;
  'visualization:export-completed': EventHandler<VisualizationExportCompletedEvent>;
  'visualization:chart-created': EventHandler<VisualizationChartCreatedEvent>;
  'visualization:dashboard-view-changed': EventHandler<VisualizationDashboardViewChangedEvent>;
}

/**
 * Event type string union for compile-time type checking
 */
export type EventType = keyof EventSubscriptionMap;

/**
 * Get event data type from event type string
 */
export type EventDataType<T extends EventType> =
  T extends keyof EventSubscriptionMap
    ? Parameters<EventSubscriptionMap[T]>[0]
    : never;
