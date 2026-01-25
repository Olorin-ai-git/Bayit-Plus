/**
 * Voice Support Service
 * Orchestrates STT → LLM → TTS for voice-based support interactions
 * Integrates with ElevenLabs for transcription and Claude for responses
 *
 * Supports two modes:
 * 1. Streaming mode (default): Ultra-low latency via unified WebSocket pipeline
 * 2. Batch mode (fallback): Sequential API calls for environments without WebSocket support
 */

import { EventEmitter } from 'eventemitter3';
import i18n from '../i18n';
import { ttsService } from './ttsService';
import { supportConfig } from '../config/supportConfig';
import { useSupportStore, VoiceState } from '../stores/supportStore';
import { streamingVoicePipeline } from './streamingVoicePipeline';

export interface VoiceSupportConfig {
  maxRecordingDuration: number;
  silenceTimeout: number;
  language: string;
  useStreamingMode: boolean; // Enable ultra-low latency streaming
}

export interface VoiceSupportEvents {
  stateChange: (state: VoiceState) => void;
  transcriptUpdate: (transcript: string) => void;
  responseReceived: (response: string) => void;
  error: (error: Error) => void;
}

class VoiceSupportService extends EventEmitter {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recordingTimeout: NodeJS.Timeout | null = null;
  private silenceTimer: NodeJS.Timeout | null = null;
  private audioStream: MediaStream | null = null;
  private isRecording = false;
  private conversationId: string | null = null;
  private API_ENDPOINT: string;

  private config: VoiceSupportConfig = {
    maxRecordingDuration: supportConfig.voiceAssistant.maxRecordingDuration,
    silenceTimeout: supportConfig.voiceAssistant.silenceTimeout,
    language: i18n.language || supportConfig.documentation.defaultLanguage,
    useStreamingMode: supportConfig.voiceAssistant.useStreamingMode,
  };

  private streamingModeActive = false;
  private isPrewarmed = false;

  private getApiEndpoint(): string {
    // Check for browser environment with location (web only)
    if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
      return 'http://localhost:8000/api/v1/support';
    }
    // For React Native, use relative path or configured API URL
    return '/api/v1/support';
  }

  constructor() {
    super();
    this.API_ENDPOINT = this.getApiEndpoint();

    // Listen to language changes
    if (typeof window !== 'undefined') {
      i18n.on('languageChanged', (lng: string) => {
        this.config.language = lng;
      });

      // Set up streaming pipeline event handlers
      this.setupStreamingPipelineHandlers();

      // Prewarm pipeline for faster first interaction
      if (supportConfig.voiceAssistant.prewarmPipeline) {
        this.prewarm();
      }
    }
  }

  /**
   * Pre-warm the voice pipeline for faster first interaction
   * Call this during app initialization
   */
  async prewarm(): Promise<void> {
    if (this.isPrewarmed) return;

    try {
      await streamingVoicePipeline.prewarm();
      this.isPrewarmed = true;
    } catch (error) {
    }
  }

  /**
   * Set up event handlers for streaming voice pipeline
   */
  private setupStreamingPipelineHandlers(): void {
    streamingVoicePipeline.on('stateChange', (state) => {
      if (this.streamingModeActive) {
        this.emit('stateChange', state);
      }
    });

    streamingVoicePipeline.on('transcriptUpdate', (transcript, _language, isFinal) => {
      if (this.streamingModeActive && isFinal) {
        this.emit('transcriptUpdate', transcript);
      }
    });

    streamingVoicePipeline.on('responseComplete', (conversationId) => {
      if (this.streamingModeActive) {
        this.conversationId = conversationId;
      }
    });

    streamingVoicePipeline.on('error', (error) => {
      if (this.streamingModeActive) {
        this.emit('error', error);
        // Fall back to batch mode on streaming error
        this.config.useStreamingMode = false;
        this.streamingModeActive = false;
      }
    });
  }

  /**
   * Start listening for voice input
   *
   * Uses streaming mode by default for ultra-low latency (~3-5s end-to-end).
   * Falls back to batch mode if streaming is not supported.
   */
  async startListening(): Promise<void> {
    if (this.isRecording || this.streamingModeActive) {
      return;
    }

    // Try streaming mode first (lower latency)
    if (this.config.useStreamingMode && streamingVoicePipeline.isSupported()) {
      try {
        this.streamingModeActive = true;
        streamingVoicePipeline.setConfig({ language: this.config.language });
        await streamingVoicePipeline.startInteraction(this.conversationId || undefined);
        return;
      } catch (error) {
        this.streamingModeActive = false;
      }
    }

    // Fall back to batch mode
    try {
      this.emitStateChange('listening');

      // Request microphone access
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create MediaRecorder
      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(this.audioStream, { mimeType });
      this.audioChunks = [];
      this.isRecording = true;

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        await this.processRecording();
      };

      this.mediaRecorder.onerror = (event) => {
        this.handleError(new Error('Recording error'));
      };

      // Start recording
      this.mediaRecorder.start(250); // Collect data every 250ms

      // Set max recording timeout
      this.recordingTimeout = setTimeout(() => {
        this.stopListening();
      }, this.config.maxRecordingDuration);

    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error('Failed to start recording'));
    }
  }

  /**
   * Stop listening and process the recording
   */
  stopListening(): void {
    // Handle streaming mode
    if (this.streamingModeActive) {
      streamingVoicePipeline.commit('button');
      return;
    }

    // Handle batch mode
    if (!this.isRecording || !this.mediaRecorder) {
      return;
    }

    // Clear timeouts
    if (this.recordingTimeout) {
      clearTimeout(this.recordingTimeout);
      this.recordingTimeout = null;
    }
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    // Stop recording
    this.isRecording = false;
    this.mediaRecorder.stop();

    // Stop audio stream
    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop());
      this.audioStream = null;
    }

  }

  /**
   * Interrupt current speech
   */
  interrupt(): void {
    // Handle streaming mode
    if (this.streamingModeActive) {
      streamingVoicePipeline.cancel();
      this.streamingModeActive = false;
      return;
    }

    // Handle batch mode
    ttsService.stop();
    this.emitStateChange('idle');
  }

  /**
   * Process the recorded audio
   */
  private async processRecording(): Promise<void> {
    if (this.audioChunks.length === 0) {
      this.emitStateChange('idle');
      return;
    }

    try {
      this.emitStateChange('processing');

      // Create audio blob
      const mimeType = this.getSupportedMimeType();
      const audioBlob = new Blob(this.audioChunks, { type: mimeType });
      this.audioChunks = [];

      // Check minimum size (avoid sending silent recordings)
      if (audioBlob.size < 1000) {
        this.emitStateChange('idle');
        return;
      }

      // Transcribe audio
      const transcript = await this.transcribeAudio(audioBlob);

      if (!transcript || transcript.trim().length === 0) {
        this.emitStateChange('idle');
        return;
      }

      this.emit('transcriptUpdate', transcript);
      useSupportStore.getState().setCurrentTranscript(transcript);

      // Get AI response
      const response = await this.getAIResponse(transcript);

      if (response) {
        this.emit('responseReceived', response);
        useSupportStore.getState().setLastResponse(response);

        // Speak the response
        this.emitStateChange('speaking');
        await this.speakResponse(response);
      }

      this.emitStateChange('idle');
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error('Processing failed'));
    }
  }

  /**
   * Transcribe audio using backend STT
   */
  private async transcribeAudio(audioBlob: Blob): Promise<string> {
    const formData = new FormData();
    formData.append('audio', audioBlob, `recording.${this.getFileExtension()}`);
    formData.append('language', this.config.language);

    const response = await fetch(`${this.API_ENDPOINT}/transcribe`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Transcription failed');
    }

    const data = await response.json();
    return data.transcript || '';
  }

  /**
   * Get AI response from support chat endpoint
   */
  private async getAIResponse(transcript: string): Promise<string> {
    const response = await fetch(`${this.API_ENDPOINT}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: transcript,
        language: this.config.language,
        conversation_id: this.conversationId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get AI response');
    }

    const data = await response.json();

    // Store conversation ID for context continuity
    if (data.conversation_id) {
      this.conversationId = data.conversation_id;
    }

    return data.response || '';
  }

  /**
   * Speak the AI response using TTS
   */
  private async speakResponse(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ttsService.speak(text, 'high', {
        onComplete: () => resolve(),
        onError: (error) => reject(error),
      });
    });
  }

  /**
   * Get supported MIME type for recording
   */
  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm';
  }

  /**
   * Get file extension based on MIME type
   */
  private getFileExtension(): string {
    const mimeType = this.getSupportedMimeType();
    if (mimeType.includes('webm')) return 'webm';
    if (mimeType.includes('ogg')) return 'ogg';
    if (mimeType.includes('mp4')) return 'm4a';
    return 'webm';
  }

  /**
   * Emit state change
   */
  private emitStateChange(state: VoiceState): void {
    useSupportStore.getState().setVoiceState(state);
    this.emit('stateChange', state);
  }

  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    this.emitStateChange('error');
    this.emit('error', error);

    // Reset to idle after error display
    setTimeout(() => {
      this.emitStateChange('idle');
    }, 3000);
  }

  /**
   * Reset conversation context
   */
  resetConversation(): void {
    this.conversationId = null;
    useSupportStore.getState().setCurrentTranscript('');
    useSupportStore.getState().setLastResponse('');

    // Also reset streaming pipeline
    streamingVoicePipeline.resetConversation();
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<VoiceSupportConfig>): void {
    this.config = { ...this.config, ...config };

    // Sync streaming mode config
    if (config.language) {
      streamingVoicePipeline.setConfig({ language: config.language });
    }
  }

  /**
   * Enable or disable streaming mode
   * Streaming mode provides ~80% lower latency (~3-5s vs ~20s)
   */
  setStreamingMode(enabled: boolean): void {
    this.config.useStreamingMode = enabled;
  }

  /**
   * Check if streaming mode is active
   */
  isStreamingModeActive(): boolean {
    return this.streamingModeActive;
  }

  /**
   * Check if voice support is available on this platform
   */
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices &&
      !!navigator.mediaDevices.getUserMedia &&
      typeof MediaRecorder !== 'undefined'
    );
  }

  /**
   * Request microphone permission
   */
  async requestPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance
export const voiceSupportService = new VoiceSupportService();

export default voiceSupportService;
