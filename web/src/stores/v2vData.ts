import { z } from 'zod';

export const v2vResultSchema = z.object({
  input_transcript: z.string(), corrected_transcript: z.string(), v2v_audio_url: z.string(),
  latency_ms: z.number().finite(), score_before: z.number().finite(),
  score_after: z.number().finite(), score_delta: z.number().finite(),
});

export const v2vSessionsSchema = z.object({ sessions: z.array(z.object({
  id: z.string(), avatar_id: z.string(), total_transforms: z.number().finite(),
  average_latency_ms: z.number().finite(), score_improvement: z.number().finite(),
  credits_charged: z.number().finite(), status: z.string(), created_at: z.string(),
})) });

export function v2vErrorText(error: unknown, fallback: string): string {
  if (error instanceof z.ZodError) return fallback;
  if (error && typeof error === 'object') {
    const { detail, message } = error as { detail?: unknown; message?: unknown };
    if (typeof detail === 'string' && detail.trim()) return detail;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}
