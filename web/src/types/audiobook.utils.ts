/**
 * Audiobook Utility Types
 * Extended types for specialized use cases (bulk operations, metadata, etc.)
 */

import { Audiobook } from './audiobook.types'
import { AudioQuality } from './audiobook.types'

// ============ ERROR TYPES ============

/**
 * API error response
 */
export interface AudiobookError {
  status: number
  detail: string
  error_code?: string
  timestamp: string
}

// ============ METADATA TYPES ============

/**
 * Audio quality metadata
 */
export interface AudioQualityMetadata {
  quality: AudioQuality
  bitrate?: string
  format?: string
  sampleRate?: string
  label: string
}

/**
 * Audiobook with metadata for display
 */
export interface AudiobookMetadata extends Audiobook {
  qualityMetadata?: AudioQualityMetadata
  playbackUrl?: string
  userRating?: number
  isFavorited?: boolean
  listenedDuration?: number
}

// ============ BULK OPERATION TYPES ============

/**
 * Bulk operation request
 */
export interface AudiobookBulkOperationRequest {
  audiobook_ids: string[]
  operation: 'publish' | 'unpublish' | 'delete' | 'feature' | 'unfeature'
  data?: Record<string, unknown>
}

/**
 * Bulk operation response
 */
export interface AudiobookBulkOperationResponse {
  success: number
  failed: number
  total: number
  errors?: AudiobookError[]
}

// ============ SECTION TYPES ============

/**
 * Featured section
 */
export interface AudiobookFeaturedSection {
  section_id: string
  section_name: string
  audiobooks: Audiobook[]
  order: number
}
