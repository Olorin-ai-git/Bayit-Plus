/**
 * Zod schemas for WidgetContainer prop validation
 */

import { z } from 'zod';

export const WidgetPositionSchema = z.object({
  x: z.number().min(0),
  y: z.number().min(0),
  width: z.number().min(150),
  height: z.number().min(100),
  z_index: z.number().min(0),
});

export const WidgetContentSchema = z.object({
  content_type: z.enum(['live_channel', 'live', 'vod', 'podcast', 'radio', 'iframe', 'custom']),
  live_channel_id: z.string().nullable().optional(),
  podcast_id: z.string().nullable().optional(),
  content_id: z.string().nullable().optional(),
  station_id: z.string().nullable().optional(),
  iframe_url: z.string().url().nullable().optional(),
  iframe_title: z.string().nullable().optional(),
  component_name: z.string().nullable().optional(),
});

export const WidgetSchema = z.object({
  id: z.string(),
  type: z.enum(['system', 'personal']),
  user_id: z.string().nullable().optional(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  cover_url: z.string().url().nullable().optional(),
  content: WidgetContentSchema,
  position: WidgetPositionSchema,
  is_active: z.boolean(),
  is_muted: z.boolean(),
  is_visible: z.boolean(),
  is_closable: z.boolean(),
  is_draggable: z.boolean(),
  visible_to_roles: z.array(z.string()),
  visible_to_subscription_tiers: z.array(z.string()),
  target_pages: z.array(z.string()),
  order: z.number().min(0),
  created_by: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const WidgetContainerPropsSchema = z.object({
  widget: WidgetSchema,
  isMuted: z.boolean(),
  position: WidgetPositionSchema,
  onToggleMute: z.function(),
  onClose: z.function(),
  onPositionChange: z.function(),
  streamUrl: z.string().url().optional(),
});

export type WidgetContainerPropsType = z.infer<typeof WidgetContainerPropsSchema>;
