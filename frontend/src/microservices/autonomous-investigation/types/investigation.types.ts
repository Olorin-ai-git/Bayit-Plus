/**
 * Core Investigation Types for Hybrid Graph Investigation UI
 *
 * This module defines the foundational data models for autonomous investigations,
 * including investigation entities, risk progression, and core types.
 *
 * @author Gil Klainert
 * @created 2025-01-21
 */

// ============================================================================
// Core Entity Types
// ============================================================================

/**
 * Entity types that can be investigated
 */
export type EntityType = "ip" | "user" | "transaction" | "device" | "email" | "domain";

/**
 * Priority levels for investigations
 */
export type Priority = "low" | "medium" | "high" | "critical";

/**
 * Severity levels for risk indicators
 */
export type Severity = "low" | "medium" | "high" | "critical";

/**
 * Investigation phases during the autonomous investigation lifecycle
 */
export type InvestigationPhase =
  | "initiation"     // Investigation just started
  | "data_collection" // Gathering initial data
  | "analysis"       // AI agents analyzing evidence
  | "review"         // Human review of results
  | "summary"        // Generating final summary
  | "complete"       // Investigation finished
  | "archived";      // Investigation archived

/**
 * Current status of an investigation
 */
export type InvestigationStatus =
  | "running"        // Actively processing
  | "paused"         // Temporarily paused
  | "waiting"        // Waiting for external dependencies
  | "review_needed"  // Requires human review
  | "complete"       // Successfully completed
  | "failed"         // Failed with errors
  | "cancelled";     // Manually cancelled

// ============================================================================
// Core Investigation Interface
// ============================================================================

/**
 * Central entity representing an autonomous investigation instance
 */
export interface Investigation {
  /** Unique investigation identifier (e.g., "INV-123") */
  id: string;

  /** The entity being investigated */
  entity: {
    type: EntityType;
    value: string;
  };

  /** Time boundaries for the investigation */
  time_window: {
    start: string;               // ISO 8601 timestamp
    end: string;                 // ISO 8601 timestamp
    duration_hours: number;      // Calculated duration for display
  };

  /** Status and lifecycle tracking */
  current_phase: InvestigationPhase;
  status: InvestigationStatus;
  priority: Priority;

  /** Quality metrics */
  confidence: number;            // 0-1 confidence in final results
  quality_score: number;         // 0-1 quality of evidence and analysis
  completeness: number;          // 0-1 percentage of domains analyzed

  /** Risk assessment */
  risk_score: number;           // 0-1 final risk score
  risk_progression: RiskProgression[];  // Historical risk score changes

  /** Assignment and ownership */
  created_by: string;           // User ID who initiated
  assigned_to: string[];        // Array of assigned analyst user IDs
  reviewed_by?: string;         // Senior analyst who reviewed

  /** Metadata */
  created_at: string;           // ISO 8601 timestamp
  updated_at: string;           // ISO 8601 timestamp
  completed_at?: string;        // ISO 8601 timestamp if complete

  /** UI state (local to microservice) */
  ui_state?: InvestigationUIState;
}

/**
 * UI-specific state for investigations
 */
export interface InvestigationUIState {
  selected_concept: string;      // Current UI concept being viewed
  last_viewed: string;           // ISO 8601 timestamp
  bookmarked: boolean;
  notes: InvestigationNote[];
}

/**
 * Risk progression tracking over time
 */
export interface RiskProgression {
  timestamp: string;            // When the risk score changed
  score: number;               // Risk score at this point (0-1)
  source: string;              // What caused the change (domain, tool, manual)
  reason: string;              // Human-readable reason for change
  confidence: number;          // Confidence in this score (0-1)
  evidence_count: number;      // Total evidence items at this point
}

/**
 * Investigation notes and annotations
 */
export interface InvestigationNote {
  id: string;
  user_id: string;
  timestamp: string;
  content: string;
  type: "comment" | "flag" | "escalation";
  visibility: "private" | "team" | "all";
}

// ============================================================================
// Validation and Utility Types
// ============================================================================

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * API response wrapper interface
 */
export interface ApiResponse<T> {
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

// ============================================================================
// Type Aliases for API Responses
// ============================================================================

export type InvestigationResponse = ApiResponse<Investigation>;
export type InvestigationListResponse = ApiResponse<Investigation[]>;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates an investigation object
 */
export const validateInvestigation = (investigation: Investigation): ValidationResult => {
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