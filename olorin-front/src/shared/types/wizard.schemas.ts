/**
 * Investigation Wizard Zod Validation Schemas
 * Feature: 004-new-olorin-frontend
 *
 * Complete schemas re-exported for convenience.
 */

import { z } from 'zod';

import {
  WizardStep,
  NotificationType,
  InvestigationStatus,
  RiskLevel,
  AgentResultSchema,
  ToolExecutionSchema,
  InvestigationSettingsSchema
} from './wizard.schemas.base';

// Re-export all base schemas and enums
export * from './wizard.schemas.base';

// RiskFactor Schema
export const RiskFactorSchema = z.object({
  category: z.string().min(1),
  description: z.string().min(1),
  severity: z.nativeEnum(RiskLevel),
  contributionWeight: z.number().min(0).max(1),
  evidenceCount: z.number().int().nonnegative()
});

// RiskAssessment Schema (extended version with RiskFactor)
export const RiskAssessmentSchema = z.object({
  investigationId: z.string().uuid(),
  overallRiskScore: z.number().min(0).max(100),
  riskLevel: z.nativeEnum(RiskLevel),
  riskFactors: z.array(RiskFactorSchema),
  confidence: z.number().min(0).max(100),
  summary: z.string(),
  createdAt: z.string().datetime()
});

// NotificationAction Schema
export const NotificationActionSchema = z.object({
  label: z.string().min(1),
  targetStep: z.nativeEnum(WizardStep)
});

// Notification Schema
export const NotificationSchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(NotificationType),
  message: z.string().min(1),
  action: NotificationActionSchema.nullable().optional(),
  timestamp: z.string().datetime(),
  isDismissed: z.boolean().default(false),
  autoDismissAfterMs: z.number().int().positive().nullable().optional()
});

// InvestigationResults Schema
export const InvestigationResultsSchema = z.object({
  investigationId: z.string().uuid(),
  riskAssessment: RiskAssessmentSchema,
  agentResults: z.array(AgentResultSchema),
  toolExecutions: z.array(ToolExecutionSchema),
  visualizations: z.object({
    networkDiagram: z.record(z.unknown()).nullable(),
    timeline: z.record(z.unknown()).nullable(),
    correlationMatrix: z.record(z.unknown()).nullable()
  }).nullable(),
  exportUrls: z.object({
    pdf: z.string().url().nullable(),
    json: z.string().url().nullable(),
    csv: z.string().url().nullable()
  }).nullable(),
  completedAt: z.string().datetime()
});

// Investigation Schema (with lazy references for circular deps)
export const InvestigationSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  currentStep: z.nativeEnum(WizardStep),
  status: z.nativeEnum(InvestigationStatus),
  settings: z.lazy(() => InvestigationSettingsSchema).nullable(),
  results: z.lazy(() => InvestigationResultsSchema).nullable()
});

// WizardContextState Schema
export const WizardContextStateSchema = z.object({
  investigation: InvestigationSchema.nullable(),
  currentStep: z.nativeEnum(WizardStep),
  settings: z.lazy(() => InvestigationSettingsSchema).nullable(),
  results: InvestigationResultsSchema.nullable(),
  notification: NotificationSchema.nullable(),
  isLoading: z.boolean().default(false),
  error: z.string().nullable()
});
