/**
 * Investigation Results Types (Transformed)
 * Feature: 008-live-investigation-updates
 *
 * TypeScript interfaces for investigation results AFTER BaseApiService transformation.
 * BaseApiService transforms snake_case → camelCase automatically.
 *
 * These types match what the frontend actually receives from the API.
 */

/** Finding severity levels */
export type FindingSeverity = "critical" | "high" | "medium" | "low";

/** Domain agent types */
export type DomainAgent = "device" | "location" | "network" | "logs" | "risk";

/** Individual finding from investigation (camelCase after transformation) */
export interface TransformedFinding {
  findingId: string;  // transformed from finding_id
  severity: FindingSeverity;
  domain: DomainAgent;
  title: string;
  description: string;
  affectedEntities: string[];  // transformed from affected_entities
  evidenceIds: string[];  // transformed from evidence_ids
  confidenceScore: number;  // transformed from confidence_score, 0-1
  timestamp: string;  // ISO 8601 datetime
  metadata?: Record<string, unknown>;
}

/** Evidence supporting investigation findings (camelCase after transformation) */
export interface TransformedEvidence {
  evidenceId: string;  // transformed from evidence_id
  source: string;
  evidenceType: string;  // transformed from evidence_type
  data: Record<string, unknown>;
  timestamp: string;  // ISO 8601 datetime
  confidenceScore: number;  // transformed from confidence_score, 0-1
  relatedFindings: string[];  // transformed from related_findings
}

/** Agent decision made during investigation (camelCase after transformation) */
export interface TransformedAgentDecision {
  agentName: string;  // transformed from agent_name
  decision: string;
  rationale: string;
  confidenceScore: number;  // transformed from confidence_score, 0-1
  supportingEvidence: string[];  // transformed from supporting_evidence
  alternativeHypotheses: string[];  // transformed from alternative_hypotheses
  timestamp: string;  // ISO 8601 datetime
}

/** Investigation execution metadata (camelCase after transformation) */
export interface TransformedInvestigationMetadata {
  entityType: string;  // transformed from entity_type
  entityId: string;  // transformed from entity_id
  timeRange: { start: string; end: string };  // transformed from time_range
  toolsUsed: string[];  // transformed from tools_used
  executionMode: string;  // transformed from execution_mode
  correlationMode: string;  // transformed from correlation_mode
}

/**
 * Investigation Results (camelCase after BaseApiService transformation)
 * This is what the frontend actually receives from the API.
 */
export interface TransformedInvestigationResults {
  investigationId: string;  // transformed from investigation_id
  overallRiskScore: number;  // transformed from overall_risk_score, 0-100
  status: "completed" | "failed";
  startedAt: string;  // transformed from started_at, ISO 8601 datetime
  completedAt: string;  // transformed from completed_at, ISO 8601 datetime
  durationMs: number;  // transformed from duration_ms
  findings: TransformedFinding[];
  evidence: TransformedEvidence[];
  agentDecisions: TransformedAgentDecision[];  // transformed from agent_decisions
  summary: string;
  metadata: TransformedInvestigationMetadata;
}

