/**
 * Text-to-Speech Service
 * Provides Hebrew and English TTS via ElevenLabs API
 * Manages audio playback queue with priority system
 * NO MOCKS - Real API integration only
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
  language: 'he' | 'en';
  model: 'eleven_turbo_v2' | 'eleven_monolingual_v1';
  stability: number; // 0-1
  similarityBoost: number; // 0-1
}

interface CachedAudio {
  text: string;
  audioBlob: Blob;
  timestamp: number;
}

class TTSService extends EventEmitter {
  private playQueue: TTSQueueItem[] = [];
  private currentPlayback: HTMLAudioElement | null = null;
  private isPlaying = false;
  private audioContext: AudioContext | null = null;
  private audioCache: Map<string, CachedAudio> = new Map();
  private CACHE_EXPIRY_MS = 1000 * 60 * 60; // 1 hour
  private MAX_CACHE_SIZE = 100;
  private API_ENDPOINT = '/api/v1/text-to-speech';

  private config: TTSConfig = {
    voiceId: 'EXAVITQu4VqLrzJuXi3n', // Default Hebrew female voice (ElevenLabs)
    language: 'he',
    model: 'eleven_turbo_v2',
    stability: 0.5,
    similarityBoost: 0.75,
  };

  constructor() {
    super();
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  /**
   * Speak text with priority queuing
   * HIGH priority stops current playback and plays immediately
   * NORMAL priority queues after current
   * LOW priority skips if already playing
   */
  async speak(
    text: string,
    priority: 'high' | 'normal' | 'low' = 'normal',
    voiceId?: string,
    callbacks?: { onStart?: () => void; onComplete?: () => void; onError?: (e: Error) => void }
  ): Promise<void> {
    const id = `${Date.now()}-${Math.random()}`;

    if (priority === 'high') {
      // Stop current playback and clear queue
      this.stop();
      this.playQueue = [];
    } else if (priority === 'low' && this.isPlaying) {
      // Skip if already playing
      return;
    }

    const queueItem: TTSQueueItem = {
      id,
      text,
      priority,
      voiceId,
      onStart: callbacks?.onStart,
      onComplete: callbacks?.onComplete,
      onError: callbacks?.onError,
    };

    this.playQueue.push(queueItem);
    this.emit('queue-updated', { length: this.playQueue.length });

    // Process queue if not playing
    if (!this.isPlaying) {
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.playQueue.length === 0 || this.isPlaying) {
      return;
    }

    // Sort by priority
    this.playQueue.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    const item = this.playQueue.shift();
    if (!item) return;

    this.isPlaying = true;
    this.emit('playing', item);

    try {
      item.onStart?.();

      // Try cache first
      const cacheKey = `${item.text}-${item.voiceId || this.config.voiceId}`;
      let audioBlob = await this.getCachedAudio(cacheKey);

      // If not in cache, fetch from API
      if (!audioBlob) {
        audioBlob = await this.fetchAudioFromAPI(
          item.text,
          item.voiceId || this.config.voiceId
        );

        // Cache the audio
        this.cacheAudio(cacheKey, item.text, audioBlob);
      }

      // Play the audio
      await this.playAudio(audioBlob);

      item.onComplete?.();
      this.emit('completed', item);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      item.onError?.(err);
      this.emit('error', { item, error: err });
    } finally {
      this.isPlaying = false;
      // Process next in queue
      await this.processQueue();
    }
  }

  private async fetchAudioFromAPI(text: string, voiceId: string): Promise<Blob> {
    // Get auth token from store
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Authentication required for TTS');
    }

    const response = await fetch(this.API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        text,
        voice_id: voiceId,
        language: this.config.language,
        model_id: this.config.model,
        voice_settings: {
          stability: this.config.stability,
          similarity_boost: this.config.similarityBoost,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`TTS API failed: ${response.statusText}`);
    }

    return response.blob();
  }

  private async playAudio(blob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Stop current playback
        if (this.currentPlayback) {
          this.currentPlayback.pause();
          this.currentPlayback.src = '';
        }

        // Create new audio element
        const audio = new Audio();
        audio.src = URL.createObjectURL(blob);
        audio.volume = this.getVolume();

        // Apply audio ducking if video is playing
        this.applyAudioDucking(audio, true);

        audio.onended = () => {
          URL.revokeObjectURL(audio.src);
          this.applyAudioDucking(audio, false);
          resolve();
        };

        audio.onerror = () => {
          URL.revokeObjectURL(audio.src);
          this.applyAudioDucking(audio, false);
          reject(new Error('Audio playback failed'));
        };

        this.currentPlayback = audio;
        audio.play().catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  private applyAudioDucking(audio: HTMLAudioElement, isDucking: boolean): void {
    const videoElement = document.querySelector('video') as HTMLVideoElement | null;
    if (!videoElement) return;

    if (isDucking) {
      // Lower video volume to 20%
      const originalVolume = videoElement.volume;
      videoElement.dataset.originalVolume = String(originalVolume);
      videoElement.volume = originalVolume * 0.2;
    } else {
      // Restore original volume
      const originalVolume = parseFloat(videoElement.dataset.originalVolume || '1');
      videoElement.volume = originalVolume;
    }
  }

  private async getCachedAudio(key: string): Promise<Blob | null> {
    const cached = this.audioCache.get(key);
    if (!cached) return null;

    // Check if cache expired
    if (Date.now() - cached.timestamp > this.CACHE_EXPIRY_MS) {
      this.audioCache.delete(key);
      return null;
    }

    return cached.audioBlob;
  }

  private cacheAudio(key: string, text: string, blob: Blob): void {
    // Implement simple LRU: remove oldest if cache is full
    if (this.audioCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.audioCache.keys().next().value;
      this.audioCache.delete(firstKey);
    }

    this.audioCache.set(key, {
      text,
      audioBlob: blob,
      timestamp: Date.now(),
    });
  }

  async preloadCommonPhrases(): Promise<void> {
    const commonPhrases = [
      { text: 'שלום', voiceId: this.config.voiceId },
      { text: 'הנה מה שמצאתי עבורך', voiceId: this.config.voiceId },
      { text: 'מעבד את הבקשה', voiceId: this.config.voiceId },
      { text: 'ברוך הבא', voiceId: this.config.voiceId },
      { text: 'רוצה להמשיך לצפות?', voiceId: this.config.voiceId },
    ];

    for (const phrase of commonPhrases) {
      try {
        const cacheKey = `${phrase.text}-${phrase.voiceId}`;
        const existing = await this.getCachedAudio(cacheKey);
        if (!existing) {
          const blob = await this.fetchAudioFromAPI(phrase.text, phrase.voiceId);
          this.cacheAudio(cacheKey, phrase.text, blob);
        }
      } catch (error) {
        console.warn('Failed to preload phrase:', phrase.text, error);
        // Continue with other phrases
      }
    }

    this.emit('preload-complete');
  }

  stop(): void {
    if (this.currentPlayback) {
      this.currentPlayback.pause();
      this.currentPlayback.src = '';
      this.currentPlayback = null;
    }
    this.isPlaying = false;
    this.emit('stopped');
  }

  pause(): void {
    if (this.currentPlayback) {
      this.currentPlayback.pause();
    }
  }

  resume(): void {
    if (this.currentPlayback) {
      this.currentPlayback.play();
    }
  }

  clearQueue(): void {
    this.playQueue = [];
    this.emit('queue-cleared');
  }

  setVoice(voiceId: string): void {
    this.config.voiceId = voiceId;
  }

  setLanguage(language: 'he' | 'en'): void {
    this.config.language = language;
  }

  setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    localStorage.setItem('tts-volume', String(clamped));
    if (this.currentPlayback) {
      this.currentPlayback.volume = clamped;
    }
  }

  private getVolume(): number {
    const saved = localStorage.getItem('tts-volume');
    return saved ? parseFloat(saved) : 1;
  }

  getQueueLength(): number {
    return this.playQueue.length;
  }

  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  clearCache(): void {
    this.audioCache.clear();
  }
}

// Singleton instance
export const ttsService = new TTSService();

export default ttsService;
