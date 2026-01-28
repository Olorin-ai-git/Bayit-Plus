/**
 * TTS Service Shim for tvOS
 * Provides a no-op implementation since web TTS APIs are not available on tvOS
 * Voice functionality on tvOS is handled differently via native TurboModules
 */

import { EventEmitter } from 'eventemitter3';
import { logger } from '../utils/logger';

export interface TTSQueueItem {
  id: string;
  text: string;
  priority: 'high' | 'normal' | 'low';
  voiceId?: string;
  onStart?: () => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export interface TTSConfig {
  voiceId: string;
  language: 'he' | 'en' | 'es';
  model: 'eleven_v3' | 'eleven_turbo_v2' | 'eleven_monolingual_v1';
  stability: number;
  similarityBoost: number;
}

class TTSServiceShim extends EventEmitter {
  private _isEnabled = false;

  constructor() {
    super();
    logger.debug('tvOS shim initialized - TTS disabled on this platform', { module: 'TTS' });
  }

  async speak(text: string, options?: Partial<TTSQueueItem>): Promise<void> {
    logger.debug('speak() called on tvOS (no-op)', { module: 'TTS', textPreview: text.substring(0, 50) });
    // No-op on tvOS
    options?.onComplete?.();
  }

  async queueSpeak(text: string, options?: Partial<TTSQueueItem>): Promise<void> {
    logger.debug('queueSpeak() called on tvOS (no-op)', { module: 'TTS' });
    options?.onComplete?.();
  }

  stop(): void {
    logger.debug('stop() called on tvOS (no-op)', { module: 'TTS' });
  }

  pause(): void {
    logger.debug('pause() called on tvOS (no-op)', { module: 'TTS' });
  }

  resume(): void {
    logger.debug('resume() called on tvOS (no-op)', { module: 'TTS' });
  }

  clearQueue(): void {
    logger.debug('clearQueue() called on tvOS (no-op)', { module: 'TTS' });
  }

  setLanguage(language: 'he' | 'en' | 'es'): void {
    logger.debug('setLanguage() called on tvOS', { module: 'TTS', language });
  }

  setVoice(voiceId: string): void {
    logger.debug('setVoice() called on tvOS', { module: 'TTS', voiceId });
  }

  getConfig(): TTSConfig {
    return {
      voiceId: 'default',
      language: 'he',
      model: 'eleven_v3',
      stability: 0.5,
      similarityBoost: 0.75,
    };
  }

  updateConfig(config: Partial<TTSConfig>): void {
    logger.debug('updateConfig() called on tvOS', { module: 'TTS', config });
  }

  isPlayingAudio(): boolean {
    return false;
  }

  getQueueLength(): number {
    return 0;
  }

  enable(): void {
    this._isEnabled = true;
    logger.debug('enabled on tvOS (but remains no-op)', { module: 'TTS' });
  }

  disable(): void {
    this._isEnabled = false;
    logger.debug('disabled on tvOS', { module: 'TTS' });
  }

  isEnabled(): boolean {
    return this._isEnabled;
  }
}

export const ttsService = new TTSServiceShim();
export default ttsService;
