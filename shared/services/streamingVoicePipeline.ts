/**
 * Streaming Voice Pipeline
 * Unified WebSocket-based voice interaction service
 *
 * Provides end-to-end streaming: Audio → STT → LLM → TTS → Audio
 * Expected latency: ~3-5 seconds (down from ~20 seconds)
 */

import { EventEmitter } from 'eventemitter3';
import i18n from '../i18n';
import { supportConfig } from '../config/supportConfig';
import { useSupportStore, VoiceState } from '../stores/supportStore';

/**
 * Message types sent from client to server
 */
interface ClientMessage {
  type: 'audio' | 'commit' | 'cancel' | 'ping';
  data?: string; // Base64 audio data
  reason?: string; // For commit: 'silence' | 'button'
}

/**
 * Message types received from server
 */
interface ServerMessage {
  type:
    | 'transcript_partial'
    | 'transcript_final'
    | 'llm_chunk'
    | 'tts_audio'
    | 'complete'
    | 'cancelled'
    | 'error'
    | 'pong';
  text?: string;
  data?: string; // Base64 audio data
  language?: string;
  conversation_id?: string;
  escalation_needed?: boolean;
  message?: string;
}

/**
 * Pipeline events
 */
export interface StreamingVoicePipelineEvents {
  stateChange: (state: VoiceState) => void;
  transcriptUpdate: (transcript: string, language: string, isFinal: boolean) => void;
  llmChunk: (text: string) => void;
  responseComplete: (conversationId: string, escalationNeeded: boolean) => void;
  audioChunk: (audioData: ArrayBuffer) => void;
  error: (error: Error) => void;
  connected: () => void;
  disconnected: () => void;
}

/**
 * Configuration for the streaming pipeline
 */
export interface StreamingPipelineConfig {
  language: string;
  conversationId?: string;
  voiceId?: string;
  autoCommitOnSilence: boolean;
  silenceThresholdMs: number;
}

/**
 * Audio processor for real-time microphone capture
 */
class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private onAudioChunk: ((chunk: ArrayBuffer) => void) | null = null;

  async start(onAudioChunk: (chunk: ArrayBuffer) => void): Promise<void> {
    this.onAudioChunk = onAudioChunk;

    try {
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });

      // Create audio context at 16kHz for ElevenLabs
      this.audioContext = new AudioContext({ sampleRate: 16000 });

      // Create source from microphone
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Use ScriptProcessor for audio processing (AudioWorklet would be better but requires additional setup)
      const bufferSize = 2048;
      const scriptProcessor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

      scriptProcessor.onaudioprocess = (event) => {
        if (!this.onAudioChunk) return;

        const inputData = event.inputBuffer.getChannelData(0);
        // Convert float32 to int16 PCM
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        this.onAudioChunk(pcmData.buffer);
      };

      // Connect nodes
      this.sourceNode.connect(scriptProcessor);
      scriptProcessor.connect(this.audioContext.destination);

    } catch (error) {
      throw error;
    }
  }

  stop(): void {
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.onAudioChunk = null;
  }
}

/**
 * Streaming audio player for real-time TTS playback
 */
class StreamingAudioPlayer {
  private audioContext: AudioContext | null = null;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private onPlaybackComplete: (() => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new AudioContext();
    }
  }

  async addChunk(audioData: ArrayBuffer): Promise<void> {
    if (!this.audioContext) return;

    try {
      // Decode MP3 audio data
      const audioBuffer = await this.audioContext.decodeAudioData(audioData.slice(0));
      this.audioQueue.push(audioBuffer);

      // Start playback if not already playing
      if (!this.isPlaying) {
        this.playNext();
      }
    } catch (error) {
    }
  }

  private playNext(): void {
    if (!this.audioContext || this.audioQueue.length === 0) {
      this.isPlaying = false;
      if (this.onPlaybackComplete) {
        this.onPlaybackComplete();
      }
      return;
    }

    this.isPlaying = true;
    const audioBuffer = this.audioQueue.shift()!;

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    source.onended = () => {
      this.playNext();
    };

    source.start(0);
    this.currentSource = source;
  }

  stop(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch {
        // Ignore if already stopped
      }
      this.currentSource = null;
    }
    this.audioQueue = [];
    this.isPlaying = false;
  }

  setOnPlaybackComplete(callback: () => void): void {
    this.onPlaybackComplete = callback;
  }

  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }
}

/**
 * Streaming Voice Pipeline Service
 * Handles unified WebSocket-based voice interactions
 */
class StreamingVoicePipeline extends EventEmitter<StreamingVoicePipelineEvents> {
  private ws: WebSocket | null = null;
  private audioProcessor: AudioProcessor | null = null;
  private audioPlayer: StreamingAudioPlayer | null = null;
  private config: StreamingPipelineConfig;
  private isConnected = false;
  private isRecording = false;
  private currentTranscript = '';
  private currentResponse = '';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private pingInterval: NodeJS.Timeout | null = null;

  private getWsEndpoint(): string {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return 'ws://localhost:8000/api/v1/support/voice';
    }
    // Use secure WebSocket in production
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/api/v1/support/voice`;
  }

  constructor() {
    super();
    this.config = {
      language: i18n.language || supportConfig.documentation.defaultLanguage,
      autoCommitOnSilence: true,
      silenceThresholdMs: 1500,
    };

    // Listen to language changes
    if (typeof window !== 'undefined') {
      i18n.on('languageChanged', (lng: string) => {
        this.config.language = lng;
      });
    }
  }

  /**
   * Get authentication token from storage
   */
  private getAuthToken(): string | null {
    try {
      const authData = localStorage.getItem('bayit-auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed?.state?.token;
      }
      return localStorage.getItem('auth_token');
    } catch {
      return null;
    }
  }

  /**
   * Start a voice interaction
   */
  async startInteraction(conversationId?: string): Promise<void> {
    if (this.isConnected) {
      return;
    }

    const token = this.getAuthToken();
    if (!token) {
      this.emitError(new Error('Authentication required'));
      return;
    }

    try {
      this.emitStateChange('listening');

      // Build WebSocket URL with params
      const wsUrl = new URL(this.getWsEndpoint());
      wsUrl.searchParams.set('token', token);
      wsUrl.searchParams.set('language', this.config.language);
      if (conversationId) {
        wsUrl.searchParams.set('conversation_id', conversationId);
      }
      if (this.config.voiceId) {
        wsUrl.searchParams.set('voice_id', this.config.voiceId);
      }

      // Connect WebSocket
      this.ws = new WebSocket(wsUrl.toString());
      this.setupWebSocketHandlers();

      // Initialize audio components
      this.audioProcessor = new AudioProcessor();
      this.audioPlayer = new StreamingAudioPlayer();

      this.audioPlayer.setOnPlaybackComplete(() => {
        // All audio played, return to idle
        this.emitStateChange('idle');
      });

    } catch (error) {
      this.emitError(error instanceof Error ? error : new Error('Failed to start'));
    }
  }

  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = async () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connected');

      // Start audio capture
      try {
        await this.audioProcessor?.start((chunk) => {
          this.sendAudioChunk(chunk);
        });
        this.isRecording = true;
      } catch (error) {
        this.emitError(new Error('Microphone access denied'));
      }

      // Start ping interval
      this.pingInterval = setInterval(() => {
        this.sendMessage({ type: 'ping' });
      }, 30000);
    };

    this.ws.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);
        this.handleServerMessage(message);
      } catch (error) {
      }
    };

    this.ws.onerror = (event) => {
      this.emitError(new Error('WebSocket connection error'));
    };

    this.ws.onclose = (event) => {
      this.isConnected = false;
      this.cleanup();
      this.emit('disconnected');

      // Auto-reconnect if not intentional close
      if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        setTimeout(() => {
          this.startInteraction(this.config.conversationId);
        }, 1000 * this.reconnectAttempts);
      }
    };
  }

  private handleServerMessage(message: ServerMessage): void {
    switch (message.type) {
      case 'transcript_partial':
        if (message.text) {
          this.emit('transcriptUpdate', message.text, message.language || 'auto', false);
        }
        break;

      case 'transcript_final':
        if (message.text) {
          this.currentTranscript = message.text;
          this.emit('transcriptUpdate', message.text, message.language || 'auto', true);
          useSupportStore.getState().setCurrentTranscript(message.text);

          // Stop recording, switch to processing
          this.stopRecording();
          this.emitStateChange('processing');
        }
        break;

      case 'llm_chunk':
        if (message.text) {
          this.currentResponse += message.text;
          this.emit('llmChunk', message.text);
        }
        break;

      case 'tts_audio':
        if (message.data) {
          // Decode base64 and play
          const binaryString = atob(message.data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          // Switch to speaking state on first audio chunk
          if (!this.audioPlayer?.isCurrentlyPlaying()) {
            this.emitStateChange('speaking');
          }

          this.audioPlayer?.addChunk(bytes.buffer);
          this.emit('audioChunk', bytes.buffer);
        }
        break;

      case 'complete':
        this.config.conversationId = message.conversation_id;
        useSupportStore.getState().setLastResponse(this.currentResponse);
        this.emit('responseComplete', message.conversation_id || '', message.escalation_needed || false);
        this.currentResponse = '';
        break;

      case 'cancelled':
        this.audioPlayer?.stop();
        this.emitStateChange('idle');
        break;

      case 'error':
        this.emitError(new Error(message.message || 'Server error'));
        break;

      case 'pong':
        // Keep-alive response
        break;

      default:
    }
  }

  private sendMessage(message: ClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private sendAudioChunk(chunk: ArrayBuffer): void {
    if (!this.isRecording || !this.isConnected) return;

    // Convert to base64
    const bytes = new Uint8Array(chunk);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    this.sendMessage({ type: 'audio', data: base64 });
  }

  /**
   * Stop recording audio (but keep connection for response)
   */
  private stopRecording(): void {
    if (this.audioProcessor) {
      this.audioProcessor.stop();
      this.audioProcessor = null;
    }
    this.isRecording = false;
  }

  /**
   * Manually commit (signal end of speech)
   */
  commit(reason: 'silence' | 'button' = 'button'): void {
    this.sendMessage({ type: 'commit', reason });
  }

  /**
   * Cancel current interaction
   */
  cancel(): void {
    this.sendMessage({ type: 'cancel' });
    this.audioPlayer?.stop();
    this.emitStateChange('idle');
  }

  /**
   * Stop the entire pipeline and disconnect
   */
  stopInteraction(): void {
    this.cleanup();

    if (this.ws) {
      this.ws.close(1000, 'User stopped interaction');
      this.ws = null;
    }

    this.isConnected = false;
    this.emitStateChange('idle');
    this.emit('disconnected');
  }

  private cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.audioProcessor) {
      this.audioProcessor.stop();
      this.audioProcessor = null;
    }

    if (this.audioPlayer) {
      this.audioPlayer.stop();
    }

    this.isRecording = false;
  }

  private emitStateChange(state: VoiceState): void {
    useSupportStore.getState().setVoiceState(state);
    this.emit('stateChange', state);
  }

  private emitError(error: Error): void {
    this.emit('error', error);
    useSupportStore.getState().setError(error.message);
    setTimeout(() => {
      this.emitStateChange('idle');
    }, 3000);
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<StreamingPipelineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current conversation ID
   */
  getConversationId(): string | undefined {
    return this.config.conversationId;
  }

  /**
   * Check if pipeline is connected
   */
  isActive(): boolean {
    return this.isConnected;
  }

  /**
   * Check if currently recording
   */
  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Check if streaming voice is supported
   */
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof WebSocket !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices &&
      !!navigator.mediaDevices.getUserMedia
    );
  }

  /**
   * Request microphone permission
   * Returns false if microphone is not supported, not allowed by policy, or permission denied
   */
  async requestPermission(): Promise<boolean> {
    // Check if navigator.permissions API is available for checking policy
    if (typeof navigator !== 'undefined' && navigator.permissions) {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (permissionStatus.state === 'denied') {
          return false;
        }
      } catch {
        // Some browsers don't support querying microphone permission
        // Continue to try getUserMedia
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error: any) {
      // Handle specific error types
      if (error?.name === 'NotAllowedError' ||
          error?.name === 'SecurityError' ||
          error?.message?.includes('Permissions policy')) {
        // Microphone not allowed by permissions policy or user denied
        return false;
      }
      // Log unexpected errors for debugging (but don't throw)
      if (typeof console !== 'undefined') {
        console.debug('[VoicePipeline] Microphone permission request failed:', error?.message || error);
      }
      return false;
    }
  }

  /**
   * Reset conversation context
   */
  resetConversation(): void {
    this.config.conversationId = undefined;
    this.currentTranscript = '';
    this.currentResponse = '';
    useSupportStore.getState().setCurrentTranscript('');
    useSupportStore.getState().setLastResponse('');
  }

  /**
   * Pre-warm the pipeline by establishing initial connections
   * Call this during app initialization for faster first interaction
   */
  async prewarm(): Promise<void> {
    if (!this.isSupported()) {
      return;
    }

    const token = this.getAuthToken();
    if (!token) {
      return;
    }

    try {
      // Request microphone permission proactively
      const hasPermission = await this.requestPermission();
      if (hasPermission) {
      }

      // Could also pre-connect WebSocket here for even faster first interaction
      // but that would require keeping the connection alive with pings
    } catch (error) {
    }
  }

  /**
   * Get performance metrics for the last interaction
   */
  getLastInteractionMetrics(): { transcriptLatencyMs: number; firstAudioLatencyMs: number } | null {
    // This could be enhanced to track actual timing metrics
    return null;
  }
}

// Singleton instance
export const streamingVoicePipeline = new StreamingVoicePipeline();

export default streamingVoicePipeline;
