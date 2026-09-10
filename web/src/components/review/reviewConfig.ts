import { z } from 'zod';
import copy from './review.en.json';

export const reviewConfig = z.object({
  storageKey: z.string().min(1), schemaVersion: z.literal(1),
  maxPins: z.number().int().positive(), maxText: z.number().int().positive(),
  maxStoredBytes: z.number().int().positive(), maxAnchorCandidates: z.number().int().positive(),
  downloadName: z.string().min(1), locale: z.string().min(1),
}).parse({
  storageKey: 'bayit.review.evidence.v1', schemaVersion: 1,
  maxPins: 200, maxText: 4000, maxStoredBytes: 4000000, maxAnchorCandidates: 2000,
  downloadName: 'bayit-review-evidence', locale: 'en',
});

export { copy };
export const overlaySelector = '[data-bayit-review-overlay]';
export const sensitiveSelector = 'input,textarea,select,[contenteditable]:not([contenteditable="false"]),[data-review-private],[data-private],[autocomplete],[role="textbox"]';
export const stableAttributes = ['data-review-id', 'data-testid', 'id'] as const;
export const severities = ['critical', 'high', 'medium', 'low', 'info'] as const;
export const findingStates = ['open', 'resolved', 'verified'] as const;
export const dispositions = ['fix', 'no-code'] as const;
