# Data Model: Enhanced Progress Wizard Page

**Feature**: 007-progress-wizard-page
**Date**: 2025-10-31
**Spec**: [spec.md](./spec.md)
**Research**: [research.md](./research.md)

## Overview

This document defines the data models, TypeScript interfaces, and transformation logic required to integrate GAIA Progress Page components with Olorin investigation data. The key challenge is mapping between GAIA's expected data structures and Olorin's actual backend responses.

---

## Core Data Models

### 1. InvestigationProgress (Backend Response)

**Source**: Olorin backend `/progress` endpoint

```typescript
interface InvestigationProgress {
  // Core identification
  id: string;
  investigationId: string;

  // Status and lifecycle
  status: 'pending' | 'initializing' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  lifecycleStage: 'draft' | 'submitted' | 'in_progress' | 'completed' | 'failed';
  completionPercent: number;  // 0-100

  // Timestamps
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  lastUpdatedAt: Date;

  // Tool execution tracking
  toolExecutions: ToolExecution[];
  totalTools: number;
  completedTools: number;
  runningTools: number;
  queuedTools: number;
  failedTools: number;
  skippedTools: number;

  // Agent tracking (may be empty, need to derive from toolExecutions)
  agentStatuses?: AgentStatus[];

  // Risk assessment
  riskMetrics: {
    overall: number;  // 0-1 scale
    byAgent?: Record<string, number>;  // Agent type -> risk score (0-1)
    confidence: number;
    lastCalculated: Date;
  };

  // Phase tracking
  phases: PhaseProgress[];
  currentPhase: string | null;

  // Entity relationships
  entities: InvestigationEntity[];
  relationships: EntityRelationship[];

  // Real-time activity
  toolsPerSecond: number;
  peakToolsPerSecond: number;

  // Connection status
  iceConnected: boolean;

  // Error tracking
  errors: InvestigationError[];
}
```

### 2. ToolExecution

**Source**: Embedded in InvestigationProgress.toolExecutions

```typescript
interface ToolExecution {
  // Identification
  id: string;
  toolName: string;
  agentType: 'device' | 'location' | 'logs' | 'network' | 'labels' | 'risk' | 'orchestrator';

  // Execution lifecycle
  status: 'queued' | 'running' | 'completed' | 'failed' | 'skipped';
  queuedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  executionTimeMs: number;

  // Input/output
  input: {
    entityId: string;
    entityType: string;
    parameters: Record<string, any>;
  };

  result?: {
    success: boolean;
    riskScore?: number;  // 0-100 (need to normalize to 0-1)
    risk?: number;  // Alternative location for risk score
    findings: Finding[];
    metadata: Record<string, any>;
  };

  // Error tracking
  error?: {
    code: string;
    message: string;
    details: any;
  };

  // Retry tracking
  retryCount: number;
  maxRetries: number;
}
```

### 3. AgentStatus

**Source**: Either from backend agentStatuses array OR derived from toolExecutions

```typescript
interface AgentStatus {
  // Agent identification
  agentType: 'device' | 'location' | 'logs' | 'network' | 'labels' | 'risk';
  agentName: string;  // Human-readable name

  // Execution status
  status: 'pending' | 'running' | 'completed' | 'failed';

  // Tool tracking
  toolsCompleted: number;
  totalTools: number;
  progressPercent: number;  // 0-100

  // Performance metrics
  averageExecutionTimeMs: number;
  findingsCount: number;

  // Risk metrics
  riskScore: number;  // 0-100 (calculated from tool risk scores)
  maxRiskDetected: number;  // 0-100

  // Timestamps
  startedAt: Date | null;
  completedAt: Date | null;
}
```

### 4. PhaseProgress

**Source**: InvestigationProgress.phases

```typescript
interface PhaseProgress {
  // Phase identification
  id: string;
  name: string;
  order: number;

  // Status
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  completionPercent: number;  // 0-100

  // Associated tools
  toolExecutionIds: string[];

  // Timestamps
  startedAt: Date | null;
  completedAt: Date | null;
  estimatedDurationMs: number;
}
```

### 5. AnomalyDetection

**Source**: Extracted from ToolExecution results or separate anomalies array

```typescript
interface AnomalyDetection {
  // Identification
  id: string;
  type: string;  // e.g., 'device_mismatch', 'location_anomaly', 'suspicious_pattern'

  // Severity
  severity: 'low' | 'medium' | 'high' | 'critical';
  severityScore: number;  // 0-100

  // Context
  entityId: string;
  entityType: string;
  detectingAgent: string;
  detectingTool: string;

  // Evidence
  confidence: number;  // 0-1
  description: string;
  supportingEvidence: {
    toolExecutionId: string;
    dataPoints: any[];
  }[];

  // Timestamps
  detectedAt: Date;
}
```

### 6. EntityRelationship

**Source**: InvestigationProgress.relationships

```typescript
interface EntityRelationship {
  // Identification
  id: string;
  sourceEntityId: string;
  targetEntityId: string;

  // Relationship type
  type: 'shared_device' | 'shared_location' | 'shared_behavior' | 'shared_network' | 'temporal_proximity';
  description: string;

  // Strength
  strength: number;  // 0-100
  confidence: number;  // 0-1

  // Evidence
  discoveredByTools: string[];
  supportingFindings: string[];

  // Timestamps
  discoveredAt: Date;
  lastConfirmedAt: Date;
}
```

### 7. InvestigationEntity

**Source**: Investigation settings

```typescript
interface InvestigationEntity {
  // Identification
  id: string;
  type: 'email' | 'phone' | 'user_id' | 'device_id' | 'ip_address' | 'account_id';
  value: string;

  // Metadata
  label?: string;
  metadata: Record<string, any>;

  // Timestamps
  addedAt: Date;
}
```

---

## GAIA Component Props Interfaces

### ConnectionStatusHeader Props

```typescript
interface ConnectionStatusHeaderProps {
  investigationStatus: 'pending' | 'draft' | 'running' | 'submitted' | 'paused' | 'completed' | 'failed' | 'cancelled';
  isConnected: boolean;
  toolsPerSec: number;
  isProcessing: boolean;
  onPause: () => void;
  onCancel: () => void;
  onResume: () => void;
}
```

**Data Mapping**:
```typescript
function mapToConnectionStatusHeaderProps(
  progress: InvestigationProgress,
  isPolling: boolean,
  handlers: { onPause, onCancel, onResume }
): ConnectionStatusHeaderProps {
  return {
    investigationStatus: mapOlorinStatusToGAIA(progress.status),
    isConnected: isPolling && !hasPollingErrors(),
    toolsPerSec: progress.toolsPerSecond,
    isProcessing: progress.status === 'running',
    ...handlers
  };
}

function mapOlorinStatusToGAIA(status: string): GAIAStatus {
  const mapping = {
    'pending': 'pending',
    'initializing': 'submitted',
    'running': 'running',
    'paused': 'paused',
    'completed': 'completed',
    'failed': 'failed',
    'cancelled': 'cancelled'
  };
  return mapping[status] || 'pending';
}
```

### EnhancedEKGMonitor Props

```typescript
interface EnhancedEKGMonitorProps {
  // Metrics
  progress: number;  // 0-100
  completed: number;
  running: number;
  queued: number;
  failed: number;

  // Connection
  isConnected: boolean;
  iceConnectionStatus?: 'connected' | 'reconnecting' | 'disconnected';

  // Optional
  expectedTotal?: number;
  investigationProgress?: InvestigationProgress;
  investigationResults?: any;
  investigationId?: string;
}
```

**Data Mapping**:
```typescript
function mapToEKGMonitorProps(
  progress: InvestigationProgress,
  isPolling: boolean
): EnhancedEKGMonitorProps {
  return {
    progress: progress.completionPercent,
    completed: progress.completedTools,
    running: progress.runningTools,
    queued: progress.queuedTools,
    failed: progress.failedTools,
    isConnected: isPolling,
    expectedTotal: progress.totalTools,
    investigationProgress: progress,
    investigationId: progress.investigationId
  };
}
```

### AgentRiskGaugesSection Props

```typescript
interface AgentRiskGaugesSectionProps {
  investigationId: string;
  agents: AgentStatus[];
  isConnected: boolean;
  defaultExpanded?: boolean;
  investigationProgress: InvestigationProgress;
  investigationResults?: any;
  onConfigChange?: (config: RiskConfiguration) => void;
  initialConfig?: RiskConfiguration;
}
```

**Data Mapping**:
```typescript
function mapToAgentRiskGaugesProps(
  progress: InvestigationProgress,
  isPolling: boolean
): AgentRiskGaugesSectionProps {
  // Derive agent statuses if not provided by backend
  const agents = progress.agentStatuses?.length > 0
    ? progress.agentStatuses
    : buildAgentStatusesFromToolExecutions(progress.toolExecutions);

  return {
    investigationId: progress.investigationId,
    agents: agents,
    isConnected: isPolling,
    defaultExpanded: true,
    investigationProgress: progress
  };
}
```

### InvestigationRadarView Props

```typescript
interface InvestigationRadarViewProps {
  investigationId: string;
  sandbox: any;  // Olorin sandbox context
  entityId: string;
  entityType: string;
  userId: string;
  investigationProgress: InvestigationProgress;
  investigationResults?: any;
}
```

**Data Mapping**:
```typescript
function mapToRadarViewProps(
  progress: InvestigationProgress,
  sandbox: any
): InvestigationRadarViewProps {
  // Use first entity for radar focus
  const primaryEntity = progress.entities[0];

  return {
    investigationId: progress.investigationId,
    sandbox: sandbox,
    entityId: primaryEntity?.id || '',
    entityType: primaryEntity?.type || '',
    userId: primaryEntity?.value || '',
    investigationProgress: progress
  };
}
```

### EntityCorrelationGraph Props

```typescript
interface EntityCorrelationGraphProps {
  investigationId: string;
  apiService?: any;
  width: number;
  height: number;
  layout: 'force' | 'hierarchical' | 'circular';
  showMetrics: boolean;
  collapsible: boolean;
  minimizable: boolean;
  enablePolling: boolean;
  pollInterval: number;
}
```

**Data Mapping**:
```typescript
function mapToEntityGraphProps(
  progress: InvestigationProgress
): EntityCorrelationGraphProps {
  return {
    investigationId: progress.investigationId,
    width: 100,  // percentage
    height: 600,  // pixels
    layout: 'force',
    showMetrics: true,
    collapsible: false,
    minimizable: false,
    enablePolling: true,
    pollInterval: 30000
  };
}
```

---

## Data Transformation Functions

### 1. buildAgentStatusesFromToolExecutions

```typescript
/**
 * Derives agent statuses when backend doesn't provide them
 */
function buildAgentStatusesFromToolExecutions(
  toolExecutions: ToolExecution[]
): AgentStatus[] {
  // Group tools by agent type
  const toolsByAgent = groupBy(toolExecutions, 'agentType');

  // Create status for each agent
  const allAgents = ['device', 'location', 'logs', 'network', 'labels', 'risk'];

  return allAgents.map(agentType => {
    const tools = toolsByAgent[agentType] || [];
    const completed = tools.filter(t => t.status === 'completed').length;
    const failed = tools.filter(t => t.status === 'failed').length;
    const running = tools.filter(t => t.status === 'running').length;

    const totalExecutionTime = tools
      .filter(t => t.completedAt)
      .reduce((sum, t) => sum + t.executionTimeMs, 0);

    const findingsCount = tools
      .filter(t => t.result?.findings)
      .reduce((sum, t) => sum + t.result.findings.length, 0);

    const riskScore = calculateAverageRiskScore(tools);

    return {
      agentType,
      agentName: getAgentDisplayName(agentType),
      status: determineAgentStatus(completed, failed, running, tools.length),
      toolsCompleted: completed,
      totalTools: tools.length,
      progressPercent: tools.length > 0 ? (completed / tools.length) * 100 : 0,
      averageExecutionTimeMs: tools.length > 0 ? totalExecutionTime / tools.length : 0,
      findingsCount,
      riskScore,
      maxRiskDetected: Math.max(...tools.map(t => extractRiskScore(t) || 0)),
      startedAt: tools[0]?.startedAt || null,
      completedAt: completed === tools.length ? tools[tools.length - 1]?.completedAt : null
    };
  });
}
```

### 2. calculateAverageRiskScore

```typescript
/**
 * Calculates average risk score from tool executions
 * Normalizes from 0-100 to 0-100 (GAIA uses 0-100, not 0-1)
 */
function calculateAverageRiskScore(tools: ToolExecution[]): number {
  const toolsWithRisk = tools
    .map(t => extractRiskScore(t))
    .filter(r => r !== null);

  if (toolsWithRisk.length === 0) return 0;

  const sum = toolsWithRisk.reduce((acc, r) => acc + r, 0);
  return Math.round(sum / toolsWithRisk.length);
}

/**
 * Extracts risk score from tool execution
 * Handles multiple possible locations and normalizes to 0-100
 */
function extractRiskScore(tool: ToolExecution): number | null {
  if (!tool.result) return null;

  const risk = tool.result.riskScore
    || tool.result.risk
    || tool.result.metadata?.riskScore
    || tool.result.metadata?.risk;

  if (typeof risk !== 'number') return null;

  // Normalize: if 0-1, convert to 0-100
  return risk <= 1 ? risk * 100 : risk;
}
```

### 3. extractAnomaliesFromProgress

```typescript
/**
 * Extracts anomaly detections from tool execution results
 */
function extractAnomaliesFromProgress(
  progress: InvestigationProgress
): AnomalyDetection[] {
  const anomalies: AnomalyDetection[] = [];

  for (const tool of progress.toolExecutions) {
    if (tool.status !== 'completed' || !tool.result) continue;

    // Check for anomalies in findings
    const findings = tool.result.findings || [];
    for (const finding of findings) {
      if (finding.type === 'anomaly' || finding.severity) {
        anomalies.push({
          id: `${tool.id}-${finding.id}`,
          type: finding.type || 'unknown',
          severity: normalizeSeverity(finding.severity),
          severityScore: finding.severityScore || calculateSeverityScore(finding.severity),
          entityId: tool.input.entityId,
          entityType: tool.input.entityType,
          detectingAgent: tool.agentType,
          detectingTool: tool.toolName,
          confidence: finding.confidence || 0.5,
          description: finding.description || '',
          supportingEvidence: [{
            toolExecutionId: tool.id,
            dataPoints: finding.evidence || []
          }],
          detectedAt: tool.completedAt!
        });
      }
    }
  }

  // Sort by severity (critical first) and time (recent first)
  return anomalies
    .sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.detectedAt.getTime() - a.detectedAt.getTime();
    })
    .slice(0, 10);  // Keep only top 10 for radar
}
```

### 4. calculateToolExecutionStats

```typescript
/**
 * Calculates aggregate statistics from tool executions
 */
function calculateToolExecutionStats(
  toolExecutions: ToolExecution[]
): {
  completed: number;
  running: number;
  queued: number;
  failed: number;
  skipped: number;
  total: number;
} {
  return {
    completed: toolExecutions.filter(t => t.status === 'completed').length,
    running: toolExecutions.filter(t => t.status === 'running').length,
    queued: toolExecutions.filter(t => t.status === 'queued').length,
    failed: toolExecutions.filter(t => t.status === 'failed').length,
    skipped: toolExecutions.filter(t => t.status === 'skipped').length,
    total: toolExecutions.length
  };
}
```

---

## TypeScript Type Guards

```typescript
/**
 * Type guard for checking if progress has agent statuses
 */
function hasAgentStatuses(
  progress: InvestigationProgress
): progress is InvestigationProgress & { agentStatuses: AgentStatus[] } {
  return Array.isArray(progress.agentStatuses) && progress.agentStatuses.length > 0;
}

/**
 * Type guard for checking if progress has risk metrics by agent
 */
function hasRiskByAgent(
  progress: InvestigationProgress
): progress is InvestigationProgress & { riskMetrics: { byAgent: Record<string, number> } } {
  return progress.riskMetrics?.byAgent !== undefined
    && Object.keys(progress.riskMetrics.byAgent).length > 0;
}

/**
 * Type guard for terminal investigation status
 */
function isTerminalStatus(status: string): boolean {
  return ['completed', 'failed', 'cancelled'].includes(status);
}
```

---

## Constants and Enums

```typescript
/**
 * Agent display names mapping
 */
const AGENT_DISPLAY_NAMES: Record<string, string> = {
  device: 'Device Fingerprint Agent',
  location: 'Location Intelligence Agent',
  logs: 'Logs Analysis Agent',
  network: 'Network Analysis Agent',
  labels: 'Labels & Identity Agent',
  risk: 'Risk Assessment Agent'
};

/**
 * Agent color schemes (from GAIA)
 */
const AGENT_COLORS = {
  Device: { primary: '#8b5cf6', secondary: '#a78bfa', opacity: 0.8 },
  Location: { primary: '#3b82f6', secondary: '#60a5fa', opacity: 0.8 },
  Logs: { primary: '#10b981', secondary: '#34d399', opacity: 0.8 },
  Network: { primary: '#f59e0b', secondary: '#fbbf24', opacity: 0.8 },
  Labels: { primary: '#ef4444', secondary: '#f87171', opacity: 0.8 },
  Risk: { primary: '#ec4899', secondary: '#f472b6', opacity: 0.8 }
};

/**
 * Risk thresholds
 */
const RISK_THRESHOLDS = {
  LOW_MAX: 39,
  MEDIUM_MAX: 59,
  HIGH_MAX: 79,
  CRITICAL_MIN: 80
};

/**
 * Polling configuration
 */
const POLLING_CONFIG = {
  PROGRESS_INTERVAL_MS: 3000,
  EKG_INTERVAL_MS: 3000,
  ENTITY_GRAPH_INTERVAL_MS: 30000,
  MAX_RETRIES: 5,
  RETRY_BACKOFF_MS: [3000, 6000, 12000, 24000, 30000]
};
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   Olorin Backend                             │
│                                                              │
│  GET /api/v1/investigation/{id}/progress                     │
│  └─> Returns: InvestigationProgress                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Every 3 seconds
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              useProgressData Hook (Olorin)                   │
│                                                              │
│  - Polls backend                                             │
│  - Handles errors & reconnection                             │
│  - Updates Zustand store                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Raw Progress Data
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                Data Adapter Layer                            │
│                                                              │
│  - buildAgentStatusesFromToolExecutions()                   │
│  - calculateToolExecutionStats()                             │
│  - extractAnomaliesFromProgress()                            │
│  - calculateAverageRiskScore()                               │
│  - mapOlorinStatusToGAIA()                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Transformed Props
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              GAIA React Components                           │
│                                                              │
│  ┌────────────────────────────────────────────┐            │
│  │ ConnectionStatusHeader                      │            │
│  │  - Props: mapped status, connection, etc.  │            │
│  └────────────────────────────────────────────┘            │
│                                                              │
│  ┌────────────────────────────────────────────┐            │
│  │ EnhancedEKGMonitor                          │            │
│  │  - Props: progress %, tool counts, etc.    │            │
│  │  - Renders: P-Q-R-S-T waveform, BPM        │            │
│  └────────────────────────────────────────────┘            │
│                                                              │
│  ┌────────────────────────────────────────────┐            │
│  │ AgentRiskGaugesSection                      │            │
│  │  - Props: agent statuses array              │            │
│  │  - Renders: 6 Lux gauges with risk colors  │            │
│  └────────────────────────────────────────────┘            │
│                                                              │
│  ┌────────────────────────────────────────────┐            │
│  │ InvestigationRadarView                      │            │
│  │  - Props: anomalies, entity data            │            │
│  │  - Renders: 360° radar with blips          │            │
│  └────────────────────────────────────────────┘            │
│                                                              │
│  ┌────────────────────────────────────────────┐            │
│  │ EntityCorrelationGraph (lazy)               │            │
│  │  - Props: entities, relationships           │            │
│  │  - Renders: force-directed graph           │            │
│  └────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

---

## Summary

This data model provides a comprehensive mapping between Olorin's backend data structures and GAIA's component requirements. The key to successful integration is the **Data Adapter Layer**, which transforms Olorin's `InvestigationProgress` into the specific props formats expected by each GAIA component. All transformation functions are pure, testable, and handle edge cases gracefully. TypeScript interfaces ensure type safety throughout the integration, and constants provide consistency for agent names, colors, and thresholds.
