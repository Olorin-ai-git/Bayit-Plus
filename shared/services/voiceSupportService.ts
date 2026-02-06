/**
 * Voice Support Service
 * Thin utility providing browser capability checks, conversation timeout management,
 * and batch recorder fallback. Stream lifecycle is owned by OlorinVoiceOrchestrator.
 */

import { EventEmitter } from 'eventemitter3';
import i18n from '../i18n';
import { supportConfig } from '../config/supportConfig';
import { useSupportStore } from '../stores/supportStore';
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

  constructor() {
    super();
    this.batchRecorder.setStopKeywordChecker(containsStopKeyword);
    this.setupBatchRecorderHandlers();
    if (typeof window !== 'undefined') {
      i18n.on('languageChanged', (lng: string) => { this.config.language = lng; });
    }
  }

  private setupBatchRecorderHandlers(): void {
    this.batchRecorder.on('stateChange', (state) => this.emit('stateChange', state));
    this.batchRecorder.on('transcriptUpdate', (t) => this.emit('transcriptUpdate', t));
    this.batchRecorder.on('responseReceived', (r) => this.emit('responseReceived', r));
    this.batchRecorder.on('error', (e) => this.emit('error', e));
  }

  /** Check if voice is supported on this platform */
  isSupported(): boolean {
    return typeof window !== 'undefined' && typeof navigator !== 'undefined'
      && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
  }

  /** Request microphone permission */
  async requestPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch { return false; }
  }

  /** Reset conversation state */
  resetConversation(): void {
    this.batchRecorder.resetConversation();
    streamingVoicePipeline.resetConversation();
  }

  /** Get batch recorder conversation ID (for continuation) */
  getConversationId(): string | null {
    return this.batchRecorder.getConversationId();
  }

  /** Update configuration */
  setConfig(config: Partial<VoiceSupportConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.language) {
      streamingVoicePipeline.setConfig({ language: config.language });
    }
  }

  setStreamingMode(enabled: boolean): void {
    this.config.useStreamingMode = enabled;
  }

  setContinuousListening(enabled: boolean): void {
    this.config.continuousListening = enabled;
  }

  isContinuousListeningEnabled(): boolean {
    return this.config.continuousListening;
  }
}

export const voiceSupportService = new VoiceSupportService();
export default voiceSupportService;
