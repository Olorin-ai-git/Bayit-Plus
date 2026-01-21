/**
 * Investigation Zod Validation Schemas
 *
 * Validation schemas for Investigation Service entities and operations
 */

import { z } from 'zod';
import {
  EntityTypeSchema,
  InvestigationTypeSchema,
  EntityStatusSchema,
  SeverityLevelSchema,
  FindingCategorySchema,
  EvidenceSchema,
  PaginationSchema,
  FilterConfigSchema
} from './common.schemas';

/**
 * Finding schema
 */
export const FindingSchema = z.object({
  id: z.string().uuid(),
  agentId: z.string().uuid(),
  category: FindingCategorySchema,
  severity: SeverityLevelSchema,
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  evidence: z.array(EvidenceSchema),
  confidence: z.number().min(0).max(1)
});

/**
 * Investigation metadata schema
 */
export const InvestigationMetadataSchema = z.object({
  estimatedDuration: z.number().int().positive().optional(),
  dataSourcesQueried: z.array(z.string()),
  apiCallsUsed: z.number().int().nonnegative(),
  tokensUsed: z.number().int().nonnegative().optional()
});

/**
 * Investigation schema
 */
export const InvestigationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  entityType: EntityTypeSchema,
  status: EntityStatusSchema,
  type: InvestigationTypeSchema,
  created: z.coerce.date(),
  updated: z.coerce.date(),
  riskScore: z.number().min(0).max(100).optional(),
  findings: z.array(FindingSchema),
  agents: z.array(z.any()), // AgentExecution - to avoid circular dependency
  metadata: InvestigationMetadataSchema
});

/**
 * Investigation options schema
 */
export const InvestigationOptionsSchema = z.object({
  priority: z.enum(['low', 'normal', 'high']).optional(),
  timeout: z.number().int().positive().optional(),
  agents: z.array(z.string()).optional()
}).catchall(z.unknown());

/**
 * Investigation parameters schema
 */
export const InvestigationParamsSchema = z.object({
  entityType: EntityTypeSchema,
  entityValue: z.string().min(1).max(500),
  type: InvestigationTypeSchema,
  options: InvestigationOptionsSchema.optional()
});

/**
 * Investigation results schema
 */
export const InvestigationResultsSchema = z.object({
  investigationId: z.string().uuid(),
  riskScore: z.number().min(0).max(100),
  findings: z.array(FindingSchema),
  summary: z.string().min(1),
  recommendations: z.array(z.string()),
  completedAt: z.coerce.date()
});

/**
 * Investigation filters schema
 */
export const InvestigationFiltersSchema = FilterConfigSchema.extend({
  status: z.array(EntityStatusSchema).optional(),
  type: z.array(InvestigationTypeSchema).optional(),
  entityType: z.array(EntityTypeSchema).optional(),
  riskScoreMin: z.number().min(0).max(100).optional(),
  riskScoreMax: z.number().min(0).max(100).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional()
});

/**
 * Investigation state schema
 */
export const InvestigationStateSchema = z.object({
  current: InvestigationSchema.nullable(),
  history: z.array(InvestigationSchema),
  active: z.array(InvestigationSchema),
  filters: InvestigationFiltersSchema,
  pagination: PaginationSchema
});

/**
 * Investigation progress schema
 */
export const InvestigationProgressSchema = z.object({
  investigationId: z.string().uuid(),
  progress: z.number().min(0).max(100),
  currentPhase: z.string().min(1),
  message: z.string().min(1),
  timestamp: z.coerce.date()
});

/**
 * Helper function to validate investigation parameters
 */
export function validateInvestigationParams(data: unknown) {
  return InvestigationParamsSchema.parse(data);
}

/**
 * Helper function to validate investigation results
 */
export function validateInvestigationResults(data: unknown) {
  return InvestigationResultsSchema.parse(data);
}

/**
 * Helper function to validate investigation filters
 */
export function validateInvestigationFilters(data: unknown) {
  return InvestigationFiltersSchema.parse(data);
}
