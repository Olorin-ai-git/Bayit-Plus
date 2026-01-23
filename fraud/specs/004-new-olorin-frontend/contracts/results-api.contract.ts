/**
 * Results API Contract
 * Feature: 004-new-olorin-frontend
 * Phase: Phase 1 - Design Contracts
 *
 * Defines API contracts for Investigation Results operations.
 * Follows SYSTEM MANDATE: All endpoints from configuration, no hardcoded URLs.
 */

import { z } from 'zod';
import {
  InvestigationResultsSchema,
  RiskAssessmentSchema,
  AgentResultSchema
} from '../data-model';

/**
 * GET /api/investigations/:id/results
 * Get complete investigation results
 */
export const GetResultsResponseSchema = InvestigationResultsSchema;

export type GetResultsResponse = z.infer<typeof GetResultsResponseSchema>;

/**
 * GET /api/investigations/:id/risk
 * Get risk assessment only
 */
export const GetRiskAssessmentResponseSchema = RiskAssessmentSchema;

export type GetRiskAssessmentResponse = z.infer<typeof GetRiskAssessmentResponseSchema>;

/**
 * GET /api/investigations/:id/agent-results
 * Get all agent analysis results
 */
export const GetAgentResultsQuerySchema = z.object({
  agentName: z.string().optional(),
  minRiskScore: z.number().min(0).max(100).optional(),
  minConfidence: z.number().min(0).max(100).optional()
});

export const GetAgentResultsResponseSchema = z.object({
  agentResults: z.array(AgentResultSchema),
  total: z.number().int().nonnegative()
});

export type GetAgentResultsQuery = z.infer<typeof GetAgentResultsQuerySchema>;
export type GetAgentResultsResponse = z.infer<typeof GetAgentResultsResponseSchema>;

/**
 * POST /api/investigations/:id/export
 * Export investigation results
 */
export const ExportFormat = z.enum(['pdf', 'json', 'csv']);

export const ExportRequestSchema = z.object({
  format: ExportFormat,
  includeVisualization: z.boolean().optional(),
  includeRawData: z.boolean().optional(),
  sections: z.array(z.enum([
    'risk_assessment',
    'agent_results',
    'tool_executions',
    'timeline',
    'evidence'
  ])).optional()
});

export const ExportResponseSchema = z.object({
  exportId: z.string().uuid(),
  format: ExportFormat,
  downloadUrl: z.string().url(),
  expiresAt: z.string().datetime(),
  sizeBytes: z.number().int().nonnegative()
});

export type ExportRequest = z.infer<typeof ExportRequestSchema>;
export type ExportResponse = z.infer<typeof ExportResponseSchema>;

/**
 * GET /api/investigations/:id/visualizations/network
 * Get network diagram data
 */
export const NetworkNodeSchema = z.object({
  id: z.string(),
  type: z.enum(['entity', 'event', 'tool', 'agent']),
  label: z.string(),
  properties: z.record(z.unknown()),
  riskScore: z.number().min(0).max(100).optional()
});

export const NetworkEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  type: z.enum(['correlation', 'execution', 'finding', 'evidence']),
  label: z.string().optional(),
  weight: z.number().min(0).max(1).optional()
});

export const NetworkDiagramSchema = z.object({
  nodes: z.array(NetworkNodeSchema),
  edges: z.array(NetworkEdgeSchema),
  layout: z.enum(['force', 'hierarchical', 'circular']).optional()
});

export const GetNetworkVisualizationResponseSchema = NetworkDiagramSchema;

export type NetworkNode = z.infer<typeof NetworkNodeSchema>;
export type NetworkEdge = z.infer<typeof NetworkEdgeSchema>;
export type NetworkDiagram = z.infer<typeof NetworkDiagramSchema>;
export type GetNetworkVisualizationResponse = z.infer<typeof GetNetworkVisualizationResponseSchema>;

/**
 * GET /api/investigations/:id/visualizations/timeline
 * Get timeline visualization data
 */
export const TimelineEventSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string().datetime(),
  type: z.enum(['tool_execution', 'finding', 'risk_indicator', 'anomaly']),
  title: z.string(),
  description: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  relatedEntities: z.array(z.string()),
  metadata: z.record(z.unknown()).optional()
});

export const TimelineVisualizationSchema = z.object({
  events: z.array(TimelineEventSchema),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  aggregationLevel: z.enum(['minute', 'hour', 'day']).optional()
});

export const GetTimelineVisualizationResponseSchema = TimelineVisualizationSchema;

export type TimelineEvent = z.infer<typeof TimelineEventSchema>;
export type TimelineVisualization = z.infer<typeof TimelineVisualizationSchema>;
export type GetTimelineVisualizationResponse = z.infer<typeof GetTimelineVisualizationResponseSchema>;

/**
 * GET /api/investigations/:id/visualizations/correlation
 * Get entity correlation matrix
 */
export const CorrelationCellSchema = z.object({
  entityA: z.string(),
  entityB: z.string(),
  correlationScore: z.number().min(0).max(1),
  sharedIndicators: z.array(z.string()),
  commonEvents: z.number().int().nonnegative()
});

export const CorrelationMatrixSchema = z.object({
  entities: z.array(z.string()),
  correlations: z.array(CorrelationCellSchema),
  threshold: z.number().min(0).max(1).optional()
});

export const GetCorrelationMatrixResponseSchema = CorrelationMatrixSchema;

export type CorrelationCell = z.infer<typeof CorrelationCellSchema>;
export type CorrelationMatrix = z.infer<typeof CorrelationMatrixSchema>;
export type GetCorrelationMatrixResponse = z.infer<typeof GetCorrelationMatrixResponseSchema>;

/**
 * GET /api/investigations/:id/evidence
 * Get supporting evidence for findings
 */
export const EvidenceItemSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['log', 'transaction', 'device_fingerprint', 'ip_location', 'behavior_pattern']),
  source: z.string(),
  timestamp: z.string().datetime(),
  description: z.string(),
  rawData: z.record(z.unknown()),
  relatedFindings: z.array(z.string().uuid()),
  trustScore: z.number().min(0).max(1)
});

export const GetEvidenceQuerySchema = z.object({
  type: z.string().optional(),
  minTrustScore: z.number().min(0).max(1).optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional()
});

export const GetEvidenceResponseSchema = z.object({
  evidence: z.array(EvidenceItemSchema),
  total: z.number().int().nonnegative(),
  hasMore: z.boolean()
});

export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;
export type GetEvidenceQuery = z.infer<typeof GetEvidenceQuerySchema>;
export type GetEvidenceResponse = z.infer<typeof GetEvidenceResponseSchema>;

/**
 * POST /api/investigations/:id/share
 * Generate shareable link for investigation results
 */
export const ShareRequestSchema = z.object({
  expiresInHours: z.number().int().positive().max(168).optional(),
  includeFullDetails: z.boolean().optional(),
  allowComments: z.boolean().optional()
});

export const ShareResponseSchema = z.object({
  shareId: z.string().uuid(),
  shareUrl: z.string().url(),
  expiresAt: z.string().datetime(),
  accessCode: z.string().optional()
});

export type ShareRequest = z.infer<typeof ShareRequestSchema>;
export type ShareResponse = z.infer<typeof ShareResponseSchema>;

/**
 * POST /api/investigations/:id/report-false-positive
 * Report a finding as false positive for ML improvement
 */
export const ReportFalsePositiveRequestSchema = z.object({
  findingId: z.string().uuid(),
  reason: z.string().min(10),
  category: z.enum(['data_error', 'rule_too_strict', 'context_missing', 'other'])
});

export const ReportFalsePositiveResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  feedbackId: z.string().uuid()
});

export type ReportFalsePositiveRequest = z.infer<typeof ReportFalsePositiveRequestSchema>;
export type ReportFalsePositiveResponse = z.infer<typeof ReportFalsePositiveResponseSchema>;

/**
 * GET /api/investigations
 * List historical investigations
 */
export const ListInvestigationsQuerySchema = z.object({
  status: z.enum(['draft', 'running', 'completed', 'failed', 'all']).optional(),
  entityType: z.string().optional(),
  minRiskScore: z.number().min(0).max(100).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
  sortBy: z.enum(['created_at', 'risk_score', 'status']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

export const InvestigationSummarySchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  status: z.enum(['draft', 'running', 'completed', 'failed']),
  entityTypes: z.array(z.string()),
  entityCount: z.number().int().nonnegative(),
  riskScore: z.number().min(0).max(100).nullable(),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).nullable()
});

export const ListInvestigationsResponseSchema = z.object({
  investigations: z.array(InvestigationSummarySchema),
  total: z.number().int().nonnegative(),
  hasMore: z.boolean()
});

export type ListInvestigationsQuery = z.infer<typeof ListInvestigationsQuerySchema>;
export type InvestigationSummary = z.infer<typeof InvestigationSummarySchema>;
export type ListInvestigationsResponse = z.infer<typeof ListInvestigationsResponseSchema>;

/**
 * DELETE /api/investigations/:id
 * Delete an investigation and all associated data
 */
export const DeleteInvestigationResponseSchema = z.object({
  success: z.boolean(),
  message: z.string()
});

export type DeleteInvestigationResponse = z.infer<typeof DeleteInvestigationResponseSchema>;
