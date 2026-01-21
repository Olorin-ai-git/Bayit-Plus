/**
 * Wake Word Service - iOS Wake Word Detection Bridge
 *
 * Wraps native WakeWordModule for always-on keyword spotting:
 * - "Hey Bayit" detection in multiple languages
 * - Battery-optimized continuous listening
 * - Automatic restart after detection
 */

import { NativeModules, NativeEventEmitter, Platform } from "react-native";

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
    if (Platform.OS === "ios" && WakeWordModule) {
      this.eventEmitter = new NativeEventEmitter(WakeWordModule);
    }
  }

  /**
   * Set wake word detection language
   * @param languageCode - 'he' | 'en' | 'es'
   */
  async setLanguage(languageCode: string): Promise<void> {
    if (!WakeWordModule) {
      console.warn("[WakeWordService] Wake word detection not available");
      return;
    }

    try {
      const result = await WakeWordModule.setLanguage(languageCode);
      console.log("[WakeWordService] Language set:", result);
    } catch (error) {
      console.error("[WakeWordService] Failed to set language:", error);
      throw error;
    }
  }

  /**
   * Set custom wake words
   * @param words - Array of wake word phrases
   */
  async setCustomWakeWords(words: string[]): Promise<void> {
    if (!WakeWordModule) {
      console.warn("[WakeWordService] Wake word detection not available");
      return;
    }

    try {
      await WakeWordModule.setCustomWakeWords(words);
      console.log("[WakeWordService] Custom wake words set:", words);
    } catch (error) {
      console.error(
        "[WakeWordService] Failed to set custom wake words:",
        error,
      );
      throw error;
    }
  }

  /**
   * Start wake word detection (always-on listening)
   */
  async startListening(): Promise<void> {
    if (!WakeWordModule || !this.eventEmitter) {
      console.warn(
        "[WakeWordService] Wake word detection not available - feature requires native WakeWordModule implementation",
      );
      return;
    }

    try {
      // Set up event listener
      this.detectionSubscription = this.eventEmitter.addListener(
        "WakeWordDetected",
        (detection: WakeWordDetection) => {
          console.log(
            "[WakeWordService] Wake word detected:",
            detection.wakeWord,
          );
          this.detectionListeners.forEach((listener) => listener(detection));
        },
      );

      // Start native detection
      const result = await WakeWordModule.startListening();
      this.isActive = true;
      console.log("[WakeWordService] Wake word detection started:", result);
    } catch (error) {
      console.error(
        "[WakeWordService] Failed to start wake word detection:",
        error,
      );
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
      console.log("[WakeWordService] Wake word detection stopped");
    } catch (error) {
      console.error(
        "[WakeWordService] Failed to stop wake word detection:",
        error,
      );
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
      console.error("[WakeWordService] Failed to check active status:", error);
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
