/**
 * Text-to-Speech Service
 * Provides Hebrew, English, and Spanish TTS via ElevenLabs API
 * Manages audio playback queue with priority system
 * Syncs language with i18n configuration
 * NO MOCKS - Real API integration only
 */

import { EventEmitter } from 'eventemitter3';
import i18n from '../i18n';

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
  private API_ENDPOINT: string;

  private getApiEndpoint(): string {
    // For development with separate backend (localhost:8000)
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return 'http://localhost:8000/api/v1/chat/text-to-speech';
    }
    // For production, use relative path (handled by reverse proxy)
    return '/api/v1/chat/text-to-speech';
  }

  private config: TTSConfig = {
    voiceId: this.getDefaultVoiceId(),
    language: (typeof window !== 'undefined' && (i18n.language as 'he' | 'en' | 'es')) || 'he',
    model: 'eleven_v3',
    stability: 0.5,
    similarityBoost: 0.75,
  };

  private getDefaultVoiceId(): string {
    // Use env variable from Vite config, otherwise fallback to Rachel (multilingual, excellent for Hebrew)
    return (import.meta.env.VITE_ELEVENLABS_DEFAULT_VOICE_ID as string) || 'EXAVITQu4vr4xnSDxMaL'; // Default: Rachel - multilingual voice
  }

  constructor() {
    super();
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Initialize with current i18n language
      const currentLang = i18n.language as 'he' | 'en' | 'es' || 'he';
      this.config.language = currentLang;
      console.log('[TTS] Initialized with language:', currentLang);

      // Listen to i18n language changes
      i18n.on('languageChanged', (lng: string) => {
        console.log('[TTS] Language changed event received:', lng);
        this.setLanguage(lng as 'he' | 'en' | 'es');
      });
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

    console.log('[TTS] speak() called:', {
      id,
      priority,
      text: text.substring(0, 50),
      voiceId: voiceId || this.config.voiceId,
      language: this.config.language,
      currentlyPlaying: this.isPlaying,
      queueLength: this.playQueue.length,
    });

    if (priority === 'high') {
      // Stop current playback and clear queue
      console.log('[TTS] HIGH priority: stopping current playback and clearing queue');
      this.stop();
      this.playQueue = [];
    } else if (priority === 'low' && this.isPlaying) {
      // Skip if already playing
      console.log('[TTS] LOW priority and already playing, skipping');
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
    console.log('[TTS] Added to queue, new queue length:', this.playQueue.length);
    this.emit('queue-updated', { length: this.playQueue.length });

    // Process queue if not playing
    if (!this.isPlaying) {
      console.log('[TTS] Not currently playing, processing queue immediately');
      await this.processQueue();
    } else {
      console.log('[TTS] Currently playing, will process queue after current playback');
    }
  }

  private async processQueue(): Promise<void> {
    if (this.playQueue.length === 0 || this.isPlaying) {
      return;
    }

    console.log('[TTS] Processing queue, items:', this.playQueue.length);

    // Sort by priority
    this.playQueue.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    const item = this.playQueue.shift();
    if (!item) return;

    console.log('[TTS] Playing queue item:', { id: item.id, priority: item.priority, text: item.text.substring(0, 50) });

    this.isPlaying = true;
    this.emit('playing', item);

    try {
      console.log('[TTS] Calling onStart callback');
      item.onStart?.();

      // Try cache first
      const cacheKey = `${item.text}-${item.voiceId || this.config.voiceId}`;
      console.log('[TTS] Checking cache for key:', cacheKey);
      let audioBlob = await this.getCachedAudio(cacheKey);

      // If not in cache, fetch from API
      if (!audioBlob) {
        console.log('[TTS] Not in cache, fetching from API');
        audioBlob = await this.fetchAudioFromAPI(
          item.text,
          item.voiceId || this.config.voiceId
        );

        // Cache the audio
        console.log('[TTS] Caching audio for text:', item.text.substring(0, 100) + (item.text.length > 100 ? '...' : ''));
        this.cacheAudio(cacheKey, item.text, audioBlob);
      } else {
        console.log('[TTS] Using cached audio');
      }

      // Play the audio
      console.log('[TTS] Calling playAudio');
      await this.playAudio(audioBlob);

      console.log('[TTS] Playback completed, calling onComplete');
      item.onComplete?.();
      this.emit('completed', item);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('[TTS] Queue processing error:', err);
      item.onError?.(err);
      this.emit('error', { item, error: err });
    } finally {
      this.isPlaying = false;
      // Process next in queue
      console.log('[TTS] Processing next in queue');
      await this.processQueue();
    }
  }

  private async fetchAudioFromAPI(text: string, voiceId: string): Promise<Blob> {
    console.log('[TTS] Fetching audio from API:', { text: text.substring(0, 50), voiceId, language: this.config.language });

    // Get auth token from localStorage (stored by Zustand persist middleware)
    let token: string | null = null;

    try {
      // Try to get from Zustand persist store (bayit-auth key)
      const authData = localStorage.getItem('bayit-auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        token = parsed?.state?.token;
        console.log('[TTS] Retrieved token from bayit-auth store:', !!token);
      }

      // Fallback: check old auth_token key (legacy)
      if (!token) {
        token = localStorage.getItem('auth_token');
        if (token) {
          console.log('[TTS] Retrieved token from legacy auth_token key');
        }
      }
    } catch (error) {
      console.error('[TTS] Error parsing auth token from localStorage:', error);
    }

    if (!token) {
      console.error('[TTS] No auth token found in localStorage');
      throw new Error('Authentication required for TTS');
    }

    try {
      const apiUrl = this.getApiEndpoint();
      console.log('[TTS] Fetching from API URL:', apiUrl);
      const response = await fetch(apiUrl, {
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

      console.log('[TTS] API response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[TTS] API error response:', errorText);
        throw new Error(`TTS API failed: ${response.statusText} - ${errorText}`);
      }

      const blob = await response.blob();
      console.log('[TTS] Audio blob received, size:', blob.size, 'type:', blob.type);

      if (blob.size === 0) {
        console.error('[TTS] Received empty audio blob from API');
        throw new Error('API returned empty audio blob');
      }

      return blob;
    } catch (error) {
      console.error('[TTS] fetchAudioFromAPI error:', error);
      throw error;
    }
  }

  private async playAudio(blob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log('[TTS] Starting audio playback, blob size:', blob.size);

        // Validate blob
        if (!blob || blob.size === 0) {
          console.error('[TTS] Invalid blob: empty or null');
          reject(new Error('Invalid audio blob: empty or null'));
          return;
        }

        // Stop current playback
        if (this.currentPlayback) {
          this.currentPlayback.pause();
          this.currentPlayback.src = '';
        }

        // Create new audio element
        const audio = new Audio();
        const objectUrl = URL.createObjectURL(blob);
        audio.src = objectUrl;
        audio.volume = this.getVolume();

        console.log('[TTS] Audio element created, url:', objectUrl, 'volume:', audio.volume);

        // Apply audio ducking if video is playing
        this.applyAudioDucking(audio, true);

        // Cleanup function
        const cleanup = () => {
          try {
            URL.revokeObjectURL(objectUrl);
          } catch (e) {
            console.warn('[TTS] Error revoking object URL:', e);
          }
          this.applyAudioDucking(audio, false);
        };

        // Track if callback has been called
        let callbackCalled = false;
        const safeResolve = () => {
          if (!callbackCalled) {
            callbackCalled = true;
            cleanup();
            resolve();
          }
        };

        const safeReject = (error: Error) => {
          if (!callbackCalled) {
            callbackCalled = true;
            cleanup();
            reject(error);
          }
        };

        // Timeout after 30 seconds to prevent hanging
        const timeoutId = setTimeout(() => {
          console.warn('[TTS] Audio playback timeout after 30s');
          safeReject(new Error('Audio playback timeout'));
        }, 30000);

        audio.oncanplay = () => {
          console.log('[TTS] Audio ready to play');
        };

        audio.onloadedmetadata = () => {
          console.log('[TTS] Audio metadata loaded, duration:', audio.duration);
        };

        audio.onplaying = () => {
          console.log('[TTS] Audio playback started');
        };

        audio.onended = () => {
          console.log('[TTS] Audio playback completed');
          clearTimeout(timeoutId);
          safeResolve();
        };

        audio.onerror = (event) => {
          console.error('[TTS] Audio error:', event, 'error code:', audio.error?.code, audio.error?.message);
          clearTimeout(timeoutId);
          safeReject(new Error(`Audio playback error: ${audio.error?.message || 'Unknown error'}`));
        };

        this.currentPlayback = audio;

        // Attempt to play and handle promise rejection (e.g., autoplay blocked)
        const playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch((playError) => {
            console.error('[TTS] Play promise rejected:', playError);
            clearTimeout(timeoutId);
            safeReject(new Error(`Play failed: ${playError.message || String(playError)}`));
          });
        }
      } catch (error) {
        console.error('[TTS] Exception in playAudio:', error);
        reject(error instanceof Error ? error : new Error(String(error)));
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

  setLanguage(language: 'he' | 'en' | 'es'): void {
    console.log('[TTS] setLanguage() called with:', language);
    this.config.language = language;
    // Use configured voice for all languages
    this.config.voiceId = this.getDefaultVoiceId();
    this.emit('language-changed', language);
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
