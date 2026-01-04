/**
 * Hybrid Graph Validation
 * Feature: 006-hybrid-graph-integration
 *
 * Client-side validation schemas using Zod for investigation configuration.
 * Matches backend validation rules for fail-fast behavior.
 */

import { z } from 'zod';
import { toolCategories } from '../constants/toolCategories';

/**
 * Entity Type Enum
 */
export const EntityTypeSchema = z.enum(['user', 'device', 'ip', 'transaction']);

/**
 * Entity ID Validation by Type
 */
export const UserEntityIdSchema = z
  .string()
  .email('User entity ID must be a valid email address')
  .max(255, 'Email address too long (max 255 characters)');

export const DeviceEntityIdSchema = z
  .string()
  .uuid('Device entity ID must be a valid UUID format');

export const IpEntityIdSchema = z
  .string()
  .refine(
    (value) => {
      const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
      const ipv6Pattern = /^([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}$/i;
      return ipv4Pattern.test(value) || ipv6Pattern.test(value);
    },
    { message: 'IP entity ID must be a valid IPv4 or IPv6 address' }
  );

export const TransactionEntityIdSchema = z
  .string()
  .regex(/^[a-zA-Z0-9]+$/, 'Transaction entity ID must contain only alphanumeric characters')
  .max(255, 'Transaction ID too long (max 255 characters)');

/**
 * Time Range Validation
 */
export const TimeRangeSchema = z
  .object({
    start: z.string().datetime('Start time must be a valid ISO 8601 datetime'),
    end: z.string().datetime('End time must be a valid ISO 8601 datetime'),
  })
  .refine(
    (data) => {
      const start = new Date(data.start);
      const end = new Date(data.end);
      return start < end;
    },
    { message: 'Start time must be before end time' }
  )
  .refine(
    (data) => {
      const start = new Date(data.start);
      const end = new Date(data.end);
      const now = new Date();
      return start <= now && end <= now;
    },
    { message: 'Time range cannot be in the future' }
  )
  .refine(
    (data) => {
      const start = new Date(data.start);
      const end = new Date(data.end);
      const durationDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      return durationDays <= 90;
    },
    { message: 'Time range cannot exceed 90 days' }
  );

/**
 * Tool Configuration Validation
 * Extract available tool IDs from toolCategories configuration
 */
const availableToolIds = toolCategories.flatMap((category) =>
  category.tools.map((tool) => tool.id)
) as unknown as readonly [string, ...string[]];

export const ToolConfigSchema = z.object({
  tool_id: z.enum(availableToolIds, {
    errorMap: () => ({ message: 'Unknown tool ID' }),
  }),
  parameters: z.record(z.any()).optional(),
});

/**
 * Correlation and Execution Modes
 */
export const CorrelationModeSchema = z.enum(['AND', 'OR']).default('OR');

export const ExecutionModeSchema = z.enum(['parallel', 'sequential']).default('parallel');

/**
 * Complete Investigation Configuration Schema
 */
export const InvestigationConfigSchema = z
  .object({
    entity_type: EntityTypeSchema,
    entity_id: z.string().min(1, 'Entity ID is required'),
    time_range: TimeRangeSchema,
    tools: z
      .array(ToolConfigSchema)
      .min(1, 'At least one tool must be selected')
      .max(20, 'Maximum 20 tools allowed'),
    correlation_mode: CorrelationModeSchema.optional(),
    execution_mode: ExecutionModeSchema.optional(),
    risk_threshold: z
      .number()
      .int()
      .min(0, 'Risk threshold must be between 0 and 100')
      .max(100, 'Risk threshold must be between 0 and 100')
      .optional(),
  })
  .refine(
    (data) => {
      switch (data.entity_type) {
        case 'user':
          return UserEntityIdSchema.safeParse(data.entity_id).success;
        case 'device':
          return DeviceEntityIdSchema.safeParse(data.entity_id).success;
        case 'ip':
          return IpEntityIdSchema.safeParse(data.entity_id).success;
        case 'transaction':
          return TransactionEntityIdSchema.safeParse(data.entity_id).success;
        default:
          return false;
      }
    },
    (data) => ({
      message: getEntityIdErrorMessage(data.entity_type, data.entity_id),
      path: ['entity_id'],
    })
  );

/**
 * Helper function to get entity ID error message
 */
function getEntityIdErrorMessage(entityType: string, entityId: string): string {
  switch (entityType) {
    case 'user':
      return 'User entity ID must be a valid email address';
    case 'device':
      return 'Device entity ID must be a valid UUID format';
    case 'ip':
      return 'IP entity ID must be a valid IPv4 or IPv6 address';
    case 'transaction':
      return 'Transaction entity ID must contain only alphanumeric characters';
    default:
      return 'Invalid entity type';
  }
}

/**
 * Validation helper function with detailed error messages
 */
export function validateInvestigationConfig(config: unknown): {
  success: boolean;
  data?: z.infer<typeof InvestigationConfigSchema>;
  errors?: Record<string, string[]>;
} {
  const result = InvestigationConfigSchema.safeParse(config);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string[]> = {};

  result.error.issues.forEach((issue) => {
    const path = issue.path.join('.');
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(issue.message);
  });

  return { success: false, errors };
}

/**
 * Type exports
 */
export type EntityType = z.infer<typeof EntityTypeSchema>;
export type TimeRange = z.infer<typeof TimeRangeSchema>;
export type ToolConfig = z.infer<typeof ToolConfigSchema>;
export type InvestigationConfig = z.infer<typeof InvestigationConfigSchema>;
export type CorrelationMode = z.infer<typeof CorrelationModeSchema>;
export type ExecutionMode = z.infer<typeof ExecutionModeSchema>;
