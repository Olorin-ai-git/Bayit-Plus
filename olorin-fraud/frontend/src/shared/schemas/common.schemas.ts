/**
 * Common Zod Validation Schemas
 *
 * Shared validation schemas used across all microservices
 */

import { z } from 'zod';

/**
 * Pagination schema
 */
export const PaginationSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive().max(100),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative()
});

/**
 * Filter configuration schema
 */
export const FilterConfigSchema = z.record(z.unknown());

/**
 * Layout configuration schema
 */
export const LayoutConfigSchema = z.object({
  type: z.enum(['force', 'hierarchical', 'circular', 'grid']),
  spacing: z.number().positive().optional(),
  orientation: z.enum(['horizontal', 'vertical']).optional()
}).catchall(z.unknown());

/**
 * Evidence schema
 */
export const EvidenceSchema = z.object({
  id: z.string().uuid(),
  type: z.string().min(1),
  source: z.string().min(1),
  data: z.unknown(),
  timestamp: z.coerce.date(),
  reliability: z.number().min(0).max(1)
});

/**
 * Result schema
 */
export const ResultSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  timestamp: z.coerce.date()
});

/**
 * Log level schema
 */
export const LogLevelSchema = z.enum(['info', 'warning', 'error', 'debug']);

/**
 * Entity status schema
 */
export const EntityStatusSchema = z.enum(['pending', 'running', 'completed', 'failed']);

/**
 * Execution status schema
 */
export const ExecutionStatusSchema = z.enum(['queued', 'running', 'completed', 'failed']);

/**
 * Session status schema
 */
export const SessionStatusSchema = z.enum(['active', 'paused', 'completed']);

/**
 * Severity level schema
 */
export const SeverityLevelSchema = z.enum(['low', 'medium', 'high', 'critical']);

/**
 * Entity type schema
 */
export const EntityTypeSchema = z.enum(['user_id', 'email', 'phone', 'device_id']);

/**
 * Investigation type schema
 */
export const InvestigationTypeSchema = z.enum(['manual', 'structured']);

/**
 * Finding category schema
 */
export const FindingCategorySchema = z.enum(['device', 'location', 'network', 'behavior']);

/**
 * Agent type schema
 */
export const AgentTypeSchema = z.enum(['device', 'location', 'network', 'logs', 'rag']);

/**
 * Node type schema
 */
export const NodeTypeSchema = z.enum(['user', 'device', 'location', 'transaction', 'event']);

/**
 * Edge type schema
 */
export const EdgeTypeSchema = z.enum(['connection', 'transaction', 'communication', 'correlation']);

/**
 * Report type schema
 */
export const ReportTypeSchema = z.enum(['summary', 'detailed', 'executive', 'technical']);

/**
 * Report format schema
 */
export const ReportFormatSchema = z.enum(['pdf', 'html', 'json']);

/**
 * Report section type schema
 */
export const ReportSectionTypeSchema = z.enum(['text', 'chart', 'table', 'image']);

/**
 * RAG source type schema
 */
export const RAGSourceTypeSchema = z.enum(['database', 'document', 'api', 'knowledge_base']);

/**
 * Visualization type schema
 */
export const VisualizationTypeSchema = z.enum(['graph', 'map', 'chart', 'neural_network']);

/**
 * View mode schema
 */
export const ViewModeSchema = z.enum(['graph', 'map', 'neural', 'chart']);
