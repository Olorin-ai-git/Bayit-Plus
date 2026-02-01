/**
 * Live Catchup API Service
 *
 * Provides access to AI-powered catch-up summaries and transcript timelines
 * for live channels. Part of the Beta 500 program.
 */

import api from './api'
import logger from '@bayit/shared-utils/logger'

const LOG_CONTEXT = 'liveCatchupApi'

export interface ProgramInfo {
  title?: string
  description?: string
  genre?: string
  host?: string
}

export interface CatchUpSummaryResponse {
  summary: string
  key_points: string[]
  program_info?: ProgramInfo
  window_start: string
  window_end: string
  cached: boolean
  credits_used: number
  remaining_credits: number
}

export interface CatchUpAvailabilityResponse {
  available: boolean
  is_beta_user: boolean
  has_credits: boolean
  balance: number
}

export interface TranscriptSegment {
  text: string
  timestamp: string
  language: string
}

export interface TranscriptTimelineResponse {
  transcripts: TranscriptSegment[]
  total: number
  channel_id: string
  window_minutes: number
}

export interface TranscriptStatusResponse {
  channel_id: string
  is_accumulating: boolean
  transcript_count: number
}

/**
 * Generate AI catch-up summary (Beta 500 users only).
 */
export async function generateCatchupSummary(
  channelId: string,
  windowMinutes: number = 15,
  targetLanguage: string = 'en'
): Promise<CatchUpSummaryResponse> {
  logger.debug('Generating catchup summary', LOG_CONTEXT, { channelId, windowMinutes, targetLanguage })

  return api.get(`/live/${channelId}/catchup`, {
    params: {
      window_minutes: windowMinutes,
      target_language: targetLanguage,
    },
  })
}

/**
 * Check if catch-up is available for a channel.
 */
export async function checkCatchupAvailability(channelId: string): Promise<CatchUpAvailabilityResponse> {
  logger.debug('Checking catchup availability', LOG_CONTEXT, { channelId })
  return api.get(`/live/${channelId}/catchup/available`)
}

/**
 * Get transcript timeline for a channel.
 */
export async function getTranscriptTimeline(
  channelId: string,
  windowMinutes: number = 15
): Promise<TranscriptTimelineResponse> {
  logger.debug('Fetching transcript timeline', LOG_CONTEXT, { channelId, windowMinutes })

  return api.get(`/live/${channelId}/transcripts`, {
    params: { window_minutes: windowMinutes },
  })
}

/**
 * Get transcript accumulation status for a channel.
 */
export async function getTranscriptStatus(channelId: string): Promise<TranscriptStatusResponse> {
  logger.debug('Checking transcript status', LOG_CONTEXT, { channelId })
  return api.get(`/live/${channelId}/transcripts/status`)
}

export default {
  generateCatchupSummary,
  checkCatchupAvailability,
  getTranscriptTimeline,
  getTranscriptStatus,
}
