/**
 * Voice Manager Service
 *
 * Comprehensive voice orchestration system that coordinates:
 * - Wake word detection (always-on listening)
 * - Speech recognition (after wake word or manual trigger)
 * - Text-to-speech responses
 * - Background audio handling
 * - Timeout management
 * - Latency measurement
 * - State transitions
 *
 * ARCHITECTURE:
 * 1. Wake Word Detection → Listen for "Hey Bayit"
 * 2. Speech Recognition → Capture user command (with timeout)
 * 3. Olorin Orchestrator → Unified intent routing
 * 4. Text-to-Speech → Voice response feedback
 * 5. Resume Listening → Return to wake word detection
 *
 * UNIFIED VOICE SYSTEM:
 * Now integrates with OlorinVoiceOrchestrator for unified intent routing
 */

import { speechService } from './speech';
import { wakeWordService } from './wakeWord';
import { ttsService } from './tts';
import { backendProxyService } from './backendProxyService';
import { createVoiceOrchestrator, OlorinVoiceOrchestrator } from '@bayit/shared/services/olorinVoiceOrchestrator';
import { useSupportStore } from '@bayit/shared/stores/supportStore';

import logger from '@/utils/logger';


const moduleLogger = logger.scope('voiceManager');

/**
 * Voice command pipeline stages
 */
export type VoiceStage =
  | 'idle'              // Waiting for wake word
  | 'wake-word'         // Listening for wake word
  | 'detected'          // Wake word detected, preparing for speech recognition
  | 'listening'         // Actively recording speech
  | 'processing'        // Sending to backend for processing
  | 'responding'        // Playing text-to-speech response
  | 'error'             // Error occurred
  | 'timeout';          // Timeout waiting for speech

/**
 * Voice session metrics for latency measurement
 */
export interface VoiceSessionMetrics {
  wakeWordTime: number;        // Time from wake word detection to listening start
  listeningTime: number;       // Time listening for user speech
  processingTime: number;      // Time for backend API call
  ttsTime: number;             // Time for text-to-speech
  totalTime: number;           // Total end-to-end time
  transcription: string;       // User's spoken command
  confidence: number;          // Speech recognition confidence
  response: string;            // Voice response text
}

/**
 * Voice event listeners
 */
export type VoiceEventListener = (data: {
  stage: VoiceStage;
  metrics?: VoiceSessionMetrics;
  error?: string;
}) => void;

/**
 * Voice Manager Configuration
 */
export interface VoiceManagerConfig {
  listenTimeoutMs?: number;      // Max time to wait for user speech (default 30s)
  wakeWordTimeoutMs?: number;    // Max time to listen for wake word in background (default disabled)
  wakeWordLanguage?: string;     // Wake word language: 'he' | 'en' | 'es'
  speechLanguage?: string;       // Speech recognition language: 'he' | 'en' | 'es'
  ttsLanguage?: string;          // Text-to-speech language: 'he' | 'en' | 'es'
  ttsRate?: number;              // Speech rate for TTS (0.5 - 2.0)
  enableMetrics?: boolean;       // Track detailed metrics
  enableBackgroundListening?: boolean; // Always-on wake word detection
}

class VoiceManager {
  private currentStage: VoiceStage = 'idle';
  private config: Required<VoiceManagerConfig>;
  private eventListeners: VoiceEventListener[] = [];
  private listenTimeoutHandle: NodeJS.Timeout | null = null;
  private sessionMetrics: VoiceSessionMetrics | null = null;
  private sessionStartTime: number = 0;
  private isWakeWordListening: boolean = false;
  private orchestrator: OlorinVoiceOrchestrator | null = null;

  constructor(config: VoiceManagerConfig = {}) {
    this.config = {
      listenTimeoutMs: config.listenTimeoutMs ?? 30000, // 30 seconds
      wakeWordTimeoutMs: config.wakeWordTimeoutMs ?? 0,  // Disabled by default
      wakeWordLanguage: config.wakeWordLanguage ?? 'he',
      speechLanguage: config.speechLanguage ?? 'he',
      ttsLanguage: config.ttsLanguage ?? 'he',
      ttsRate: config.ttsRate ?? 1.0,
      enableMetrics: config.enableMetrics ?? true,
      enableBackgroundListening: config.enableBackgroundListening ?? false,
    };

    this._setupEventListeners();
    this._initializeOrchestrator();
  }

  /**
   * Initialize Olorin Voice Orchestrator
   */
  private async _initializeOrchestrator(): Promise<void> {
    try {
      const store = useSupportStore.getState();

      this.orchestrator = createVoiceOrchestrator({
        platform: 'ios', // Will be 'android' on Android devices
        language: this.config.speechLanguage,
        wakeWordEnabled: this.config.enableBackgroundListening,
        streamingMode: false,
        initialAvatarMode: store.avatarVisibilityMode,
        autoExpandOnWakeWord: true,
        collapseDelay: 10000,
      });

      await this.orchestrator.initialize();
      moduleLogger.debug('[VoiceManager] Orchestrator initialized');
    } catch (error) {
      moduleLogger.error('[VoiceManager] Failed to initialize orchestrator:', error);
    }
  }

  /**
   * Setup listeners for wake word and speech events
   */
  private _setupEventListeners(): void {
    // Wake word detection listener
    wakeWordService.addDetectionListener((detection) => {
      moduleLogger.debug('[VoiceManager] Wake word detected:', detection.wakeWord);
      this._onWakeWordDetected(detection);
    });

    // Speech recognition listeners
    speechService.addResultListener((result) => {
      moduleLogger.debug('[VoiceManager] Speech result:', result.transcription);
      this._onSpeechResult(result);
    });

    speechService.addErrorListener((error) => {
      moduleLogger.error('Speech error:', error);
      this._onSpeechError(error);
    });
  }

  /**
   * Start background wake word listening
   * Continuously listens for "Hey Bayit" to trigger voice commands
   */
  async startBackgroundListening(): Promise<void> {
    if (this.isWakeWordListening) {
      moduleLogger.debug('[VoiceManager] Already listening for wake word');
      return;
    }

    try {
      moduleLogger.debug('[VoiceManager] Starting background wake word detection');

      // Check and set language
      await wakeWordService.setLanguage(this.config.wakeWordLanguage);

      // Start listening
      await wakeWordService.startListening();
      this.isWakeWordListening = true;
      this._setStage('wake-word');

      // Set timeout for wake word listening if configured
      if (this.config.wakeWordTimeoutMs > 0) {
        this.listenTimeoutHandle = setTimeout(async () => {
          moduleLogger.warn('[VoiceManager] Wake word timeout, stopping background listening');
          await this.stopBackgroundListening();
          this._setStage('timeout');
        }, this.config.wakeWordTimeoutMs);
      }
    } catch (error) {
      moduleLogger.error('Failed to start background listening:', error);
      this._setStage('error', (error as Error).message);
      throw error;
    }
  }

  /**
   * Stop background wake word listening
   */
  async stopBackgroundListening(): Promise<void> {
    if (!this.isWakeWordListening) {
      return;
    }

    try {
      moduleLogger.debug('[VoiceManager] Stopping background wake word detection');
      await wakeWordService.stopListening();
      this.isWakeWordListening = false;

      // Clear any pending timeout
      if (this.listenTimeoutHandle) {
        clearTimeout(this.listenTimeoutHandle);
        this.listenTimeoutHandle = null;
      }

      this._setStage('idle');
    } catch (error) {
      moduleLogger.error('Failed to stop background listening:', error);
      throw error;
    }
  }

  /**
   * Manually start speech recognition (without waiting for wake word)
   * Used for voice search button or manual activation
   */
  async startManualListening(): Promise<void> {
    try {
      moduleLogger.debug('[VoiceManager] Starting manual speech recognition');

      // Stop background wake word listening first
      if (this.isWakeWordListening) {
        await this.stopBackgroundListening();
      }

      this._startSession();
      this._setStage('listening');

      // Set language
      await speechService.setLanguage(this.config.speechLanguage);

      // Start speech recognition
      await speechService.startRecognition();

      // Set timeout for listening
      this.listenTimeoutHandle = setTimeout(async () => {
        moduleLogger.warn('[VoiceManager] Speech listening timeout');
        await this.stopListening();
        this._setStage('timeout');
      }, this.config.listenTimeoutMs);
    } catch (error) {
      moduleLogger.error('Failed to start manual listening:', error);
      this._setStage('error', (error as Error).message);
      throw error;
    }
  }

  /**
   * Stop listening (stop speech recognition and clear timeouts)
   */
  async stopListening(): Promise<void> {
    try {
      moduleLogger.debug('[VoiceManager] Stopping speech recognition');

      // Stop speech recognition
      await speechService.stopRecognition();

      // Clear timeout
      if (this.listenTimeoutHandle) {
        clearTimeout(this.listenTimeoutHandle);
        this.listenTimeoutHandle = null;
      }

      // Return to wake word listening if enabled
      if (this.config.enableBackgroundListening) {
        await this.startBackgroundListening();
      } else {
        this._setStage('idle');
      }
    } catch (error) {
      moduleLogger.error('Failed to stop listening:', error);
      throw error;
    }
  }

  /**
   * Handle wake word detection - start speech recognition
   */
  private async _onWakeWordDetected(detection: any): Promise<void> {
    try {
      // Stop background wake word listening
      await this.stopBackgroundListening();

      // Notify orchestrator of wake word detection
      if (this.orchestrator) {
        await this.orchestrator.startListening('wake-word');
      }

      // Notify supportStore to trigger UI auto-expand
      const store = useSupportStore.getState();
      store.onWakeWordDetected();

      // Start metrics tracking
      this._startSession();
      if (this.config.enableMetrics && this.sessionMetrics) {
        this.sessionMetrics.wakeWordTime = Date.now() - this.sessionStartTime;
      }

      // Signal detected state
      this._setStage('detected');

      // Give user brief moment to speak after wake word
      await new Promise(resolve => setTimeout(resolve, 300));

      // Start speech recognition
      this._setStage('listening');
      await speechService.setLanguage(this.config.speechLanguage);
      await speechService.startRecognition();

      // Set timeout for speech listening
      this.listenTimeoutHandle = setTimeout(async () => {
        moduleLogger.warn('[VoiceManager] Speech timeout after wake word');
        await speechService.stopRecognition();
        this._setStage('timeout');
        await this.startBackgroundListening();
      }, this.config.listenTimeoutMs);
    } catch (error) {
      moduleLogger.error('Failed to handle wake word:', error);
      this._setStage('error', (error as Error).message);
      // Return to background listening
      await this.startBackgroundListening().catch((err) => moduleLogger.error("Background operation failed", err));
    }
  }

  /**
   * Handle speech recognition result
   */
  private async _onSpeechResult(result: any): Promise<void> {
    try {
      // Clear timeout
      if (this.listenTimeoutHandle) {
        clearTimeout(this.listenTimeoutHandle);
        this.listenTimeoutHandle = null;
      }

      // Only process final results
      if (!result.isFinal) {
        moduleLogger.debug('[VoiceManager] Interim result:', result.transcription);
        return;
      }

      moduleLogger.debug('[VoiceManager] Final result:', result.transcription);

      // Stop listening
      await speechService.stopRecognition();

      // Update metrics
      if (this.sessionMetrics) {
        this.sessionMetrics.transcription = result.transcription;
        this.sessionMetrics.confidence = result.confidence;
        this.sessionMetrics.listeningTime = Date.now() - this.sessionStartTime - (this.sessionMetrics.wakeWordTime || 0);
      }

      // Start processing
      this._setStage('processing');

      // Process through Olorin Orchestrator (unified voice system)
      const processingStartTime = Date.now();
      try {
        let response;

        if (this.orchestrator) {
          // Use unified orchestrator for intent routing
          const orchestratorResponse = await this.orchestrator.processTranscript(
            result.transcription,
            undefined // conversation_id will be managed by orchestrator
          );

          // Convert orchestrator response to voice response format
          response = {
            responseText: orchestratorResponse.spokenResponse,
            intent: orchestratorResponse.intent,
            confidence: orchestratorResponse.confidence,
          };

          moduleLogger.debug('[VoiceManager] Orchestrator response:', {
            intent: response.intent,
            confidence: response.confidence,
          });
        } else {
          // Fallback to legacy backend proxy (should rarely happen)
          moduleLogger.warn('[VoiceManager] Orchestrator not available, using legacy proxy');
          response = await backendProxyService.processVoiceCommand({
            transcription: result.transcription,
            confidence: result.confidence,
            language: this.config.speechLanguage,
          });
        }

        if (this.sessionMetrics) {
          this.sessionMetrics.processingTime = Date.now() - processingStartTime;
        }

        // Play response as speech
        if (response.responseText) {
          await this._playVoiceResponse(response.responseText);
        }

        // Return to background listening
        if (this.config.enableBackgroundListening) {
          await this.startBackgroundListening();
        } else {
          this._setStage('idle');
        }
      } catch (apiError) {
        moduleLogger.error('API processing failed:', apiError);
        this._setStage('error', (apiError as Error).message);
        // Try to return to background listening
        if (this.config.enableBackgroundListening) {
          await this.startBackgroundListening().catch((err) => moduleLogger.error("Background operation failed", err));
        }
      }
    } catch (error) {
      moduleLogger.error('Failed to handle speech result:', error);
      this._setStage('error', (error as Error).message);
    }
  }

  /**
   * Handle speech recognition error
   */
  private async _onSpeechError(error: any): Promise<void> {
    moduleLogger.error('Speech recognition error:', error);

    // Clear timeout
    if (this.listenTimeoutHandle) {
      clearTimeout(this.listenTimeoutHandle);
      this.listenTimeoutHandle = null;
    }

    // Try to stop recognition gracefully
    try {
      await speechService.stopRecognition();
    } catch (e) {
      moduleLogger.error('Error stopping recognition after error:', e);
    }

    // Signal error state
    this._setStage('error', error.error || 'Unknown error');

    // Return to background listening or idle
    if (this.config.enableBackgroundListening) {
      await this.startBackgroundListening().catch((err) => moduleLogger.error("Background operation failed", err));
    } else {
      this._setStage('idle');
    }
  }

  /**
   * Play voice response using TTS
   */
  private async _playVoiceResponse(text: string): Promise<void> {
    try {
      this._setStage('responding');

      const ttsStartTime = Date.now();

      // Set TTS language and rate
      ttsService.setLanguage(this.config.ttsLanguage);
      ttsService.setRate(this.config.ttsRate);

      // Speak response
      await ttsService.speak(text, {
        language: this.config.ttsLanguage,
        rate: this.config.ttsRate,
      });

      if (this.sessionMetrics) {
        this.sessionMetrics.response = text;
        this.sessionMetrics.ttsTime = Date.now() - ttsStartTime;
        this.sessionMetrics.totalTime = Date.now() - this.sessionStartTime;
      }

      // Log metrics if enabled
      if (this.config.enableMetrics && this.sessionMetrics) {
        moduleLogger.info('Session metrics', { totalDuration, listenDuration, processingDuration, avgConfidence });
      }
    } catch (error) {
      moduleLogger.error('Failed to play voice response:', error);
      // Don't treat TTS error as critical failure
    }
  }

  /**
   * Initialize new session metrics
   */
  private _startSession(): void {
    this.sessionStartTime = Date.now();
    this.sessionMetrics = {
      wakeWordTime: 0,
      listeningTime: 0,
      processingTime: 0,
      ttsTime: 0,
      totalTime: 0,
      transcription: '',
      confidence: 0,
      response: '',
    };
  }

  /**
   * Set current stage and notify listeners
   */
  private _setStage(stage: VoiceStage, errorMessage?: string): void {
    this.currentStage = stage;

    const eventData: Parameters<VoiceEventListener>[0] = {
      stage,
      metrics: this.sessionMetrics || undefined,
    };

    if (errorMessage) {
      eventData.error = errorMessage;
    }

    // Notify all listeners
    this.eventListeners.forEach(listener => {
      try {
        listener(eventData);
      } catch (error) {
        moduleLogger.error('Error in event listener:', error);
      }
    });
  }

  /**
   * Add event listener
   */
  addEventListener(listener: VoiceEventListener): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: VoiceEventListener): void {
    this.eventListeners = this.eventListeners.filter(l => l !== listener);
  }

  /**
   * Get current stage
   */
  getStage(): VoiceStage {
    return this.currentStage;
  }

  /**
   * Get current metrics
   */
  getMetrics(): VoiceSessionMetrics | null {
    return this.sessionMetrics;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<VoiceManagerConfig>): void {
    this.config = { ...this.config, ...config };
    moduleLogger.debug('[VoiceManager] Configuration updated:', this.config);
  }

  /**
   * Check if listening (wake word or speech)
   */
  isListening(): boolean {
    return this.currentStage === 'listening' || this.currentStage === 'detected' || this.currentStage === 'wake-word';
  }

  /**
   * Check if processing
   */
  isProcessing(): boolean {
    return this.currentStage === 'processing' || this.currentStage === 'responding';
  }

  /**
   * Cleanup and stop all voice operations
   */
  async cleanup(): Promise<void> {
    try {
      moduleLogger.debug('[VoiceManager] Cleaning up voice resources');

      // Clear timeout
      if (this.listenTimeoutHandle) {
        clearTimeout(this.listenTimeoutHandle);
        this.listenTimeoutHandle = null;
      }

      // Stop speech recognition
      try {
        await speechService.stopRecognition();
      } catch (e) {
        moduleLogger.error('Error stopping speech recognition:', e);
      }

      // Stop wake word listening
      try {
        await wakeWordService.stopListening();
      } catch (e) {
        moduleLogger.error('Error stopping wake word listening:', e);
      }

      // Stop TTS
      try {
        await ttsService.stop();
      } catch (e) {
        moduleLogger.error('Error stopping TTS:', e);
      }

      this._setStage('idle');
      this.isWakeWordListening = false;
    } catch (error) {
      moduleLogger.error('Error during cleanup:', error);
    }
  }
}

// Export singleton instance
export const voiceManager = new VoiceManager({
  listenTimeoutMs: 30000,        // 30 seconds to wait for speech
  wakeWordLanguage: 'he',        // Hebrew wake word
  speechLanguage: 'he',          // Hebrew speech recognition
  ttsLanguage: 'he',             // Hebrew text-to-speech
  enableMetrics: true,            // Track performance metrics
  enableBackgroundListening: true, // Always-on wake word detection
});

export type { VoiceSessionMetrics, VoiceEventListener, VoiceManagerConfig };
