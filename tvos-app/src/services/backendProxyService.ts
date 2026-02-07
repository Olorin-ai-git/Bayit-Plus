/**
 * Backend Proxy Service - Secure Third-Party Service Integration (tvOS)
 *
 * Unified facade for calling backend proxy endpoints.
 * All third-party service calls (TTS, wake word detection, analytics) are routed
 * through backend proxies that manage credentials securely.
 *
 * Implementation split into proxy modules:
 * - proxy/ttsProxy.ts - Text-to-speech synthesis
 * - proxy/wakeWordProxy.ts - Wake word detection
 * - proxy/analyticsProxy.ts - Analytics event tracking
 * - proxy/voiceProxy.ts - Voice command processing
 */

// Re-export types for backward compatibility
export type {
  TTSSynthesizeRequest,
  TTSVoice,
  WakeWordDetectRequest,
  WakeWordDetectResponse,
  WakeWordModel,
  AnalyticsEvent,
  AnalyticsResponse,
  VoiceCommandRequest,
  VoiceCommandResponse,
  HealthCheckResponse,
  BatchTrackingResponse,
} from '../types/backendProxy';

// Import proxy modules
import { synthesizeSpeech, getAvailableTTSVoices, checkTTSHealth } from './proxy/ttsProxy';
import { detectWakeWord, getAvailableWakeWordModels, checkWakeWordHealth } from './proxy/wakeWordProxy';
import { trackEvent, trackBatchEvents, checkAnalyticsHealth } from './proxy/analyticsProxy';
import { processVoiceCommand, getVoiceCommandSuggestions, checkVoiceHealth } from './proxy/voiceProxy';

/**
 * Unified backend proxy service facade
 * Delegates to individual proxy modules for each service domain
 */
export const backendProxyService = {
  // TTS
  synthesizeSpeech,
  getAvailableTTSVoices,
  checkTTSHealth,

  // Wake Word
  detectWakeWord,
  getAvailableWakeWordModels,
  checkWakeWordHealth,

  // Analytics
  trackEvent,
  trackBatchEvents,
  checkAnalyticsHealth,

  // Voice
  processVoiceCommand,
  getVoiceCommandSuggestions,
  checkVoiceHealth,
};
