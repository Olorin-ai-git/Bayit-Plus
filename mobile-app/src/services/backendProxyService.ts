/**
 * Backend Proxy Service - Secure Third-Party Service Integration
 *
 * This service provides a unified interface for calling backend proxy endpoints.
 * All third-party service calls (TTS, wake word detection, analytics) are routed
 * through backend proxies that manage credentials securely.
 *
 * Architecture:
 * - Mobile app: Calls backend proxy endpoints via OAuth token
 * - Backend proxy: Calls third-party service with backend-managed credentials
 * - Credentials: Never exposed to mobile app
 *
 * Endpoints:
 * - POST /api/v1/tts/synthesize - Text-to-speech synthesis
 * - GET /api/v1/tts/voices - Available voices
 * - POST /api/v1/wake-word/detect - Wake word detection
 * - GET /api/v1/wake-word/models - Available models
 * - POST /api/v1/analytics/track - Single event tracking
 * - POST /api/v1/analytics/batch - Batch event tracking
 */

import { API_BASE_URL } from '../config/apiConfig';
import { useAuthStore } from '@bayit/shared-stores';

// Type definitions
export interface TTSSynthesizeRequest {
  text: string;
  voice_id?: string;
  language_code?: string;
}

export interface TTSVoice {
  name: string;
  gender: string;
  accent: string;
  description: string;
}

export interface WakeWordDetectRequest {
  language_code?: string;
  sensitivity?: number;
}

export interface WakeWordDetectResponse {
  detected: boolean;
  confidence: number;
  wake_word?: string;
}

export interface WakeWordModel {
  name: string;
  language: string;
  description: string;
}

export interface AnalyticsEvent {
  event_name: string;
  event_category: string;
  properties?: Record<string, any>;
  timestamp?: string;
}

export interface AnalyticsResponse {
  success: boolean;
  event_id?: string;
  message?: string;
}

export interface VoiceCommandRequest {
  transcription: string;
  confidence: number;
  language: string;
}

export interface VoiceCommandResponse {
  success: boolean;
  commandType: string;
  action?: string;
  responseText: string;
  context?: Record<string, any>;
}

class BackendProxyService {
  private baseUrl: string;
  private apiBaseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}`;
    this.apiBaseUrl = `${API_BASE_URL}`;
  }

  /**
   * Get authorization headers with OAuth token
   */
  private async getHeaders(): Promise<HeadersInit> {
    const { token } = useAuthStore.getState();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  // ============================================
  // TTS (Text-to-Speech) Proxy
  // ============================================

  /**
   * Synthesize speech from text using backend proxy
   * @param request - TTS synthesis request
   * @returns Audio blob as MP3
   */
  async synthesizeSpeech(request: TTSSynthesizeRequest): Promise<Blob> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}/tts/synthesize`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text: request.text,
          voice_id: request.voice_id || 'default',
          language_code: request.language_code || 'en',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`TTS synthesis failed: ${response.status} - ${errorText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('[BackendProxyService] TTS synthesis error:', error);
      throw error;
    }
  }

  /**
   * Get available TTS voices
   * @returns Dictionary of available voices
   */
  async getAvailableTTSVoices(): Promise<Record<string, TTSVoice>> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}/tts/voices`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch TTS voices: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[BackendProxyService] Failed to get TTS voices:', error);
      throw error;
    }
  }

  /**
   * Check TTS service health
   */
  async checkTTSHealth(): Promise<{ status: string; service: string; credentials_configured: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/tts/health`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`TTS health check failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[BackendProxyService] TTS health check error:', error);
      throw error;
    }
  }

  // ============================================
  // Wake Word Detection Proxy
  // ============================================

  /**
   * Detect wake word in audio file using backend proxy
   * @param audioBlob - Audio file (WAV format recommended)
   * @param languageCode - Language code (en, he, es)
   * @param sensitivity - Detection sensitivity (0.0-1.0)
   * @returns Wake word detection result
   */
  async detectWakeWord(
    audioBlob: Blob,
    languageCode: string = 'en',
    sensitivity: number = 0.5
  ): Promise<WakeWordDetectResponse> {
    try {
      const headers = await this.getHeaders();
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.wav');
      formData.append('language_code', languageCode);
      formData.append('sensitivity', sensitivity.toString());

      const response = await fetch(`${this.baseUrl}/wake-word/detect`, {
        method: 'POST',
        headers: {
          'Authorization': headers.Authorization as string,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Wake word detection failed: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[BackendProxyService] Wake word detection error:', error);
      throw error;
    }
  }

  /**
   * Get available wake word detection models
   * @returns Dictionary of available models
   */
  async getAvailableWakeWordModels(): Promise<Record<string, WakeWordModel>> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}/wake-word/models`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch wake word models: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[BackendProxyService] Failed to get wake word models:', error);
      throw error;
    }
  }

  /**
   * Check wake word detection service health
   */
  async checkWakeWordHealth(): Promise<{ status: string; service: string; credentials_configured: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/wake-word/health`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Wake word health check failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[BackendProxyService] Wake word health check error:', error);
      throw error;
    }
  }

  // ============================================
  // Analytics Proxy
  // ============================================

  /**
   * Track a single analytics event via backend proxy
   * @param event - Analytics event to track
   * @returns Tracking response with event ID
   */
  async trackEvent(event: AnalyticsEvent): Promise<AnalyticsResponse> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}/analytics/track`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          event_name: event.event_name,
          event_category: event.event_category,
          properties: event.properties || {},
          timestamp: event.timestamp || new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Analytics tracking failed: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[BackendProxyService] Analytics tracking error:', error);
      throw error;
    }
  }

  /**
   * Track multiple analytics events in batch via backend proxy
   * @param events - Array of analytics events
   * @returns Batch tracking response
   */
  async trackBatchEvents(events: AnalyticsEvent[]): Promise<{
    total: number;
    tracked: number;
    failed: number;
    tracked_events: any[];
    failed_events: any[];
  }> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}/analytics/batch`, {
        method: 'POST',
        headers,
        body: JSON.stringify(
          events.map((event) => ({
            event_name: event.event_name,
            event_category: event.event_category,
            properties: event.properties || {},
            timestamp: event.timestamp || new Date().toISOString(),
          }))
        ),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Batch analytics tracking failed: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[BackendProxyService] Batch analytics tracking error:', error);
      throw error;
    }
  }

  /**
   * Check analytics service health
   */
  async checkAnalyticsHealth(): Promise<{ status: string; service: string; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/analytics/health`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Analytics health check failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[BackendProxyService] Analytics health check error:', error);
      throw error;
    }
  }

  // ============================================
  // Voice Command Processing
  // ============================================

  /**
   * Process voice command (transcription → action)
   * Sends user's spoken command to backend for processing
   * @param request - Voice command with transcription
   * @returns Voice command response with action and text response
   */
  async processVoiceCommand(request: VoiceCommandRequest): Promise<VoiceCommandResponse> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}/voice/command`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          transcription: request.transcription,
          confidence: request.confidence,
          language: request.language,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Voice command processing failed: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[BackendProxyService] Voice command processing error:', error);
      throw error;
    }
  }

  /**
   * Get voice command suggestions for partial transcription
   * Helps predict what user is trying to say
   * @param partialTranscription - Incomplete user speech
   * @param language - Language code
   * @returns List of suggested commands
   */
  async getVoiceCommandSuggestions(
    partialTranscription: string,
    language: string = 'en'
  ): Promise<{ suggestions: string[] }> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}/voice/suggestions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          partial: partialTranscription,
          language,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get voice command suggestions: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[BackendProxyService] Failed to get voice suggestions:', error);
      throw error;
    }
  }

  /**
   * Check voice service health
   */
  async checkVoiceHealth(): Promise<{ status: string; service: string; features: string[] }> {
    try {
      const response = await fetch(`${this.baseUrl}/voice/health`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Voice health check failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[BackendProxyService] Voice health check error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const backendProxyService = new BackendProxyService();
