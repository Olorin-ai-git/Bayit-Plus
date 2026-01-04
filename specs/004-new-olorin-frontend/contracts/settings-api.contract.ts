/**
 * Settings API Contract
 * Feature: 004-new-olorin-frontend
 * Phase: Phase 1 - Design Contracts
 *
 * Defines API contracts for Investigation Settings operations.
 * Follows SYSTEM MANDATE: All endpoints from configuration, no hardcoded URLs.
 */

import { z } from 'zod';
import {
  InvestigationSettingsSchema,
  InvestigationTemplateSchema,
  EntitySchema
} from '../data-model';

/**
 * POST /api/investigations/execute
 * Start a new investigation with provided settings
 */
export const StartInvestigationRequestSchema = z.object({
  settings: InvestigationSettingsSchema
});

export const StartInvestigationResponseSchema = z.object({
  investigationId: z.string().uuid(),
  status: z.enum(['queued', 'running']),
  message: z.string(),
  websocketUrl: z.string().url()
});

export type StartInvestigationRequest = z.infer<typeof StartInvestigationRequestSchema>;
export type StartInvestigationResponse = z.infer<typeof StartInvestigationResponseSchema>;

/**
 * GET /api/investigations/:id/settings
 * Load saved investigation settings
 */
export const LoadSettingsResponseSchema = z.object({
  investigationId: z.string().uuid(),
  settings: InvestigationSettingsSchema,
  savedAt: z.string().datetime()
});

export type LoadSettingsResponse = z.infer<typeof LoadSettingsResponseSchema>;

/**
 * POST /api/investigations/:id/validate
 * Validate investigation settings without starting
 */
export const ValidateSettingsRequestSchema = z.object({
  settings: InvestigationSettingsSchema
});

export const ValidateSettingsResponseSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.object({
    field: z.string(),
    message: z.string(),
    severity: z.enum(['error', 'warning'])
  })),
  warnings: z.array(z.string()).optional()
});

export type ValidateSettingsRequest = z.infer<typeof ValidateSettingsRequestSchema>;
export type ValidateSettingsResponse = z.infer<typeof ValidateSettingsResponseSchema>;

/**
 * GET /api/templates
 * List available investigation templates
 */
export const ListTemplatesQuerySchema = z.object({
  category: z.enum(['system', 'custom', 'all']).optional(),
  entityType: z.string().optional()
});

export const ListTemplatesResponseSchema = z.object({
  templates: z.array(InvestigationTemplateSchema),
  total: z.number().int().nonnegative()
});

export type ListTemplatesQuery = z.infer<typeof ListTemplatesQuerySchema>;
export type ListTemplatesResponse = z.infer<typeof ListTemplatesResponseSchema>;

/**
 * POST /api/templates
 * Save a new investigation template
 */
export const SaveTemplateRequestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  settings: InvestigationSettingsSchema
});

export const SaveTemplateResponseSchema = z.object({
  templateId: z.string().uuid(),
  message: z.string()
});

export type SaveTemplateRequest = z.infer<typeof SaveTemplateRequestSchema>;
export type SaveTemplateResponse = z.infer<typeof SaveTemplateResponseSchema>;

/**
 * DELETE /api/templates/:id
 * Delete a custom template
 */
export const DeleteTemplateResponseSchema = z.object({
  success: z.boolean(),
  message: z.string()
});

export type DeleteTemplateResponse = z.infer<typeof DeleteTemplateResponseSchema>;

/**
 * GET /api/entity-types
 * Get available entity types and their validation rules
 */
export const EntityTypeInfoSchema = z.object({
  type: z.string(),
  displayName: z.string(),
  description: z.string(),
  validationPattern: z.string(),
  examples: z.array(z.string())
});

export const GetEntityTypesResponseSchema = z.object({
  entityTypes: z.array(EntityTypeInfoSchema)
});

export type EntityTypeInfo = z.infer<typeof EntityTypeInfoSchema>;
export type GetEntityTypesResponse = z.infer<typeof GetEntityTypesResponseSchema>;

/**
 * GET /api/tools
 * Get available tools and agents for matrix selection
 */
export const ToolInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  compatibleEntityTypes: z.array(z.string()),
  recommendedForEntityTypes: z.array(z.string())
});

export const AgentInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  capabilities: z.array(z.string()),
  compatibleTools: z.array(z.string())
});

export const GetToolsAndAgentsResponseSchema = z.object({
  tools: z.array(ToolInfoSchema),
  agents: z.array(AgentInfoSchema)
});

export type ToolInfo = z.infer<typeof ToolInfoSchema>;
export type AgentInfo = z.infer<typeof AgentInfoSchema>;
export type GetToolsAndAgentsResponse = z.infer<typeof GetToolsAndAgentsResponseSchema>;

/**
 * API Error Response (standardized across all endpoints)
 */
export const ApiErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional()
  })
});

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
