/**
 * Zod Schemas for Investigation API
 *
 * Constitutional Compliance:
 * - Runtime validation of API requests/responses
 * - Type-safe schema definitions
 * - No hardcoded values (schemas match OpenAPI)
 * - Fail-fast validation
 *
 * Usage:
 *   import { InvestigationRequestSchema, validateInvestigationRequest } from '@api/schemas/investigation';
 */

import { z } from 'zod';

/**
 * Entity Type Enum Schema
 */
export const EntityTypeSchema = z.enum([
  'email',
  'phone',
  'device_id',
  'ip_address',
  'user_id'
]);

export type EntityType = z.infer<typeof EntityTypeSchema>;

/**
 * Investigation Status Enum Schema
 */
export const InvestigationStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'failed'
]);

export type InvestigationStatus = z.infer<typeof InvestigationStatusSchema>;

/**
 * Time Range Schema
 */
export const TimeRangeSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime()
});

export type TimeRange = z.infer<typeof TimeRangeSchema>;

/**
 * Investigation Request Schema
 *
 * Matches OpenAPI InvestigationRequest schema
 */
export const InvestigationRequestSchema = z.object({
  entity_id: z.string().min(1, 'Entity ID is required'),
  entity_type: EntityTypeSchema,
  time_range: TimeRangeSchema.optional()
});

export type InvestigationRequest = z.infer<typeof InvestigationRequestSchema>;

/**
 * Investigation Response Schema
 *
 * Matches OpenAPI InvestigationResponse schema
 */
export const InvestigationResponseSchema = z.object({
  investigation_id: z.string().uuid(),
  status: InvestigationStatusSchema,
  risk_score: z.number().min(0).max(100).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

export type InvestigationResponse = z.infer<typeof InvestigationResponseSchema>;

/**
 * Validation functions
 */
export function validateInvestigationRequest(
  data: unknown
): InvestigationRequest {
  return InvestigationRequestSchema.parse(data);
}

export function validateInvestigationResponse(
  data: unknown
): InvestigationResponse {
  return InvestigationResponseSchema.parse(data);
}

/**
 * Safe validation (returns result instead of throwing)
 */
export function safeValidateInvestigationRequest(data: unknown): {
  success: boolean;
  data?: InvestigationRequest;
  error?: z.ZodError;
} {
  const result = InvestigationRequestSchema.safeParse(data);
  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: result.error };
}

export function safeValidateInvestigationResponse(data: unknown): {
  success: boolean;
  data?: InvestigationResponse;
  error?: z.ZodError;
} {
  const result = InvestigationResponseSchema.safeParse(data);
  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: result.error };
}
