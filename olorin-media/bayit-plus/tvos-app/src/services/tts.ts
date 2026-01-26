/**
 * TTS Service - tvOS Text-to-Speech Bridge
 *
 * Wraps native TTSModule using AVSpeechSynthesizer:
 * - Natural voice synthesis
 * - Multi-language support (Hebrew, English, Spanish)
 * - Speech rate control (0.9x for TV clarity)
 * - Pause/resume functionality
 * - Audio ducking (lowers media volume during TTS)
 */

import { NativeModules, Platform } from 'react-native';
import { config } from '../config/appConfig';

const { TTSModule } = NativeModules;

interface TTSOptions {
  language?: string; // 'he' | 'en' | 'es'
  rate?: number; // 0.5 - 2.0 (1.0 is normal speed, 0.9 recommended for TV)
}

interface Voice {
  identifier: string;
  name: string;
  language: string;
  quality: 'default' | 'enhanced' | 'premium';
}

class TTSService {
  private currentLanguage: string = 'en';
  private currentRate: number = config.voice.ttsRate; // 0.9 for TV

  /**
   * Speak text using tvOS TTS
   * TV-optimized: slower rate for clarity, audio ducking
   * @param text - Text to speak
   * @param options - TTS options (language, rate)
   */
  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    if (!TTSModule) {
      console.warn('[TTSService] TTSModule not available on tvOS');
      return;
    }

    if (!text || text.trim().length === 0) {
      return;
    }

    const language = options.language || this.currentLanguage;
    const rate = options.rate !== undefined ? options.rate : this.currentRate;

    try {
      await TTSModule.speak(text, language, rate);
      console.log('[TTSService] Speaking (TV mode):', text);
    } catch (error) {
      console.error('[TTSService] Failed to speak:', error);
      throw error;
    }
  }

  /**
   * Stop speaking immediately
   */
  async stop(): Promise<void> {
    if (!TTSModule) {
      return;
    }

    try {
      await TTSModule.stop();
      console.log('[TTSService] Stopped speaking');
    } catch (error) {
      console.error('[TTSService] Failed to stop:', error);
    }
  }

  /**
   * Pause speaking
   */
  async pause(): Promise<void> {
    if (!TTSModule) {
      return;
    }

    try {
      await TTSModule.pause();
      console.log('[TTSService] Paused speaking');
    } catch (error) {
      console.error('[TTSService] Failed to pause:', error);
    }
  }

  /**
   * Resume speaking
   */
  async resume(): Promise<void> {
    if (!TTSModule) {
      return;
    }

    try {
      await TTSModule.resume();
      console.log('[TTSService] Resumed speaking');
    } catch (error) {
      console.error('[TTSService] Failed to resume:', error);
    }
  }

  /**
   * Check if currently speaking
   */
  async isSpeaking(): Promise<boolean> {
    if (!TTSModule) {
      return false;
    }

    try {
      const result = await TTSModule.isSpeaking();
      return result.speaking;
    } catch (error) {
      console.error('[TTSService] Failed to check speaking status:', error);
      return false;
    }
  }

  /**
   * Get available voices for a language
   * @param language - Language code ('he' | 'en' | 'es')
   */
  async getAvailableVoices(language: string): Promise<Voice[]> {
    if (!TTSModule) {
      return [];
    }

    try {
      const result = await TTSModule.getAvailableVoices(language);
      return result.voices;
    } catch (error) {
      console.error('[TTSService] Failed to get voices:', error);
      return [];
    }
  }

  /**
   * Set default language for TTS
   * @param language - Language code ('he' | 'en' | 'es')
   */
  setLanguage(language: string): void {
    this.currentLanguage = language;
  }

  /**
   * Set default speech rate
   * TV recommended: 0.9 for clarity
   * @param rate - Speech rate (0.5 - 2.0, 0.9 recommended for TV)
   */
  setRate(rate: number): void {
    this.currentRate = Math.max(0.5, Math.min(2.0, rate));
  }
}

// Export singleton instance
export const ttsService = new TTSService();

export type { TTSOptions, Voice };
