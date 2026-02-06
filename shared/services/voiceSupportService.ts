/**
 * Voice Support Service
 * Orchestrates STT -> LLM -> TTS for voice-based support interactions
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
import { VoiceBatchRecorder } from './voiceBatchRecorder';
import { containsStopKeyword } from './voiceStopKeywords';
import { logger } from '../utils/logger';

export interface VoiceSupportConfig {
  maxRecordingDuration: number;
  silenceTimeout: number;
  language: string;
  useStreamingMode: boolean;
  continuousListening: boolean;
}

export interface VoiceSupportEvents {
  stateChange: (state: VoiceState) => void;
  transcriptUpdate: (transcript: string) => void;
  responseReceived: (response: string) => void;
  error: (error: Error) => void;
}

const log = logger.scope('VoiceSupportService');

class VoiceSupportService extends EventEmitter {
  private batchRecorder = new VoiceBatchRecorder();
  private config: VoiceSupportConfig = {
    maxRecordingDuration: supportConfig.voiceAssistant.maxRecordingDuration,
    silenceTimeout: supportConfig.voiceAssistant.silenceTimeout,
    language: i18n.language || supportConfig.documentation.defaultLanguage,
    useStreamingMode: supportConfig.voiceAssistant.useStreamingMode,
    continuousListening: true,
  };
  private streamingModeActive = false;
  private isPrewarmed = false;
  private shouldStopListening = false;

  constructor() {
    super();
    this.batchRecorder.setStopKeywordChecker(containsStopKeyword);
    this.setupBatchRecorderHandlers();
    if (typeof window !== 'undefined') {
      i18n.on('languageChanged', (lng: string) => { this.config.language = lng; });
      this.setupStreamingPipelineHandlers();
      if (supportConfig.voiceAssistant.prewarmPipeline) this.prewarm();
    }
  }

  private setupBatchRecorderHandlers(): void {
    this.batchRecorder.on('stateChange', (state) => this.emit('stateChange', state));
    this.batchRecorder.on('transcriptUpdate', (t) => this.emit('transcriptUpdate', t));
    this.batchRecorder.on('responseReceived', (r) => this.emit('responseReceived', r));
    this.batchRecorder.on('error', (e) => this.handleError(e));
    this.batchRecorder.on('restartListening', () => this.startListening());
  }

  async prewarm(): Promise<void> {
    if (this.isPrewarmed) return;
    try {
      await streamingVoicePipeline.prewarm();
      this.isPrewarmed = true;
    } catch (_error) { /* prewarm failure is non-critical */ }
  }

  private setupStreamingPipelineHandlers(): void {
    streamingVoicePipeline.on('stateChange', (state) => {
      if (this.streamingModeActive) this.emit('stateChange', state);
    });
    streamingVoicePipeline.on('transcriptUpdate', (transcript, _language, isFinal) => {
      if (this.streamingModeActive && isFinal) {
        this.emit('transcriptUpdate', transcript);
        if (containsStopKeyword(transcript)) this.shouldStopListening = true;
      }
    });
    streamingVoicePipeline.on('responseComplete', (conversationId) => {
      if (!this.streamingModeActive) return;
      this.batchRecorder.setConversationId(conversationId);
      this.handleStreamingContinuation();
    });
    streamingVoicePipeline.on('error', (error) => {
      if (this.streamingModeActive) {
        this.config.useStreamingMode = false;
        this.streamingModeActive = false;
        this.handleError(error);
      }
    });
  }

  private handleStreamingContinuation(): void {
    const isMediaPlaying = this.batchRecorder.isMediaCurrentlyPlaying();
    const shouldContinue = this.config.continuousListening &&
      useSupportStore.getState().isVoiceModalOpen && !this.shouldStopListening && !isMediaPlaying;
    if (shouldContinue) {
      setTimeout(async () => {
        if (this.streamingModeActive && useSupportStore.getState().isVoiceModalOpen && !this.shouldStopListening) {
          await streamingVoicePipeline.restartListening();
        }
      }, 500);
    } else {
      this.shouldStopListening = false;
    }
  }

  async startListening(): Promise<void> {
    if (this.batchRecorder.getIsRecording() || this.streamingModeActive) return;
    this.shouldStopListening = false;
    if (this.config.useStreamingMode && streamingVoicePipeline.isSupported()) {
      try {
        this.streamingModeActive = true;
        streamingVoicePipeline.setConfig({ language: this.config.language });
        await streamingVoicePipeline.startInteraction(this.batchRecorder.getConversationId() || undefined);
        return;
      } catch (_error) { this.streamingModeActive = false; }
    }
    await this.batchRecorder.startRecording(this.config);
  }

  stopListening(): void {
    if (this.streamingModeActive) { streamingVoicePipeline.commit('button'); return; }
    this.batchRecorder.stopRecording();
  }

  interrupt(): void {
    if (this.streamingModeActive) {
      streamingVoicePipeline.cancel();
      this.streamingModeActive = false;
      return;
    }
    ttsService.stop();
    useSupportStore.getState().setVoiceState('idle');
    this.emit('stateChange', 'idle');
  }

  private handleError(error: Error): void {
    useSupportStore.getState().setVoiceState('error');
    this.emit('stateChange', 'error');
    this.emit('error', error);
    setTimeout(() => {
      useSupportStore.getState().setVoiceState('idle');
      this.emit('stateChange', 'idle');
      const isMediaPlaying = this.batchRecorder.isMediaCurrentlyPlaying();
      const shouldContinue = this.config.continuousListening &&
        useSupportStore.getState().isVoiceModalOpen && !this.shouldStopListening && !isMediaPlaying;
      if (shouldContinue) {
        setTimeout(() => {
          if (useSupportStore.getState().isVoiceModalOpen && !this.shouldStopListening) {
            this.startListening();
          }
        }, 500);
      } else { this.shouldStopListening = false; }
    }, 3000);
  }

  resetConversation(): void {
    this.batchRecorder.resetConversation();
    streamingVoicePipeline.resetConversation();
  }

  setConfig(config: Partial<VoiceSupportConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.language) streamingVoicePipeline.setConfig({ language: config.language });
  }

  setStreamingMode(enabled: boolean): void { this.config.useStreamingMode = enabled; }
  setContinuousListening(enabled: boolean): void { this.config.continuousListening = enabled; }
  isContinuousListeningEnabled(): boolean { return this.config.continuousListening; }
  isStreamingModeActive(): boolean { return this.streamingModeActive; }

  isSupported(): boolean {
    return typeof window !== 'undefined' && typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia &&
      typeof MediaRecorder !== 'undefined';
  }

  async requestPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (_error) { return false; }
  }
}

export const voiceSupportService = new VoiceSupportService();
export default voiceSupportService;
