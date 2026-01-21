/**
 * TTS Service Shim for tvOS
 * Provides a no-op implementation since web TTS APIs are not available on tvOS
 * Voice functionality on tvOS is handled differently via native TurboModules
 */

import { EventEmitter } from 'eventemitter3';

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
  private isEnabled = false;

  constructor() {
    super();
    console.log('[TTS] tvOS shim initialized - TTS disabled on this platform');
  }

  async speak(text: string, options?: Partial<TTSQueueItem>): Promise<void> {
    console.log('[TTS] speak() called on tvOS (no-op):', text.substring(0, 50));
    // No-op on tvOS
    options?.onComplete?.();
  }

  async queueSpeak(text: string, options?: Partial<TTSQueueItem>): Promise<void> {
    console.log('[TTS] queueSpeak() called on tvOS (no-op)');
    options?.onComplete?.();
  }

  stop(): void {
    console.log('[TTS] stop() called on tvOS (no-op)');
  }

  pause(): void {
    console.log('[TTS] pause() called on tvOS (no-op)');
  }

  resume(): void {
    console.log('[TTS] resume() called on tvOS (no-op)');
  }

  clearQueue(): void {
    console.log('[TTS] clearQueue() called on tvOS (no-op)');
  }

  setLanguage(language: 'he' | 'en' | 'es'): void {
    console.log('[TTS] setLanguage() called on tvOS:', language);
  }

  setVoice(voiceId: string): void {
    console.log('[TTS] setVoice() called on tvOS:', voiceId);
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
    console.log('[TTS] updateConfig() called on tvOS:', config);
  }

  isPlayingAudio(): boolean {
    return false;
  }

  getQueueLength(): number {
    return 0;
  }

  enable(): void {
    this.isEnabled = true;
    console.log('[TTS] enabled on tvOS (but remains no-op)');
  }

  disable(): void {
    this.isEnabled = false;
    console.log('[TTS] disabled on tvOS');
  }

  isEnabled(): boolean {
    return this.isEnabled;
  }
}

export const ttsService = new TTSServiceShim();
export default ttsService;
