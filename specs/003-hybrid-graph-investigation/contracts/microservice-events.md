# Microservice Event Contracts

**Created**: 2025-01-21
**Version**: 1.0.0
**Context**: Olorin Frontend Microservices Architecture

## Overview

This document defines the event-driven communication contracts between the structured-investigation microservice and other microservices in the Olorin frontend architecture. These contracts ensure loose coupling and reliable inter-service communication.

## Event Bus Architecture

### Event Bus Configuration
- **Technology**: Custom event bus with Message Queue fallback
- **Transport**: In-memory events with Redis pub/sub for persistence
- **Serialization**: JSON with Zod schema validation
- **Error Handling**: Dead letter queue for failed events

### Event Structure

```typescript
interface MicroserviceEvent<T = unknown> {
  // Event identification
  id: string;                    // Unique event ID
  type: string;                  // Event type (namespaced)
  version: string;               // Event schema version

  // Timing
  timestamp: string;             // ISO 8601 timestamp
  correlation_id?: string;       // Request correlation ID

  // Source information
  source: {
    service: MicroserviceName;   // Originating service
    instance_id: string;         // Service instance ID
    user_id?: string;            // User who triggered event
  };

  // Event payload
  data: T;                       // Event-specific data

  // Metadata
  metadata: {
    retry_count?: number;        // Number of retries
    trace_id?: string;           // Distributed tracing ID
    priority?: EventPriority;    // Event priority
    ttl?: number;                // Time to live in seconds
  };
}

type MicroserviceName =
  | "investigation"              // Main investigation service (port 3001)
  | "structured-investigation"   // This microservice
  | "agent-analytics"           // Agent monitoring (port 3002)
  | "rag-intelligence"          // RAG analytics (port 3003)
  | "visualization"             // Charts/graphs (port 3004)
  | "reporting"                 // Reports/exports (port 3005)
  | "core-ui";                  // Shared components (port 3006)

type EventPriority = "low" | "normal" | "high" | "critical";
```

## Investigation Events

### Investigation Lifecycle Events

#### Investigation Started
```typescript
interface InvestigationStartedEvent {
  type: "investigation.started";
  data: {
    investigation_id: string;
    entity: {
      type: string;
      value: string;
    };
    time_window: {
      start: string;
      end: string;
    };
    priority: "low" | "medium" | "high" | "critical";
    assigned_to: string[];
    configuration: {
      domains_to_analyze: string[];
      analysis_depth: string;
      auto_escalation_enabled: boolean;
    };
  };
}

// Publishers: investigation
// Subscribers: structured-investigation, agent-analytics, reporting
```

#### Investigation Progress Update
```typescript
interface InvestigationProgressEvent {
  type: "investigation.progress";
  data: {
    investigation_id: string;
    current_phase: "initiation" | "analysis" | "review" | "summary" | "complete";
    progress_percent: number;     // 0-100
    estimated_completion?: string; // ISO 8601 timestamp
    domains_completed: string[];
    domains_in_progress: string[];
    domains_pending: string[];
  };
}

// Publishers: investigation
// Subscribers: structured-investigation, agent-analytics
```

#### Investigation Status Changed
```typescript
interface InvestigationStatusChangedEvent {
  type: "investigation.status_changed";
  data: {
    investigation_id: string;
    old_status: InvestigationStatus;
    new_status: InvestigationStatus;
    reason?: string;
    changed_by: string;          // User ID
  };
}

// Publishers: investigation, structured-investigation
// Subscribers: agent-analytics, reporting
```

#### Investigation Completed
```typescript
interface InvestigationCompletedEvent {
  type: "investigation.completed";
  data: {
    investigation_id: string;
    final_risk_score: number;
    confidence: number;
    quality_score: number;
    total_evidence_items: number;
    analysis_duration_seconds: number;
    completion_reason: "analysis_complete" | "manual_completion" | "timeout" | "cancelled";
    summary: {
      key_findings: string[];
      recommendations: string[];
      policy_violations: string[];
    };
  };
}

// Publishers: investigation
// Subscribers: structured-investigation, agent-analytics, reporting
```

### Evidence Events

#### Evidence Found
```typescript
interface EvidenceFoundEvent {
  type: "evidence.found";
  data: {
    investigation_id: string;
    evidence_id: string;
    domain: string;
    type: string;
    strength: number;            // 0-1
    reliability: number;         // 0-1
    title: string;
    description: string;
    discovered_at: string;       // ISO 8601 timestamp
    source: string;              // Agent or tool that found it
    related_evidence: string[];  // Related evidence IDs
    risk_impact: number;         // Impact on risk score (-1 to 1)
  };
}

// Publishers: investigation
// Subscribers: structured-investigation, visualization, reporting
```

#### Evidence Verified
```typescript
interface EvidenceVerifiedEvent {
  type: "evidence.verified";
  data: {
    investigation_id: string;
    evidence_id: string;
    verification_status: "verified" | "disputed" | "false_positive";
    verified_by: string;         // User ID
    verification_notes?: string;
    confidence_impact: number;   // Impact on investigation confidence
  };
}

// Publishers: structured-investigation
// Subscribers: investigation, agent-analytics, reporting
```

### Risk Assessment Events

#### Risk Score Updated
```typescript
interface RiskScoreUpdatedEvent {
  type: "risk.updated";
  data: {
    investigation_id: string;
    old_score: number;
    new_score: number;
    source: string;              // What caused the update
    reason: string;              // Human-readable explanation
    confidence: number;          // Confidence in new score
    evidence_count: number;      // Total evidence at this point
    domain_scores: Record<string, number>; // Per-domain risk scores
  };
}

// Publishers: investigation
// Subscribers: structured-investigation, visualization, agent-analytics
```

#### Risk Threshold Breached
```typescript
interface RiskThresholdBreachedEvent {
  type: "risk.threshold_breached";
  data: {
    investigation_id: string;
    threshold_type: "high_risk" | "critical_risk" | "escalation_required";
    current_score: number;
    threshold_value: number;
    breach_time: string;         // ISO 8601 timestamp
    recommended_actions: string[];
    auto_escalation_triggered: boolean;
  };
}

// Publishers: investigation
// Subscribers: structured-investigation, agent-analytics, reporting
```

## Agent and Tool Events

#### Agent Status Changed
```typescript
interface AgentStatusChangedEvent {
  type: "agent.status_changed";
  data: {
    investigation_id: string;
    agent_name: string;
    agent_type: string;
    old_status: "idle" | "running" | "complete" | "error" | "timeout";
    new_status: "idle" | "running" | "complete" | "error" | "timeout";
    domain: string;
    task_description: string;
    error_message?: string;
  };
}

// Publishers: investigation
// Subscribers: structured-investigation, agent-analytics
```

#### Tool Execution Started
```typescript
interface ToolExecutionStartedEvent {
  type: "tool.execution_started";
  data: {
    investigation_id: string;
    tool_name: string;
    tool_type: "data" | "intel" | "analysis" | "decision";
    execution_id: string;
    domain: string;
    input_summary: string;
    estimated_duration_ms?: number;
  };
}

// Publishers: investigation
// Subscribers: structured-investigation, agent-analytics
```

#### Tool Execution Completed
```typescript
interface ToolExecutionCompletedEvent {
  type: "tool.execution_completed";
  data: {
    investigation_id: string;
    tool_name: string;
    execution_id: string;
    success: boolean;
    duration_ms: number;
    output_summary: string;
    evidence_generated: string[]; // Evidence IDs created
    error_message?: string;
    performance_metrics: {
      cpu_usage_percent: number;
      memory_usage_mb: number;
      network_requests: number;
    };
  };
}

// Publishers: investigation
// Subscribers: structured-investigation, agent-analytics
```

## Timeline Events

#### Timeline Event Created
```typescript
interface TimelineEventCreatedEvent {
  type: "timeline.event_created";
  data: {
    investigation_id: string;
    event_id: string;
    timestamp: string;
    actor: "orchestrator" | "agent" | "tool" | "user" | "system";
    action: string;
    success: boolean;
    duration_ms?: number;
    input_summary?: string;
    output_summary?: string;
    risk_delta?: number;
    confidence_delta?: number;
    evidence_generated: string[];
    parent_event_id?: string;
    importance_level: 1 | 2 | 3 | 4 | 5;
  };
}

// Publishers: investigation
// Subscribers: structured-investigation, visualization, reporting
```

## UI Interaction Events

#### Investigation View Changed
```typescript
interface InvestigationViewChangedEvent {
  type: "ui.investigation_view_changed";
  data: {
    investigation_id: string;
    user_id: string;
    view_type: "power_grid" | "command_center" | "evidence_trail" | "network_explorer";
    previous_view?: string;
    view_duration_ms?: number;   // How long user spent in previous view
    interaction_count?: number;  // Number of interactions in previous view
  };
}

// Publishers: structured-investigation
// Subscribers: agent-analytics
```

#### Graph Node Selected
```typescript
interface GraphNodeSelectedEvent {
  type: "ui.graph_node_selected";
  data: {
    investigation_id: string;
    user_id: string;
    node_id: string;
    node_type: "domain" | "tool" | "evidence" | "decision";
    selection_context: "click" | "keyboard" | "search" | "programmatic";
    related_nodes: string[];     // Connected nodes
    evidence_count?: number;     // Evidence associated with node
  };
}

// Publishers: structured-investigation
// Subscribers: visualization, agent-analytics
```

#### Timeline Filter Applied
```typescript
interface TimelineFilterAppliedEvent {
  type: "ui.timeline_filter_applied";
  data: {
    investigation_id: string;
    user_id: string;
    filter_type: "actor" | "action" | "success" | "time_range" | "importance";
    filter_value: unknown;
    visible_events_count: number;
    total_events_count: number;
  };
}

// Publishers: structured-investigation
// Subscribers: agent-analytics
```

## Export and Reporting Events

#### Export Requested
```typescript
interface ExportRequestedEvent {
  type: "export.requested";
  data: {
    investigation_id: string;
    user_id: string;
    export_id: string;
    format: "pdf" | "json" | "csv" | "markdown";
    template: "executive" | "detailed" | "compliance" | "technical";
    include_sections: string[];
    estimated_size_mb?: number;
  };
}

// Publishers: structured-investigation
// Subscribers: reporting
```

#### Export Completed
```typescript
interface ExportCompletedEvent {
  type: "export.completed";
  data: {
    export_id: string;
    investigation_id: string;
    success: boolean;
    file_size_bytes?: number;
    download_url?: string;
    generation_duration_ms: number;
    error_message?: string;
    expires_at?: string;         // ISO 8601 timestamp
  };
}

// Publishers: reporting
// Subscribers: structured-investigation
```

## System Health Events

#### Service Health Check
```typescript
interface ServiceHealthCheckEvent {
  type: "system.health_check";
  data: {
    service_name: MicroserviceName;
    status: "healthy" | "degraded" | "unhealthy";
    checks: {
      name: string;
      status: "pass" | "fail" | "warn";
      duration_ms: number;
      message?: string;
    }[];
    performance_metrics: {
      cpu_percent: number;
      memory_mb: number;
      active_connections: number;
      response_time_ms: number;
    };
  };
}

// Publishers: all services
// Subscribers: agent-analytics (for monitoring dashboard)
```

#### Performance Alert
```typescript
interface PerformanceAlertEvent {
  type: "system.performance_alert";
  data: {
    service_name: MicroserviceName;
    alert_type: "high_cpu" | "high_memory" | "slow_response" | "error_rate";
    severity: "warning" | "critical";
    current_value: number;
    threshold_value: number;
    duration_seconds: number;
    suggested_actions: string[];
  };
}

// Publishers: all services
// Subscribers: agent-analytics
```

## Event Subscription Patterns

### Service-Specific Subscriptions

```typescript
// structured-investigation microservice subscriptions
const structuredInvestigationSubscriptions = [
  "investigation.started",
  "investigation.progress",
  "investigation.completed",
  "evidence.found",
  "risk.updated",
  "risk.threshold_breached",
  "agent.status_changed",
  "tool.execution_completed",
  "timeline.event_created",
  "export.completed"
];

// agent-analytics subscriptions
const agentAnalyticsSubscriptions = [
  "investigation.started",
  "investigation.status_changed",
  "investigation.completed",
  "agent.status_changed",
  "tool.execution_started",
  "tool.execution_completed",
  "ui.investigation_view_changed",
  "ui.graph_node_selected",
  "ui.timeline_filter_applied",
  "system.health_check",
  "system.performance_alert"
];

// visualization subscriptions
const visualizationSubscriptions = [
  "evidence.found",
  "risk.updated",
  "timeline.event_created",
  "ui.graph_node_selected"
];

// reporting subscriptions
const reportingSubscriptions = [
  "investigation.completed",
  "evidence.verified",
  "export.requested"
];
```

### Event Routing Configuration

```typescript
interface EventRoutingConfig {
  // Direct event routing
  routes: {
    [eventType: string]: {
      targets: MicroserviceName[];
      options: {
        async: boolean;          // Asynchronous delivery
        retry: boolean;          // Retry on failure
        persist: boolean;        // Persist event
        timeout_ms: number;      // Delivery timeout
      };
    };
  };

  // Event filtering
  filters: {
    [serviceName in MicroserviceName]: {
      include_patterns: string[];  // Event types to include
      exclude_patterns: string[];  // Event types to exclude
      user_filters?: {             // User-specific filtering
        [userId: string]: string[];
      };
    };
  };
}
```

## Error Handling and Recovery

### Event Delivery Guarantees
- **At-least-once delivery**: Events may be delivered multiple times
- **Ordering**: Events from same source maintain order
- **Durability**: Critical events persisted to Redis
- **Timeout**: 30-second delivery timeout with exponential backoff

### Dead Letter Queue
```typescript
interface DeadLetterEvent {
  original_event: MicroserviceEvent;
  failure_reason: string;
  retry_count: number;
  last_attempt: string;        // ISO 8601 timestamp
  next_retry?: string;         // ISO 8601 timestamp
}
```

### Event Replay
Events can be replayed for:
- Service recovery after downtime
- Development and testing
- Audit and compliance requirements

```typescript
interface EventReplayRequest {
  service_name: MicroserviceName;
  start_timestamp: string;     // ISO 8601 timestamp
  end_timestamp: string;       // ISO 8601 timestamp
  event_types?: string[];      // Specific event types to replay
  investigation_id?: string;   // Specific investigation
}
```

## Event Schema Validation

All events are validated using Zod schemas:

```typescript
import { z } from 'zod';

const InvestigationStartedEventSchema = z.object({
  type: z.literal("investigation.started"),
  data: z.object({
    investigation_id: z.string(),
    entity: z.object({
      type: z.enum(["ip", "user", "transaction", "device", "email", "domain"]),
      value: z.string()
    }),
    time_window: z.object({
      start: z.string().datetime(),
      end: z.string().datetime()
    }),
    priority: z.enum(["low", "medium", "high", "critical"]),
    assigned_to: z.array(z.string()),
    configuration: z.object({
      domains_to_analyze: z.array(z.string()),
      analysis_depth: z.string(),
      auto_escalation_enabled: z.boolean()
    })
  })
});
```

## Testing Events

### Mock Event Generation
For testing purposes, mock events can be generated:

```typescript
interface MockEventConfig {
  event_type: string;
  count: number;
  interval_ms: number;
  investigation_id?: string;
  randomize_data: boolean;
}
```

### Event Recording
Events can be recorded and replayed for testing:

```typescript
interface EventRecording {
  name: string;
  description: string;
  events: MicroserviceEvent[];
  duration_ms: number;
  created_at: string;
}
```

This event-driven architecture ensures loose coupling between microservices while maintaining real-time synchronization and robust error handling for the hybrid graph investigation UI.