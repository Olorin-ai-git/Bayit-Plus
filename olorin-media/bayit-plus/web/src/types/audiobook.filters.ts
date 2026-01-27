/**
 * Audiobook Filters and Search Schemas
 * Types and validation schemas for discovery, filtering, and search
 */

import { z } from 'zod'
import { AudioQualitySchema, SubscriptionTierSchema } from './audiobook.schemas'

// ============ FILTER SCHEMAS ============

/**
 * Audiobook filters for discovery/search
 */
export const AudiobookFiltersSchema = z.object({
  page: z.number().int().min(1).default(1),
  page_size: z.number().int().min(1).max(500).default(50),
  author: z.string().optional(),
  narrator: z.string().optional(),
  audio_quality: AudioQualitySchema.optional(),
  requires_subscription: SubscriptionTierSchema.optional(),
  is_published: z.boolean().optional(),
  search_query: z.string().optional(),
  genre_ids: z.array(z.string()).optional(),
  sort_by: z.enum(['title', 'newest', 'views', 'rating']).default('newest'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
})

/**
 * Admin filters (extended)
 */
export const AudiobookAdminFiltersSchema = AudiobookFiltersSchema.extend({
  is_featured: z.boolean().optional(),
  visibility_mode: z.enum(['public', 'private', 'restricted']).optional(),
  min_rating: z.number().min(0).max(5).optional(),
  max_rating: z.number().min(0).max(5).optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
})

// ============ SEARCH SCHEMAS ============

/**
 * Search suggestion schema
 */
export const AudiobookSearchSuggestionSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(['title', 'author', 'narrator']),
  highlight: z.string().optional(),
})

/**
 * Search response schema
 */
export const AudiobookSearchResponseSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      author: z.string().optional(),
      thumbnail: z.string().url().optional(),
      type: z.enum(['audiobook']),
    })
  ),
  total: z.number().int(),
  query: z.string(),
})

// ============ TYPE INFERENCE ============

export type AudiobookFilters = z.infer<typeof AudiobookFiltersSchema>
export type AudiobookAdminFilters = z.infer<typeof AudiobookAdminFiltersSchema>
export type AudiobookSearchSuggestion = z.infer<typeof AudiobookSearchSuggestionSchema>
export type AudiobookSearchResponse = z.infer<typeof AudiobookSearchResponseSchema>
