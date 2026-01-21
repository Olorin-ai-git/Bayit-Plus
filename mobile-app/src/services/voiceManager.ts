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
 * 3. API Processing → Send command to backend
 * 4. Text-to-Speech → Voice response feedback
 * 5. Resume Listening → Return to wake word detection
 */

import { speechService } from './speech';
import { wakeWordService } from './wakeWord';
import { ttsService } from './tts';
import { backendProxyService } from './backendProxyService';

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
  }

  /**
   * Setup listeners for wake word and speech events
   */
  private _setupEventListeners(): void {
    // Wake word detection listener
    wakeWordService.addDetectionListener((detection) => {
      console.log('[VoiceManager] Wake word detected:', detection.wakeWord);
      this._onWakeWordDetected(detection);
    });

    // Speech recognition listeners
    speechService.addResultListener((result) => {
      console.log('[VoiceManager] Speech result:', result.transcription);
      this._onSpeechResult(result);
    });

    speechService.addErrorListener((error) => {
      console.error('[VoiceManager] Speech error:', error);
      this._onSpeechError(error);
    });
  }

  /**
   * Start background wake word listening
   * Continuously listens for "Hey Bayit" to trigger voice commands
   */
  async startBackgroundListening(): Promise<void> {
    if (this.isWakeWordListening) {
      console.log('[VoiceManager] Already listening for wake word');
      return;
    }

    try {
      console.log('[VoiceManager] Starting background wake word detection');

      // Check and set language
      await wakeWordService.setLanguage(this.config.wakeWordLanguage);

      // Start listening
      await wakeWordService.startListening();
      this.isWakeWordListening = true;
      this._setStage('wake-word');

      // Set timeout for wake word listening if configured
      if (this.config.wakeWordTimeoutMs > 0) {
        this.listenTimeoutHandle = setTimeout(async () => {
          console.warn('[VoiceManager] Wake word timeout, stopping background listening');
          await this.stopBackgroundListening();
          this._setStage('timeout');
        }, this.config.wakeWordTimeoutMs);
      }
    } catch (error) {
      console.error('[VoiceManager] Failed to start background listening:', error);
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
      console.log('[VoiceManager] Stopping background wake word detection');
      await wakeWordService.stopListening();
      this.isWakeWordListening = false;

      // Clear any pending timeout
      if (this.listenTimeoutHandle) {
        clearTimeout(this.listenTimeoutHandle);
        this.listenTimeoutHandle = null;
      }

      this._setStage('idle');
    } catch (error) {
      console.error('[VoiceManager] Failed to stop background listening:', error);
      throw error;
    }
  }

  /**
   * Manually start speech recognition (without waiting for wake word)
   * Used for voice search button or manual activation
   */
  async startManualListening(): Promise<void> {
    try {
      console.log('[VoiceManager] Starting manual speech recognition');

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
        console.warn('[VoiceManager] Speech listening timeout');
        await this.stopListening();
        this._setStage('timeout');
      }, this.config.listenTimeoutMs);
    } catch (error) {
      console.error('[VoiceManager] Failed to start manual listening:', error);
      this._setStage('error', (error as Error).message);
      throw error;
    }
  }

  /**
   * Stop listening (stop speech recognition and clear timeouts)
   */
  async stopListening(): Promise<void> {
    try {
      console.log('[VoiceManager] Stopping speech recognition');

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
      console.error('[VoiceManager] Failed to stop listening:', error);
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
        console.warn('[VoiceManager] Speech timeout after wake word');
        await speechService.stopRecognition();
        this._setStage('timeout');
        await this.startBackgroundListening();
      }, this.config.listenTimeoutMs);
    } catch (error) {
      console.error('[VoiceManager] Failed to handle wake word:', error);
      this._setStage('error', (error as Error).message);
      // Return to background listening
      await this.startBackgroundListening().catch(console.error);
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
        console.log('[VoiceManager] Interim result:', result.transcription);
        return;
      }

      console.log('[VoiceManager] Final result:', result.transcription);

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

      // Send to backend proxy for processing
      const processingStartTime = Date.now();
      try {
        const response = await backendProxyService.processVoiceCommand({
          transcription: result.transcription,
          confidence: result.confidence,
          language: this.config.speechLanguage,
        });

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
        console.error('[VoiceManager] API processing failed:', apiError);
        this._setStage('error', (apiError as Error).message);
        // Try to return to background listening
        if (this.config.enableBackgroundListening) {
          await this.startBackgroundListening().catch(console.error);
        }
      }
    } catch (error) {
      console.error('[VoiceManager] Failed to handle speech result:', error);
      this._setStage('error', (error as Error).message);
    }
  }

  /**
   * Handle speech recognition error
   */
  private async _onSpeechError(error: any): Promise<void> {
    console.error('[VoiceManager] Speech recognition error:', error);

    // Clear timeout
    if (this.listenTimeoutHandle) {
      clearTimeout(this.listenTimeoutHandle);
      this.listenTimeoutHandle = null;
    }

    // Try to stop recognition gracefully
    try {
      await speechService.stopRecognition();
    } catch (e) {
      console.error('[VoiceManager] Error stopping recognition after error:', e);
    }

    // Signal error state
    this._setStage('error', error.error || 'Unknown error');

    // Return to background listening or idle
    if (this.config.enableBackgroundListening) {
      await this.startBackgroundListening().catch(console.error);
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
        console.log('[VoiceManager] Session metrics:', {
          wakeWordTime: this.sessionMetrics.wakeWordTime,
          listeningTime: this.sessionMetrics.listeningTime,
          processingTime: this.sessionMetrics.processingTime,
          ttsTime: this.sessionMetrics.ttsTime,
          totalTime: this.sessionMetrics.totalTime,
          confidence: this.sessionMetrics.confidence,
        });
      }
    } catch (error) {
      console.error('[VoiceManager] Failed to play voice response:', error);
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
        console.error('[VoiceManager] Error in event listener:', error);
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
    console.log('[VoiceManager] Configuration updated:', this.config);
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
      console.log('[VoiceManager] Cleaning up voice resources');

      // Clear timeout
      if (this.listenTimeoutHandle) {
        clearTimeout(this.listenTimeoutHandle);
        this.listenTimeoutHandle = null;
      }

      // Stop speech recognition
      try {
        await speechService.stopRecognition();
      } catch (e) {
        console.error('[VoiceManager] Error stopping speech recognition:', e);
      }

      // Stop wake word listening
      try {
        await wakeWordService.stopListening();
      } catch (e) {
        console.error('[VoiceManager] Error stopping wake word listening:', e);
      }

      // Stop TTS
      try {
        await ttsService.stop();
      } catch (e) {
        console.error('[VoiceManager] Error stopping TTS:', e);
      }

      this._setStage('idle');
      this.isWakeWordListening = false;
    } catch (error) {
      console.error('[VoiceManager] Error during cleanup:', error);
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
