/**
 * Visualization Service Event Type Schemas
 *
 * All event types with Zod validation for type safety.
 * Event naming: {service}:{entity}:{action}
 */

import { z } from 'zod';

// Event name constants
export const EVENT_NAMES = {
  // Consumed Events (from other services)
  INVESTIGATION_RISK_UPDATED: 'investigation:risk-updated',
  INVESTIGATION_ENTITY_DISCOVERED: 'investigation:entity-discovered',
  INVESTIGATION_LOCATION_DETECTED: 'investigation:location-detected',
  INVESTIGATION_PROGRESS_UPDATED: 'investigation:progress-updated',
  INVESTIGATION_COMPLETED: 'investigation:completed',
  INVESTIGATION_LOG_ENTRY: 'investigation:log-entry',
  AGENT_TOOL_EXECUTION_STARTED: 'agent:tool-execution-started',
  AGENT_TOOL_EXECUTION_COMPLETED: 'agent:tool-execution-completed',
  AGENT_HEARTBEAT: 'agent:heartbeat',
  AGENT_TPS_UPDATED: 'agent:tps-updated',

  // Published Events (to other services)
  VIZ_NODE_SELECTED: 'visualization:node-selected',
  VIZ_EDGE_SELECTED: 'visualization:edge-selected',
  VIZ_LOCATION_CLICKED: 'visualization:location-clicked',
  VIZ_MAP_VIEW_CHANGED: 'visualization:map-view-changed',
  VIZ_TIMELINE_EVENT_EXPANDED: 'visualization:timeline-event-expanded',
  VIZ_TIMELINE_FILTERED: 'visualization:timeline-filtered',
  VIZ_EXPORT_STARTED: 'visualization:export-started',
  VIZ_EXPORT_COMPLETED: 'visualization:export-completed',
  VIZ_CHART_CREATED: 'visualization:chart-created',
  VIZ_DASHBOARD_VIEW_CHANGED: 'visualization:dashboard-view-changed'
} as const;

export type EventName = typeof EVENT_NAMES[keyof typeof EVENT_NAMES];

// Base event schema
const BaseEventSchema = z.object({
  event: z.string(),
  timestamp: z.string().datetime()
});

// Risk score schema
const RiskScoreSchema = z.object({
  score: z.number().min(0).max(100),
  level: z.enum(['low', 'medium', 'high', 'critical']),
  factors: z.array(z.object({
    name: z.string(),
    impact: z.number(),
    description: z.string().optional()
  }))
});

// Network data schema
const NetworkDataSchema = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    type: z.enum(['account', 'device', 'location', 'transaction', 'person']),
    label: z.string(),
    metadata: z.record(z.unknown()).optional()
  })),
  edges: z.array(z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    type: z.string(),
    weight: z.number().optional()
  }))
});

// Location marker schema
const LocationMarkerSchema = z.object({
  id: z.string(),
  type: z.enum(['customer', 'business', 'device', 'transaction', 'risk']),
  latitude: z.number(),
  longitude: z.number(),
  label: z.string(),
  metadata: z.record(z.unknown()).optional()
});

// Timeline event schema
const TimelineEventSchema = z.object({
  id: z.string(),
  timestamp: z.string().datetime(),
  type: z.enum(['info', 'warning', 'critical', 'success']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  message: z.string(),
  metadata: z.record(z.unknown()).optional()
});

// Consumed event schemas
export const InvestigationRiskUpdatedEventSchema = BaseEventSchema.extend({
  event: z.literal(EVENT_NAMES.INVESTIGATION_RISK_UPDATED),
  data: z.object({
    investigationId: z.string(),
    agentId: z.string(),
    agentName: z.string(),
    riskScore: RiskScoreSchema
  })
});

export const InvestigationEntityDiscoveredEventSchema = BaseEventSchema.extend({
  event: z.literal(EVENT_NAMES.INVESTIGATION_ENTITY_DISCOVERED),
  data: z.object({
    investigationId: z.string(),
    networkData: NetworkDataSchema
  })
});

export const InvestigationLocationDetectedEventSchema = BaseEventSchema.extend({
  event: z.literal(EVENT_NAMES.INVESTIGATION_LOCATION_DETECTED),
  data: z.object({
    investigationId: z.string(),
    location: LocationMarkerSchema
  })
});

export const InvestigationProgressUpdatedEventSchema = BaseEventSchema.extend({
  event: z.literal(EVENT_NAMES.INVESTIGATION_PROGRESS_UPDATED),
  data: z.object({
    investigationId: z.string(),
    phase: z.string(),
    progress: z.number().min(0).max(100),
    status: z.enum(['pending', 'in_progress', 'completed', 'failed'])
  })
});

export const InvestigationLogEntryEventSchema = BaseEventSchema.extend({
  event: z.literal(EVENT_NAMES.INVESTIGATION_LOG_ENTRY),
  data: z.object({
    investigationId: z.string(),
    logEntry: TimelineEventSchema
  })
});

// Published event schemas
export const VizNodeSelectedEventSchema = BaseEventSchema.extend({
  event: z.literal(EVENT_NAMES.VIZ_NODE_SELECTED),
  data: z.object({
    investigationId: z.string(),
    nodeId: z.string(),
    nodeType: z.enum(['account', 'device', 'location', 'transaction', 'person']),
    metadata: z.record(z.unknown()).optional()
  })
});

export const VizLocationClickedEventSchema = BaseEventSchema.extend({
  event: z.literal(EVENT_NAMES.VIZ_LOCATION_CLICKED),
  data: z.object({
    investigationId: z.string(),
    locationId: z.string(),
    locationType: z.enum(['customer', 'business', 'device', 'transaction', 'risk']),
    coordinates: z.object({
      latitude: z.number(),
      longitude: z.number()
    })
  })
});

export const VizMapViewChangedEventSchema = BaseEventSchema.extend({
  event: z.literal(EVENT_NAMES.VIZ_MAP_VIEW_CHANGED),
  data: z.object({
    investigationId: z.string(),
    bounds: z.object({
      north: z.number(),
      south: z.number(),
      east: z.number(),
      west: z.number()
    }),
    center: z.object({
      latitude: z.number(),
      longitude: z.number()
    }),
    zoom: z.number().min(0).max(22)
  })
});

export const VizTimelineEventExpandedEventSchema = BaseEventSchema.extend({
  event: z.literal(EVENT_NAMES.VIZ_TIMELINE_EVENT_EXPANDED),
  data: z.object({
    investigationId: z.string(),
    eventId: z.string(),
    expanded: z.boolean()
  })
});

export const VizTimelineFilteredEventSchema = BaseEventSchema.extend({
  event: z.literal(EVENT_NAMES.VIZ_TIMELINE_FILTERED),
  data: z.object({
    investigationId: z.string(),
    filters: z.object({
      types: z.array(z.enum(['info', 'warning', 'critical', 'success'])),
      severities: z.array(z.enum(['low', 'medium', 'high', 'critical'])),
      dateRange: z.object({
        start: z.string().datetime().optional(),
        end: z.string().datetime().optional()
      }).optional(),
      searchQuery: z.string().optional()
    }),
    resultCount: z.number()
  })
});

// Type exports
export type InvestigationRiskUpdatedEvent = z.infer<typeof InvestigationRiskUpdatedEventSchema>;
export type InvestigationEntityDiscoveredEvent = z.infer<typeof InvestigationEntityDiscoveredEventSchema>;
export type InvestigationLocationDetectedEvent = z.infer<typeof InvestigationLocationDetectedEventSchema>;
export type InvestigationProgressUpdatedEvent = z.infer<typeof InvestigationProgressUpdatedEventSchema>;
export type InvestigationLogEntryEvent = z.infer<typeof InvestigationLogEntryEventSchema>;
export type VizNodeSelectedEvent = z.infer<typeof VizNodeSelectedEventSchema>;
export type VizLocationClickedEvent = z.infer<typeof VizLocationClickedEventSchema>;
export type VizMapViewChangedEvent = z.infer<typeof VizMapViewChangedEventSchema>;
export type VizTimelineEventExpandedEvent = z.infer<typeof VizTimelineEventExpandedEventSchema>;
export type VizTimelineFilteredEvent = z.infer<typeof VizTimelineFilteredEventSchema>;

// Location marker type export
export type LocationMarker = z.infer<typeof LocationMarkerSchema>;

// Timeline event type export
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;
