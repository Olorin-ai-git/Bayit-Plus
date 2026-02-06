import { speechService } from './speech';
import { wakeWordService } from './wakeWord';
import { createVoiceOrchestrator, OlorinVoiceOrchestrator } from '@bayit/shared/services/olorinVoiceOrchestrator';
import { useSupportStore } from '@bayit/shared/stores/supportStore';
import logger from '@/utils/logger';
import { processSpeechResult } from './voiceSpeechProcessor';
import {
  VoiceStage, VoiceSessionMetrics, VoiceEventListener, VoiceManagerConfig,
  createSessionMetrics,
} from './voiceTypes';

export type { VoiceStage, VoiceSessionMetrics, VoiceEventListener, VoiceManagerConfig };

const moduleLogger = logger.scope('voiceManager');

class VoiceManager {
  private currentStage: VoiceStage = 'idle';
  private config: Required<VoiceManagerConfig>;
  private eventListeners: VoiceEventListener[] = [];
  private listenTimeoutHandle: NodeJS.Timeout | null = null;
  private sessionMetrics: VoiceSessionMetrics | null = null;
  private sessionStartTime: number = 0;
  private isWakeWordListening: boolean = false;
  private orchestrator: OlorinVoiceOrchestrator | null = null;

  constructor(c: VoiceManagerConfig = {}) {
    this.config = {
      listenTimeoutMs: c.listenTimeoutMs ?? 30000,
      wakeWordTimeoutMs: c.wakeWordTimeoutMs ?? 0,
      wakeWordLanguage: c.wakeWordLanguage ?? 'he',
      speechLanguage: c.speechLanguage ?? 'he',
      ttsLanguage: c.ttsLanguage ?? 'he',
      ttsRate: c.ttsRate ?? 1.0,
      enableMetrics: c.enableMetrics ?? true,
      enableBackgroundListening: c.enableBackgroundListening ?? false,
    };
    this._setupEventListeners();
    this._initializeOrchestrator();
  }

  private async _initializeOrchestrator(): Promise<void> {
    try {
      const store = useSupportStore.getState();
      this.orchestrator = createVoiceOrchestrator({
        platform: 'ios', language: this.config.speechLanguage, streamingMode: false,
        wakeWordEnabled: this.config.enableBackgroundListening,
        initialAvatarMode: store.avatarVisibilityMode, autoExpandOnWakeWord: true, collapseDelay: 10000,
      });
      await this.orchestrator.initialize();
      moduleLogger.debug('Orchestrator initialized');
    } catch (error) { moduleLogger.error('Failed to initialize orchestrator', error); }
  }

  private _setupEventListeners(): void {
    wakeWordService.addDetectionListener((d) => this._onWakeWordDetected(d));
    speechService.addResultListener((r) => this._onSpeechResult(r));
    speechService.addErrorListener((e) => this._onSpeechError(e));
  }

  async startBackgroundListening(): Promise<void> {
    if (this.isWakeWordListening) return;
    try {
      await wakeWordService.setLanguage(this.config.wakeWordLanguage);
      await wakeWordService.startListening();
      this.isWakeWordListening = true;
      this._setStage('wake-word');
      if (this.config.wakeWordTimeoutMs > 0) {
        this.listenTimeoutHandle = setTimeout(async () => {
          await this.stopBackgroundListening(); this._setStage('timeout');
        }, this.config.wakeWordTimeoutMs);
      }
    } catch (error) {
      moduleLogger.error('Failed to start background listening', error);
      this._setStage('error', (error as Error).message); throw error;
    }
  }

  async stopBackgroundListening(): Promise<void> {
    if (!this.isWakeWordListening) return;
    try {
      await wakeWordService.stopListening();
      this.isWakeWordListening = false; this._clearTimeout(); this._setStage('idle');
    } catch (error) { moduleLogger.error('Failed to stop background listening', error); throw error; }
  }

  async startManualListening(): Promise<void> {
    try {
      if (this.isWakeWordListening) await this.stopBackgroundListening();
      this._startSession(); this._setStage('listening');
      await speechService.setLanguage(this.config.speechLanguage);
      await speechService.startRecognition();
      this.listenTimeoutHandle = setTimeout(async () => {
        await this.stopListening(); this._setStage('timeout');
      }, this.config.listenTimeoutMs);
    } catch (error) {
      moduleLogger.error('Failed to start manual listening', error);
      this._setStage('error', (error as Error).message); throw error;
    }
  }

  async stopListening(): Promise<void> {
    try {
      await speechService.stopRecognition(); this._clearTimeout();
      if (this.config.enableBackgroundListening) await this.startBackgroundListening();
      else this._setStage('idle');
    } catch (error) { moduleLogger.error('Failed to stop listening', error); throw error; }
  }

  private async _onWakeWordDetected(detection: any): Promise<void> {
    try {
      await this.stopBackgroundListening();
      if (this.orchestrator) await this.orchestrator.startListening('wake-word');
      useSupportStore.getState().onWakeWordDetected();
      this._startSession();
      if (this.config.enableMetrics && this.sessionMetrics)
        this.sessionMetrics.wakeWordTime = Date.now() - this.sessionStartTime;
      this._setStage('detected');
      await new Promise(resolve => setTimeout(resolve, 300));
      this._setStage('listening');
      await speechService.setLanguage(this.config.speechLanguage);
      await speechService.startRecognition();
      this.listenTimeoutHandle = setTimeout(async () => {
        await speechService.stopRecognition(); this._setStage('timeout');
        await this.startBackgroundListening();
      }, this.config.listenTimeoutMs);
    } catch (error) {
      moduleLogger.error('Failed to handle wake word', error);
      this._setStage('error', (error as Error).message);
      await this.startBackgroundListening().catch((e) => moduleLogger.error('Background op failed', e));
    }
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
        if (this.config.enableBackgroundListening) await this.startBackgroundListening();
        else this._setStage('idle');
      } else {
        this._setStage('error', processResult.errorMessage);
        if (this.config.enableBackgroundListening)
          await this.startBackgroundListening().catch((e) => moduleLogger.error('Background op failed', e));
      }
    } catch (error) {
      moduleLogger.error('Failed to handle speech result', error);
      this._setStage('error', (error as Error).message);
    }
  }

  private async _onSpeechError(error: any): Promise<void> {
    this._clearTimeout();
    try { await speechService.stopRecognition(); } catch (e) { moduleLogger.error('Error stopping recognition', e); }
    this._setStage('error', error.error || 'Unknown error');
    if (this.config.enableBackgroundListening) await this.startBackgroundListening().catch((e) => moduleLogger.error('Background op failed', e));
    else this._setStage('idle');
  }

  private _startSession(): void {
    this.sessionStartTime = Date.now(); this.sessionMetrics = createSessionMetrics();
  }
  private _clearTimeout(): void {
    if (this.listenTimeoutHandle) { clearTimeout(this.listenTimeoutHandle); this.listenTimeoutHandle = null; }
  }
  private _setStage(stage: VoiceStage, errorMessage?: string): void {
    this.currentStage = stage;
    const eventData: Parameters<VoiceEventListener>[0] = { stage, metrics: this.sessionMetrics || undefined };
    if (errorMessage) eventData.error = errorMessage;
    this.eventListeners.forEach(listener => { try { listener(eventData); } catch (e) { moduleLogger.error('Listener error', e); } });
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
      try { await speechService.stopRecognition(); } catch (e) { moduleLogger.error('Error stopping speech', e); }
      try { await wakeWordService.stopListening(); } catch (e) { moduleLogger.error('Error stopping wake word', e); }
      try { const { ttsService } = await import('./tts'); await ttsService.stop(); } catch (e) { moduleLogger.error('Error stopping TTS', e); }
      this._setStage('idle');
      this.isWakeWordListening = false;
    } catch (error) { moduleLogger.error('Error during cleanup', error); }
  }
}

export const voiceManager = new VoiceManager({
  listenTimeoutMs: 30000, wakeWordLanguage: 'he', speechLanguage: 'he',
  ttsLanguage: 'he', enableMetrics: true, enableBackgroundListening: true,
});
