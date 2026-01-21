/**
 * B2B Capabilities Types
 *
 * Type definitions for B2B API capabilities (Fraud Detection, Content AI).
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

export interface FraudRiskRequest {
  entityType: string;
  entityId: string;
  attributes: Record<string, unknown>;
}

export interface FraudRiskResponse {
  requestId: string;
  entityType: string;
  entityId: string;
  riskScore: number;
  riskLevel: RiskLevel;
  factors: RiskFactor[];
  recommendations: string[];
  processedAt: string;
  latencyMs: number;
}

export interface RiskFactor {
  name: string;
  weight: number;
  contribution: number;
  description: string;
}

export interface AnomalyDetectionRequest {
  datasetId: string;
  parameters: Record<string, unknown>;
}

export interface AnomalyDetectionResponse {
  requestId: string;
  anomalies: Anomaly[];
  totalRecords: number;
  anomalyRate: number;
  processedAt: string;
  latencyMs: number;
}

export interface Anomaly {
  id: string;
  recordId: string;
  anomalyScore: number;
  riskLevel: RiskLevel;
  features: Record<string, unknown>;
  explanation: string;
}

export interface InvestigationRequest {
  name: string;
  description: string;
  entityType: string;
  entityIds: string[];
  parameters: Record<string, unknown>;
}

export interface InvestigationResponse {
  investigationId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  completedAt: string | null;
  results: InvestigationResult | null;
}

export interface InvestigationResult {
  findings: Finding[];
  riskScore: number;
  recommendations: string[];
}

export interface Finding {
  id: string;
  type: string;
  severity: RiskLevel;
  description: string;
  evidence: Record<string, unknown>[];
}

export interface SemanticSearchRequest {
  query: string;
  limit?: number;
  filters?: Record<string, unknown>;
}

export interface SemanticSearchResponse {
  requestId: string;
  results: SearchResult[];
  totalResults: number;
  processedAt: string;
  latencyMs: number;
}

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface CulturalContextRequest {
  text: string;
  language?: string;
}

export interface CulturalContextResponse {
  requestId: string;
  references: CulturalReference[];
  detectedLanguage: string;
  processedAt: string;
  latencyMs: number;
}

export interface CulturalReference {
  id: string;
  type: string;
  name: string;
  description: string;
  confidence: number;
  sourceRange: { start: number; end: number };
}

export interface RecapSessionRequest {
  name: string;
  description?: string;
  context?: Record<string, unknown>;
}

export interface RecapSessionResponse {
  sessionId: string;
  status: 'active' | 'completed' | 'expired';
  createdAt: string;
  expiresAt: string;
}

export interface RecapMessageRequest {
  sessionId: string;
  message: string;
}

export interface RecapMessageResponse {
  sessionId: string;
  response: string;
  processedAt: string;
  latencyMs: number;
}
