# Event Bus Contracts: Analytics Microservice

**Feature**: Analytics Microservice  
**Date**: 2025-11-08  
**Status**: Complete

## Overview

The analytics microservice integrates with the Olorin event bus (mitt) for real-time updates and cross-service communication.

## Event Bus Integration

### Event Bus Instance

The analytics microservice uses the shared event bus instance:

```typescript
import { EventBusManager } from '@shared/events/UnifiedEventBus';

const eventBus = EventBusManager.getInstance().getBus();
```

## Published Events

### analytics:service:ready

Published when the analytics microservice is initialized and ready.

**Event**: `analytics:service:ready`

**Payload**:
```typescript
{
  service: 'analytics',
  timestamp: string; // ISO 8601
  capabilities: [
    'fraud-metrics',
    'cohort-analysis',
    'experiments',
    'drift-detection',
    'replay',
    'explainability',
    'observability'
  ];
  version: string;
}
```

### analytics:metrics:updated

Published when fraud metrics are updated (real-time mode).

**Event**: `analytics:metrics:updated`

**Payload**:
```typescript
{
  kpis: {
    precision: number;
    recall: number;
    f1Score: number;
    captureRate: number;
    approvalRate: number;
    falsePositiveCost: number;
    chargebackRate: number;
    decisionThroughput: number;
  };
  timestamp: string; // ISO 8601
  timeWindow: string; // '1h' | '24h' | '7d' | '30d'
}
```

### analytics:cohort:updated

Published when cohort analysis is updated.

**Event**: `analytics:cohort:updated`

**Payload**:
```typescript
{
  dimension: string;
  cohortId: string;
  metrics: FraudMetrics;
  timestamp: string;
}
```

### analytics:experiment:status-changed

Published when experiment status changes.

**Event**: `analytics:experiment:status-changed`

**Payload**:
```typescript
{
  experimentId: string;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
  timestamp: string;
}
```

### analytics:drift:detected

Published when data drift is detected.

**Event**: `analytics:drift:detected`

**Payload**:
```typescript
{
  featureName: string;
  psi: number;
  klDivergence: number;
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
}
```

### analytics:pipeline:health-changed

Published when pipeline health status changes.

**Event**: `analytics:pipeline:health-changed`

**Payload**:
```typescript
{
  pipelineId: string;
  status: 'healthy' | 'degraded' | 'down';
  alerts: Array<{
    type: string;
    severity: 'warning' | 'critical';
    message: string;
  }>;
  timestamp: string;
}
```

### analytics:replay:completed

Published when a replay scenario completes.

**Event**: `analytics:replay:completed`

**Payload**:
```typescript
{
  scenarioId: string;
  status: 'completed' | 'failed';
  results?: ReplayResults;
  timestamp: string;
}
```

## Subscribed Events

### fraud:decision

Subscribe to fraud decisions for real-time metrics updates.

**Event**: `fraud:decision`

**Payload** (from fraud detection service):
```typescript
{
  decisionId: string;
  transactionId: string;
  investigationId?: string;
  decision: 'approved' | 'declined' | 'review';
  modelScore: number;
  timestamp: string;
  // ... other decision fields
}
```

**Handler**: Updates real-time metrics, invalidates cache, emits `analytics:metrics:updated`

### investigation:updated

Subscribe to investigation updates for investigation-specific analytics.

**Event**: `investigation:updated`

**Payload** (from investigation service):
```typescript
{
  investigationId: string;
  status: string;
  updatedAt: string;
  // ... other investigation fields
}
```

**Handler**: Updates investigation-specific analytics, emits `analytics:investigation:updated`

### investigation:completed

Subscribe to investigation completion for final metrics calculation.

**Event**: `investigation:completed`

**Payload**:
```typescript
{
  investigationId: string;
  completedAt: string;
  results: {...};
}
```

**Handler**: Calculates final metrics for investigation, updates dashboard

## Event Handlers

### Real-time Metrics Handler

```typescript
eventBus.on('fraud:decision', (decision: FraudDecision) => {
  // Update metrics cache
  // Calculate new KPIs
  // Emit analytics:metrics:updated
});
```

### Investigation Handler

```typescript
eventBus.on('investigation:updated', (investigation: Investigation) => {
  // Update investigation-specific analytics
  // Filter dashboard if investigation ID matches
});
```

### Pipeline Health Handler

```typescript
eventBus.on('pipeline:health-changed', (health: PipelineHealth) => {
  // Update pipeline health display
  // Show alerts if status is degraded/down
});
```

## Deep Linking Events

### analytics:navigate

Request navigation to analytics with filters.

**Event**: `analytics:navigate`

**Payload**:
```typescript
{
  investigationId?: string;
  cohortId?: string;
  filters?: {
    startDate?: string;
    endDate?: string;
    dimension?: string;
  };
}
```

**Handler**: Navigate to `/analytics` route with query parameters

### analytics:filter-changed

Published when user changes filters in analytics dashboard.

**Event**: `analytics:filter-changed`

**Payload**:
```typescript
{
  filters: {
    startDate?: string;
    endDate?: string;
    investigationId?: string;
    dimension?: string;
  };
  source: 'user' | 'deep-link';
}
```

## Error Events

### analytics:error

Published when analytics service encounters an error.

**Event**: `analytics:error`

**Payload**:
```typescript
{
  error: string;
  message: string;
  component?: string; // 'dashboard' | 'metrics' | 'cohort' | etc.
  timestamp: string;
  recoverable: boolean;
}
```

## Event Bus Lifecycle

### Initialization

```typescript
// On service initialization
eventBus.emit('analytics:service:ready', {
  service: 'analytics',
  timestamp: new Date().toISOString(),
  capabilities: [...],
  version: '1.0.0'
});

// Subscribe to events
eventBus.on('fraud:decision', handleFraudDecision);
eventBus.on('investigation:updated', handleInvestigationUpdate);
```

### Cleanup

```typescript
// On service unmount
eventBus.off('fraud:decision', handleFraudDecision);
eventBus.off('investigation:updated', handleInvestigationUpdate);
```

## Event Bus Best Practices

1. **Idempotency**: Event handlers should be idempotent
2. **Error Handling**: Wrap event handlers in try-catch, emit error events
3. **Debouncing**: Debounce high-frequency events (e.g., metrics updates)
4. **Filtering**: Filter events by investigation ID or other criteria when needed
5. **Cleanup**: Always unsubscribe from events on component unmount

