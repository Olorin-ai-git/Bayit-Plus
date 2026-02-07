/**
 * Wake Word Service - tvOS Wake Word Detection (Optional)
 *
 * NOTE: Wake word detection is OPTIONAL on tvOS.
 * Primary voice trigger: Menu button long-press (500ms)
 * Optional enhancement: "Hey Bayit" wake word detection
 *
 * tvOS Voice Activation Hierarchy:
 * 1. PRIMARY: Menu button long-press (always available, native gesture)
 * 2. OPTIONAL: Wake word detection (user-configurable, battery-optimized)
 *
 * This service provides graceful no-op behavior when native wake word module is unavailable.
 * Current implementation:
 * - Returns success for all operations (non-blocking)
 * - Logs warnings about optional status
 * - Can be extended with native WakeWordModule when implemented
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { logger } from '../utils/logger';

const { WakeWordModule } = NativeModules;

interface WakeWordDetection {
  wakeWord: string;
  timestamp: number;
}

type WakeWordDetectionListener = (detection: WakeWordDetection) => void;

class WakeWordService {
  private eventEmitter: NativeEventEmitter | null = null;
  private detectionSubscription: any = null;
  private detectionListeners: WakeWordDetectionListener[] = [];
  private isActive: boolean = false;

  constructor() {
    if (Platform.isTV && WakeWordModule) {
      this.eventEmitter = new NativeEventEmitter(WakeWordModule);
    }
  }

  /**
   * Set wake word detection language
   * NOTE: Optional feature on tvOS - Menu button is primary trigger
   * @param languageCode - 'he' | 'en' | 'es'
   */
  async setLanguage(languageCode: string): Promise<void> {
    if (!WakeWordModule) {
      logger.warn('Wake word module unavailable - Menu button is primary voice trigger on tvOS', { module: 'WakeWordService' });
      return;
    }

    try {
      const result = await WakeWordModule.setLanguage(languageCode);
      logger.info('Language set', { module: 'WakeWordService', languageCode, result });
    } catch (error) {
      logger.error('Failed to set language', { module: 'WakeWordService', languageCode, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Set custom wake words
   * NOTE: Optional feature on tvOS - Menu button is primary trigger
   * @param words - Array of wake word phrases
   */
  async setCustomWakeWords(words: string[]): Promise<void> {
    if (!WakeWordModule) {
      logger.warn('Wake word module unavailable - Menu button is primary voice trigger on tvOS', { module: 'WakeWordService' });
      return;
    }

    try {
      await WakeWordModule.setCustomWakeWords(words);
      logger.info('Custom wake words set', { module: 'WakeWordService', wordCount: words.length });
    } catch (error) {
      logger.error('Failed to set custom wake words', { module: 'WakeWordService', error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Start wake word detection (always-on listening)
   * NOTE: Optional feature on tvOS - Menu button is primary trigger
   * This is a user-configurable enhancement, not a core requirement
   */
  async startListening(): Promise<void> {
    if (!WakeWordModule || !this.eventEmitter) {
      logger.warn(
        'Wake word module unavailable - Menu button is primary voice trigger on tvOS. ' +
        'This feature is optional and can be enabled when native WakeWordModule is available.',
        { module: 'WakeWordService' }
      );
      return;
    }

    try {
      // Set up event listener
      this.detectionSubscription = this.eventEmitter.addListener(
        'WakeWordDetected',
        (detection: WakeWordDetection) => {
          logger.info('Wake word detected', { module: 'WakeWordService', wakeWord: detection.wakeWord });
          this.detectionListeners.forEach((listener) => listener(detection));
        },
      );

      // Start native detection
      const result = await WakeWordModule.startListening();
      this.isActive = true;
      logger.info('Wake word detection started (TV mode)', { module: 'WakeWordService', result });
    } catch (error) {
      logger.error('Failed to start wake word detection', { module: 'WakeWordService', error: error instanceof Error ? error.message : String(error) });
      this.cleanup();
      throw error;
    }
  }

  /**
   * Stop wake word detection
   */
  async stopListening(): Promise<void> {
    if (!WakeWordModule) {
      return;
    }

    try {
      await WakeWordModule.stopListening();
      this.isActive = false;
      this.cleanup();
      logger.info('Wake word detection stopped', { module: 'WakeWordService' });
    } catch (error) {
      logger.error('Failed to stop wake word detection', { module: 'WakeWordService', error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * Check if wake word detection is active
   */
  async isListening(): Promise<boolean> {
    if (!WakeWordModule) {
      return false;
    }

    try {
      const result = await WakeWordModule.isActive();
      return result.active;
    } catch (error) {
      logger.error('Failed to check active status', { module: 'WakeWordService', error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  /**
   * Add listener for wake word detections
   */
  addDetectionListener(listener: WakeWordDetectionListener): void {
    this.detectionListeners.push(listener);
  }

  /**
   * Remove detection listener
   */
  removeDetectionListener(listener: WakeWordDetectionListener): void {
    this.detectionListeners = this.detectionListeners.filter(
      (l) => l !== listener,
    );
  }

  /**
   * Get current active status (cached)
   */
  get active(): boolean {
    return this.isActive;
  }

  /**
   * Clean up event listeners
   */
  private cleanup(): void {
    if (this.detectionSubscription) {
      this.detectionSubscription.remove();
      this.detectionSubscription = null;
    }
  }
}

// Export singleton instance
export const wakeWordService = new WakeWordService();

export type { WakeWordDetection };
