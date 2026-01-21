/**
 * Investigation Wizard Type Definitions
 * Feature: 004-new-olorin-frontend
 *
 * Core TypeScript interfaces and enums for the Investigation Wizard feature.
 * All types are derived from Zod schemas for runtime validation.
 */

import { z } from 'zod';
import {
  InvestigationSchema,
  InvestigationSettingsSchema,
  TimeRangeSchema,
  ToolSelectionSchema,
  InvestigationTemplateSchema,
  ToolExecutionSchema,
  AgentResultSchema,
  RiskAssessmentSchema,
  RiskFactorSchema,
  NotificationSchema,
  NotificationActionSchema,
  InvestigationResultsSchema,
  WizardContextStateSchema
} from './wizard.schemas';

// Investigation Status
export enum InvestigationStatus {
  DRAFT = 'draft',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// Wizard Steps
export enum WizardStep {
  SETTINGS = 'settings',
  PROGRESS = 'progress',
  RESULTS = 'results'
}

// Time Range Types
export enum TimeRangeType {
  LAST_24H = 'last_24h',
  LAST_7D = 'last_7d',
  LAST_30D = 'last_30d',
  LAST_90D = 'last_90d',
  LAST_120D = 'last_120d',
  LAST_180D = 'last_180d',
  LAST_365D = 'last_365d',
  CUSTOM = 'custom'
}

// Correlation Mode
export enum CorrelationMode {
  AND = 'AND',
  OR = 'OR'
}

// Execution Mode
export enum ExecutionMode {
  PARALLEL = 'parallel',
  SEQUENTIAL = 'sequential'
}

// Template Category
export enum TemplateCategory {
  SYSTEM = 'system',
  CUSTOM = 'custom'
}

// Tool Execution Status
export enum ToolExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// Risk Level
export enum RiskLevel {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

// Notification Type
export enum NotificationType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

// Core Type Definitions
export type Investigation = z.infer<typeof InvestigationSchema>;
export type InvestigationSettings = z.infer<typeof InvestigationSettingsSchema>;
export type TimeRange = z.infer<typeof TimeRangeSchema>;
export type ToolSelection = z.infer<typeof ToolSelectionSchema>;
export type InvestigationTemplate = z.infer<typeof InvestigationTemplateSchema>;
export type ToolExecution = z.infer<typeof ToolExecutionSchema>;
export type AgentResult = z.infer<typeof AgentResultSchema>;
export type RiskAssessment = z.infer<typeof RiskAssessmentSchema>;
export type RiskFactor = z.infer<typeof RiskFactorSchema>;
export type Notification = z.infer<typeof NotificationSchema>;
export type NotificationAction = z.infer<typeof NotificationActionSchema>;
export type InvestigationResults = z.infer<typeof InvestigationResultsSchema>;
export type WizardContextState = z.infer<typeof WizardContextStateSchema>;

/**
 * Helper function to calculate risk level from score
 * @param score - Risk score (0-100)
 * @returns Corresponding risk level
 */
export function calculateRiskLevel(score: number): RiskLevel {
  if (score >= 80) return RiskLevel.CRITICAL;
  if (score >= 60) return RiskLevel.HIGH;
  if (score >= 40) return RiskLevel.MEDIUM;
  return RiskLevel.LOW;
}

/**
 * Type guard for Investigation
 */
export function isInvestigation(value: unknown): value is Investigation {
  return InvestigationSchema.safeParse(value).success;
}

/**
 * Type guard for InvestigationSettings
 */
export function isInvestigationSettings(value: unknown): value is InvestigationSettings {
  return InvestigationSettingsSchema.safeParse(value).success;
}

/**
 * Type guard for multi-entity investigation
 */
export function isMultiEntityInvestigation(settings: InvestigationSettings): boolean {
  return settings.entities.length >= 2;
}

// Type Aliases for backward compatibility
export type WizardSettings = InvestigationSettings;
export type Entity = InvestigationSettings['entities'][number];
export type WizardEntity = Entity;
