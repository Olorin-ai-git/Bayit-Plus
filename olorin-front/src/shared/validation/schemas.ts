/**
 * Centralized Validation Schemas
 *
 * Production-grade validation using Zod for type-safe runtime validation.
 * All validation logic consolidated here to eliminate duplication across codebase.
 *
 * @module shared/validation/schemas
 */

import { z } from 'zod';

// ============================================================================
// Entity Types and Enums
// ============================================================================

export const ENTITY_TYPES = [
  'email',
  'phone',
  'ip',
  'device',
  'account',
  'transaction'
] as const;

export const PRIORITY_LEVELS = ['low', 'medium', 'high', 'critical'] as const;

export const INVESTIGATION_STATUSES = [
  'pending',
  'in_progress',
  'completed',
  'failed',
  'cancelled'
] as const;

export const AGENT_STATUSES = [
  'idle',
  'running',
  'completed',
  'error',
  'timeout'
] as const;

export const RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const;

export const CORRELATION_MODES = ['AND', 'OR'] as const;

export const EXECUTION_MODES = ['parallel', 'sequential'] as const;

// ============================================================================
// Base Schemas
// ============================================================================

/**
 * Entity schema for investigation targets
 */
export const entitySchema = z.object({
  type: z.enum(ENTITY_TYPES, {
    errorMap: () => ({ message: 'Invalid entity type' })
  }),
  value: z.string().min(1, 'Entity value is required'),
  metadata: z.record(z.unknown()).optional()
});

/**
 * Time range schema for investigation temporal bounds
 */
export const timeRangeSchema = z.object({
  start: z.string().datetime({ message: 'Start time must be valid ISO datetime' }),
  end: z.string().datetime({ message: 'End time must be valid ISO datetime' })
}).refine(
  (data) => new Date(data.start) < new Date(data.end),
  { message: 'Start time must be before end time' }
);

/**
 * Tool configuration schema
 */
export const toolConfigSchema = z.object({
  tool_name: z.string().min(1, 'Tool name is required'),
  enabled: z.boolean(),
  parameters: z.record(z.unknown()).optional()
});

// ============================================================================
// Investigation Schemas
// ============================================================================

/**
 * Investigation settings schema
 * Used for wizard configuration and API requests
 */
export const investigationSettingsSchema = z.object({
  name: z.string().min(1, 'Investigation name is required').max(200, 'Name too long'),
  entities: z.array(entitySchema).min(1, 'At least one entity required').max(10, 'Maximum 10 entities'),
  timeRange: timeRangeSchema,
  tools: z.array(toolConfigSchema).min(1, 'At least one tool required'),
  correlationMode: z.enum(CORRELATION_MODES),
  executionMode: z.enum(EXECUTION_MODES),
  riskThreshold: z.number().int().min(0).max(100),
  priority: z.enum(PRIORITY_LEVELS).optional(),
  tags: z.array(z.string()).optional()
});

/**
 * Investigation response schema
 * Used for API response validation
 */
export const investigationSchema = z.object({
  investigationId: z.string().uuid(),
  status: z.enum(INVESTIGATION_STATUSES),
  settings: investigationSettingsSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  progress: z.number().min(0).max(100).optional(),
  results: z.record(z.unknown()).optional(),
  error: z.string().optional()
});

/**
 * Investigation list item schema (minimal data)
 */
export const investigationListItemSchema = z.object({
  investigationId: z.string().uuid(),
  name: z.string(),
  status: z.enum(INVESTIGATION_STATUSES),
  priority: z.enum(PRIORITY_LEVELS).optional(),
  createdAt: z.string().datetime(),
  progress: z.number().min(0).max(100).optional()
});

// ============================================================================
// Agent Schemas
// ============================================================================

/**
 * Agent configuration schema
 */
export const agentConfigSchema = z.object({
  agentId: z.string(),
  name: z.string().min(1, 'Agent name required'),
  type: z.string(),
  tools: z.array(z.string()).min(1, 'At least one tool required'),
  parameters: z.record(z.unknown()).optional()
});

/**
 * Agent log entry schema
 */
export const agentLogSchema = z.object({
  logId: z.string(),
  agentId: z.string(),
  timestamp: z.string().datetime(),
  level: z.enum(['debug', 'info', 'warning', 'error']),
  message: z.string(),
  metadata: z.record(z.unknown()).optional()
});

/**
 * Agent analytics schema
 */
export const agentAnalyticsSchema = z.object({
  agentId: z.string(),
  executionTime: z.number().positive(),
  toolsExecuted: z.number().int().nonnegative(),
  successRate: z.number().min(0).max(100),
  errorCount: z.number().int().nonnegative()
});

// ============================================================================
// RAG Intelligence Schemas
// ============================================================================

/**
 * RAG document schema
 */
export const ragDocumentSchema = z.object({
  documentId: z.string().optional(),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  metadata: z.object({
    title: z.string().optional(),
    source: z.string().optional(),
    tags: z.array(z.string()).optional(),
    embedding: z.array(z.number()).optional()
  }).optional()
});

/**
 * RAG query schema
 */
export const ragQuerySchema = z.object({
  query: z.string().min(1, 'Query required'),
  filters: z.record(z.unknown()).optional(),
  limit: z.number().int().positive().max(100).default(10)
});

/**
 * RAG search result schema
 */
export const ragSearchResultSchema = z.object({
  documentId: z.string(),
  content: z.string(),
  score: z.number().min(0).max(1),
  metadata: z.record(z.unknown()).optional()
});

// ============================================================================
// Form Validation Schemas
// ============================================================================

/**
 * Email validation schema
 */
export const emailSchema = z.string()
  .email('Invalid email format')
  .min(1, 'Email required');

/**
 * Phone validation schema (international format)
 */
export const phoneSchema = z.string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone format')
  .min(1, 'Phone number required');

/**
 * IP address validation schema
 */
export const ipAddressSchema = z.string()
  .regex(
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    'Invalid IP address format'
  );

/**
 * URL validation schema
 */
export const urlSchema = z.string()
  .url('Invalid URL format')
  .min(1, 'URL required');

// ============================================================================
// Type Exports
// ============================================================================

export type Entity = z.infer<typeof entitySchema>;
export type TimeRange = z.infer<typeof timeRangeSchema>;
export type ToolConfig = z.infer<typeof toolConfigSchema>;
export type InvestigationSettings = z.infer<typeof investigationSettingsSchema>;
export type Investigation = z.infer<typeof investigationSchema>;
export type InvestigationListItem = z.infer<typeof investigationListItemSchema>;
export type AgentConfig = z.infer<typeof agentConfigSchema>;
export type AgentLog = z.infer<typeof agentLogSchema>;
export type AgentAnalytics = z.infer<typeof agentAnalyticsSchema>;
export type RagDocument = z.infer<typeof ragDocumentSchema>;
export type RagQuery = z.infer<typeof ragQuerySchema>;
export type RagSearchResult = z.infer<typeof ragSearchResultSchema>;

// Type aliases for enums
export type EntityType = typeof ENTITY_TYPES[number];
export type PriorityLevel = typeof PRIORITY_LEVELS[number];
export type InvestigationStatus = typeof INVESTIGATION_STATUSES[number];
export type AgentStatus = typeof AGENT_STATUSES[number];
export type RiskLevel = typeof RISK_LEVELS[number];
export type CorrelationMode = typeof CORRELATION_MODES[number];
export type ExecutionMode = typeof EXECUTION_MODES[number];
