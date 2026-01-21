/**
 * UI-Specific Base Types for Hybrid Graph Investigation UI
 *
 * This module defines core UI types including concept types, basic event types,
 * and fundamental UI constructs for the 4 UI concepts.
 *
 * @author Gil Klainert
 * @created 2025-01-21
 */

import type { DomainType, EntityType, Severity } from './investigation.types';

// ============================================================================
// UI Concept Types
// ============================================================================

/**
 * The 4 UI concept types
 */
export type ConceptType = "power_grid" | "command_center" | "evidence_trail" | "network_explorer";

/**
 * Tool types for agent tools
 */
export type ToolType =
  | "data"              // Data retrieval tools
  | "intel"             // Intelligence gathering
  | "analysis"          // Analysis algorithms
  | "decision"          // Decision-making tools
  | "notification"      // Alert/notification tools
  | "export";           // Export/reporting tools

/**
 * Health status for tools and systems
 */
export type HealthStatus = "healthy" | "degraded" | "failed" | "maintenance";

/**
 * Event actors in the investigation timeline
 */
export type EventActor =
  | "orchestrator"      // Investigation orchestrator
  | "agent"             // AI analysis agent
  | "tool"              // Automated tool
  | "user"              // Human user
  | "system"            // System process
  | "external";         // External service

/**
 * Event actions in the investigation timeline
 */
export type EventAction =
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

// ============================================================================
// Basic Timeline Event Types
// ============================================================================

/**
 * Timeline event for investigation history
 */
export interface TimelineEvent {
  /** Core identification */
  id: string;
  investigation_id: string;
  sequence_number: number;      // Order within investigation

  /** Event details */
  timestamp: string;            // ISO 8601 timestamp
  actor: EventActor;            // Who/what performed this action
  action: EventAction;          // What action was performed

  /** Event data */
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

  /** Performance */
  duration_ms: number;          // How long this event took
  success: boolean;             // Whether the event succeeded
  error_message?: string;       // Error if failed

  /** Impact */
  risk_delta?: number;          // Change in risk score (-1 to 1)
  confidence_delta?: number;    // Change in confidence (-1 to 1)
  evidence_generated: string[]; // Evidence IDs created by this event

  /** Relationships */
  parent_event?: string;        // Parent event ID if this is a sub-event
  child_events: string[];       // Child event IDs
  related_events: string[];     // Related events

  /** UI presentation */
  display_config: TimelineEventDisplay;
}

/**
 * Timeline event display configuration
 */
export interface TimelineEventDisplay {
  color: string;              // Timeline color
  icon: string;               // Icon to display
  expandable: boolean;        // Can this event be expanded
  importance: number;         // 1-5 importance for filtering
}

// ============================================================================
// Notification Types
// ============================================================================

/**
 * Notification preferences for Command Center
 */
export interface NotificationPreferences {
  email_alerts: boolean;
  browser_notifications: boolean;
  sound_alerts: boolean;
  severity_threshold: Severity;
  frequency_limit: number; // Max notifications per hour
}

// ============================================================================
// WebSocket Event Types
// ============================================================================

/**
 * WebSocket event types for real-time updates
 */
export type InvestigationWebSocketEvent =
  | { type: "investigation.started"; data: any }
  | { type: "investigation.updated"; data: any }
  | { type: "domain.analysis_started"; data: any }
  | { type: "domain.analysis_completed"; data: any }
  | { type: "evidence.found"; data: any }
  | { type: "risk.updated"; data: any }
  | { type: "timeline.event"; data: TimelineEvent }
  | { type: "tool.status_changed"; data: any }
  | { type: "investigation.completed"; data: any };

// ============================================================================
// React Query Integration Types
// ============================================================================

/**
 * React Query key factory for investigations
 */
export const investigationQueryKeys = {
  all: ['investigations'] as const,
  lists: () => [...investigationQueryKeys.all, 'list'] as const,
  list: (filters: string) => [...investigationQueryKeys.lists(), { filters }] as const,
  details: () => [...investigationQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...investigationQueryKeys.details(), id] as const,
  evidence: (id: string) => [...investigationQueryKeys.detail(id), 'evidence'] as const,
  timeline: (id: string) => [...investigationQueryKeys.detail(id), 'timeline'] as const,
  graph: (id: string) => [...investigationQueryKeys.detail(id), 'graph'] as const,
} as const;

// ============================================================================
// Base UI State Types
// ============================================================================

/**
 * Base interface for all UI concept states
 */
export interface BaseUIState {
  /** Common filters */
  time_range_filter?: { start: string; end: string };
  risk_level_filter?: Severity[];

  /** Common display options */
  theme: "light" | "dark" | "auto";
  density: "compact" | "normal" | "spacious";
  animation_enabled: boolean;

  /** Common interaction state */
  selected_items: string[];
  last_interaction: string; // ISO 8601 timestamp
}

/**
 * PowerGrid UI state
 */
export interface PowerGridUIState extends BaseUIState {
  graph_layout: "force" | "radial" | "hierarchical";
  node_size_metric: "risk_score" | "evidence_count" | "confidence";
  edge_filter: string[];
  zoom_level: number;
  center_position: { x: number; y: number };
  domain_filter: DomainType[];
  risk_threshold: number;
  animation_speed: number;
}

/**
 * CommandCenter UI state
 */
export interface CommandCenterUIState extends BaseUIState {
  tool_view_mode: "grid" | "list" | "timeline";
  tool_filter: ToolType[];
  health_filter: HealthStatus[];
  metrics_timespan: "1h" | "6h" | "24h" | "7d";
  metrics_refresh_rate: number;
  alert_severity_filter: Severity[];
  notification_preferences: NotificationPreferences;
  panel_layout: "split" | "tabs" | "overlay";
  collapsed_panels: string[];
}

/**
 * EvidenceTrail UI state
 */
export interface EvidenceTrailUIState extends BaseUIState {
  timeline_zoom: "minutes" | "hours" | "days";
  timeline_position: string; // ISO 8601 timestamp
  evidence_type_filter: string[];
  strength_threshold: number;
  verification_filter: string[];
  show_relationships: boolean;
  group_by_domain: boolean;
  sort_order: "chronological" | "strength" | "relevance";
  expanded_evidence: string[];
  comparison_mode: boolean;
}

/**
 * NetworkExplorer UI state
 */
export interface NetworkExplorerUIState extends BaseUIState {
  network_layout: "geographic" | "logical" | "temporal";
  entity_types: EntityType[];
  relationship_depth: number;
  map_center: { lat: number; lng: number };
  map_zoom: number;
  show_paths: boolean;
  clustering_algorithm: "community" | "hierarchical" | "force";
  cluster_threshold: number;
  path_analysis_enabled: boolean;
  anomaly_detection_enabled: boolean;
}