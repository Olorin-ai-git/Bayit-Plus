/**
 * Voice Services Index - tvOS
 *
 * Centralized exports for all voice-related services
 * Provides clean imports for tvOS voice functionality
 *
 * Usage:
 * ```typescript
 * import {
 *   speechService,
 *   ttsService,
 *   voiceManager,
 *   backendProxyService,
 *   siriService,
 *   offlineCacheService,
 *   wakeWordService,
 *   secureStorageService,
 * } from '@/services';
 * ```
 */

// Core voice services
export { speechService } from './speech';
export type { SpeechRecognitionResult, SpeechPermissions } from './speech';

export { ttsService } from './tts';
export type { TTSOptions, Voice } from './tts';

export { voiceManager } from './voiceManager';
export type {
  VoiceStage,
  VoiceSessionMetrics,
  VoiceEventListener,
  VoiceManagerConfig,
} from './voiceManager';

// Backend integration
export { backendProxyService } from './backendProxyService';
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
} from './backendProxyService';

// Platform integrations
export { siriService } from './siri';

export { wakeWordService } from './wakeWord';
export type { WakeWordDetection } from './wakeWord';

// Storage and caching
export { offlineCacheService } from './offlineCacheService';

export { secureStorageService } from './secureStorageService';

/**
 * tvOS Voice Services Overview
 *
 * PRIMARY VOICE FLOW (Menu Button):
 * 1. User long-presses Menu button (500ms)
 * 2. voiceManager.startMenuButtonListening()
 * 3. speechService captures user command (45s timeout)
 * 4. backendProxyService.processVoiceCommand()
 * 5. ttsService speaks response (0.9x rate for TV)
 *
 * OPTIONAL VOICE FLOW (Wake Word):
 * 1. User says "Hey Bayit" (if enabled)
 * 2. wakeWordService detects wake word
 * 3. voiceManager transitions to listening
 * 4. (same as steps 3-5 above)
 *
 * SIRI INTEGRATION:
 * - siriService.donatePlayIntent() - Scene Search indexing
 * - siriService.updateTopShelf() - Featured content
 * - siriService.handleSceneSearchLaunch() - Deep linking
 *
 * OFFLINE SUPPORT:
 * - offlineCacheService - Persistent content caching
 * - secureStorageService - User preferences and credentials
 *
 * TV-SPECIFIC FEATURES:
 * - 45s speech timeout (vs 30s mobile)
 * - 0.9x TTS rate (vs 1.0x mobile)
 * - Focus-based visual feedback
 * - Multi-window voice commands
 * - Menu button primary trigger
 * - Wake word optional (user-configurable)
 */
