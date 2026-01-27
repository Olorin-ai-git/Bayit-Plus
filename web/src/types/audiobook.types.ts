/**
 * Core Audiobook Types
 * TypeScript interfaces for audiobooks
 */

// ============ ENUM TYPES ============

export type AudioQuality = '8-bit' | '16-bit' | '24-bit' | '32-bit' | 'high-fidelity' | 'standard' | 'premium' | 'lossless'
export type SubscriptionTier = 'free' | 'basic' | 'premium' | 'family'
export type VisibilityMode = 'public' | 'private' | 'restricted'

// ============ CORE TYPES ============

/**
 * User-facing audiobook response (no stream URL)
 */
export interface Audiobook {
  id: string
  title: string
  author?: string
  narrator?: string
  description?: string
  duration?: string
  year?: number
  rating?: number
  thumbnail?: string
  backdrop?: string
  audio_quality?: AudioQuality
  isbn?: string
  book_edition?: string
  publisher_name?: string
  view_count: number
  avg_rating: number
  is_featured: boolean
  requires_subscription: SubscriptionTier
  content_format: 'audiobook'
  created_at: string
  updated_at: string
}

/**
 * Admin-only audiobook response with sensitive fields
 */
export interface AudiobookAdmin extends Audiobook {
  stream_url: string
  stream_type: 'hls' | 'dash' | 'rtmp' | 'rtmps'
  is_drm_protected: boolean
  drm_key_id?: string
  is_published: boolean
  visibility_mode: VisibilityMode
  section_ids: string[]
  primary_section_id?: string
  genre_ids: string[]
  audience_id?: string
  topic_tags: string[]
}

// ============ REQUEST TYPES ============

/**
 * Create audiobook request
 */
export interface AudiobookCreateRequest {
  title: string
  author: string
  narrator?: string
  description?: string
  duration?: string
  year?: number
  rating?: number
  thumbnail?: string
  backdrop?: string
  stream_url: string
  stream_type?: 'hls' | 'dash' | 'rtmp' | 'rtmps'
  is_drm_protected?: boolean
  drm_key_id?: string
  audio_quality?: AudioQuality
  isbn?: string
  book_edition?: string
  publisher_name?: string
  section_ids?: string[]
  primary_section_id?: string
  genre_ids?: string[]
  audience_id?: string
  topic_tags?: string[]
  requires_subscription?: SubscriptionTier
  visibility_mode?: VisibilityMode
  is_published?: boolean
}

/**
 * Update audiobook request (all fields optional)
 */
export type AudiobookUpdateRequest = Partial<AudiobookCreateRequest>

// ============ RESPONSE TYPES ============

/**
 * Paginated audiobook list response
 */
export interface AudiobookListResponse {
  items: Audiobook[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

/**
 * Admin paginated list response
 */
export interface AudiobookAdminListResponse {
  items: AudiobookAdmin[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

/**
 * Stream URL response (admin-only)
 */
export interface AudiobookStreamResponse {
  id: string
  title: string
  author?: string
  narrator?: string
  stream_url: string
  stream_type: 'hls' | 'dash' | 'rtmp' | 'rtmps'
  duration?: string
  audio_quality?: AudioQuality
  is_drm_protected: boolean
}

/**
 * Feature/unfeature operation response
 */
export interface AudiobookFeatureResponse {
  message: string
  audiobook_id: string
  is_featured: boolean
}
