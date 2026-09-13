import { z } from 'zod';
import { matchPath } from 'react-router-dom';
import publicRoutes from './reviewRoutes.json';
import { dispositions, findingStates, reviewConfig, severities, stableAttributes } from './reviewConfig';

const digestSchema = z.string().regex(/^[a-f0-9]{64}$/);
const textSchema = z.string().trim().min(1).max(reviewConfig.maxText);
const tagSchema = z.string().regex(/^[a-z][a-z0-9-]*$/);
export const anchorSchema = z.object({
  tag: tagSchema,
  path: z.array(z.object({ tag: tagSchema, index: z.number().int().nonnegative() }).strict()),
  stable: z.object({ attribute: z.enum(stableAttributes), digest: digestSchema }).strict().optional(),
  private: z.boolean(),
}).strict();
export const draftSchema = z.object({
  severity: z.enum(severities), observed: textSchema, expected: textSchema,
  disposition: z.enum(dispositions), action: textSchema, state: z.enum(findingStates),
}).strict().refine(value => value.state !== 'verified' || value.disposition === 'no-code')
  .refine(value => value.state !== 'resolved' || value.disposition === 'fix');
const contextSchema = z.object({
  buildSha: z.string().regex(/^[a-f0-9]{40}$/), route: z.string().startsWith('/'), routeKey: digestSchema,
  viewport: z.object({ width: z.number().int().positive(), height: z.number().int().positive(), pixelRatio: z.number().positive() }).strict(),
  timestamp: z.string().datetime(),
}).strict();
export const pinSchema = z.object({
  id: z.string().uuid(), anchor: anchorSchema, context: contextSchema,
  finding: draftSchema, updatedAt: z.string().datetime(),
}).strict();
export const evidenceSchema = z.object({
  schemaVersion: z.literal(reviewConfig.schemaVersion), pins: z.array(pinSchema).max(reviewConfig.maxPins),
}).strict();
export type Anchor = z.infer<typeof anchorSchema>;
export type Finding = z.infer<typeof draftSchema>;
export type Pin = z.infer<typeof pinSchema>;
export type ReviewContext = z.infer<typeof contextSchema>;
export const emptyFinding: Finding = { severity: 'medium', observed: '', expected: '', disposition: 'fix', action: '', state: 'open' };

// Only public route patterns enter evidence. Unknown routes retain their digest for scoping.
export function privateRoute(pathname: string): string {
  return publicRoutes.find(path => matchPath({ path, end: true, caseSensitive: true }, pathname)) || '/:unrecognized';
}
