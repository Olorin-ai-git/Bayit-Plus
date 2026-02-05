/**
 * Content Helper Utilities
 * Helper functions for content-related operations
 */

import { Content } from '../types/content'

/**
 * Determine if content is a series based on multiple indicators.
 *
 * A content item is considered a series if:
 * 1. category_name contains "series" or "סדרות" (Hebrew)
 * 2. Has series_id (but is not itself an episode with season/episode numbers)
 * 3. Has total_episodes field
 * 4. season number without episode number (season container)
 *
 * This replaces the deprecated `is_series` field.
 *
 * @param content - Content object (or partial content with relevant fields)
 * @returns true if content is a series, false otherwise
 */
export function isSeriesContent(content: Partial<Content>): boolean {
  // Check category name (most reliable indicator)
  const categoryName = content.category_name?.toLowerCase() || ''
  if (categoryName.includes('series') || categoryName.includes('סדרות')) {
    return true
  }

  // Check if has series_id but no episode markers (could be series parent)
  if (content.series_id && !content.season && !content.episode) {
    return false // This is an episode without season/episode info
  }

  // Check for total_episodes (series parents have this)
  if ((content as any).total_episodes !== undefined && (content as any).total_episodes !== null) {
    return true
  }

  // Check if has season but no episode (season container)
  if (content.season !== undefined && content.season !== null && !content.episode) {
    return true
  }

  return false
}

/**
 * Determine if content is an episode (part of a series).
 *
 * @param content - Content object
 * @returns true if content is an episode
 */
export function isEpisodeContent(content: Partial<Content>): boolean {
  return !!(
    content.series_id ||
    (content.season !== undefined && content.season !== null) ||
    (content.episode !== undefined && content.episode !== null)
  )
}

/**
 * Get content type label for display.
 *
 * @param content - Content object
 * @returns "Series", "Episode", or "Movie"
 */
export function getContentTypeLabel(content: Partial<Content>): string {
  if (isEpisodeContent(content)) {
    return 'Episode'
  }
  if (isSeriesContent(content)) {
    return 'Series'
  }
  return 'Movie'
}
