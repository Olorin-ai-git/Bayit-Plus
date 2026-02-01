/**
 * Live Search API Service
 *
 * Provides access to real-time transcript search for live channels.
 * Uses MongoDB text index for full-text search across transcript content.
 */

import api from './api'
import logger from '@bayit/shared-utils/logger'

const LOG_CONTEXT = 'liveSearchApi'

export interface TranscriptMatch {
  text: string
  timestamp: string
  source_lang: string
  score?: number
}

export interface SearchResponse {
  query: string
  results: TranscriptMatch[]
  total: number
  channel_id: string
}

export interface RecentTranscriptsResponse {
  transcripts: TranscriptMatch[]
  total: number
  channel_id: string
}

export interface IndexStatusResponse {
  channel_id: string
  is_indexing: boolean
  indexed_count: number
  config: {
    enabled: boolean
    batch_size: number
    flush_interval: number
    ttl_hours: number
  }
}

/**
 * Search live transcripts for a channel.
 */
export async function searchTranscripts(
  channelId: string,
  query: string,
  limit: number = 20
): Promise<SearchResponse> {
  logger.debug('Searching transcripts', LOG_CONTEXT, { channelId, query, limit })

  return api.get(`/live/${channelId}/search`, {
    params: { q: query, limit },
  })
}

/**
 * Get recent transcripts for a channel.
 */
export async function getRecentTranscripts(
  channelId: string,
  limit: number = 50,
  minutes: number = 15
): Promise<RecentTranscriptsResponse> {
  logger.debug('Fetching recent transcripts', LOG_CONTEXT, { channelId, limit, minutes })

  return api.get(`/live/${channelId}/transcripts/recent`, {
    params: { limit, minutes },
  })
}

/**
 * Get search index status for a channel.
 */
export async function getIndexStatus(channelId: string): Promise<IndexStatusResponse> {
  logger.debug('Checking index status', LOG_CONTEXT, { channelId })
  return api.get(`/live/${channelId}/search/status`)
}

/**
 * Start search indexing for a channel (admin only).
 */
export async function startIndexing(channelId: string): Promise<{ status: string; channel_id: string }> {
  logger.info('Starting search indexing', LOG_CONTEXT, { channelId })
  return api.post(`/live/${channelId}/search/start`)
}

/**
 * Stop search indexing for a channel (admin only).
 */
export async function stopIndexing(channelId: string): Promise<{ status: string; channel_id: string }> {
  logger.info('Stopping search indexing', LOG_CONTEXT, { channelId })
  return api.post(`/live/${channelId}/search/stop`)
}

export default {
  searchTranscripts,
  getRecentTranscripts,
  getIndexStatus,
  startIndexing,
  stopIndexing,
}
