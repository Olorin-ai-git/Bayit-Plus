/**
 * Zod Schemas for VerticalFeed Component
 */

import { z } from 'zod';

export const FeedItemSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  duration: z.number().optional(),
  type: z.string().optional(),
  stream_url: z.string().optional(),
  url: z.string().optional(),
  thumbnail: z.string().optional(),
});

export type FeedItem = z.infer<typeof FeedItemSchema>;

export const VerticalFeedPropsSchema = z.object({
  items: z.array(FeedItemSchema).optional().default([]),
  onItemChange: z.function()
    .args(FeedItemSchema, z.number())
    .returns(z.void())
    .optional(),
  onItemPress: z.function()
    .args(FeedItemSchema, z.number())
    .returns(z.void())
    .optional(),
  renderItem: z.function()
    .args(FeedItemSchema, z.number(), z.boolean())
    .returns(z.any())
    .optional(),
  autoPlay: z.boolean().optional().default(true),
  showProgress: z.boolean().optional().default(true),
});

export type VerticalFeedProps = z.infer<typeof VerticalFeedPropsSchema>;
