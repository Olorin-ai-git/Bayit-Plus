/**
 * Investigation Wizard Base Zod Schemas
 * Feature: 004-new-olorin-frontend
 *
 * Base schemas and enums for wizard validation.
 */

import { z } from 'zod';

// Investigation Status Enum
export enum InvestigationStatus {
  DRAFT = 'draft',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// Wizard Step Enum
export enum WizardStep {
  SETTINGS = 'settings',
  PROGRESS = 'progress',
  RESULTS = 'results'
}

// Entity Type Enum
export enum EntityType {
  USER_ID = 'user_id',
  EMAIL = 'email',
  IP_ADDRESS = 'ip_address',
  DEVICE_ID = 'device_id',
  PHONE_NUMBER = 'phone_number',
  TRANSACTION_ID = 'transaction_id',
  ACCOUNT_ID = 'account_id'
}

// Time Range Type Enum
export enum TimeRangeType {
  LAST_24H = 'last_24h',
  LAST_7D = 'last_7d',
  LAST_30D = 'last_30d',
  CUSTOM = 'custom'
}

// Correlation Mode Enum
export enum CorrelationMode {
  AND = 'AND',
  OR = 'OR'
}

// Execution Mode Enum
export enum ExecutionMode {
  PARALLEL = 'parallel',
  SEQUENTIAL = 'sequential'
}

// Template Category Enum
export enum TemplateCategory {
  SYSTEM = 'system',
  CUSTOM = 'custom'
}

// Tool Execution Status Enum
export enum ToolExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// Risk Level Enum
export enum RiskLevel {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

// Notification Type Enum
export enum NotificationType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

// Entity Schema
export const EntitySchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(EntityType),
  value: z.string().min(1),
  displayLabel: z.string().min(1),
  isPrimary: z.boolean().default(false),
  importanceWeight: z.number().min(1).max(10).default(5),
  validationStatus: z.enum(['valid', 'invalid', 'pending']).default('pending'),
  validationError: z.string().nullable().optional()
});

// TimeRange Schema
export const TimeRangeSchema = z.object({
  type: z.nativeEnum(TimeRangeType),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  relativeDescription: z.string().optional(),
  windowDays: z.number().int().min(1).max(365).optional().default(14)
}).refine(
  (data) => new Date(data.endDate) > new Date(data.startDate),
  { message: "End date must be after start date" }
);

// ToolSelection Schema
export const ToolSelectionSchema = z.object({
  toolId: z.string().min(1),
  toolName: z.string().min(1),
  agentId: z.string().min(1),
  agentName: z.string().min(1),
  priority: z.number().min(1).max(10).default(5),
  isEnabled: z.boolean().default(true)
});

// InvestigationSettings Schema
export const InvestigationSettingsSchema = z.object({
  entities: z.array(EntitySchema).min(1, "At least one entity required"),
  primaryEntityId: z.string().uuid().nullable(),
  correlationMode: z.nativeEnum(CorrelationMode).default(CorrelationMode.OR),
  timeRange: TimeRangeSchema,
  toolSelections: z.array(ToolSelectionSchema).min(1, "At least one tool required"),
  riskThreshold: z.number().min(0).max(100).default(50),
  executionMode: z.nativeEnum(ExecutionMode).default(ExecutionMode.PARALLEL),
  enableLlmInsights: z.boolean().default(true),
  enableRelationshipGraph: z.boolean().default(true),
  validationErrors: z.array(z.string()).default([]),
  isValid: z.boolean().default(false)
}).refine(
  (data) => {
    if (data.entities.length > 1 && !data.primaryEntityId) {
      return false;
    }
    return true;
  },
  { message: "Primary entity required for multi-entity investigations" }
);

// InvestigationTemplate Schema
export const InvestigationTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  category: z.nativeEnum(TemplateCategory),
  entityTypes: z.array(z.nativeEnum(EntityType)),
  defaultToolSelections: z.array(ToolSelectionSchema),
  defaultCorrelationMode: z.nativeEnum(CorrelationMode),
  defaultRiskThreshold: z.number().min(0).max(100),
  createdAt: z.string().datetime()
});

// ToolExecution Schema
export const ToolExecutionSchema = z.object({
  id: z.string().uuid(),
  investigationId: z.string().uuid(),
  toolName: z.string().min(1),
  agentName: z.string().min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().nullable(),
  status: z.nativeEnum(ToolExecutionStatus),
  outputData: z.record(z.unknown()).nullable(),
  errorMessage: z.string().nullable(),
  logEntries: z.array(z.object({
    timestamp: z.string().datetime(),
    level: z.enum(['info', 'warning', 'error']),
    message: z.string()
  })).default([])
});

// AgentResult Schema
export const AgentResultSchema = z.object({
  id: z.string().uuid(),
  investigationId: z.string().uuid(),
  agentName: z.string().min(1),
  analysisFindings: z.string(),
  riskScore: z.number().min(0).max(100),
  confidenceScore: z.number().min(0).max(100),
  supportingEvidence: z.array(z.object({
    type: z.string(),
    description: z.string(),
    source: z.string(),
    timestamp: z.string().datetime().optional()
  })),
  relatedToolExecutions: z.array(z.string().uuid()),
  createdAt: z.string().datetime()
});
