/**
 * Voice API Service
 * Handles communication with backend unified voice endpoint
 *
 * This service provides a type-safe interface to the /api/v1/voice/unified
 * endpoint, which processes voice commands and returns intent classification,
 * spoken responses, actions, and wizard gestures.
 */

import { logger } from '../utils/logger';

const serviceLogger = logger.scope('VoiceApiService');

// ============================================================================
// Types
// ============================================================================

export type VoiceIntent = 'CHAT' | 'SEARCH' | 'NAVIGATION' | 'PLAYBACK' | 'SCROLL' | 'CONTROL';
export type Platform = 'web' | 'ios' | 'android' | 'tvos';
export type TriggerType = 'manual' | 'wake-word';

/**
 * Animation sequence names for wizard storyboards
 */
export type AnimationSequence =
  | 'summon_wizard'
  | 'dismiss_wizard'
  | 'process_command'
  | 'acknowledge_new'
  | 'error_shake'
  | 'magical_reveal'
  | 'success';

/**
 * Gesture names matching available spritesheets
 */
export type GestureName =
  | 'idle'
  | 'greeting'
  | 'listening'
  | 'attentive'
  | 'thinking'
  | 'presenting'
  | 'conjuring'
  | 'browsing'
  | 'confused'
  | 'shrugging'
  | 'farewell'
  | 'cheering'
  | 'clapping'
  | 'crying'
  | 'facepalm'
  | 'emphatic'
  | 'reading'
  | 'confirmation'
  | 'single_result'
  | 'waiting'
  | 'success'
  | 'clarification'
  | 'warning'
  | 'magical_reveal'
  | 'agreement'
  | 'disagreement'
  | 'speaking';

export interface GestureState {
  gesture: GestureName;
  duration: number | null;
}

export interface VoiceAction {
  type: string;
  payload: Record<string, unknown>;
}

export interface UnifiedVoiceRequest {
  transcript: string;
  language: string;
  conversation_id?: string;
  platform: Platform;
  trigger_type: TriggerType;
}

export interface UnifiedVoiceResponse {
  intent: VoiceIntent;
  spoken_response: string;
  action?: VoiceAction;
  conversation_id: string;
  confidence: number;
  gesture?: GestureState;
  animation_sequence?: AnimationSequence;
}

export interface VoiceApiError {
  status: number;
  message: string;
  error_code?: string;
  retry_after?: number;
}

// ============================================================================
// Configuration
// ============================================================================

const getApiBaseUrl = (): string => {
  // Use environment variable or default
  const baseUrl = process.env.REACT_APP_API_URL
    || process.env.EXPO_PUBLIC_API_URL
    || process.env.API_BASE_URL
    || '';
  return baseUrl;
};

const VOICE_ENDPOINT = '/api/v1/voice/unified';
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 2;

// ============================================================================
// Service Implementation
// ============================================================================

/**
 * Process voice command through unified backend endpoint
 *
 * @param request - Voice command request with transcript and context
 * @param authToken - Firebase auth token for authentication
 * @returns Unified voice response with intent, action, and gesture
 * @throws VoiceApiError on failure
 */
export async function processUnifiedVoice(
  request: UnifiedVoiceRequest,
  authToken: string
): Promise<UnifiedVoiceResponse> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${VOICE_ENDPOINT}`;

  serviceLogger.info('Processing voice command', {
    platform: request.platform,
    language: request.language,
    trigger_type: request.trigger_type,
    transcript_length: request.transcript.length,
  });

  let lastError: VoiceApiError | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Rate limit - don't retry
        if (response.status === 429) {
          const error: VoiceApiError = {
            status: response.status,
            message: errorData.detail || 'Rate limit exceeded',
            error_code: errorData.error_code || 'RATE_LIMIT_EXCEEDED',
            retry_after: errorData.retry_after || 60,
          };
          serviceLogger.warn('Rate limited', { retry_after: error.retry_after });
          throw error;
        }

        // Auth error - don't retry
        if (response.status === 401) {
          const error: VoiceApiError = {
            status: response.status,
            message: errorData.detail || 'Authentication failed',
            error_code: errorData.error_code || 'AUTH_INVALID_TOKEN',
          };
          serviceLogger.error('Authentication failed');
          throw error;
        }

        // Server error - retry
        if (response.status >= 500 && attempt < MAX_RETRIES) {
          lastError = {
            status: response.status,
            message: errorData.detail || 'Server error',
            error_code: errorData.error_code || 'INTERNAL_SERVER_ERROR',
          };
          serviceLogger.warn('Server error, retrying', { attempt, status: response.status });
          await exponentialBackoff(attempt);
          continue;
        }

        // Other errors
        const error: VoiceApiError = {
          status: response.status,
          message: errorData.detail || 'Request failed',
          error_code: errorData.error_code,
        };
        throw error;
      }

      const data: UnifiedVoiceResponse = await response.json();

      serviceLogger.info('Voice command processed', {
        intent: data.intent,
        confidence: data.confidence,
        has_gesture: !!data.gesture,
        has_animation: !!data.animation_sequence,
      });

      return data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = {
          status: 408,
          message: 'Request timeout',
          error_code: 'TIMEOUT',
        };
        if (attempt < MAX_RETRIES) {
          serviceLogger.warn('Request timeout, retrying', { attempt });
          await exponentialBackoff(attempt);
          continue;
        }
      } else if ((error as VoiceApiError).status) {
        throw error;
      } else {
        // Network error
        lastError = {
          status: 0,
          message: (error as Error).message || 'Network error',
          error_code: 'NETWORK_ERROR',
        };
        if (attempt < MAX_RETRIES) {
          serviceLogger.warn('Network error, retrying', { attempt, error: lastError.message });
          await exponentialBackoff(attempt);
          continue;
        }
      }
    }
  }

  // All retries exhausted
  serviceLogger.error('Voice command failed after retries', { lastError });
  throw lastError || {
    status: 0,
    message: 'Request failed',
    error_code: 'UNKNOWN_ERROR',
  };
}

/**
 * Check if voice API is available
 */
export async function checkVoiceApiHealth(): Promise<boolean> {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/v1/voice/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return response.ok;
  } catch {
    return false;
  }
}

// ============================================================================
// Helpers
// ============================================================================

async function exponentialBackoff(attempt: number): Promise<void> {
  const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
  await new Promise(resolve => setTimeout(resolve, delay));
}

export default {
  processUnifiedVoice,
  checkVoiceApiHealth,
};
