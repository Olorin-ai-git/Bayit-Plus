/**
 * Sound Effects Service
 * Fetches and plays wizard gesture sound effects via ElevenLabs API
 * Caches audio for performance and offline support
 *
 * Requires setApiClient() to be called with the platform's centralized api
 * instance before any fetch operations (web uses web/src/services/api.js).
 */

import { EventEmitter } from 'eventemitter3';
import { logger } from '../utils/logger';

const sfxLogger = logger.scope('SFX');

export type WizardGesture = 'conjuring' | 'thinking' | 'clapping' | 'cheering';

interface CachedSFX {
  gesture: WizardGesture;
  audioBlob: Blob;
  objectUrl: string;
  timestamp: number;
}

/** Minimal interface for the injected API client (web api.js returns unwrapped data) */
interface ApiClient {
  post(url: string, data?: unknown, config?: Record<string, unknown>): Promise<unknown>;
}

class SFXService extends EventEmitter {
  private cache: Map<WizardGesture, CachedSFX> = new Map();
  private currentAudio: HTMLAudioElement | null = null;
  private isPlaying = false;
  private volume = 0.7;
  private CACHE_EXPIRY_MS = 1000 * 60 * 60 * 24; // 24 hours
  private apiClient: ApiClient | null = null;

  /**
   * Inject the platform's centralized API client.
   * Must be called once at app startup before any SFX operations.
   */
  setApiClient(client: ApiClient): void {
    this.apiClient = client;
  }

  async preload(gesture: WizardGesture): Promise<void> {
    const cached = this.cache.get(gesture);
    if (cached && Date.now() - cached.timestamp < this.CACHE_EXPIRY_MS) {
      return;
    }

    sfxLogger.info('Preloading sound effect', { gesture });

    try {
      const audioBlob = await this.fetchSFX(gesture);
      this.cacheAudio(gesture, audioBlob);
    } catch (error) {
      sfxLogger.error('Failed to preload sound effect', {
        gesture,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  async preloadAll(): Promise<void> {
    const gestures: WizardGesture[] = ['conjuring', 'thinking', 'clapping', 'cheering'];
    await Promise.allSettled(gestures.map(g => this.preload(g)));
    this.emit('preload-complete');
  }

  async play(gesture: WizardGesture): Promise<void> {
    try {
      let cached = this.cache.get(gesture);

      if (!cached || Date.now() - cached.timestamp >= this.CACHE_EXPIRY_MS) {
        const audioBlob = await this.fetchSFX(gesture);
        cached = this.cacheAudio(gesture, audioBlob);
      }

      this.stop();
      await this.playAudio(cached.objectUrl);
      this.emit('played', gesture);
    } catch (error) {
      sfxLogger.warn('Sound effect unavailable, continuing without audio', {
        gesture,
        error: error instanceof Error ? error.message : String(error),
      });
      this.emit('error', { gesture, error });
    }
  }

  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    this.isPlaying = false;
    this.emit('stopped');
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.currentAudio) {
      this.currentAudio.volume = this.volume;
    }
    localStorage.setItem('sfx-volume', String(this.volume));
  }

  getVolume(): number {
    const saved = localStorage.getItem('sfx-volume');
    if (saved) {
      this.volume = parseFloat(saved);
    }
    return this.volume;
  }

  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  clearCache(): void {
    const cacheSize = this.cache.size;
    for (const cached of this.cache.values()) {
      URL.revokeObjectURL(cached.objectUrl);
    }
    this.cache.clear();
    sfxLogger.info('Sound effects cache cleared', { itemsCleared: cacheSize });
  }

  private async fetchSFX(gesture: WizardGesture): Promise<Blob> {
    if (!this.apiClient) {
      throw new Error('SFX API client not initialized. Call sfxService.setApiClient(api) at app startup.');
    }

    // api.js response interceptor returns response.data directly (unwrapped)
    const blob = await this.apiClient.post(
      `/chat/sound-effect/${gesture}`,
      null,
      { responseType: 'blob' }
    ) as unknown as Blob;

    if (!blob || blob.size === 0) {
      throw new Error('API returned empty audio blob');
    }

    return blob;
  }

  private cacheAudio(gesture: WizardGesture, audioBlob: Blob): CachedSFX {
    const existing = this.cache.get(gesture);
    if (existing) {
      URL.revokeObjectURL(existing.objectUrl);
    }

    const cached: CachedSFX = {
      gesture,
      audioBlob,
      objectUrl: URL.createObjectURL(audioBlob),
      timestamp: Date.now(),
    };

    this.cache.set(gesture, cached);
    return cached;
  }

  private async playAudio(objectUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(objectUrl);
      audio.volume = this.getVolume();

      this.currentAudio = audio;
      this.isPlaying = true;

      audio.onended = () => {
        this.isPlaying = false;
        this.currentAudio = null;
        resolve();
      };

      audio.onerror = () => {
        this.isPlaying = false;
        this.currentAudio = null;
        reject(new Error(`Audio playback error: ${audio.error?.message || 'Unknown'}`));
      };

      const playPromise = audio.play();
      if (playPromise) {
        playPromise.catch((error) => {
          this.isPlaying = false;
          this.currentAudio = null;
          reject(error);
        });
      }
    });
  }
}

export const sfxService = new SFXService();

export default sfxService;
