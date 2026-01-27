/**
 * Audiobook Zod Validation Schemas
 * Runtime validation for API requests and responses
 */

import { z } from 'zod'

// ============ ENUM SCHEMAS ============

export const AudioQualitySchema = z.enum([
  '8-bit',
  '16-bit',
  '24-bit',
  '32-bit',
  'high-fidelity',
  'standard',
  'premium',
  'lossless',
])

export const SubscriptionTierSchema = z.enum(['free', 'basic', 'premium', 'family'])

export const VisibilityModeSchema = z.enum(['public', 'private', 'restricted'])

// ============ CORE SCHEMAS ============

/**
 * Core audiobook schema - matches backend Content model
 */
export const AudiobookSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(500),
  author: z.string().optional(),
  narrator: z.string().optional(),
  description: z.string().optional(),
  duration: z.string().optional(),
  year: z.number().int().optional(),
  rating: z.number().min(0).max(5).optional(),
  thumbnail: z.string().url().optional(),
  backdrop: z.string().url().optional(),
  audio_quality: AudioQualitySchema.optional(),
  isbn: z.string().optional(),
  book_edition: z.string().optional(),
  publisher_name: z.string().optional(),
  view_count: z.number().int().default(0),
  avg_rating: z.number().min(0).max(5).default(0),
  is_featured: z.boolean().default(false),
  requires_subscription: SubscriptionTierSchema.default('basic'),
  content_format: z.literal('audiobook'),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

/**
 * Admin audiobook schema with publishing details
 */
export const AudiobookAdminSchema = AudiobookSchema.extend({
  stream_url: z.string().url(),
  stream_type: z.enum(['hls', 'dash', 'rtmp', 'rtmps']).default('hls'),
  is_drm_protected: z.boolean().default(false),
  drm_key_id: z.string().optional(),
  is_published: z.boolean().default(false),
  visibility_mode: VisibilityModeSchema.default('public'),
  section_ids: z.array(z.string()).default([]),
  primary_section_id: z.string().optional(),
  genre_ids: z.array(z.string()).default([]),
  audience_id: z.string().optional(),
  topic_tags: z.array(z.string()).default([]),
})

// ============ REQUEST SCHEMAS ============

/**
 * Create audiobook request schema
 */
export const AudiobookCreateRequestSchema = z.object({
  title: z.string().min(1).max(500),
  author: z.string().min(1).max(300),
  narrator: z.string().optional(),
  description: z.string().optional(),
  duration: z.string().optional(),
  year: z.number().int().optional(),
  rating: z.number().min(0).max(5).optional(),
  thumbnail: z.string().url().optional(),
  backdrop: z.string().url().optional(),
  stream_url: z.string().url(),
  stream_type: z.enum(['hls', 'dash', 'rtmp', 'rtmps']).default('hls'),
  is_drm_protected: z.boolean().default(false),
  drm_key_id: z.string().optional(),
  audio_quality: AudioQualitySchema.optional(),
  isbn: z.string().optional(),
  book_edition: z.string().optional(),
  publisher_name: z.string().optional(),
  section_ids: z.array(z.string()).default([]),
  primary_section_id: z.string().optional(),
  genre_ids: z.array(z.string()).default([]),
  audience_id: z.string().optional(),
  topic_tags: z.array(z.string()).default([]),
  requires_subscription: SubscriptionTierSchema.default('basic'),
  visibility_mode: VisibilityModeSchema.default('public'),
  is_published: z.boolean().default(false),
})

/**
 * Update audiobook request schema (all fields optional)
 */
export const AudiobookUpdateRequestSchema = AudiobookCreateRequestSchema.partial()

// ============ RESPONSE SCHEMAS ============

/**
 * Paginated audiobook list response
 */
export const AudiobookListResponseSchema = z.object({
  items: z.array(AudiobookSchema),
  total: z.number().int(),
  page: z.number().int().min(1),
  page_size: z.number().int().min(1).max(500),
  total_pages: z.number().int(),
})

/**
 * Admin paginated list response
 */
export const AudiobookAdminListResponseSchema = z.object({
  items: z.array(AudiobookAdminSchema),
  total: z.number().int(),
  page: z.number().int().min(1),
  page_size: z.number().int().min(1).max(500),
  total_pages: z.number().int(),
})

/**
 * Stream response schema
 */
export const AudiobookStreamResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.string().optional(),
  narrator: z.string().optional(),
  stream_url: z.string().url(),
  stream_type: z.enum(['hls', 'dash', 'rtmp', 'rtmps']),
  duration: z.string().optional(),
  audio_quality: AudioQualitySchema.optional(),
  is_drm_protected: z.boolean(),
})

/**
 * Feature response schema
 */
export const AudiobookFeatureResponseSchema = z.object({
  message: z.string(),
  audiobook_id: z.string(),
  is_featured: z.boolean(),
})

// ============ UTILITY SCHEMAS ============

/**
 * User rating schema
 */
export const AudiobookUserRatingSchema = z.object({
  audiobook_id: z.string(),
  rating: z.number().int().min(1).max(5),
  review_text: z.string().max(1000).optional(),
})

/**
 * User favorite schema
 */
export const AudiobookFavoriteSchema = z.object({
  audiobook_id: z.string(),
  is_favorite: z.boolean(),
  added_at: z.string().datetime().optional(),
})
