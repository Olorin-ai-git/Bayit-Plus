/**
 * Audiobook Types for tvOS
 * Core TypeScript interfaces for audiobooks
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
 * Featured section for tvOS rows
 */
export interface AudiobookFeaturedSection {
  section_id: string
  section_name: string
  audiobooks: Audiobook[]
  order: number
}

/**
 * Stream response (admin only)
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

// ============ FILTER TYPES ============

/**
 * Audiobook filters for browsing
 */
export interface AudiobookFilters {
  page?: number
  page_size?: number
  author?: string
  narrator?: string
  audio_quality?: AudioQuality
  requires_subscription?: SubscriptionTier
  is_published?: boolean
  search_query?: string
  genre_ids?: string[]
  sort_by?: 'title' | 'newest' | 'views' | 'rating'
  sort_order?: 'asc' | 'desc'
}
