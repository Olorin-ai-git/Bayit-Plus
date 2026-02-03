/**
 * Audio Tracks Service
 *
 * API client for VOD audio track management.
 * Handles AI-generated audio track fetching, generation, and status polling.
 */

import api from './api';

/**
 * Audio track metadata returned from API
 */
export interface AudioTrackMetadata {
  id: string;
  content_id: string;
  content_type: string;
  variant_type: string; // "heblish", "slang", "grammar_flip", "engrew"
  variant_display_name: string;
  language: string;
  language_name: string;
  audio_url: string | null;
  audio_format: string;
  duration_seconds: number | null;
  file_size_bytes: number | null;
  generation_status: string; // "pending", "processing", "completed", "failed"
  generation_progress: number; // 0-100
  generation_error: string | null;
  is_default: boolean;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Response from generate audio tracks endpoint
 */
export interface GenerateAudioTracksResponse {
  job_id: string;
  status: string;
  message: string;
  audio_tracks: AudioTrackMetadata[];
}

/**
 * Response from list audio tracks endpoint
 */
export interface AudioTrackListResponse {
  audio_tracks: AudioTrackMetadata[];
}

/**
 * Response from audio generation status endpoint
 */
export interface AudioGenerationStatusResponse {
  overall_status: string; // "pending", "processing", "completed", "failed"
  completed: number;
  processing: number;
  failed: number;
  pending: number;
  total_tracks: number;
  tracks: AudioTrackMetadata[];
}

/**
 * Get all available audio tracks for content.
 *
 * Returns only completed audio tracks with audio URLs.
 *
 * @param contentId - Content ID
 * @returns List of completed audio tracks
 */
export async function getAudioTracks(contentId: string): Promise<AudioTrackListResponse> {
  return await api.get(`/vod/${contentId}/audio-tracks`);
}

/**
 * Trigger audio generation for all 4 subtitle variants.
 *
 * Creates background jobs to generate audio tracks.
 * Requires admin privileges.
 *
 * @param contentId - Content ID
 * @param variants - Optional list of variants to generate (defaults to all 4)
 * @returns Generation response with job ID and created tracks
 */
export async function generateAudioTracks(
  contentId: string,
  variants?: string[]
): Promise<GenerateAudioTracksResponse> {
  return await api.post(`/vod/${contentId}/audio-tracks/generate`, {
    variants,
  });
}

/**
 * Poll audio generation status for all variants.
 *
 * Returns counts by status and detailed track information.
 *
 * @param contentId - Content ID
 * @returns Generation status with counts and track details
 */
export async function getGenerationStatus(
  contentId: string
): Promise<AudioGenerationStatusResponse> {
  return await api.get(`/vod/${contentId}/audio-tracks/status`);
}

/**
 * Get HLS manifest with audio variant tracks.
 *
 * Returns HLS manifest URL that includes all available audio tracks.
 *
 * @param contentId - Content ID
 * @returns HLS manifest URL
 */
export function getHLSManifestURL(contentId: string): string {
  return `/api/v1/vod/${contentId}/hls/manifest.m3u8`;
}
