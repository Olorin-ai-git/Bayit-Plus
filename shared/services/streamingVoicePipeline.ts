/** Streaming Voice Pipeline - WebSocket-based voice interaction coordinator */

import { EventEmitter } from 'eventemitter3';
import i18n from '../i18n';
import { supportConfig } from '../config/supportConfig';
import { useSupportStore, VoiceState } from '../stores/supportStore';
import { AudioProcessor } from './audioProcessor';
import { StreamingAudioPlayer } from './streamingAudioPlayer';
import { VoiceWebSocketHandler } from './voiceWebSocketHandler';
import { isStreamingSupported, requestMicrophonePermission, checkMicrophonePermissionState } from './microphonePermission';
import { logger } from '../utils/logger';

const log = logger.scope('StreamingVoicePipeline');

export interface StreamingVoicePipelineEvents {
  stateChange: (state: VoiceState) => void;
  transcriptUpdate: (transcript: string, language: string, isFinal: boolean) => void;
  llmChunk: (text: string) => void;
  intentAction: (intent: string, action: { type: string; payload: Record<string, unknown> }, spokenResponse: string, confidence: number) => void;
  responseComplete: (conversationId: string, escalationNeeded: boolean) => void;
  audioChunk: (audioData: ArrayBuffer) => void;
  error: (error: Error) => void;
  connected: () => void;
  disconnected: () => void;
}

export interface StreamingPipelineConfig {
  language: string;
  conversationId?: string;
  voiceId?: string;
  autoCommitOnSilence: boolean;
  silenceThresholdMs: number;
}

class StreamingVoicePipeline extends EventEmitter<StreamingVoicePipelineEvents> {
  private wsHandler = new VoiceWebSocketHandler();
  private audioProcessor: AudioProcessor | null = null;
  private audioPlayer: StreamingAudioPlayer | null = null;
  private config: StreamingPipelineConfig;
  private isConnected = false;
  private isConnecting = false;
  private isRecording = false;
  private currentTranscript = '';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private micPermissionGranted = false;

  private getWsEndpoint(): string {
    const voicePath = '/api/v1/support/voice';
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = typeof window !== 'undefined' ? window.location.host : 'localhost:8000';
    return `${protocol}//${host}${voicePath}`;
  }

  constructor() {
    super();
    this.config = {
      language: i18n.language || supportConfig.documentation.defaultLanguage,
      autoCommitOnSilence: true, silenceThresholdMs: 1500,
    };
    if (typeof window !== 'undefined') {
      i18n.on('languageChanged', (lng: string) => { this.config.language = lng; });
    }
  }

  private getAuthToken(): string | null {
    try {
      const authData = localStorage.getItem('bayit-auth');
      if (authData) return JSON.parse(authData)?.state?.token;
      return localStorage.getItem('auth_token');
    } catch { return null; }
  }

  async startInteraction(conversationId?: string): Promise<void> {
    if (this.isConnected || this.isConnecting) return;
    this.isConnecting = true;
    const token = this.getAuthToken();
    if (!token) { this.isConnecting = false; this.emitError(new Error('Authentication required')); return; }
    try {
      const store = useSupportStore.getState();
      store.clearStreamingResponse();
      store.setCurrentTranscript('');
      this.emitStateChange('listening');
      const wsUrl = new URL(this.getWsEndpoint());
      wsUrl.searchParams.set('token', token);
      wsUrl.searchParams.set('language', this.config.language);
      if (conversationId) wsUrl.searchParams.set('conversation_id', conversationId);
      if (this.config.voiceId) wsUrl.searchParams.set('voice_id', this.config.voiceId);
      this.audioProcessor = new AudioProcessor();
      this.audioPlayer = new StreamingAudioPlayer();
      this.audioPlayer.setOnPlaybackComplete(() => this.emitStateChange('idle'));
      this.wsHandler.connect(wsUrl.toString(), {
        onConnected: async () => {
          this.isConnected = true; this.isConnecting = false; this.reconnectAttempts = 0; this.emit('connected');
          try { await this.audioProcessor?.start((c) => this.sendAudioChunk(c)); this.isRecording = true; }
          catch { this.emitError(new Error('Microphone access denied')); }
        },
        onDisconnected: (code) => {
          this.isConnected = false; this.isConnecting = false; this.cleanup(); this.emit('disconnected');
          if (code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => this.startInteraction(this.config.conversationId), 1000 * this.reconnectAttempts);
          }
        },
        onTranscriptPartial: (text, lang) => {
          this.emit('transcriptUpdate', text, lang, false);
          useSupportStore.getState().setCurrentTranscript(text);
        },
        onTranscriptFinal: (text, lang) => {
          this.currentTranscript = text;
          this.emit('transcriptUpdate', text, lang, true);
          useSupportStore.getState().setCurrentTranscript(text);
          this.stopRecording(); this.emitStateChange('processing');
        },
        onLlmChunk: (text) => {
          useSupportStore.getState().appendStreamingResponse(text);
          this.emit('llmChunk', text);
        },
        onTtsAudio: (audioData) => {
          if (!this.audioPlayer?.isCurrentlyPlaying()) this.emitStateChange('speaking');
          this.audioPlayer?.addChunk(audioData); this.emit('audioChunk', audioData);
        },
        onIntentAction: (intent, action, spokenResponse, confidence) => {
          this.emit('intentAction', intent, action, spokenResponse, confidence);
        },
        onComplete: (convId, escalation, responseText) => {
          this.config.conversationId = convId || undefined;
          const store = useSupportStore.getState();
          // Use accumulated streaming text if available, fallback to WS responseText
          const finalText = store.streamingResponse || responseText;
          // Atomic update: set final response and clear streaming in single store write
          useSupportStore.setState({ lastResponse: finalText, streamingResponse: '', isStreamingText: false });
          this.emit('responseComplete', convId, escalation);
        },
        onCancelled: () => { this.audioPlayer?.stop(); this.emitStateChange('idle'); },
        onError: (error) => this.emitError(error),
      });
    } catch (error) { this.isConnecting = false; this.emitError(error instanceof Error ? error : new Error('Failed to start')); }
  }

  private sendAudioChunk(chunk: ArrayBuffer): void {
    if (!this.isRecording || !this.isConnected) return;
    const bytes = new Uint8Array(chunk);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    this.wsHandler.sendAudio(btoa(binary));
  }

  private stopRecording(): void {
    if (this.audioProcessor) { this.audioProcessor.stop(); this.audioProcessor = null; }
    this.isRecording = false;
  }

  async restartListening(): Promise<void> {
    if (!this.isConnected) { log.warn('Cannot restart listening - not connected'); return; }
    if (this.isRecording) { log.warn('Already recording'); return; }
    try {
      log.info('Restarting audio processor');
      this.currentTranscript = '';
      useSupportStore.getState().setCurrentTranscript('');
      this.emitStateChange('listening');
      if (!this.audioProcessor) this.audioProcessor = new AudioProcessor();
      await this.audioProcessor.start((c) => this.sendAudioChunk(c));
      this.isRecording = true;
    } catch (error) {
      log.error('Failed to restart audio processor', { error });
      this.emitError(new Error('Failed to restart microphone'));
    }
  }

  commit(reason: 'silence' | 'button' = 'button'): void { this.wsHandler.send({ type: 'commit', reason }); }
  cancel(): void { this.wsHandler.send({ type: 'cancel' }); this.audioPlayer?.stop(); this.emitStateChange('idle'); }

  stopInteraction(): void {
    this.cleanup(); this.wsHandler.close(); this.isConnected = false; this.isConnecting = false;
    this.emitStateChange('idle'); this.emit('disconnected');
  }

  private cleanup(): void {
    if (this.audioProcessor) { this.audioProcessor.stop(); this.audioProcessor = null; }
    if (this.audioPlayer) this.audioPlayer.stop();
    this.isRecording = false;
  }

  private emitStateChange(state: VoiceState): void { this.emit('stateChange', state); }
  private emitError(error: Error): void { this.emit('error', error); useSupportStore.getState().setError(error.message); setTimeout(() => this.emitStateChange('idle'), 3000); }

  setConfig(config: Partial<StreamingPipelineConfig>): void { this.config = { ...this.config, ...config }; }
  getConversationId(): string | undefined { return this.config.conversationId; }
  isActive(): boolean { return this.isConnected; }
  isCurrentlyRecording(): boolean { return this.isRecording; }
  isSupported(): boolean { return isStreamingSupported(); }
  async requestPermission(): Promise<boolean> { return requestMicrophonePermission(); }

  resetConversation(): void {
    this.config.conversationId = undefined; this.currentTranscript = '';
    useSupportStore.getState().setCurrentTranscript(''); useSupportStore.getState().setLastResponse('');
  }

  async prewarm(): Promise<void> {
    if (!this.isSupported() || !this.getAuthToken()) return;
    const state = await checkMicrophonePermissionState();
    if (state === 'granted') this.micPermissionGranted = true;
  }
}

export const streamingVoicePipeline = new StreamingVoicePipeline();
export default streamingVoicePipeline;
