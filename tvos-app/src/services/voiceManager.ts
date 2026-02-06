/**
 * Voice Manager Service (tvOS)
 * Coordinates wake word detection, speech recognition, TTS responses
 * Primary trigger: Menu button long-press; optional: wake word "Hey Bayit"
 */

import { speechService } from './speech';
import { wakeWordService } from './wakeWord';
import { config } from '../config/appConfig';
import { OlorinVoiceOrchestrator, voiceOrchestrator } from '@bayit/shared/services/olorinVoiceOrchestrator';
import { useSupportStore } from '@bayit/shared/stores/supportStore';
import { logger } from '@bayit/shared/utils/logger';
import { processSpeechResult } from './voiceSpeechProcessor';
import {
  handleWakeWordDetected, startBackgroundListening, stopBackgroundListening,
  shouldResumeBackgroundListening,
} from './voiceWakeWordHandler';
import {
  VoiceStage, VoiceSessionMetrics, VoiceEventListener, VoiceManagerConfig,
  createSessionMetrics,
} from './voiceTypes';

export type { VoiceStage, VoiceSessionMetrics, VoiceEventListener, VoiceManagerConfig };

const log = logger.scope('VoiceManager');

class VoiceManager {
  private currentStage: VoiceStage = 'idle';
  private config: Required<VoiceManagerConfig>;
  private eventListeners: VoiceEventListener[] = [];
  private listenTimeoutHandle: NodeJS.Timeout | null = null;
  private sessionMetrics: VoiceSessionMetrics | null = null;
  private sessionStartTime: number = 0;
  private _isWakeWordListening: boolean = false;
  private orchestrator: OlorinVoiceOrchestrator | null = null;

  constructor(c: VoiceManagerConfig = {}) {
    this.config = {
      listenTimeoutMs: c.listenTimeoutMs ?? config.voice.listenTimeoutMs,
      wakeWordTimeoutMs: c.wakeWordTimeoutMs ?? 0,
      wakeWordLanguage: c.wakeWordLanguage ?? config.voice.defaultLanguage,
      speechLanguage: c.speechLanguage ?? config.voice.speechLanguage,
      ttsLanguage: c.ttsLanguage ?? config.voice.ttsLanguage,
      ttsRate: c.ttsRate ?? config.voice.ttsRate,
      enableMetrics: c.enableMetrics ?? true,
      enableBackgroundListening: c.enableBackgroundListening ?? config.voice.alwaysOnListening,
      triggerType: c.triggerType ?? config.tv.voiceTrigger,
    };
    this._setupEventListeners();
    this._initializeOrchestrator();
  }

  private async _initializeOrchestrator(): Promise<void> {
    try {
      this.orchestrator = voiceOrchestrator;
      await this.orchestrator.initialize({
        platform: 'tvos', language: this.config.speechLanguage, streamingMode: false,
        wakeWordEnabled: this.config.enableBackgroundListening,
        autoExpandOnWakeWord: true, collapseDelay: 10000,
      });
      log.info('Orchestrator initialized (tvOS)');
    } catch (error) { log.error('Failed to initialize orchestrator', error); }
  }

  private _setupEventListeners(): void {
    wakeWordService.addDetectionListener((detection) => {
      log.info('Wake word detected', { wakeWord: detection.wakeWord });
      handleWakeWordDetected(detection, this._getDeps());
    });
    speechService.addResultListener((result) => {
      log.info('Speech result', { transcription: result.transcription });
      this._onSpeechResult(result);
    });
    speechService.addErrorListener((error) => {
      log.error('Speech error', error);
      this._onSpeechError(error);
    });
  }

  private _getDeps() { return {
    getConfig: () => this.config, getOrchestrator: () => this.orchestrator,
    getSessionMetrics: () => this.sessionMetrics, getSessionStartTime: () => this.sessionStartTime,
    setStage: (stage: string, err?: string) => this._setStage(stage as VoiceStage, err),
    startSession: (t: 'menu-button' | 'wake-word') => this._startSession(t),
    setListenTimeout: (h: NodeJS.Timeout) => { this.listenTimeoutHandle = h; },
    clearTimeout: () => this._clearTimeout(),
    setWakeWordListening: (v: boolean) => { this._isWakeWordListening = v; },
    isWakeWordListening: () => this._isWakeWordListening,
  }; }

  async startBackgroundListening(): Promise<void> { return startBackgroundListening(this._getDeps()); }
  async stopBackgroundListening(): Promise<void> { return stopBackgroundListening(this._getDeps()); }

  async startMenuButtonListening(): Promise<void> {
    try {
      log.info('Starting speech recognition via Menu button');
      if (this.orchestrator) await this.orchestrator.startVoiceInteraction('manual');
      useSupportStore.getState().openVoiceModal();
      if (this._isWakeWordListening) await this.stopBackgroundListening();
      this._startSession('menu-button');
      this._setStage('listening');
      await speechService.setLanguage(this.config.speechLanguage);
      await speechService.startRecognition();
      this.listenTimeoutHandle = setTimeout(async () => {
        log.warn('Speech listening timeout (45s for TV)');
        await this.stopListening();
        this._setStage('timeout');
      }, this.config.listenTimeoutMs);
    } catch (error) {
      log.error('Failed to start Menu button listening', error);
      this._setStage('error', (error as Error).message);
      throw error;
    }
  }

  async startManualListening(): Promise<void> { return this.startMenuButtonListening(); }

  async stopListening(): Promise<void> {
    try {
      await speechService.stopRecognition();
      this._clearTimeout();
      if (shouldResumeBackgroundListening(this.config)) await this.startBackgroundListening();
      else this._setStage('idle');
    } catch (error) { log.error('Failed to stop listening', error); throw error; }
  }

  private async _onSpeechResult(result: any): Promise<void> {
    try {
      this._clearTimeout();
      if (!result.isFinal) return;
      this._setStage('processing');
      const processResult = await processSpeechResult({
        result, orchestrator: this.orchestrator, config: this.config,
        sessionMetrics: this.sessionMetrics, sessionStartTime: this.sessionStartTime,
      });
      if (processResult.success) {
        if (shouldResumeBackgroundListening(this.config)) await this.startBackgroundListening();
        else this._setStage('idle');
      } else {
        this._setStage('error', processResult.errorMessage);
        if (shouldResumeBackgroundListening(this.config))
          await this.startBackgroundListening().catch((e) => log.error('Background op failed', e));
      }
    } catch (error) {
      log.error('Failed to handle speech result', error);
      this._setStage('error', (error as Error).message);
    }
  }

  private async _onSpeechError(error: any): Promise<void> {
    this._clearTimeout();
    try { await speechService.stopRecognition(); } catch (e) { log.error('Error stopping recognition', e); }
    this._setStage('error', error.error || 'Unknown error');
    if (shouldResumeBackgroundListening(this.config))
      await this.startBackgroundListening().catch((e) => log.error('Background op failed', e));
    else this._setStage('idle');
  }

  private _startSession(triggerType: 'menu-button' | 'wake-word'): void {
    this.sessionStartTime = Date.now(); this.sessionMetrics = createSessionMetrics(triggerType);
  }
  private _clearTimeout(): void {
    if (this.listenTimeoutHandle) { clearTimeout(this.listenTimeoutHandle); this.listenTimeoutHandle = null; }
  }
  private _setStage(stage: VoiceStage, errorMessage?: string): void {
    this.currentStage = stage;
    const eventData: Parameters<VoiceEventListener>[0] = { stage, metrics: this.sessionMetrics || undefined };
    if (errorMessage) eventData.error = errorMessage;
    this.eventListeners.forEach(listener => { try { listener(eventData); } catch (e) { log.error('Listener error', e); } });
  }

  addEventListener(listener: VoiceEventListener): void { this.eventListeners.push(listener); }
  removeEventListener(listener: VoiceEventListener): void { this.eventListeners = this.eventListeners.filter(l => l !== listener); }
  getStage(): VoiceStage { return this.currentStage; }
  getMetrics(): VoiceSessionMetrics | null { return this.sessionMetrics; }
  updateConfig(c: Partial<VoiceManagerConfig>): void { this.config = { ...this.config, ...c }; }
  isListening(): boolean { return ['listening', 'detected', 'wake-word'].includes(this.currentStage); }
  isProcessing(): boolean { return ['processing', 'responding'].includes(this.currentStage); }

  async cleanup(): Promise<void> {
    try {
      this._clearTimeout();
      try { await speechService.stopRecognition(); } catch (e) { log.error('Error stopping speech', e); }
      try { await wakeWordService.stopListening(); } catch (e) { log.error('Error stopping wake word', e); }
      try { await (await import('./tts')).ttsService.stop(); } catch (e) { log.error('Error stopping TTS', e); }
      this._setStage('idle');
      this._isWakeWordListening = false;
    } catch (error) { log.error('Error during cleanup', error); }
  }
}

export const voiceManager = new VoiceManager({
  listenTimeoutMs: config.voice.listenTimeoutMs, wakeWordLanguage: config.voice.defaultLanguage,
  speechLanguage: config.voice.speechLanguage, ttsLanguage: config.voice.ttsLanguage,
  ttsRate: config.voice.ttsRate, enableMetrics: true,
  enableBackgroundListening: config.voice.alwaysOnListening, triggerType: config.tv.voiceTrigger,
});
