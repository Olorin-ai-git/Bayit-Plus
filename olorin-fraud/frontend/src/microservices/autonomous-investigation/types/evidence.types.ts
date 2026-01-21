/**
 * Evidence Management Types for Hybrid Graph Investigation UI
 *
 * This module defines evidence-specific data models including evidence items,
 * verification status, and evidence-related types.
 *
 * @author Gil Klainert
 * @created 2025-01-21
 */

import type { DomainType, ApiResponse, ValidationResult } from './investigation.types';

// ============================================================================
// Evidence Types
// ============================================================================

/**
 * Evidence types for different kinds of findings
 */
export type EvidenceType =
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

/**
 * Verification status for evidence items
 */
export type VerificationStatus =
  | "unverified"        // Not yet verified
  | "verified"          // Verified as accurate
  | "disputed"          // Accuracy disputed
  | "false_positive"    // Determined to be false positive
  | "pending_review";   // Waiting for verification

// ============================================================================
// Evidence Interface
// ============================================================================

/**
 * Evidence items found during investigation
 */
export interface Evidence {
  /** Core identification */
  id: string;                   // Unique evidence identifier
  investigation_id: string;
  domain: DomainType;

  /** Evidence details */
  type: EvidenceType;
  source: string;               // Where this evidence came from
  strength: number;             // 0-1 strength of this evidence
  reliability: number;          // 0-1 reliability of the source

  /** Content */
  title: string;                // Short description
  description: string;          // Detailed description
  raw_data?: unknown;           // Original data if applicable
  processed_data?: unknown;     // Processed/normalized data

  /** Temporal information */
  discovered_at: string;        // When evidence was found
  occurred_at?: string;         // When the evidence event occurred
  time_range?: {
    start: string;
    end: string;
  };

  /** Relationships */
  related_evidence: string[];   // IDs of related evidence
  supports_indicators: string[]; // Indicator IDs this evidence supports
  contradicts_evidence: string[]; // Evidence this contradicts

  /** Verification */
  verification_status: VerificationStatus;
  verified_by?: string;         // User ID who verified
  verification_notes?: string;

  /** UI presentation data */
  display_data: EvidenceDisplayData;
}

/**
 * Display data for evidence visualization
 */
export interface EvidenceDisplayData {
  summary: string;            // One-line summary for timeline
  details: string;            // Expanded details
  visualization?: {           // Chart/graph data if applicable
    type: string;
    data: unknown;
  };
}

/**
 * Evidence collection metrics
 */
export interface EvidenceMetrics {
  investigation_id: string;
  total_evidence_items: number;
  evidence_by_domain: Record<DomainType, number>;
  evidence_by_type: Record<EvidenceType, number>;
  strength_distribution: {
    high: number;              // strength > 0.7
    medium: number;            // strength 0.3-0.7
    low: number;               // strength < 0.3
  };
  verification_status_counts: Record<VerificationStatus, number>;
  avg_evidence_strength: number;
  avg_source_reliability: number;
}

/**
 * Evidence search and filter criteria
 */
export interface EvidenceFilter {
  investigation_id?: string;
  domains?: DomainType[];
  types?: EvidenceType[];
  min_strength?: number;
  max_strength?: number;
  verification_status?: VerificationStatus[];
  date_range?: {
    start: string;
    end: string;
  };
  search_query?: string;
  limit?: number;
  offset?: number;
}

/**
 * Evidence analysis result
 */
export interface EvidenceAnalysis {
  evidence_id: string;
  analysis_type: string;
  confidence: number;           // 0-1 confidence in analysis
  findings: string[];           // Key findings from analysis
  correlations: {
    evidence_id: string;
    correlation_strength: number; // 0-1 correlation strength
    correlation_type: string;
  }[];
  metadata: Record<string, unknown>;
}

// ============================================================================
// Evidence Graph Types
// ============================================================================

/**
 * Evidence graph node for visualization
 */
export interface EvidenceGraphNode {
  id: string;                   // Evidence ID
  label: string;                // Display label
  type: EvidenceType;
  strength: number;
  reliability: number;
  verification_status: VerificationStatus;
  position?: { x: number; y: number };
  selected: boolean;
  highlighted: boolean;
}

/**
 * Evidence graph edge for relationships
 */
export interface EvidenceGraphEdge {
  id: string;
  source: string;               // Source evidence ID
  target: string;               // Target evidence ID
  relationship_type: "supports" | "contradicts" | "relates_to" | "temporal";
  strength: number;             // 0-1 relationship strength
  description?: string;
}

/**
 * Evidence graph data structure
 */
export interface EvidenceGraph {
  investigation_id: string;
  nodes: EvidenceGraphNode[];
  edges: EvidenceGraphEdge[];
  layout_algorithm: "force" | "hierarchical" | "circular";
  last_updated: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export type EvidenceResponse = ApiResponse<Evidence>;
export type EvidenceListResponse = ApiResponse<Evidence[]>;
export type EvidenceMetricsResponse = ApiResponse<EvidenceMetrics>;
export type EvidenceAnalysisResponse = ApiResponse<EvidenceAnalysis>;
export type EvidenceGraphResponse = ApiResponse<EvidenceGraph>;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates an evidence object
 */
export const validateEvidence = (evidence: Evidence): ValidationResult => {
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

  if (!evidence.source || evidence.source.trim().length === 0) {
    errors.push("Evidence must have a source");
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Validates evidence filter criteria
 */
export const validateEvidenceFilter = (filter: EvidenceFilter): ValidationResult => {
  const errors: string[] = [];

  if (filter.min_strength !== undefined && (filter.min_strength < 0 || filter.min_strength > 1)) {
    errors.push("Minimum strength must be between 0 and 1");
  }

  if (filter.max_strength !== undefined && (filter.max_strength < 0 || filter.max_strength > 1)) {
    errors.push("Maximum strength must be between 0 and 1");
  }

  if (filter.min_strength !== undefined && filter.max_strength !== undefined &&
      filter.min_strength > filter.max_strength) {
    errors.push("Minimum strength cannot be greater than maximum strength");
  }

  if (filter.limit !== undefined && filter.limit <= 0) {
    errors.push("Limit must be greater than 0");
  }

  if (filter.offset !== undefined && filter.offset < 0) {
    errors.push("Offset cannot be negative");
  }

  return { valid: errors.length === 0, errors };
};