/**
 * Speech Service - tvOS Speech Framework Bridge
 *
 * Wraps native SpeechModule for speech recognition functionality:
 * - On-device speech recognition (privacy-first)
 * - Multi-language support (Hebrew, English, Spanish)
 * - Real-time streaming recognition
 * - Permission handling
 * - TV-optimized (45s timeout for 10-foot distance)
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { logger } from '../utils/logger';

const { SpeechModule } = NativeModules;

interface SpeechRecognitionResult {
  transcription: string;
  isFinal: boolean;
  confidence: number;
}

interface SpeechPermissions {
  microphone: boolean;
  speech: boolean;
}

type SpeechRecognitionListener = (result: SpeechRecognitionResult) => void;
type SpeechErrorListener = (error: { error: string }) => void;

class SpeechService {
  private eventEmitter: NativeEventEmitter | null = null;
  private resultSubscription: any = null;
  private errorSubscription: any = null;
  private resultListeners: SpeechRecognitionListener[] = [];
  private errorListeners: SpeechErrorListener[] = [];

  constructor() {
    if (Platform.isTV && SpeechModule) {
      this.eventEmitter = new NativeEventEmitter(SpeechModule);
    }
  }

  /**
   * Request microphone and speech recognition permissions
   */
  async requestPermissions(): Promise<{ granted: boolean }> {
    if (!SpeechModule) {
      throw new Error('SpeechModule not available on tvOS');
    }

    try {
      const result = await SpeechModule.requestPermissions();
      return result;
    } catch (error: any) {
      logger.error('Permission request failed', { module: 'SpeechService', error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Check if permissions are granted
   */
  async checkPermissions(): Promise<SpeechPermissions> {
    if (!SpeechModule) {
      return { microphone: false, speech: false };
    }

    try {
      const result = await SpeechModule.checkPermissions();
      return result;
    } catch (error) {
      logger.error('Permission check failed', { module: 'SpeechService', error: error instanceof Error ? error.message : String(error) });
      return { microphone: false, speech: false };
    }
  }

  /**
   * Set recognition language
   * @param languageCode - 'he' | 'en' | 'es'
   */
  async setLanguage(languageCode: string): Promise<void> {
    if (!SpeechModule) {
      throw new Error('SpeechModule not available on tvOS');
    }

    try {
      await SpeechModule.setLanguage(languageCode);
      logger.info('Language set', { module: 'SpeechService', languageCode });
    } catch (error) {
      logger.error('Failed to set language', { module: 'SpeechService', languageCode, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Start speech recognition
   * TV-optimized: longer timeout for 10-foot distance
   */
  async startRecognition(): Promise<void> {
    if (!SpeechModule || !this.eventEmitter) {
      throw new Error('SpeechModule not available on tvOS');
    }

    try {
      // Set up event listeners
      // Note: Event names must match what SpeechModule.swift emits
      this.resultSubscription = this.eventEmitter.addListener(
        'onSpeechRecognitionResult',
        (result: SpeechRecognitionResult) => {
          this.resultListeners.forEach((listener) => listener(result));
        },
      );

      this.errorSubscription = this.eventEmitter.addListener(
        'onSpeechRecognitionError',
        (error: { error: string }) => {
          this.errorListeners.forEach((listener) => listener(error));
        },
      );

      // Start native recognition
      await SpeechModule.startRecognition();
      logger.info('Recognition started (TV mode)', { module: 'SpeechService' });
    } catch (error) {
      logger.error('Failed to start recognition', { module: 'SpeechService', error: error instanceof Error ? error.message : String(error) });
      this.cleanup();
      throw error;
    }
  }

  /**
   * Stop speech recognition
   */
  async stopRecognition(): Promise<void> {
    if (!SpeechModule) {
      return;
    }

    try {
      await SpeechModule.stopRecognition();
      this.cleanup();
      logger.info('Recognition stopped', { module: 'SpeechService' });
    } catch (error) {
      logger.error('Failed to stop recognition', { module: 'SpeechService', error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * Add listener for recognition results
   */
  addResultListener(listener: SpeechRecognitionListener): void {
    this.resultListeners.push(listener);
  }

  /**
   * Remove result listener
   */
  removeResultListener(listener: SpeechRecognitionListener): void {
    this.resultListeners = this.resultListeners.filter((l) => l !== listener);
  }

  /**
   * Add listener for recognition errors
   */
  addErrorListener(listener: SpeechErrorListener): void {
    this.errorListeners.push(listener);
  }

  /**
   * Remove error listener
   */
  removeErrorListener(listener: SpeechErrorListener): void {
    this.errorListeners = this.errorListeners.filter((l) => l !== listener);
  }

  /**
   * Clean up event listeners
   */
  private cleanup(): void {
    if (this.resultSubscription) {
      this.resultSubscription.remove();
      this.resultSubscription = null;
    }

    if (this.errorSubscription) {
      this.errorSubscription.remove();
      this.errorSubscription = null;
    }
  }
}

// Export singleton instance
export const speechService = new SpeechService();

export type { SpeechRecognitionResult, SpeechPermissions };
