/**
 * Voice Manager Service (tvOS)
 *
 * Comprehensive voice orchestration system for tvOS that coordinates:
 * - Menu button long-press detection (primary trigger)
 * - Wake word detection (optional, user-configurable)
 * - Speech recognition (tvOS Speech Framework)
 * - Text-to-speech responses (AVSpeechSynthesizer)
 * - Background audio handling (ducking)
 * - Timeout management (45s for TV, not 30s)
 * - Latency measurement
 * - State transitions
 *
 * tvOS-SPECIFIC ARCHITECTURE:
 * 1. PRIMARY TRIGGER: Menu button long-press (500ms) - native, always available
 * 2. OPTIONAL TRIGGER: Wake word "Hey Bayit" - user-configurable enhancement
 * 3. Olorin Orchestrator → Unified intent routing
 * 4. Text-to-Speech → Voice response feedback (0.9x rate for TV clarity)
 * 5. Resume Listening → Return to idle or wake word detection
 *
 * TV-OPTIMIZED VOICE FLOW:
 * - Longer timeouts (45s vs 30s mobile) for 10-foot speaking distance
 * - Slower TTS rate (0.9x vs 1.0x) for TV clarity
 * - Focus-based visual feedback during listening
 * - Multi-window voice commands ("switch to window 2")
 *
 * UNIFIED VOICE SYSTEM:
 * Now integrates with OlorinVoiceOrchestrator for unified intent routing
 */

import { speechService } from './speech';
import { wakeWordService } from './wakeWord';
import { ttsService } from './tts';
import { backendProxyService } from './backendProxyService';
import { config } from '../config/appConfig';
import { createVoiceOrchestrator, OlorinVoiceOrchestrator } from '@bayit/shared/services/olorinVoiceOrchestrator';
import { useSupportStore } from '@bayit/shared/stores/supportStore';

/**
 * Voice command pipeline stages
 */
export type VoiceStage =
  | 'idle'              // Waiting for trigger (Menu button or wake word)
  | 'wake-word'         // Listening for wake word (optional)
  | 'detected'          // Trigger detected, preparing for speech recognition
  | 'listening'         // Actively recording speech
  | 'processing'        // Sending to backend for processing
  | 'responding'        // Playing text-to-speech response
  | 'error'             // Error occurred
  | 'timeout';          // Timeout waiting for speech

/**
 * Voice session metrics for latency measurement
 */
export interface VoiceSessionMetrics {
  triggerTime: number;             // Time from trigger (Menu button or wake word) to listening start
  listeningTime: number;           // Time listening for user speech
  processingTime: number;          // Time for backend API call
  ttsTime: number;                 // Time for text-to-speech
  totalTime: number;               // Total end-to-end time
  transcription: string;           // User's spoken command
  confidence: number;              // Speech recognition confidence
  response: string;                // Voice response text
  triggerType: 'menu-button' | 'wake-word'; // How voice was triggered
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
 * Voice Manager Configuration (tvOS)
 */
export interface VoiceManagerConfig {
  listenTimeoutMs?: number;      // Max time to wait for user speech (default 45s for TV, not 30s)
  wakeWordTimeoutMs?: number;    // Max time to listen for wake word in background (default disabled)
  wakeWordLanguage?: string;     // Wake word language: 'he' | 'en' | 'es'
  speechLanguage?: string;       // Speech recognition language: 'he' | 'en' | 'es'
  ttsLanguage?: string;          // Text-to-speech language: 'he' | 'en' | 'es'
  ttsRate?: number;              // Speech rate for TTS (0.9 for TV clarity, not 1.0)
  enableMetrics?: boolean;       // Track detailed metrics
  enableBackgroundListening?: boolean; // Always-on wake word detection (optional on TV)
  triggerType?: 'menu-button' | 'wake-word' | 'both'; // Voice activation method
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

  constructor(voiceConfig: VoiceManagerConfig = {}) {
    // tvOS-specific defaults from appConfig
    this.config = {
      listenTimeoutMs: voiceConfig.listenTimeoutMs ?? config.voice.listenTimeoutMs, // 45s for TV
      wakeWordTimeoutMs: voiceConfig.wakeWordTimeoutMs ?? 0,  // Disabled by default
      wakeWordLanguage: voiceConfig.wakeWordLanguage ?? config.voice.defaultLanguage,
      speechLanguage: voiceConfig.speechLanguage ?? config.voice.speechLanguage,
      ttsLanguage: voiceConfig.ttsLanguage ?? config.voice.ttsLanguage,
      ttsRate: voiceConfig.ttsRate ?? config.voice.ttsRate, // 0.9 for TV clarity
      enableMetrics: voiceConfig.enableMetrics ?? true,
      enableBackgroundListening: voiceConfig.enableBackgroundListening ?? config.voice.alwaysOnListening,
      triggerType: voiceConfig.triggerType ?? config.tv.voiceTrigger,
    };

    this._setupEventListeners();
    this._initializeOrchestrator();
  }

  /**
   * Initialize Olorin Voice Orchestrator (tvOS)
   */
  private async _initializeOrchestrator(): Promise<void> {
    try {
      const store = useSupportStore.getState();

      this.orchestrator = createVoiceOrchestrator({
        platform: 'tvos',
        language: this.config.speechLanguage,
        wakeWordEnabled: this.config.enableBackgroundListening,
        streamingMode: false,
        initialAvatarMode: store.avatarVisibilityMode,
        autoExpandOnWakeWord: true,
        collapseDelay: 10000,
      });

      await this.orchestrator.initialize();
      console.log('[VoiceManager] Orchestrator initialized (tvOS)');
    } catch (error) {
      console.error('[VoiceManager] Failed to initialize orchestrator:', error);
    }
  }

  /**
   * Setup listeners for wake word and speech events
   */
  private _setupEventListeners(): void {
    // Wake word detection listener (optional on tvOS)
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
   * Start background wake word listening (optional on tvOS)
   * Continuously listens for "Hey Bayit" to trigger voice commands
   * NOTE: Menu button long-press is the primary trigger method on tvOS
   */
  async startBackgroundListening(): Promise<void> {
    if (this.isWakeWordListening) {
      console.log('[VoiceManager] Already listening for wake word');
      return;
    }

    try {
      console.log('[VoiceManager] Starting background wake word detection (optional on tvOS)');

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
   * Start speech recognition triggered by Menu button long-press
   * PRIMARY VOICE ACTIVATION METHOD on tvOS
   * Used for Menu button long-press (500ms) trigger
   */
  async startMenuButtonListening(): Promise<void> {
    try {
      console.log('[VoiceManager] Starting speech recognition via Menu button (TV primary method)');

      // Notify orchestrator of manual activation
      if (this.orchestrator) {
        await this.orchestrator.startListening('manual');
      }

      // Notify supportStore to open voice modal
      const store = useSupportStore.getState();
      store.openVoiceModal();

      // Stop background wake word listening first
      if (this.isWakeWordListening) {
        await this.stopBackgroundListening();
      }

      this._startSession('menu-button');
      this._setStage('listening');

      // Set language
      await speechService.setLanguage(this.config.speechLanguage);

      // Start speech recognition
      await speechService.startRecognition();

      // Set timeout for listening (45s for TV, not 30s)
      this.listenTimeoutHandle = setTimeout(async () => {
        console.warn('[VoiceManager] Speech listening timeout (45s for TV)');
        await this.stopListening();
        this._setStage('timeout');
      }, this.config.listenTimeoutMs);
    } catch (error) {
      console.error('[VoiceManager] Failed to start Menu button listening:', error);
      this._setStage('error', (error as Error).message);
      throw error;
    }
  }

  /**
   * Manually start speech recognition (without waiting for trigger)
   * Used for voice search button or manual activation
   * Alias for Menu button activation (TV primary method)
   */
  async startManualListening(): Promise<void> {
    return this.startMenuButtonListening();
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

      // Return to wake word listening if enabled, otherwise idle
      if (this.config.enableBackgroundListening && this.config.triggerType !== 'menu-button') {
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
   * OPTIONAL TRIGGER on tvOS (Menu button is primary)
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
      this._startSession('wake-word');
      if (this.config.enableMetrics && this.sessionMetrics) {
        this.sessionMetrics.triggerTime = Date.now() - this.sessionStartTime;
      }

      // Signal detected state
      this._setStage('detected');

      // Give user brief moment to speak after wake word
      await new Promise(resolve => setTimeout(resolve, 300));

      // Start speech recognition
      this._setStage('listening');
      await speechService.setLanguage(this.config.speechLanguage);
      await speechService.startRecognition();

      // Set timeout for speech listening (45s for TV)
      this.listenTimeoutHandle = setTimeout(async () => {
        console.warn('[VoiceManager] Speech timeout after wake word (45s for TV)');
        await speechService.stopRecognition();
        this._setStage('timeout');
        await this.startBackgroundListening();
      }, this.config.listenTimeoutMs);
    } catch (error) {
      console.error('[VoiceManager] Failed to handle wake word:', error);
      this._setStage('error', (error as Error).message);
      // Return to background listening
      await this.startBackgroundListening().catch((err) => console.error('[VoiceManager] Background operation failed', err));
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
        this.sessionMetrics.listeningTime = Date.now() - this.sessionStartTime - (this.sessionMetrics.triggerTime || 0);
      }

      // Start processing
      this._setStage('processing');

      // Send to orchestrator or backend proxy for processing
      const processingStartTime = Date.now();
      try {
        let response: { responseText?: string; intent?: string; confidence?: number };

        if (this.orchestrator) {
          // Use unified orchestrator for intent routing
          const orchestratorResponse = await this.orchestrator.processTranscript(
            result.transcription,
            undefined // conversation ID handled internally
          );

          response = {
            responseText: orchestratorResponse.spokenResponse,
            intent: orchestratorResponse.intent,
            confidence: orchestratorResponse.confidence,
          };
        } else {
          // Fallback to legacy backend proxy
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

        // Return to background listening or idle
        if (this.config.enableBackgroundListening && this.config.triggerType !== 'menu-button') {
          await this.startBackgroundListening();
        } else {
          this._setStage('idle');
        }
      } catch (apiError) {
        console.error('[VoiceManager] API processing failed:', apiError);
        this._setStage('error', (apiError as Error).message);
        // Try to return to background listening
        if (this.config.enableBackgroundListening && this.config.triggerType !== 'menu-button') {
          await this.startBackgroundListening().catch((err) => console.error('[VoiceManager] Background operation failed', err));
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
    if (this.config.enableBackgroundListening && this.config.triggerType !== 'menu-button') {
      await this.startBackgroundListening().catch((err) => console.error('[VoiceManager] Background operation failed', err));
    } else {
      this._setStage('idle');
    }
  }

  /**
   * Play voice response using TTS (tvOS-optimized)
   * 0.9x rate for TV clarity (not 1.0x)
   */
  private async _playVoiceResponse(text: string): Promise<void> {
    try {
      this._setStage('responding');

      const ttsStartTime = Date.now();

      // Set TTS language and rate (0.9 for TV clarity)
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
        console.log('[VoiceManager] Session metrics (TV):', {
          triggerType: this.sessionMetrics.triggerType,
          totalTime: this.sessionMetrics.totalTime,
          listeningTime: this.sessionMetrics.listeningTime,
          processingTime: this.sessionMetrics.processingTime,
          ttsTime: this.sessionMetrics.ttsTime,
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
  private _startSession(triggerType: 'menu-button' | 'wake-word' = 'menu-button'): void {
    this.sessionStartTime = Date.now();
    this.sessionMetrics = {
      triggerTime: 0,
      listeningTime: 0,
      processingTime: 0,
      ttsTime: 0,
      totalTime: 0,
      transcription: '',
      confidence: 0,
      response: '',
      triggerType,
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
  updateConfig(voiceConfig: Partial<VoiceManagerConfig>): void {
    this.config = { ...this.config, ...voiceConfig };
    console.log('[VoiceManager] Configuration updated (TV):', this.config);
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
      console.log('[VoiceManager] Cleaning up voice resources (TV)');

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

// Export singleton instance with tvOS-specific defaults
export const voiceManager = new VoiceManager({
  listenTimeoutMs: config.voice.listenTimeoutMs,        // 45s for TV (not 30s)
  wakeWordLanguage: config.voice.defaultLanguage,       // Hebrew
  speechLanguage: config.voice.speechLanguage,          // Hebrew
  ttsLanguage: config.voice.ttsLanguage,                // Hebrew
  ttsRate: config.voice.ttsRate,                        // 0.9 for TV clarity
  enableMetrics: true,                                   // Track performance metrics
  enableBackgroundListening: config.voice.alwaysOnListening, // User-configurable
  triggerType: config.tv.voiceTrigger,                  // Menu button primary
});

export type { VoiceSessionMetrics, VoiceEventListener, VoiceManagerConfig };
