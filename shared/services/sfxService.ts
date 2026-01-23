/**
 * Sound Effects Service
 * Fetches and plays wizard gesture sound effects via ElevenLabs API
 * Caches audio for performance and offline support
 */

import { EventEmitter } from 'eventemitter3';

export type WizardGesture = 'conjuring' | 'thinking' | 'clapping' | 'cheering';

interface CachedSFX {
  gesture: WizardGesture;
  audioBlob: Blob;
  objectUrl: string;
  timestamp: number;
}

class SFXService extends EventEmitter {
  private cache: Map<WizardGesture, CachedSFX> = new Map();
  private currentAudio: HTMLAudioElement | null = null;
  private isPlaying = false;
  private volume = 0.7; // Default SFX volume (slightly lower than speech)
  private CACHE_EXPIRY_MS = 1000 * 60 * 60 * 24; // 24 hours

  private getApiEndpoint(): string {
    // For development with separate backend (localhost:8001)
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return 'http://localhost:8001/api/v1/chat/sound-effect';
    }
    // For production, use relative path (handled by reverse proxy)
    return '/api/v1/chat/sound-effect';
  }

  private getAuthToken(): string | null {
    try {
      // Try to get from Zustand persist store (bayit-auth key)
      const authData = localStorage.getItem('bayit-auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed?.state?.token || null;
      }
      // Fallback: check old auth_token key (legacy)
      return localStorage.getItem('auth_token');
    } catch (error) {
      console.error('[SFX] Error parsing auth token:', error);
      return null;
    }
  }

  /**
   * Preload a wizard gesture sound effect
   * Call this during app initialization for commonly used gestures
   */
  async preload(gesture: WizardGesture): Promise<void> {
    // Check if already cached and not expired
    const cached = this.cache.get(gesture);
    if (cached && Date.now() - cached.timestamp < this.CACHE_EXPIRY_MS) {
      console.log(`[SFX] ${gesture} already cached`);
      return;
    }

    console.log(`[SFX] Preloading ${gesture} sound effect...`);

    try {
      const audioBlob = await this.fetchSFX(gesture);
      this.cacheAudio(gesture, audioBlob);
      console.log(`[SFX] ${gesture} preloaded successfully`);
    } catch (error) {
      console.error(`[SFX] Failed to preload ${gesture}:`, error);
      // Don't throw - preload failures shouldn't break the app
    }
  }

  /**
   * Preload all wizard gesture sounds
   */
  async preloadAll(): Promise<void> {
    const gestures: WizardGesture[] = ['conjuring', 'thinking', 'clapping', 'cheering'];
    await Promise.allSettled(gestures.map(g => this.preload(g)));
    this.emit('preload-complete');
  }

  /**
   * Play a wizard gesture sound effect
   * Will fetch if not cached
   */
  async play(gesture: WizardGesture): Promise<void> {
    console.log(`[SFX] Playing ${gesture}...`);

    try {
      // Check cache first
      let cached = this.cache.get(gesture);

      // Fetch if not cached or expired
      if (!cached || Date.now() - cached.timestamp >= this.CACHE_EXPIRY_MS) {
        console.log(`[SFX] ${gesture} not in cache, fetching...`);
        const audioBlob = await this.fetchSFX(gesture);
        cached = this.cacheAudio(gesture, audioBlob);
      }

      // Stop any current playback
      this.stop();

      // Play the audio
      await this.playAudio(cached.objectUrl);

      this.emit('played', gesture);
    } catch (error) {
      console.error(`[SFX] Failed to play ${gesture}:`, error);
      this.emit('error', { gesture, error });
      throw error;
    }
  }

  /**
   * Stop current SFX playback
   */
  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    this.isPlaying = false;
    this.emit('stopped');
  }

  /**
   * Set SFX volume (0-1)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.currentAudio) {
      this.currentAudio.volume = this.volume;
    }
    localStorage.setItem('sfx-volume', String(this.volume));
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    const saved = localStorage.getItem('sfx-volume');
    if (saved) {
      this.volume = parseFloat(saved);
    }
    return this.volume;
  }

  /**
   * Check if currently playing
   */
  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Clear the SFX cache
   */
  clearCache(): void {
    // Revoke all object URLs to free memory
    for (const cached of this.cache.values()) {
      URL.revokeObjectURL(cached.objectUrl);
    }
    this.cache.clear();
    console.log('[SFX] Cache cleared');
  }

  private async fetchSFX(gesture: WizardGesture): Promise<Blob> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('Authentication required for SFX');
    }

    const apiUrl = `${this.getApiEndpoint()}/${gesture}`;
    console.log(`[SFX] Fetching from: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SFX API failed: ${response.statusText} - ${errorText}`);
    }

    const blob = await response.blob();
    console.log(`[SFX] Received ${blob.size} bytes for ${gesture}`);

    if (blob.size === 0) {
      throw new Error('API returned empty audio blob');
    }

    return blob;
  }

  private cacheAudio(gesture: WizardGesture, audioBlob: Blob): CachedSFX {
    // Revoke old URL if exists
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

      audio.onerror = (event) => {
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

// Singleton instance
export const sfxService = new SFXService();

export default sfxService;
