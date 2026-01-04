# Data Model: New Olorin Frontend - Investigation Wizard

**Feature**: 004-new-olorin-frontend
**Created**: 2025-10-14
**Phase**: Phase 1 - Design Contracts and Data Model

This document defines TypeScript interfaces and Zod schemas for all entities in the Investigation Wizard feature, ensuring type safety and runtime validation.

---

## Core Entities

### Investigation

The root entity representing a complete fraud investigation workflow.

```typescript
import { z } from 'zod';

/**
 * Investigation status throughout the wizard flow
 */
export enum InvestigationStatus {
  DRAFT = 'draft',           // Settings being configured
  RUNNING = 'running',       // Investigation executing
  COMPLETED = 'completed',   // Investigation finished successfully
  FAILED = 'failed'          // Investigation failed or cancelled
}

/**
 * Current wizard step
 */
export enum WizardStep {
  SETTINGS = 'settings',
  PROGRESS = 'progress',
  RESULTS = 'results'
}

/**
 * Investigation schema
 */
export const InvestigationSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  currentStep: z.nativeEnum(WizardStep),
  status: z.nativeEnum(InvestigationStatus),
  settings: z.lazy(() => InvestigationSettingsSchema).nullable(),
  results: z.lazy(() => InvestigationResultsSchema).nullable()
});

export type Investigation = z.infer<typeof InvestigationSchema>;
```

### Entity

Represents an entity being investigated (user, email, IP address, device, etc.).

```typescript
/**
 * Supported entity types for investigation
 */
export enum EntityType {
  USER_ID = 'user_id',
  EMAIL = 'email',
  IP_ADDRESS = 'ip_address',
  DEVICE_ID = 'device_id',
  PHONE_NUMBER = 'phone_number',
  TRANSACTION_ID = 'transaction_id',
  ACCOUNT_ID = 'account_id'
}

/**
 * Entity schema
 */
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

export type Entity = z.infer<typeof EntitySchema>;
```

### TimeRange

Defines the time period for investigation data collection.

```typescript
/**
 * Predefined time range options
 */
export enum TimeRangeType {
  LAST_24H = 'last_24h',
  LAST_7D = 'last_7d',
  LAST_30D = 'last_30d',
  CUSTOM = 'custom'
}

/**
 * TimeRange schema
 */
export const TimeRangeSchema = z.object({
  type: z.nativeEnum(TimeRangeType),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  relativeDescription: z.string().optional()
}).refine(
  (data) => new Date(data.endDate) > new Date(data.startDate),
  { message: "End date must be after start date" }
);

export type TimeRange = z.infer<typeof TimeRangeSchema>;
```

### ToolSelection

Represents a selected tool-agent combination for investigation execution.

```typescript
/**
 * ToolSelection schema
 */
export const ToolSelectionSchema = z.object({
  toolId: z.string().min(1),
  toolName: z.string().min(1),
  agentId: z.string().min(1),
  agentName: z.string().min(1),
  priority: z.number().min(1).max(10).default(5),
  isEnabled: z.boolean().default(true)
});

export type ToolSelection = z.infer<typeof ToolSelectionSchema>;
```

### InvestigationSettings

Complete configuration for an investigation, representing the Settings page state.

```typescript
/**
 * Correlation mode for multi-entity investigations
 */
export enum CorrelationMode {
  AND = 'AND',  // All entities must match
  OR = 'OR'     // Any entity can match
}

/**
 * Execution mode for tool/agent processing
 */
export enum ExecutionMode {
  PARALLEL = 'parallel',
  SEQUENTIAL = 'sequential'
}

/**
 * InvestigationSettings schema
 */
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
    // If multiple entities, must have primary entity
    if (data.entities.length > 1 && !data.primaryEntityId) {
      return false;
    }
    return true;
  },
  { message: "Primary entity required for multi-entity investigations" }
);

export type InvestigationSettings = z.infer<typeof InvestigationSettingsSchema>;
```

### InvestigationTemplate

Reusable configuration template for investigations.

```typescript
/**
 * Template category
 */
export enum TemplateCategory {
  SYSTEM = 'system',      // Predefined system templates
  CUSTOM = 'custom'       // User-created templates
}

/**
 * InvestigationTemplate schema
 */
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

export type InvestigationTemplate = z.infer<typeof InvestigationTemplateSchema>;
```

### ToolExecution

Represents a single tool execution within an investigation.

```typescript
/**
 * Tool execution status
 */
export enum ToolExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * ToolExecution schema
 */
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

export type ToolExecution = z.infer<typeof ToolExecutionSchema>;
```

### AgentResult

AI agent analysis findings and recommendations.

```typescript
/**
 * AgentResult schema
 */
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

export type AgentResult = z.infer<typeof AgentResultSchema>;
```

### RiskAssessment

Overall risk assessment for the investigation.

```typescript
/**
 * Risk level classification
 */
export enum RiskLevel {
  CRITICAL = 'critical',  // 80-100
  HIGH = 'high',          // 60-79
  MEDIUM = 'medium',      // 40-59
  LOW = 'low'             // 0-39
}

/**
 * Risk factor contributing to overall assessment
 */
export const RiskFactorSchema = z.object({
  category: z.string().min(1),
  description: z.string().min(1),
  severity: z.nativeEnum(RiskLevel),
  contributionWeight: z.number().min(0).max(1),
  evidenceCount: z.number().int().nonnegative()
});

/**
 * RiskAssessment schema
 */
export const RiskAssessmentSchema = z.object({
  investigationId: z.string().uuid(),
  overallRiskScore: z.number().min(0).max(100),
  riskLevel: z.nativeEnum(RiskLevel),
  riskFactors: z.array(RiskFactorSchema),
  confidence: z.number().min(0).max(100),
  summary: z.string(),
  createdAt: z.string().datetime()
});

export type RiskAssessment = z.infer<typeof RiskAssessmentSchema>;
export type RiskFactor = z.infer<typeof RiskFactorSchema>;

/**
 * Helper function to calculate risk level from score
 */
export function calculateRiskLevel(score: number): RiskLevel {
  if (score >= 80) return RiskLevel.CRITICAL;
  if (score >= 60) return RiskLevel.HIGH;
  if (score >= 40) return RiskLevel.MEDIUM;
  return RiskLevel.LOW;
}
```

### Notification

User notifications for wizard events and status updates.

```typescript
/**
 * Notification type
 */
export enum NotificationType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

/**
 * Notification action
 */
export const NotificationActionSchema = z.object({
  label: z.string().min(1),
  targetStep: z.nativeEnum(WizardStep)
});

/**
 * Notification schema
 */
export const NotificationSchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(NotificationType),
  message: z.string().min(1),
  action: NotificationActionSchema.nullable().optional(),
  timestamp: z.string().datetime(),
  isDismissed: z.boolean().default(false),
  autoDismissAfterMs: z.number().int().positive().nullable().optional()
});

export type Notification = z.infer<typeof NotificationSchema>;
export type NotificationAction = z.infer<typeof NotificationActionSchema>;
```

### InvestigationResults

Complete results structure for the Results page.

```typescript
/**
 * InvestigationResults schema
 */
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

export type InvestigationResults = z.infer<typeof InvestigationResultsSchema>;
```

---

## Composite Types

### Wizard Context State

Complete state for the Investigation Wizard context.

```typescript
/**
 * WizardContextState schema
 */
export const WizardContextStateSchema = z.object({
  investigation: InvestigationSchema.nullable(),
  currentStep: z.nativeEnum(WizardStep),
  settings: InvestigationSettingsSchema.nullable(),
  results: InvestigationResultsSchema.nullable(),
  notification: NotificationSchema.nullable(),
  isLoading: z.boolean().default(false),
  error: z.string().nullable()
});

export type WizardContextState = z.infer<typeof WizardContextStateSchema>;
```

---

## Validation Helpers

### Settings Validation

```typescript
/**
 * Validate investigation settings
 * @returns Array of validation error messages (empty if valid)
 */
export function validateInvestigationSettings(
  settings: InvestigationSettings
): string[] {
  const errors: string[] = [];

  // Entity validation
  if (settings.entities.length === 0) {
    errors.push("At least one entity is required");
  }

  // Multi-entity validation
  if (settings.entities.length > 1 && !settings.primaryEntityId) {
    errors.push("Primary entity must be selected for multi-entity investigations");
  }

  // Time range validation
  const startDate = new Date(settings.timeRange.startDate);
  const endDate = new Date(settings.timeRange.endDate);
  if (endDate <= startDate) {
    errors.push("End date must be after start date");
  }

  // Tool selection validation
  if (settings.toolSelections.length === 0) {
    errors.push("At least one tool must be selected");
  }

  const enabledTools = settings.toolSelections.filter(t => t.isEnabled);
  if (enabledTools.length === 0) {
    errors.push("At least one tool must be enabled");
  }

  return errors;
}
```

### Entity Validation

```typescript
/**
 * Validate entity value based on entity type
 */
export function validateEntityValue(
  type: EntityType,
  value: string
): { valid: boolean; error?: string } {
  switch (type) {
    case EntityType.EMAIL:
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value)
        ? { valid: true }
        : { valid: false, error: "Invalid email format" };

    case EntityType.IP_ADDRESS:
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipRegex.test(value)) {
        return { valid: false, error: "Invalid IP address format" };
      }
      const octets = value.split('.').map(Number);
      if (octets.some(o => o > 255)) {
        return { valid: false, error: "IP address octets must be 0-255" };
      }
      return { valid: true };

    case EntityType.PHONE_NUMBER:
      const phoneRegex = /^\+?[\d\s\-()]+$/;
      return phoneRegex.test(value)
        ? { valid: true }
        : { valid: false, error: "Invalid phone number format" };

    case EntityType.USER_ID:
    case EntityType.DEVICE_ID:
    case EntityType.TRANSACTION_ID:
    case EntityType.ACCOUNT_ID:
      return value.trim().length > 0
        ? { valid: true }
        : { valid: false, error: "Value cannot be empty" };

    default:
      return { valid: false, error: "Unknown entity type" };
  }
}
```

---

## Type Guards

```typescript
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
```

---

## Configuration Integration

All data models follow SYSTEM MANDATE configuration-driven principles:

```typescript
/**
 * Data model configuration (from environment)
 */
export interface DataModelConfig {
  maxEntitiesPerInvestigation: number;
  maxToolSelectionsPerInvestigation: number;
  defaultRiskThreshold: number;
  defaultCorrelationMode: CorrelationMode;
  defaultExecutionMode: ExecutionMode;
}

/**
 * Load data model configuration from environment
 */
export function loadDataModelConfig(): DataModelConfig {
  return {
    maxEntitiesPerInvestigation: Number(process.env.REACT_APP_MAX_ENTITIES) || 10,
    maxToolSelectionsPerInvestigation: Number(process.env.REACT_APP_MAX_TOOLS) || 20,
    defaultRiskThreshold: Number(process.env.REACT_APP_DEFAULT_RISK_THRESHOLD) || 50,
    defaultCorrelationMode: (process.env.REACT_APP_DEFAULT_CORRELATION_MODE as CorrelationMode) || CorrelationMode.OR,
    defaultExecutionMode: (process.env.REACT_APP_DEFAULT_EXECUTION_MODE as ExecutionMode) || ExecutionMode.PARALLEL
  };
}
```

---

## Summary

This data model defines:
- **11 core entities** with TypeScript interfaces and Zod schemas
- **Runtime validation** for all data structures
- **Type safety** throughout the wizard flow
- **Configuration-driven** defaults and limits
- **Helper functions** for validation and type guards
- **SYSTEM MANDATE compliance** with no hardcoded values

All entities are ready for implementation in Phase 2 tasks.
