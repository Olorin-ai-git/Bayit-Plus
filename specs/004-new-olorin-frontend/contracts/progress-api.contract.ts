/**
 * Progress API Contract
 * Feature: 004-new-olorin-frontend
 * Phase: Phase 1 - Design Contracts
 *
 * Defines API contracts for Investigation Progress monitoring operations.
 * Follows SYSTEM MANDATE: All endpoints from configuration, no hardcoded URLs.
 */

import { z } from 'zod';
import { ToolExecutionSchema, ToolExecutionStatus } from '../data-model';

/**
 * GET /api/investigations/:id/progress
 * Get current investigation progress
 */
export const InvestigationProgressSchema = z.object({
  investigationId: z.string().uuid(),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  overallProgress: z.number().min(0).max(100),
  currentPhase: z.string(),
  phases: z.array(z.object({
    name: z.string(),
    status: z.enum(['pending', 'running', 'completed', 'failed']),
    progress: z.number().min(0).max(100),
    startTime: z.string().datetime().nullable(),
    endTime: z.string().datetime().nullable()
  })),
  toolExecutions: z.array(ToolExecutionSchema),
  estimatedTimeRemaining: z.number().int().nonnegative().nullable(),
  lastUpdated: z.string().datetime()
});

export type InvestigationProgress = z.infer<typeof InvestigationProgressSchema>;

/**
 * POST /api/investigations/:id/cancel
 * Cancel a running investigation
 */
export const CancelInvestigationResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  investigationId: z.string().uuid(),
  cancelledAt: z.string().datetime()
});

export type CancelInvestigationResponse = z.infer<typeof CancelInvestigationResponseSchema>;

/**
 * POST /api/investigations/:id/pause
 * Pause a running investigation (if supported)
 */
export const PauseInvestigationResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  investigationId: z.string().uuid(),
  pausedAt: z.string().datetime()
});

export type PauseInvestigationResponse = z.infer<typeof PauseInvestigationResponseSchema>;

/**
 * POST /api/investigations/:id/resume
 * Resume a paused investigation
 */
export const ResumeInvestigationResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  investigationId: z.string().uuid(),
  resumedAt: z.string().datetime()
});

export type ResumeInvestigationResponse = z.infer<typeof ResumeInvestigationResponseSchema>;

/**
 * WebSocket Event: Progress Update
 * Real-time progress updates via WebSocket connection
 */
export const ProgressUpdateEventSchema = z.object({
  type: z.literal('progress_update'),
  investigationId: z.string().uuid(),
  timestamp: z.string().datetime(),
  data: z.object({
    overallProgress: z.number().min(0).max(100),
    currentPhase: z.string(),
    phaseProgress: z.number().min(0).max(100),
    message: z.string().optional()
  })
});

export type ProgressUpdateEvent = z.infer<typeof ProgressUpdateEventSchema>;

/**
 * WebSocket Event: Tool Execution Started
 */
export const ToolExecutionStartedEventSchema = z.object({
  type: z.literal('tool_execution_started'),
  investigationId: z.string().uuid(),
  timestamp: z.string().datetime(),
  data: z.object({
    executionId: z.string().uuid(),
    toolName: z.string(),
    agentName: z.string()
  })
});

export type ToolExecutionStartedEvent = z.infer<typeof ToolExecutionStartedEventSchema>;

/**
 * WebSocket Event: Tool Execution Completed
 */
export const ToolExecutionCompletedEventSchema = z.object({
  type: z.literal('tool_execution_completed'),
  investigationId: z.string().uuid(),
  timestamp: z.string().datetime(),
  data: z.object({
    executionId: z.string().uuid(),
    toolName: z.string(),
    agentName: z.string(),
    status: z.nativeEnum(ToolExecutionStatus),
    duration: z.number().int().nonnegative()
  })
});

export type ToolExecutionCompletedEvent = z.infer<typeof ToolExecutionCompletedEventSchema>;

/**
 * WebSocket Event: Log Entry
 */
export const LogEntryEventSchema = z.object({
  type: z.literal('log_entry'),
  investigationId: z.string().uuid(),
  timestamp: z.string().datetime(),
  data: z.object({
    level: z.enum(['info', 'warning', 'error', 'debug']),
    message: z.string(),
    source: z.string(),
    metadata: z.record(z.unknown()).optional()
  })
});

export type LogEntryEvent = z.infer<typeof LogEntryEventSchema>;

/**
 * WebSocket Event: Investigation Completed
 */
export const InvestigationCompletedEventSchema = z.object({
  type: z.literal('investigation_completed'),
  investigationId: z.string().uuid(),
  timestamp: z.string().datetime(),
  data: z.object({
    status: z.enum(['completed', 'failed']),
    duration: z.number().int().nonnegative(),
    resultsUrl: z.string().url()
  })
});

export type InvestigationCompletedEvent = z.infer<typeof InvestigationCompletedEventSchema>;

/**
 * WebSocket Event: Error Occurred
 */
export const ErrorEventSchema = z.object({
  type: z.literal('error'),
  investigationId: z.string().uuid(),
  timestamp: z.string().datetime(),
  data: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional()
  })
});

export type ErrorEvent = z.infer<typeof ErrorEventSchema>;

/**
 * Union type for all WebSocket events
 */
export const WebSocketEventSchema = z.discriminatedUnion('type', [
  ProgressUpdateEventSchema,
  ToolExecutionStartedEventSchema,
  ToolExecutionCompletedEventSchema,
  LogEntryEventSchema,
  InvestigationCompletedEventSchema,
  ErrorEventSchema
]);

export type WebSocketEvent = z.infer<typeof WebSocketEventSchema>;

/**
 * GET /api/investigations/:id/logs
 * Get historical log entries for an investigation
 */
export const GetLogsQuerySchema = z.object({
  level: z.enum(['info', 'warning', 'error', 'debug', 'all']).optional(),
  limit: z.number().int().positive().max(1000).optional(),
  offset: z.number().int().nonnegative().optional(),
  source: z.string().optional()
});

export const LogEntrySchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string().datetime(),
  level: z.enum(['info', 'warning', 'error', 'debug']),
  message: z.string(),
  source: z.string(),
  metadata: z.record(z.unknown()).optional()
});

export const GetLogsResponseSchema = z.object({
  logs: z.array(LogEntrySchema),
  total: z.number().int().nonnegative(),
  hasMore: z.boolean()
});

export type GetLogsQuery = z.infer<typeof GetLogsQuerySchema>;
export type LogEntry = z.infer<typeof LogEntrySchema>;
export type GetLogsResponse = z.infer<typeof GetLogsResponseSchema>;
