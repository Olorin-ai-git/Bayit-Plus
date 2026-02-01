/**
 * Live Highlights API Service
 *
 * Provides access to real-time highlight detection for live channels.
 * Highlights are detected from transcript analysis and include:
 * - Emotional peaks
 * - Entity density (people, places)
 * - Keyword patterns
 * - Dramatic moments
 */

import api from './api'
import logger from '@bayit/shared-utils/logger'

const LOG_CONTEXT = 'liveHighlightsApi'

export interface Highlight {
  highlight_id: string
  channel_id: string
  start_time: number
  end_time: number
  transcript_text: string
  highlight_type: 'emotional' | 'entity' | 'keyword' | 'dramatic'
  confidence: number
  metadata: Record<string, unknown>
  created_at: string
}

export interface HighlightsListResponse {
  highlights: Highlight[]
  total: number
  channel_id: string
}

export interface DetectionStatusResponse {
  channel_id: string
  is_detecting: boolean
  highlights_count: number
  config: {
    enabled: boolean
    min_confidence: number
    max_per_hour: number
  }
}

export interface ActiveChannelsResponse {
  channels: string[]
  total: number
}

/**
 * Get recent highlights for a live channel.
 */
export async function getChannelHighlights(
  channelId: string,
  limit: number = 20,
  highlightType?: string
): Promise<HighlightsListResponse> {
  logger.debug('Fetching channel highlights', LOG_CONTEXT, { channelId, limit, highlightType })

  const params: Record<string, unknown> = { limit }
  if (highlightType) {
    params.highlight_type = highlightType
  }

  return api.get(`/live/${channelId}/highlights`, { params })
}

/**
 * Get detection status for a channel.
 */
export async function getDetectionStatus(channelId: string): Promise<DetectionStatusResponse> {
  logger.debug('Checking detection status', LOG_CONTEXT, { channelId })
  return api.get(`/live/${channelId}/highlights/status`)
}

/**
 * Start highlight detection for a channel (admin only).
 */
export async function startDetection(channelId: string): Promise<{ status: string; channel_id: string }> {
  logger.info('Starting highlight detection', LOG_CONTEXT, { channelId })
  return api.post(`/live/${channelId}/highlights/start`)
}

/**
 * Stop highlight detection for a channel (admin only).
 */
export async function stopDetection(channelId: string): Promise<{ status: string; channel_id: string }> {
  logger.info('Stopping highlight detection', LOG_CONTEXT, { channelId })
  return api.post(`/live/${channelId}/highlights/stop`)
}

/**
 * Get all channels with active highlight detection (admin only).
 */
export async function getActiveChannels(): Promise<ActiveChannelsResponse> {
  logger.debug('Fetching active detection channels', LOG_CONTEXT)
  return api.get('/admin/highlights/active')
}

export default {
  getChannelHighlights,
  getDetectionStatus,
  startDetection,
  stopDetection,
  getActiveChannels,
}
