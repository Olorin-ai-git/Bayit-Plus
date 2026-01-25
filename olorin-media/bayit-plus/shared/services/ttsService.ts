/**
 * Text-to-Speech Service
 * Provides multi-language TTS via ElevenLabs API
 * Supports 10 languages: Hebrew, English, Spanish, Chinese, French, Italian, Hindi, Tamil, Bengali, Japanese
 * Manages audio playback queue with priority system
 * Syncs language with i18n configuration
 * NO MOCKS - Real API integration only
 */

import { EventEmitter } from 'eventemitter3';
import i18n from '../i18n';
import type { VoiceLanguage } from './api/types';
import { logger } from '../utils/logger';

// Scoped logger for TTS service with voice-specific context
const ttsLogger = logger.scope('TTS');

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
  language: VoiceLanguage;
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
    language: (typeof window !== 'undefined' && (i18n.language as VoiceLanguage)) || 'he',
    model: 'eleven_v3',
    stability: 0.5,
    similarityBoost: 0.75,
  };

  /**
   * Language-specific voice mapping for optimal quality
   * Uses ElevenLabs multilingual voices configured for each language
   */
  private getLanguageVoiceId(language: VoiceLanguage): string {
    const languageVoices: Record<VoiceLanguage, string> = {
      he: 'EXAVITQu4vr4xnSDxMaL', // Rachel - multilingual (Hebrew optimized)
      en: 'EXAVITQu4vr4xnSDxMaL', // Rachel - multilingual (English)
      es: 'EXAVITQu4vr4xnSDxMaL', // Rachel - multilingual (Spanish)
      zh: 'EXAVITQu4vr4xnSDxMaL', // Rachel - multilingual (Chinese)
      fr: 'EXAVITQu4vr4xnSDxMaL', // Rachel - multilingual (French)
      it: 'EXAVITQu4vr4xnSDxMaL', // Rachel - multilingual (Italian)
      hi: 'EXAVITQu4vr4xnSDxMaL', // Rachel - multilingual (Hindi)
      ta: 'EXAVITQu4vr4xnSDxMaL', // Rachel - multilingual (Tamil)
      bn: 'EXAVITQu4vr4xnSDxMaL', // Rachel - multilingual (Bengali)
      ja: 'EXAVITQu4vr4xnSDxMaL', // Rachel - multilingual (Japanese)
    };

    return languageVoices[language] || this.getDefaultVoiceId();
  }

  private getDefaultVoiceId(): string {
    // Use env variable from config, otherwise fallback to Rachel (multilingual, excellent for all 10 languages)
    // Note: Using process.env for React Native compatibility (Vite's import.meta.env not supported by Hermes)
    try {
      const envVoiceId = typeof process !== 'undefined' && process.env?.VITE_ELEVENLABS_DEFAULT_VOICE_ID;
      return envVoiceId || 'EXAVITQu4vr4xnSDxMaL'; // Default: Rachel - multilingual voice
    } catch {
      return 'EXAVITQu4vr4xnSDxMaL'; // Default: Rachel - multilingual voice
    }
  }

  constructor() {
    super();
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Initialize with current i18n language
      const currentLang = i18n.language as VoiceLanguage || 'he';
      this.config.language = currentLang;

      // Listen to i18n language changes
      i18n.on('languageChanged', (lng: string) => {
        this.setLanguage(lng as VoiceLanguage);
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
    } else {
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
      } else {
      }

      // Play the audio
      await this.playAudio(audioBlob);

      item.onComplete?.();
      this.emit('completed', item);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      ttsLogger.error('Queue processing failed', {
        error: err.message,
        itemId: item.id,
        textPreview: item.text.substring(0, 50),
        priority: item.priority,
        voiceId: item.voiceId || this.config.voiceId,
        language: this.config.language,
        stack: err.stack,
      });
      item.onError?.(err);
      this.emit('error', { item, error: err });
    } finally {
      this.isPlaying = false;
      // Process next in queue
      await this.processQueue();
    }
  }

  private async fetchAudioFromAPI(text: string, voiceId: string): Promise<Blob> {
    const startTime = Date.now();
    ttsLogger.info('Fetching audio from API', {
      textLength: text.length,
      textPreview: text.substring(0, 50),
      voiceId,
      language: this.config.language,
      model: this.config.model,
    });

    // Get auth token from localStorage (stored by Zustand persist middleware)
    let token: string | null = null;

    try {
      // Try to get from Zustand persist store (bayit-auth key)
      const authData = localStorage.getItem('bayit-auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        token = parsed?.state?.token;
      }

      // Fallback: check old auth_token key (legacy)
      if (!token) {
        token = localStorage.getItem('auth_token');
        if (token) {
          ttsLogger.debug('Using legacy auth token', {
            source: 'auth_token',
          });
        }
      }
    } catch (error) {
      ttsLogger.error('Failed to parse auth token', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (!token) {
      ttsLogger.error('No auth token found', {
        textPreview: text.substring(0, 50),
      });
      throw new Error('Authentication required for TTS. Please log in first.');
    }

    try {
      const apiUrl = this.getApiEndpoint();
      ttsLogger.debug('Calling TTS API', {
        endpoint: apiUrl,
        textLength: text.length,
        voiceId,
        language: this.config.language,
        model: this.config.model,
      });

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

      const responseTime = Date.now() - startTime;
      ttsLogger.info('TTS API response received', {
        status: response.status,
        responseTimeMs: responseTime,
        textLength: text.length,
      });

      if (!response.ok) {
        const errorText = await response.text();
        ttsLogger.error('TTS API error response', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText.substring(0, 200),
          textPreview: text.substring(0, 50),
        });

        if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication failed. Please log in again.');
        } else if (response.status === 503 || response.status === 502) {
          throw new Error('Backend server is unavailable. Please try again later.');
        }

        throw new Error(`TTS API failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const totalTime = Date.now() - startTime;
      ttsLogger.info('Audio blob received', {
        blobSize: blob.size,
        totalTimeMs: totalTime,
        textLength: text.length,
        language: this.config.language,
      });

      if (blob.size === 0) {
        ttsLogger.error('Received empty audio blob', {
          textPreview: text.substring(0, 50),
          voiceId,
          language: this.config.language,
        });
        throw new Error('API returned empty audio');
      }

      return blob;
    } catch (error) {
      // Enhanced error logging
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        ttsLogger.error('Network error - cannot connect to backend', {
          endpoint: this.getApiEndpoint(),
          textPreview: text.substring(0, 50),
          error: error.message,
        });
        throw new Error('Cannot connect to backend server. Please ensure the backend is running on port 8000.');
      }

      ttsLogger.error('Audio fetch failed', {
        error: error instanceof Error ? error.message : String(error),
        textPreview: text.substring(0, 50),
        voiceId,
        language: this.config.language,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  private async playAudio(blob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Validate blob
        if (!blob || blob.size === 0) {
          ttsLogger.error('Invalid audio blob', {
            blobSize: blob?.size || 0,
            isNull: !blob,
          });
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


        // Apply audio ducking if video is playing
        this.applyAudioDucking(audio, true);

        // Cleanup function
        const cleanup = () => {
          try {
            URL.revokeObjectURL(objectUrl);
          } catch (e) {
            ttsLogger.warn('Error revoking object URL', {
              error: e instanceof Error ? e.message : String(e),
            });
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
          ttsLogger.warn('Audio playback timeout', {
            timeoutMs: 30000,
            blobSize: blob.size,
          });
          safeReject(new Error('Audio playback timeout'));
        }, 30000);

        audio.oncanplay = () => {
          ttsLogger.debug('Audio can play', {
            blobSize: blob.size,
            duration: audio.duration,
          });
        };

        audio.onloadedmetadata = () => {
          ttsLogger.debug('Audio metadata loaded', {
            duration: audio.duration,
            blobSize: blob.size,
          });
        };

        audio.onplaying = () => {
          ttsLogger.debug('Audio playback started', {
            duration: audio.duration,
            volume: audio.volume,
          });
        };

        audio.onended = () => {
          ttsLogger.debug('Audio playback completed', {
            duration: audio.duration,
          });
          clearTimeout(timeoutId);
          safeResolve();
        };

        audio.onerror = (event) => {
          ttsLogger.error('Audio playback error', {
            errorCode: audio.error?.code,
            errorMessage: audio.error?.message,
            blobSize: blob.size,
          });
          clearTimeout(timeoutId);
          safeReject(new Error(`Audio playback error: ${audio.error?.message || 'Unknown error'}`));
        };

        this.currentPlayback = audio;

        // Attempt to play and handle promise rejection (e.g., autoplay blocked)
        const playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch((playError) => {
            ttsLogger.error('Play promise rejected', {
              error: playError.message || String(playError),
              blobSize: blob.size,
              volume: audio.volume,
            });
            clearTimeout(timeoutId);
            safeReject(new Error(`Play failed: ${playError.message || String(playError)}`));
          });
        }
      } catch (error) {
        ttsLogger.error('Exception in playAudio', {
          error: error instanceof Error ? error.message : String(error),
          blobSize: blob.size,
          stack: error instanceof Error ? error.stack : undefined,
        });
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
        ttsLogger.warn('Failed to preload phrase', {
          phrase: phrase.text,
          error: error instanceof Error ? error.message : String(error),
          voiceId: phrase.voiceId,
        });
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

  setLanguage(language: VoiceLanguage): void {
    this.config.language = language;
    // Update voice ID for language-specific optimization
    this.config.voiceId = this.getLanguageVoiceId(language);
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
