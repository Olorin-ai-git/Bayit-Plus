/**
 * Audiobook Types Index
 * Central export point for all audiobook-related types, schemas, and utilities
 *
 * Sub-modules:
 * - audiobook.types.ts: Core TypeScript interfaces
 * - audiobook.schemas.ts: Zod validation schemas
 * - audiobook.filters.ts: Filter and search types
 * - audiobook.utils.ts: Utility types (metadata, bulk operations, etc.)
 */

// Core types
export * from './audiobook.types'

// Validation schemas (Zod)
export * from './audiobook.schemas'

// Filters and search
export * from './audiobook.filters'

// Utility types
export * from './audiobook.utils'

// Re-export commonly used types at top level for convenience
export type {
  Audiobook,
  AudiobookAdmin,
  AudiobookCreateRequest,
  AudiobookUpdateRequest,
  AudiobookListResponse,
  AudiobookStreamResponse,
  AudiobookChapter,
  AudiobookWithChapters,
  AudioQuality,
  SubscriptionTier,
  VisibilityMode,
} from './audiobook.types'

export type {
  AudiobookFilters,
} from './audiobook.filters'

export type {
  AudiobookError,
  AudiobookMetadata,
  AudiobookBulkOperationRequest,
  AudiobookFeaturedSection,
} from './audiobook.utils'
