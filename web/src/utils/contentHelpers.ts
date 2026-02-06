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
  // Aligned with backend SERIES_CATEGORY_KEYWORDS: "series", "סדרות", "סדרה", "tv shows", "shows"
  const categoryName = content.category_name?.toLowerCase() || ''
  const seriesKeywords = ['series', 'סדרות', 'סדרה', 'tv shows', 'shows']
  if (seriesKeywords.some(keyword => categoryName.includes(keyword))) {
    return true
  }

  // Check series structure indicators (aligned with backend logic)
  const series_id = content.series_id
  const total_episodes = (content as any).total_episodes
  const season_number = (content as any).season_number
  const episode_number = (content as any).episode_number

  // Has series_id → is an episode or series-related
  if (series_id) {
    return true
  }

  // Has total_episodes → is a parent series
  if (total_episodes !== undefined && total_episodes !== null) {
    return true
  }

  // Has season_number or episode_number → is series content
  if (season_number !== undefined && season_number !== null) {
    return true
  }
  if (episode_number !== undefined && episode_number !== null) {
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
