# Data Model: Hybrid Graph Investigation UI

**Created**: 2025-01-21
**Phase**: 1 - Architecture & Contracts
**Status**: Complete

## Overview

This document defines the comprehensive data models for the Hybrid Graph Investigation UI concepts. These models support all 4 UI concepts (Power Grid, Command Center, Evidence Trail, Network Explorer) and ensure consistent data flow across the autonomous-investigation microservice.

## Core Data Models

### Investigation Entity

The central entity representing an autonomous investigation instance.

```typescript
interface Investigation {
  // Core identification
  id: string;                    // Unique investigation identifier (e.g., "INV-123")
  entity: {
    type: EntityType;            // "ip" | "user" | "transaction" | "device"
    value: string;               // The actual entity value being investigated
  };

  // Time boundaries
  time_window: {
    start: string;               // ISO 8601 timestamp
    end: string;                 // ISO 8601 timestamp
    duration_hours: number;      // Calculated duration for display
  };

  // Status and lifecycle
  current_phase: InvestigationPhase;
  status: InvestigationStatus;
  priority: Priority;

  // Quality metrics
  confidence: number;            // 0-1 confidence in final results
  quality_score: number;         // 0-1 quality of evidence and analysis
  completeness: number;          // 0-1 percentage of domains analyzed

  // Risk assessment
  risk_score: number;           // 0-1 final risk score
  risk_progression: RiskProgression[];  // Historical risk score changes

  // Assignment and ownership
  created_by: string;           // User ID who initiated
  assigned_to: string[];        // Array of assigned analyst user IDs
  reviewed_by?: string;         // Senior analyst who reviewed

  // Metadata
  created_at: string;           // ISO 8601 timestamp
  updated_at: string;           // ISO 8601 timestamp
  completed_at?: string;        // ISO 8601 timestamp if complete

  // UI state (local to microservice)
  ui_state?: {
    selected_concept: ConceptType;
    last_viewed: string;
    bookmarked: boolean;
    notes: InvestigationNote[];
  };
}

type InvestigationPhase =
  | "initiation"     // Investigation just started
  | "data_collection" // Gathering initial data
  | "analysis"       // AI agents analyzing evidence
  | "review"         // Human review of results
  | "summary"        // Generating final summary
  | "complete"       // Investigation finished
  | "archived";      // Investigation archived

type InvestigationStatus =
  | "running"        // Actively processing
  | "paused"         // Temporarily paused
  | "waiting"        // Waiting for external dependencies
  | "review_needed"  // Requires human review
  | "complete"       // Successfully completed
  | "failed"         // Failed with errors
  | "cancelled";     // Manually cancelled

type Priority = "low" | "medium" | "high" | "critical";

type EntityType = "ip" | "user" | "transaction" | "device" | "email" | "domain";

type ConceptType = "power_grid" | "command_center" | "evidence_trail" | "network_explorer";
```

### Risk Progression Tracking

```typescript
interface RiskProgression {
  timestamp: string;            // When the risk score changed
  score: number;               // Risk score at this point (0-1)
  source: string;              // What caused the change (domain, tool, manual)
  reason: string;              // Human-readable reason for change
  confidence: number;          // Confidence in this score (0-1)
  evidence_count: number;      // Total evidence items at this point
}

interface InvestigationNote {
  id: string;
  user_id: string;
  timestamp: string;
  content: string;
  type: "comment" | "flag" | "escalation";
  visibility: "private" | "team" | "all";
}
```

### Domain Analysis Results

Represents analysis results for each investigation domain (network, device, location, etc.).

```typescript
interface Domain {
  // Core identification
  name: DomainType;
  investigation_id: string;

  // Analysis results
  risk_score: number;           // 0-1 risk score for this domain
  confidence: number;           // 0-1 confidence in analysis
  evidence_count: number;       // Number of evidence items found

  // Status tracking
  analysis_status: AnalysisStatus;
  last_updated: string;         // ISO 8601 timestamp
  analysis_duration_ms: number; // How long analysis took

  // Findings
  indicators: RiskIndicator[];   // Risk indicators found
  evidence_items: Evidence[];    // Detailed evidence
  recommendations: string[];     // Domain-specific recommendations

  // Agent information
  analyzing_agent: string;       // Which agent analyzed this domain
  agent_version: string;         // Agent version for reproducibility

  // Dependencies
  depends_on: DomainType[];      // Other domains this analysis depends on
  blocked_by: string[];          // What's preventing complete analysis
}

type DomainType =
  | "authentication"   // Login patterns, credentials
  | "device"          // Device fingerprinting, hardware
  | "network"         // IP, geography, VPN detection
  | "logs"            // Activity logs, audit trails
  | "location"        // Geographic analysis
  | "behavioral"      // User behavior patterns
  | "financial"       // Transaction patterns
  | "temporal";       // Time-based patterns

type AnalysisStatus =
  | "pending"         // Not yet started
  | "running"         // Currently analyzing
  | "complete"        // Analysis finished
  | "failed"          // Analysis failed
  | "timeout"         // Analysis timed out
  | "cancelled"       // Analysis cancelled
  | "waiting_data";   // Waiting for external data

interface RiskIndicator {
  name: string;                 // Human-readable indicator name
  severity: Severity;           // Risk level of this indicator
  weight: number;              // 0-1 weight in final risk calculation
  confidence: number;          // 0-1 confidence in this indicator
  description: string;         // Detailed description
  evidence_refs: string[];     // References to supporting evidence
  policy_violation?: string;   // Policy ID if this violates a rule
}

type Severity = "low" | "medium" | "high" | "critical";
```

### Evidence Management

```typescript
interface Evidence {
  // Core identification
  id: string;                   // Unique evidence identifier
  investigation_id: string;
  domain: DomainType;

  // Evidence details
  type: EvidenceType;
  source: string;               // Where this evidence came from
  strength: number;             // 0-1 strength of this evidence
  reliability: number;          // 0-1 reliability of the source

  // Content
  title: string;                // Short description
  description: string;          // Detailed description
  raw_data?: unknown;           // Original data if applicable
  processed_data?: unknown;     // Processed/normalized data

  // Temporal information
  discovered_at: string;        // When evidence was found
  occurred_at?: string;         // When the evidence event occurred
  time_range?: {
    start: string;
    end: string;
  };

  // Relationships
  related_evidence: string[];   // IDs of related evidence
  supports_indicators: string[]; // Indicator IDs this evidence supports
  contradicts_evidence: string[]; // Evidence this contradicts

  // Verification
  verification_status: VerificationStatus;
  verified_by?: string;         // User ID who verified
  verification_notes?: string;

  // UI presentation
  display_data: {
    summary: string;            // One-line summary for timeline
    details: string;            // Expanded details
    visualization?: {           // Chart/graph data if applicable
      type: string;
      data: unknown;
    };
  };
}

type EvidenceType =
  | "login_pattern"      // Authentication patterns
  | "device_fingerprint" // Device characteristics
  | "ip_geolocation"     // Geographic data
  | "transaction_data"   // Financial transactions
  | "user_behavior"      // Behavioral patterns
  | "network_traffic"    // Network analysis
  | "audit_log"         // System logs
  | "external_intel"    // Third-party intelligence
  | "policy_violation"  // Rule violations
  | "anomaly_detection"; // Statistical anomalies

type VerificationStatus =
  | "unverified"        // Not yet verified
  | "verified"          // Verified as accurate
  | "disputed"          // Accuracy disputed
  | "false_positive"    // Determined to be false positive
  | "pending_review";   // Waiting for verification
```

### Agent and Tool Execution

```typescript
interface AgentTool {
  // Core identification
  name: string;                 // Tool name (e.g., "snowflake_query")
  type: ToolType;
  version: string;              // Tool version for reproducibility

  // Execution statistics
  calls: number;                // Number of times called
  duration_ms: number;          // Total execution time
  avg_duration_ms: number;      // Average execution time

  // Health and performance
  success_rate: number;         // 0-1 success rate
  errors: ToolError[];          // Recent errors
  last_execution: string;       // ISO 8601 timestamp
  health_status: HealthStatus;

  // Configuration
  configuration: Record<string, unknown>; // Tool-specific config
  dependencies: string[];       // Other tools this depends on

  // Investigation context
  investigation_id: string;
  domain: DomainType;           // Which domain this tool serves

  // Performance metrics
  performance_metrics: {
    latency_p50: number;        // 50th percentile latency
    latency_p95: number;        // 95th percentile latency
    throughput: number;         // Operations per second
    error_rate: number;         // Errors per minute
  };
}

type ToolType =
  | "data"              // Data retrieval tools
  | "intel"             // Intelligence gathering
  | "analysis"          // Analysis algorithms
  | "decision"          // Decision-making tools
  | "notification"      // Alert/notification tools
  | "export";           // Export/reporting tools

type HealthStatus = "healthy" | "degraded" | "failed" | "maintenance";

interface ToolError {
  timestamp: string;
  error_type: string;
  message: string;
  stack_trace?: string;
  resolution_status: "open" | "resolved" | "investigating";
  impact: "low" | "medium" | "high";
}
```

### Timeline Events

```typescript
interface TimelineEvent {
  // Core identification
  id: string;
  investigation_id: string;
  sequence_number: number;      // Order within investigation

  // Event details
  timestamp: string;            // ISO 8601 timestamp
  actor: EventActor;            // Who/what performed this action
  action: EventAction;          // What action was performed

  // Event data
  input_data?: {
    summary: string;            // Brief description of input
    details?: unknown;          // Full input data
    size_bytes?: number;        // Size of input data
  };

  output_data?: {
    summary: string;            // Brief description of output
    details?: unknown;          // Full output data
    size_bytes?: number;        // Size of output data
  };

  // Performance
  duration_ms: number;          // How long this event took
  success: boolean;             // Whether the event succeeded
  error_message?: string;       // Error if failed

  // Impact
  risk_delta?: number;          // Change in risk score (-1 to 1)
  confidence_delta?: number;    // Change in confidence (-1 to 1)
  evidence_generated: string[]; // Evidence IDs created by this event

  // Relationships
  parent_event?: string;        // Parent event ID if this is a sub-event
  child_events: string[];       // Child event IDs
  related_events: string[];     // Related events

  // UI presentation
  display_config: {
    color: string;              // Timeline color
    icon: string;               // Icon to display
    expandable: boolean;        // Can this event be expanded
    importance: number;         // 1-5 importance for filtering
  };
}

type EventActor =
  | "orchestrator"      // Investigation orchestrator
  | "agent"             // AI analysis agent
  | "tool"              // Automated tool
  | "user"              // Human user
  | "system"            // System process
  | "external";         // External service

type EventAction =
  | "investigation_started"
  | "investigation_completed"
  | "tool_call"
  | "tool_response"
  | "risk_update"
  | "evidence_found"
  | "analysis_completed"
  | "decision_made"
  | "user_action"
  | "error_occurred"
  | "data_received"
  | "export_generated";
```

### Graph Data Model

```typescript
interface GraphData {
  investigation_id: string;
  last_updated: string;

  nodes: GraphNode[];
  edges: GraphEdge[];

  layout_data?: {
    force_directed?: ForceLayoutData;
    radial?: RadialLayoutData;
    hierarchical?: HierarchicalLayoutData;
  };

  performance_stats: {
    node_count: number;
    edge_count: number;
    render_time_ms: number;
    last_layout_time_ms: number;
  };
}

interface GraphNode {
  // Core identification
  id: string;
  type: NodeType;
  label: string;

  // Position (for cached layouts)
  x?: number;
  y?: number;

  // Visual properties
  size: number;                 // Node size
  color: string;                // Node color
  shape: NodeShape;             // Node shape

  // Data properties
  risk_score?: number;          // 0-1 risk score if applicable
  confidence?: number;          // 0-1 confidence if applicable
  status: NodeStatus;           // Current status

  // Connected data
  properties: Record<string, unknown>; // Node-specific properties
  evidence_refs: string[];      // Evidence this node represents

  // UI state
  selected: boolean;
  highlighted: boolean;
  clustered: boolean;           // Is this node part of a cluster
  cluster_id?: string;          // Cluster ID if clustered

  // Accessibility
  aria_label: string;           // Screen reader description
  keyboard_focusable: boolean;
}

type NodeType = "domain" | "tool" | "evidence" | "decision" | "cluster";
type NodeShape = "circle" | "square" | "diamond" | "triangle";
type NodeStatus = "active" | "complete" | "error" | "pending" | "disabled";

interface GraphEdge {
  id: string;
  source: string;               // Source node ID
  target: string;               // Target node ID
  type: EdgeType;

  // Visual properties
  weight: number;               // Edge thickness (1-10)
  color: string;                // Edge color
  style: EdgeStyle;             // Solid, dashed, dotted

  // Data properties
  strength: number;             // 0-1 relationship strength
  direction: EdgeDirection;     // Relationship direction

  // Temporal information
  created_at?: string;          // When this relationship was established

  // UI state
  highlighted: boolean;

  // Accessibility
  aria_label: string;           // Screen reader description
}

type EdgeType = "causal" | "temporal" | "similarity" | "dependency";
type EdgeStyle = "solid" | "dashed" | "dotted";
type EdgeDirection = "directed" | "undirected" | "bidirectional";

interface ForceLayoutData {
  strength: number;
  distance: number;
  iterations: number;
}

interface RadialLayoutData {
  center_node: string;
  radius: number;
  angle_step: number;
}

interface HierarchicalLayoutData {
  root_nodes: string[];
  level_height: number;
  node_spacing: number;
}
```

### Summary and Reporting

```typescript
interface InvestigationSummary {
  investigation_id: string;
  generated_at: string;
  generated_by: string;          // User ID who generated summary

  // Risk assessment
  final_risk_score: number;      // 0-1 final risk assessment
  confidence: number;            // 0-1 confidence in final assessment
  risk_factors: string[];        // Key risk factors identified

  // Evidence summary
  total_evidence_items: number;
  evidence_by_domain: Record<DomainType, number>;
  evidence_strength_distribution: {
    high: number;
    medium: number;
    low: number;
  };

  // Key findings
  key_indicators: string[];      // Most important risk indicators
  policy_violations: string[];   // Policies violated
  recommendations: Recommendation[];

  // Analysis summary
  domains_analyzed: DomainType[];
  analysis_duration_hours: number;
  tools_used: string[];
  external_data_sources: string[];

  // Decision rationale
  decision_rationale: string;    // Why this risk score was assigned
  alternative_scenarios: string[]; // Other possible interpretations
  confidence_factors: string[];  // What increases/decreases confidence

  // Quality metrics
  data_completeness: number;     // 0-1 completeness of analysis
  source_reliability: number;   // 0-1 average source reliability
  temporal_coverage: number;    // 0-1 time window coverage

  // Compliance
  compliance_status: ComplianceStatus;
  audit_trail_complete: boolean;
  reviewer_sign_off?: {
    user_id: string;
    timestamp: string;
    notes?: string;
  };
}

interface Recommendation {
  type: RecommendationType;
  priority: Priority;
  action: string;               // What action to take
  rationale: string;            // Why this action is recommended
  impact: string;               // Expected impact
  implementation_effort: "low" | "medium" | "high";
  dependencies: string[];       // What this depends on
}

type RecommendationType =
  | "block_entity"         // Block the investigated entity
  | "step_up_auth"         // Require additional authentication
  | "monitor_closely"      // Increase monitoring
  | "manual_review"        // Require human review
  | "whitelist_entity"     // Add to whitelist
  | "update_policy"        // Update fraud policies
  | "investigate_further"; // Additional investigation needed

type ComplianceStatus = "compliant" | "non_compliant" | "under_review" | "exempt";
```

### System Telemetry

```typescript
interface SystemTelemetry {
  investigation_id: string;
  collection_timestamp: string;

  // Orchestration metrics
  orchestrator_metrics: {
    loops_completed: number;
    avg_loop_duration_ms: number;
    decisions_made: number;
    escalations_triggered: number;
  };

  // Tool utilization
  tool_utilization: Record<string, {
    calls: number;
    total_duration_ms: number;
    success_rate: number;
    avg_response_time_ms: number;
  }>;

  // Performance metrics
  performance_metrics: {
    total_processing_time_ms: number;
    peak_memory_usage_mb: number;
    cpu_utilization_percent: number;
    network_requests: number;
    cache_hit_rate: number;
  };

  // Quality metrics
  quality_metrics: {
    evidence_quality_score: number;     // 0-1 average evidence quality
    source_diversity: number;           // Number of different data sources
    temporal_coverage: number;          // 0-1 time window coverage
    cross_validation_rate: number;      // 0-1 evidence cross-validation rate
  };

  // Error tracking
  warnings: TelemetryWarning[];
  errors: TelemetryError[];

  // Resource usage
  resource_usage: {
    external_api_calls: number;
    database_queries: number;
    storage_used_mb: number;
    bandwidth_used_mb: number;
  };

  // Investigation efficiency
  efficiency_metrics: {
    time_to_first_evidence_ms: number;
    time_to_decision_ms: number;
    evidence_per_minute: number;
    false_positive_rate: number;
    human_intervention_required: boolean;
  };
}

interface TelemetryWarning {
  timestamp: string;
  component: string;
  message: string;
  severity: "low" | "medium" | "high";
  resolved: boolean;
}

interface TelemetryError {
  timestamp: string;
  component: string;
  error_type: string;
  message: string;
  stack_trace?: string;
  impact: "low" | "medium" | "high" | "critical";
  resolution_status: "open" | "investigating" | "resolved";
}
```

## Data Flow Patterns

### Investigation Lifecycle Data Flow

```typescript
// 1. Investigation Initiation
const newInvestigation: Partial<Investigation> = {
  entity: { type: "ip", value: "95.211.35.146" },
  time_window: { start: "2025-01-21T10:00:00Z", end: "2025-01-23T10:00:00Z" },
  current_phase: "initiation",
  status: "running"
};

// 2. Domain Analysis Trigger
const domainAnalysis: Partial<Domain> = {
  name: "network",
  investigation_id: "INV-123",
  analysis_status: "running"
};

// 3. Evidence Discovery
const evidenceFound: Evidence = {
  id: "EV-001",
  investigation_id: "INV-123",
  domain: "network",
  type: "ip_geolocation",
  strength: 0.85,
  title: "Geographic anomaly detected",
  discovered_at: "2025-01-21T11:30:00Z"
};

// 4. Risk Score Update
const riskUpdate: RiskProgression = {
  timestamp: "2025-01-21T11:30:00Z",
  score: 0.75,
  source: "network_agent",
  reason: "IP location inconsistency detected",
  confidence: 0.82,
  evidence_count: 3
};

// 5. Investigation Completion
const completedInvestigation: Partial<Investigation> = {
  current_phase: "complete",
  status: "complete",
  confidence: 0.78,
  quality_score: 0.85,
  completed_at: "2025-01-21T14:00:00Z"
};
```

### Real-time Update Patterns

```typescript
// WebSocket event types for real-time updates
type InvestigationWebSocketEvent =
  | { type: "investigation.started", data: Investigation }
  | { type: "investigation.updated", data: Partial<Investigation> }
  | { type: "domain.analysis_started", data: Domain }
  | { type: "domain.analysis_completed", data: Domain }
  | { type: "evidence.found", data: Evidence }
  | { type: "risk.updated", data: RiskProgression }
  | { type: "timeline.event", data: TimelineEvent }
  | { type: "tool.status_changed", data: AgentTool }
  | { type: "investigation.completed", data: InvestigationSummary };
```

## Validation Rules

### Data Integrity Constraints

```typescript
// Investigation validation
const validateInvestigation = (investigation: Investigation): ValidationResult => {
  const errors: string[] = [];

  if (investigation.confidence < 0 || investigation.confidence > 1) {
    errors.push("Confidence must be between 0 and 1");
  }

  if (investigation.risk_score < 0 || investigation.risk_score > 1) {
    errors.push("Risk score must be between 0 and 1");
  }

  if (investigation.time_window.start >= investigation.time_window.end) {
    errors.push("Time window start must be before end");
  }

  return { valid: errors.length === 0, errors };
};

// Evidence validation
const validateEvidence = (evidence: Evidence): ValidationResult => {
  const errors: string[] = [];

  if (evidence.strength < 0 || evidence.strength > 1) {
    errors.push("Evidence strength must be between 0 and 1");
  }

  if (evidence.reliability < 0 || evidence.reliability > 1) {
    errors.push("Evidence reliability must be between 0 and 1");
  }

  if (!evidence.title || evidence.title.trim().length === 0) {
    errors.push("Evidence must have a title");
  }

  return { valid: errors.length === 0, errors };
};

interface ValidationResult {
  valid: boolean;
  errors: string[];
}
```

## API Response Formats

### Standard Response Wrapper

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    request_id: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      has_next: boolean;
    };
  };
}

// Example usage
type InvestigationResponse = ApiResponse<Investigation>;
type InvestigationListResponse = ApiResponse<Investigation[]>;
type EvidenceResponse = ApiResponse<Evidence>;
```

This comprehensive data model ensures type safety, consistency, and extensibility across all 4 UI concepts while supporting the complex requirements of autonomous investigation workflows.