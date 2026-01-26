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
 * This service provides a stub implementation that can be enhanced later
 * with actual wake word detection if needed. Current implementation:
 * - Returns success for all operations (non-blocking)
 * - Logs warnings about optional status
 * - Can be extended with native WakeWordModule when implemented
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

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
      console.warn('[WakeWordService] Wake word detection not implemented - Menu button is primary voice trigger on tvOS');
      return;
    }

    try {
      const result = await WakeWordModule.setLanguage(languageCode);
      console.log('[WakeWordService] Language set:', result);
    } catch (error) {
      console.error('[WakeWordService] Failed to set language:', error);
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
      console.warn('[WakeWordService] Wake word detection not implemented - Menu button is primary voice trigger on tvOS');
      return;
    }

    try {
      await WakeWordModule.setCustomWakeWords(words);
      console.log('[WakeWordService] Custom wake words set:', words);
    } catch (error) {
      console.error('[WakeWordService] Failed to set custom wake words:', error);
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
      console.warn(
        '[WakeWordService] Wake word detection not implemented - Menu button is primary voice trigger on tvOS. ' +
        'This feature is optional and can be enabled later if native WakeWordModule is implemented.'
      );
      return;
    }

    try {
      // Set up event listener
      this.detectionSubscription = this.eventEmitter.addListener(
        'WakeWordDetected',
        (detection: WakeWordDetection) => {
          console.log('[WakeWordService] Wake word detected:', detection.wakeWord);
          this.detectionListeners.forEach((listener) => listener(detection));
        },
      );

      // Start native detection
      const result = await WakeWordModule.startListening();
      this.isActive = true;
      console.log('[WakeWordService] Wake word detection started (TV mode):', result);
    } catch (error) {
      console.error('[WakeWordService] Failed to start wake word detection:', error);
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
      console.log('[WakeWordService] Wake word detection stopped');
    } catch (error) {
      console.error('[WakeWordService] Failed to stop wake word detection:', error);
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
      console.error('[WakeWordService] Failed to check active status:', error);
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
