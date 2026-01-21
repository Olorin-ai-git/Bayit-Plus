import { z } from 'zod';

export const InvestigationFindingSchema = z.object({
  finding_id: z.string(),
  category: z.string(),
  description: z.string(),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  certainty: z.number().min(0).max(1),
});

export type InvestigationFinding = z.infer<typeof InvestigationFindingSchema>;

export const InvestigationResponseSchema = z.object({
  investigation_id: z.string(),
  status: z.string(),
  lifecycle_stage: z.string(),
  risk_score: z.number().optional(),
  final_risk_score: z.number().optional(),
  findings: z.array(InvestigationFindingSchema).optional(),
  recommendations: z.array(z.string()).optional(),
  agents_participated: z.array(z.string()).optional(),
  total_execution_time_ms: z.number().optional(),
});

export type InvestigationResponse = z.infer<typeof InvestigationResponseSchema>;

export function validateInvestigationResponse(
  response: unknown
): { valid: boolean; data?: InvestigationResponse; error?: string } {
  const result = InvestigationResponseSchema.safeParse(response);

  if (!result.success) {
    return {
      valid: false,
      error: `Invalid investigation response: ${JSON.stringify(result.error.format())}`,
    };
  }

  return {
    valid: true,
    data: result.data,
  };
}
