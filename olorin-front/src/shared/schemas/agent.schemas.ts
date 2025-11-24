/**
 * Agent Zod Validation Schemas
 *
 * Validation schemas for Agent Analytics Service entities
 */

import { z } from 'zod';
import {
  AgentTypeSchema,
  ExecutionStatusSchema,
  LogLevelSchema,
  FilterConfigSchema
} from './common.schemas';

/**
 * Agent log schema
 */
export const AgentLogSchema = z.object({
  timestamp: z.coerce.date(),
  level: LogLevelSchema,
  message: z.string().min(1),
  data: z.unknown().optional()
});

/**
 * Agent metrics schema
 */
export const AgentMetricsSchema = z.object({
  executionTime: z.number().nonnegative(),
  dataProcessed: z.number().nonnegative(),
  apiCalls: z.number().int().nonnegative(),
  successRate: z.number().min(0).max(1),
  accuracy: z.number().min(0).max(1).optional()
});

/**
 * Agent result schema
 */
export const AgentResultSchema = z.object({
  success: z.boolean(),
  findings: z.array(z.unknown()),
  metrics: AgentMetricsSchema,
  summary: z.string(),
  errors: z.array(z.string()).optional()
});

/**
 * Agent execution schema
 */
export const AgentExecutionSchema = z.object({
  id: z.string().uuid(),
  agentId: z.string().uuid(),
  investigationId: z.string().uuid(),
  status: ExecutionStatusSchema,
  startTime: z.coerce.date(),
  endTime: z.coerce.date().optional(),
  progress: z.number().min(0).max(100),
  logs: z.array(AgentLogSchema),
  results: AgentResultSchema.optional()
});

/**
 * Agent schema
 */
export const AgentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  type: AgentTypeSchema,
  status: z.enum(['idle', 'running', 'completed', 'error']),
  capabilities: z.array(z.string()),
  description: z.string().min(1).max(500)
});

/**
 * Log filters schema
 */
export const LogFiltersSchema = FilterConfigSchema.extend({
  level: z.array(LogLevelSchema).optional(),
  agentId: z.string().uuid().optional(),
  executionId: z.string().uuid().optional(),
  searchTerm: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional()
});

/**
 * Agent performance metrics schema
 */
export const AgentPerformanceMetricsSchema = z.object({
  totalExecutions: z.number().int().nonnegative(),
  successRate: z.number().min(0).max(1),
  averageExecutionTime: z.number().nonnegative(),
  errorRate: z.number().min(0).max(1),
  lastExecution: z.coerce.date().optional(),
  metricsPerAgent: z.record(AgentMetricsSchema)
});

/**
 * Agent state schema
 */
export const AgentStateSchema = z.object({
  agents: z.array(AgentSchema),
  executions: z.array(AgentExecutionSchema),
  selectedAgent: z.string().uuid().nullable(),
  logFilters: LogFiltersSchema,
  performance: AgentPerformanceMetricsSchema
});

/**
 * Agent status update schema
 */
export const AgentStatusUpdateSchema = z.object({
  agentId: z.string().uuid(),
  status: z.enum(['idle', 'running', 'completed', 'error']),
  timestamp: z.coerce.date(),
  message: z.string().optional()
});

/**
 * Agent log update schema
 */
export const AgentLogUpdateSchema = z.object({
  executionId: z.string().uuid(),
  log: AgentLogSchema
});

/**
 * Helper function to validate agent execution
 */
export function validateAgentExecution(data: unknown) {
  return AgentExecutionSchema.parse(data);
}

/**
 * Helper function to validate agent log
 */
export function validateAgentLog(data: unknown) {
  return AgentLogSchema.parse(data);
}

/**
 * Helper function to validate log filters
 */
export function validateLogFilters(data: unknown) {
  return LogFiltersSchema.parse(data);
}
