/**
 * Offscreen Document Main Logic
 *
 * Coordinates:
 * - Tab audio capture (chrome.tabCapture)
 * - AudioWorklet processing (PCM encoding)
 * - WebSocket connection (direct to backend)
 * - Dubbed audio playback
 * - Volume mixing
 *
 * This document stays alive during dubbing sessions (unlike service worker)
 */

import { createLogger, generateCorrelationId } from '@/lib/logger';
import { CONFIG } from '@/config/constants';
import { AudioWorkletManager } from './audio-worklet-node';
import { WebSocketManager } from './websocket-manager';
import { AudioPlayer } from './audio-player';
import { VolumeMixer } from './volume-mixer';

const logger = createLogger('Offscreen');

interface DubbingSession {
  sessionId: string;
  tabId: number;
  targetLanguage: string;
  voiceId?: string;
}

class OffscreenManager {
  private audioWorklet: AudioWorkletManager | null = null;
  private websocket: WebSocketManager | null = null;
  private audioPlayer: AudioPlayer | null = null;
  private volumeMixer: VolumeMixer | null = null;
  private currentSession: DubbingSession | null = null;
  private mediaStream: MediaStream | null = null;
  private correlationId: string | null = null;

  constructor() {
    logger.info('Offscreen document loaded');
    this.initialize();
  }

  /**
   * Initialize offscreen manager
   */
  private async initialize(): Promise<void> {
    try {
      // Listen for messages from service worker and content script
      chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));

      // Load runtime configuration
      const { loadRuntimeConfig } = await import('@/config/constants');
      await loadRuntimeConfig();

      // Initialize volume mixer
      this.volumeMixer = new VolumeMixer();
      await this.volumeMixer.loadSettings();

      logger.info('Offscreen manager initialized');
    } catch (error) {
      logger.error('Failed to initialize offscreen manager', { error: String(error) });
    }
  }

  /**
   * Handle messages from other extension contexts
   */
  private handleMessage(
    message: Record<string, unknown>,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ): boolean {
    logger.debug('Message received', { type: message.type });

    switch (message.type) {
      case 'START_DUBBING':
        this.handleStartDubbing(message as StartDubbingMessage)
          .then(sendResponse)
          .catch((error) => sendResponse({ error: String(error) }));
        return true; // Async response

      case 'STOP_DUBBING':
        this.handleStopDubbing()
          .then(sendResponse)
          .catch((error) => sendResponse({ error: String(error) }));
        return true; // Async response

      case 'SET_VOLUME':
        this.handleSetVolume(message as SetVolumeMessage);
        sendResponse({ success: true });
        break;

      case 'APPLY_VOLUME_PRESET':
        this.handleApplyVolumePreset(message as ApplyVolumePresetMessage);
        sendResponse({ success: true });
        break;

      case 'GET_STATUS':
        sendResponse(this.getStatus());
        break;

      default:
        logger.warn('Unknown message type', { type: message.type });
        sendResponse({ error: 'Unknown message type' });
    }

    return false;
  }

  /**
   * Start dubbing session
   */
  private async handleStartDubbing(message: StartDubbingMessage): Promise<Record<string, unknown>> {
    try {
      logger.info('Starting dubbing session', {
        sessionId: message.sessionId,
        tabId: message.tabId,
        targetLanguage: message.targetLanguage,
      });

      // Generate correlation ID for this session
      this.correlationId = generateCorrelationId();
      logger.setCorrelationId(this.correlationId);

      // Store session info
      this.currentSession = {
        sessionId: message.sessionId,
        tabId: message.tabId,
        targetLanguage: message.targetLanguage,
        voiceId: message.voiceId,
      };

      // Step 1: Capture tab audio
      await this.captureTabAudio(message.tabId);

      // Step 2: Initialize audio player
      await this.initializeAudioPlayer();

      // Step 3: Initialize volume mixer
      this.initializeVolumeMixer();

      // Step 4: Initialize WebSocket connection
      await this.initializeWebSocket(message.sessionId, message.token);

      // Step 5: Start audio processing
      await this.startAudioProcessing();

      logger.info('Dubbing session started successfully', {
        sessionId: message.sessionId,
      });

      return {
        success: true,
        sessionId: message.sessionId,
      };
    } catch (error) {
      logger.error('Failed to start dubbing session', { error: String(error) });
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Capture audio from browser tab
   */
  private async captureTabAudio(tabId: number): Promise<void> {
    try {
      logger.info('Capturing tab audio', { tabId });

      // Request tab audio stream
      this.mediaStream = await new Promise<MediaStream>((resolve, reject) => {
        chrome.tabCapture.capture(
          {
            audio: true,
            video: false,
          },
          (stream) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else if (!stream) {
              reject(new Error('Failed to capture audio stream'));
            } else {
              resolve(stream);
            }
          }
        );
      });

      logger.info('Tab audio captured successfully', {
        audioTracks: this.mediaStream.getAudioTracks().length,
      });
    } catch (error) {
      logger.error('Failed to capture tab audio', { error: String(error) });
      throw error;
    }
  }

  /**
   * Initialize audio player
   */
  private async initializeAudioPlayer(): Promise<void> {
    try {
      logger.info('Initializing audio player');

      this.audioPlayer = new AudioPlayer();
      await this.audioPlayer.initialize(CONFIG.AUDIO.SAMPLE_RATE);

      logger.info('Audio player initialized');
    } catch (error) {
      logger.error('Failed to initialize audio player', { error: String(error) });
      throw error;
    }
  }

  /**
   * Initialize volume mixer
   */
  private initializeVolumeMixer(): void {
    if (!this.volumeMixer || !this.audioPlayer) {
      throw new Error('Volume mixer or audio player not initialized');
    }

    this.volumeMixer.initialize(
      (volume) => {
        // Original audio volume control
        // Note: Original audio volume is controlled by muting/unmuting the video element
        // This is handled by the content script
        logger.debug('Original volume changed', { volume });
      },
      (volume) => {
        // Dubbed audio volume control
        if (this.audioPlayer) {
          this.audioPlayer.setVolume(volume);
        }
      }
    );

    logger.info('Volume mixer initialized');
  }

  /**
   * Initialize WebSocket connection
   */
  private async initializeWebSocket(sessionId: string, token: string): Promise<void> {
    try {
      logger.info('Initializing WebSocket connection', { sessionId });

      this.websocket = new WebSocketManager({
        sessionId,
        token,
        onAudioReceived: this.handleDubbedAudio.bind(this),
        onTranscriptReceived: this.handleTranscript.bind(this),
        onError: this.handleWebSocketError.bind(this),
        onStatusChange: this.handleWebSocketStatusChange.bind(this),
      });

      await this.websocket.connect();

      logger.info('WebSocket connection established');
    } catch (error) {
      logger.error('Failed to initialize WebSocket', { error: String(error) });
      throw error;
    }
  }

  /**
   * Start audio processing with AudioWorklet
   */
  private async startAudioProcessing(): Promise<void> {
    if (!this.mediaStream) {
      throw new Error('Media stream not available');
    }

    try {
      logger.info('Starting audio processing');

      this.audioWorklet = new AudioWorkletManager();
      await this.audioWorklet.initialize(this.mediaStream, this.handleAudioData.bind(this));

      logger.info('Audio processing started');
    } catch (error) {
      logger.error('Failed to start audio processing', { error: String(error) });
      throw error;
    }
  }

  /**
   * Handle audio data from AudioWorklet (PCM)
   */
  private handleAudioData(pcmData: Int16Array): void {
    if (!this.websocket || !this.websocket.isConnected()) {
      logger.debug('WebSocket not connected, skipping audio data');
      return;
    }

    // Send PCM data to backend
    this.websocket.sendAudio(pcmData);
  }

  /**
   * Handle dubbed audio from backend
   */
  private handleDubbedAudio(base64Audio: string): void {
    if (!this.audioPlayer) {
      logger.error('Audio player not initialized');
      return;
    }

    try {
      // Play dubbed audio
      this.audioPlayer.playBase64Audio(base64Audio);
    } catch (error) {
      logger.error('Failed to play dubbed audio', { error: String(error) });
    }
  }

  /**
   * Handle transcript from backend
   */
  private handleTranscript(transcript: string): void {
    logger.debug('Transcript received', { transcript });

    // Broadcast transcript to content script for display
    if (this.currentSession) {
      chrome.tabs.sendMessage(this.currentSession.tabId, {
        type: 'TRANSCRIPT_RECEIVED',
        transcript,
      }).catch(() => {
        // Ignore errors (content script may not be active)
      });
    }
  }

  /**
   * Handle WebSocket error
   */
  private handleWebSocketError(error: Error): void {
    logger.error('WebSocket error', { error: error.message });

    // Notify content script
    if (this.currentSession) {
      chrome.tabs.sendMessage(this.currentSession.tabId, {
        type: 'DUBBING_ERROR',
        error: error.message,
      }).catch(() => {
        // Ignore errors
      });
    }
  }

  /**
   * Handle WebSocket status change
   */
  private handleWebSocketStatusChange(
    status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting'
  ): void {
    logger.info('WebSocket status changed', { status });

    // Update UI status display
    const statusElement = document.getElementById('status-text');
    if (statusElement) {
      statusElement.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    }

    // Notify content script
    if (this.currentSession) {
      chrome.tabs.sendMessage(this.currentSession.tabId, {
        type: 'CONNECTION_STATUS_CHANGED',
        status,
      }).catch(() => {
        // Ignore errors
      });
    }
  }

  /**
   * Stop dubbing session
   */
  private async handleStopDubbing(): Promise<Record<string, unknown>> {
    try {
      logger.info('Stopping dubbing session');

      await this.cleanup();

      logger.info('Dubbing session stopped successfully');

      return { success: true };
    } catch (error) {
      logger.error('Failed to stop dubbing session', { error: String(error) });
      throw error;
    }
  }

  /**
   * Set volume levels
   */
  private handleSetVolume(message: SetVolumeMessage): void {
    if (!this.volumeMixer) {
      logger.error('Volume mixer not initialized');
      return;
    }

    if (message.originalVolume !== undefined) {
      this.volumeMixer.setOriginalVolume(message.originalVolume);
    }

    if (message.dubbedVolume !== undefined) {
      this.volumeMixer.setDubbedVolume(message.dubbedVolume);
    }

    // Save settings
    this.volumeMixer.saveSettings();
  }

  /**
   * Apply volume preset
   */
  private handleApplyVolumePreset(message: ApplyVolumePresetMessage): void {
    if (!this.volumeMixer) {
      logger.error('Volume mixer not initialized');
      return;
    }

    const { VOLUME_PRESETS } = require('./volume-mixer');
    const preset = VOLUME_PRESETS[message.presetName];

    if (!preset) {
      logger.error('Unknown volume preset', { preset: message.presetName });
      return;
    }

    this.volumeMixer.applyPreset(preset);
    this.volumeMixer.saveSettings();
  }

  /**
   * Get current status
   */
  private getStatus(): Record<string, unknown> {
    return {
      isActive: this.currentSession !== null,
      sessionId: this.currentSession?.sessionId,
      websocketConnected: this.websocket?.isConnected() || false,
      websocketState: this.websocket?.getState() || 'disconnected',
      audioProcessing: this.audioWorklet?.isActive() || false,
      audioPlaying: this.audioPlayer?.isPlayingAudio() || false,
      audioQueueSize: this.audioPlayer?.getQueueSize() || 0,
      originalVolume: this.volumeMixer?.getOriginalVolume() || 0,
      dubbedVolume: this.volumeMixer?.getDubbedVolume() || 0,
    };
  }

  /**
   * Cleanup all resources
   */
  private async cleanup(): Promise<void> {
    try {
      // Stop audio worklet
      if (this.audioWorklet) {
        await this.audioWorklet.stop();
        this.audioWorklet = null;
      }

      // Close WebSocket
      if (this.websocket) {
        this.websocket.close();
        this.websocket = null;
      }

      // Stop audio player
      if (this.audioPlayer) {
        await this.audioPlayer.dispose();
        this.audioPlayer = null;
      }

      // Stop media stream
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach((track) => track.stop());
        this.mediaStream = null;
      }

      // Clear session
      this.currentSession = null;
      this.correlationId = null;

      logger.info('Cleanup completed');
    } catch (error) {
      logger.error('Error during cleanup', { error: String(error) });
    }
  }
}

// Message type interfaces
interface StartDubbingMessage {
  type: 'START_DUBBING';
  sessionId: string;
  tabId: number;
  targetLanguage: string;
  voiceId?: string;
  token: string;
}

interface SetVolumeMessage {
  type: 'SET_VOLUME';
  originalVolume?: number;
  dubbedVolume?: number;
}

interface ApplyVolumePresetMessage {
  type: 'APPLY_VOLUME_PRESET';
  presetName: string;
}

// Initialize offscreen manager
const offscreenManager = new OffscreenManager();

// Export for testing
export { OffscreenManager };
