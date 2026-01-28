/**
 * API Types for Bayit+ Dubbing Backend
 *
 * Matches backend Pydantic models from:
 * - backend/app/models/dubbing/session.py
 * - backend/app/api/routes/dubbing/sessions.py
 */

/**
 * Session Type Configuration
 * Enables audio dubbing, live subtitles, or both
 */
export interface DubbingSessionType {
  audio_dubbing: boolean;
  live_subtitles: boolean;
  subtitle_language: string | null;
}

/**
 * Request to create a new dubbing/subtitle session
 */
export interface CreateSessionRequest {
  source_language: string;          // e.g., "he" (Hebrew)
  target_language: string;          // e.g., "en" (English) or "es" (Spanish)
  audio_dubbing: boolean;           // Enable audio dubbing
  live_subtitles: boolean;          // Enable live subtitles
  subtitle_language?: string;       // Override subtitle language (defaults to target_language)
  voice_id?: string;                // Voice ID for TTS (optional)
  extension_version?: string;       // Extension version for telemetry
  browser?: string;                 // Browser name (chrome, edge)
  platform?: string;                // Platform (windows, mac, linux)
}

/**
 * Response from creating a session
 */
export interface SessionResponse {
  session_id: string;
  websocket_url: string;
  quota_remaining_minutes: number;
  session_type: DubbingSessionType;
  expires_at: string;               // ISO timestamp
}

/**
 * Session status response
 */
export interface SessionStatusResponse {
  session_id: string;
  status: 'active' | 'completed' | 'failed' | 'expired';
  duration_seconds: number;
  audio_chunks_processed: number;
  subtitles_generated: number;
  websocket_connected: boolean;
  created_at: string;               // ISO timestamp
  updated_at: string;               // ISO timestamp
}

/**
 * Quota check response
 */
export interface QuotaCheckResponse {
  has_quota: boolean;
  minutes_used: number;
  minutes_total: number;
  minutes_remaining: number;
  is_premium: boolean;
  reset_at: string;                 // ISO timestamp (midnight UTC)
}

/**
 * Usage sync request (extension → server)
 */
export interface UsageSyncRequest {
  daily_minutes_used: number;
}

/**
 * Usage sync response (server → extension)
 */
export interface UsageSyncResponse {
  daily_minutes_used: number;
  quota_remaining: number;
  is_premium: boolean;
}

/**
 * Voice option from /voices endpoint
 */
export interface VoiceOption {
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female';
  preview_url: string | null;
}

/**
 * Available voices response
 */
export interface VoicesResponse {
  voices: VoiceOption[];
}

/**
 * WebSocket message types (server → extension)
 */
export type WebSocketMessage =
  | { type: 'audio'; data: string; timestamp: string }      // Base64 dubbed audio
  | { type: 'subtitle'; data: string; timestamp: string }   // Translated subtitle text
  | { type: 'transcript'; data: string; timestamp: string } // Original transcript
  | { type: 'error'; error: string; timestamp: string }     // Error message
  | { type: 'status'; status: string; message: string; timestamp: string }; // Connection status

/**
 * WebSocket control messages (extension → server)
 */
export interface WebSocketControlMessage {
  type: 'auth' | 'ping' | 'close';
  token?: string;  // JWT token for auth message
}

/**
 * API Error Response
 */
export interface APIError {
  detail: string | { code: string; message: string; [key: string]: any };
}

/**
 * Extension runtime configuration (fetched from backend)
 */
export interface ExtensionConfig {
  free_tier_minutes_per_day: number;
  premium_tier_price_usd: number;
  supported_languages: string[];
  supported_sites: string[];
  audio_sample_rate: number;
  max_session_duration_minutes: number;
}
