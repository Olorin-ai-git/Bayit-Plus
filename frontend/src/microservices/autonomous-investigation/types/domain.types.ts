/**
 * Domain Analysis Types for Hybrid Graph Investigation UI
 *
 * This module defines domain-specific data models including domain analysis,
 * risk indicators, and domain-related types.
 *
 * @author Gil Klainert
 * @created 2025-01-21
 */

import type { Severity, ApiResponse } from './investigation.types';

// ============================================================================
// Domain Types
// ============================================================================

/**
 * Domain types for investigation analysis
 */
export type DomainType =
  | "authentication"   // Login patterns, credentials
  | "device"          // Device fingerprinting, hardware
  | "network"         // IP, geography, VPN detection
  | "logs"            // Activity logs, audit trails
  | "location"        // Geographic analysis
  | "behavioral"      // User behavior patterns
  | "financial"       // Transaction patterns
  | "temporal";       // Time-based patterns

/**
 * Status of domain analysis
 */
export type AnalysisStatus =
  | "pending"         // Not yet started
  | "running"         // Currently analyzing
  | "complete"        // Analysis finished
  | "failed"          // Analysis failed
  | "timeout"         // Analysis timed out
  | "cancelled"       // Analysis cancelled
  | "waiting_data";   // Waiting for external data

// ============================================================================
// Domain Analysis Interface
// ============================================================================

/**
 * Analysis results for each investigation domain
 */
export interface Domain {
  /** Core identification */
  name: DomainType;
  investigation_id: string;

  /** Analysis results */
  risk_score: number;           // 0-1 risk score for this domain
  confidence: number;           // 0-1 confidence in analysis
  evidence_count: number;       // Number of evidence items found

  /** Status tracking */
  analysis_status: AnalysisStatus;
  last_updated: string;         // ISO 8601 timestamp
  analysis_duration_ms: number; // How long analysis took

  /** Findings */
  indicators: RiskIndicator[];   // Risk indicators found
  evidence_items: string[];      // Evidence IDs (references)
  recommendations: string[];     // Domain-specific recommendations

  /** Agent information */
  analyzing_agent: string;       // Which agent analyzed this domain
  agent_version: string;         // Agent version for reproducibility

  /** Dependencies */
  depends_on: DomainType[];      // Other domains this analysis depends on
  blocked_by: string[];          // What's preventing complete analysis
}

/**
 * Risk indicators found during domain analysis
 */
export interface RiskIndicator {
  name: string;                 // Human-readable indicator name
  severity: Severity;           // Risk level of this indicator
  weight: number;              // 0-1 weight in final risk calculation
  confidence: number;          // 0-1 confidence in this indicator
  description: string;         // Detailed description
  evidence_refs: string[];     // References to supporting evidence
  policy_violation?: string;   // Policy ID if this violates a rule
}

/**
 * Domain analysis configuration
 */
export interface DomainConfig {
  domain: DomainType;
  enabled: boolean;
  priority: number;             // 1-10 priority order
  timeout_ms: number;           // Max analysis time
  required_evidence_types: string[];
  optional_evidence_types: string[];
  agent_configuration: Record<string, unknown>;
}

/**
 * Domain analysis metrics
 */
export interface DomainMetrics {
  domain: DomainType;
  total_analyses: number;
  success_rate: number;         // 0-1 success rate
  avg_duration_ms: number;      // Average analysis duration
  avg_evidence_found: number;   // Average evidence items per analysis
  avg_risk_score: number;       // Average risk score
  common_indicators: string[];  // Most common risk indicators
}

/**
 * Domain dependencies and relationships
 */
export interface DomainDependency {
  source_domain: DomainType;
  target_domain: DomainType;
  dependency_type: "requires" | "enhances" | "conflicts";
  strength: number;             // 0-1 dependency strength
  description: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export type DomainResponse = ApiResponse<Domain>;
export type DomainListResponse = ApiResponse<Domain[]>;
export type RiskIndicatorResponse = ApiResponse<RiskIndicator>;
export type DomainMetricsResponse = ApiResponse<DomainMetrics>;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates a domain analysis object
 */
export const validateDomain = (domain: Domain): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (domain.risk_score < 0 || domain.risk_score > 1) {
    errors.push("Domain risk score must be between 0 and 1");
  }

  if (domain.confidence < 0 || domain.confidence > 1) {
    errors.push("Domain confidence must be between 0 and 1");
  }

  if (domain.evidence_count < 0) {
    errors.push("Evidence count cannot be negative");
  }

  if (!domain.analyzing_agent || domain.analyzing_agent.trim().length === 0) {
    errors.push("Domain must have an analyzing agent");
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Validates a risk indicator object
 */
export const validateRiskIndicator = (indicator: RiskIndicator): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (indicator.weight < 0 || indicator.weight > 1) {
    errors.push("Risk indicator weight must be between 0 and 1");
  }

  if (indicator.confidence < 0 || indicator.confidence > 1) {
    errors.push("Risk indicator confidence must be between 0 and 1");
  }

  if (!indicator.name || indicator.name.trim().length === 0) {
    errors.push("Risk indicator must have a name");
  }

  return { valid: errors.length === 0, errors };
};