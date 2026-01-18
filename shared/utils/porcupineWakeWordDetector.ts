/**
 * Porcupine Wake Word Detector
 *
 * Provides wake word detection using Picovoice Porcupine SDK.
 * Listens for "Hey Buyit" (phonetically identical to Hebrew "הי בית")
 * to activate voice commands.
 *
 * This service wraps the Porcupine Web SDK for browser-based wake word detection.
 * For React Native (iOS/Android), use the @picovoice/porcupine-react-native package.
 */

import {
  PorcupineWorker,
  PorcupineKeyword,
  BuiltInKeyword,
} from '@picovoice/porcupine-web';
import { WebVoiceProcessor } from '@picovoice/web-voice-processor';

export interface PorcupineWakeWordConfig {
  accessKey: string;
  modelPath?: string;
  keywordPath?: string;
  sensitivity?: number;
  enabled?: boolean;
}

export interface PorcupineWakeWordResult {
  detected: boolean;
  keywordIndex: number;
  timestamp: number;
}

type DetectionCallback = (keywordIndex: number) => void;

/**
 * PorcupineWakeWordDetector class
 *
 * Handles wake word detection using Picovoice Porcupine SDK.
 * Runs locally in the browser via WebAssembly for privacy.
 */
export class PorcupineWakeWordDetector {
  private porcupine: PorcupineWorker | null = null;
  private webVoiceProcessor: typeof WebVoiceProcessor | null = null;
  private isInitialized: boolean = false;
  private isListening: boolean = false;
  private detectionCallback: DetectionCallback | null = null;
  private accessKey: string = '';
  private sensitivity: number = 0.5;
  private lastDetectionTime: number = 0;
  private cooldownMs: number = 2000;

  /**
   * Initialize the Porcupine wake word detector
   * @param accessKey - Picovoice access key from console.picovoice.ai
   * @param keywordPath - Path to custom wake word .ppn model (optional, uses built-in if not provided)
   * @param sensitivity - Wake word sensitivity 0-1 (default 0.5)
   */
  async initialize(
    accessKey: string,
    keywordPath?: string,
    sensitivity: number = 0.5
  ): Promise<void> {
    if (this.isInitialized) {
      console.log('[PorcupineWakeWord] Already initialized');
      return;
    }

    if (!accessKey) {
      throw new Error('[PorcupineWakeWord] Access key is required');
    }

    this.accessKey = accessKey;
    this.sensitivity = Math.max(0, Math.min(1, sensitivity));

    try {
      console.log('[PorcupineWakeWord] Initializing Porcupine...');

      // Determine keyword configuration
      let keyword: PorcupineKeyword | BuiltInKeyword;

      // Check if custom model exists by trying to fetch it
      let useCustomModel = false;
      if (keywordPath) {
        try {
          const response = await fetch(keywordPath, { method: 'HEAD' });
          useCustomModel = response.ok;
        } catch {
          useCustomModel = false;
        }
      }

      if (useCustomModel && keywordPath) {
        // Use custom wake word model "Hey Buyit"
        console.log('[PorcupineWakeWord] Using custom keyword model:', keywordPath);
        keyword = {
          publicPath: keywordPath,
          label: 'hey_buyit',
          sensitivity: this.sensitivity,
        };
      } else {
        // Fallback to built-in "Computer" for testing
        // User's Picovoice free tier training limit reached - using built-in keyword
        console.log('[PorcupineWakeWord] Custom model not found, using built-in "Computer" (say "Computer" to activate)');
        keyword = {
          builtin: 'Computer' as BuiltInKeyword,
          sensitivity: this.sensitivity,
        };
      }

      // Create Porcupine worker
      this.porcupine = await PorcupineWorker.create(
        this.accessKey,
        [keyword],
        (detection) => this.handleDetection(detection.index)
      );

      this.isInitialized = true;
      console.log('[PorcupineWakeWord] Initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[PorcupineWakeWord] Failed to initialize:', errorMessage);
      this.isInitialized = false;
      throw new Error(`Failed to initialize Porcupine: ${errorMessage}`);
    }
  }

  /**
   * Handle wake word detection event
   */
  private handleDetection(keywordIndex: number): void {
    const now = Date.now();

    // Check cooldown to prevent rapid re-triggering
    if (now - this.lastDetectionTime < this.cooldownMs) {
      console.log('[PorcupineWakeWord] Detection ignored (cooldown)');
      return;
    }

    this.lastDetectionTime = now;
    console.log('[PorcupineWakeWord] Wake word detected! Index:', keywordIndex);

    if (this.detectionCallback) {
      this.detectionCallback(keywordIndex);
    }
  }

  /**
   * Start listening for wake word
   * @param onDetection - Callback function when wake word is detected
   */
  async start(onDetection: DetectionCallback): Promise<void> {
    if (!this.isInitialized || !this.porcupine) {
      throw new Error('[PorcupineWakeWord] Not initialized. Call initialize() first.');
    }

    if (this.isListening) {
      console.log('[PorcupineWakeWord] Already listening');
      return;
    }

    this.detectionCallback = onDetection;

    try {
      console.log('[PorcupineWakeWord] Starting audio capture...');

      // Start WebVoiceProcessor to capture microphone audio
      await WebVoiceProcessor.subscribe(this.porcupine);

      this.isListening = true;
      console.log('[PorcupineWakeWord] Listening for wake word...');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[PorcupineWakeWord] Failed to start listening:', errorMessage);
      throw new Error(`Failed to start wake word detection: ${errorMessage}`);
    }
  }

  /**
   * Stop listening for wake word
   */
  async stop(): Promise<void> {
    if (!this.isListening) {
      console.log('[PorcupineWakeWord] Not listening');
      return;
    }

    try {
      console.log('[PorcupineWakeWord] Stopping audio capture...');

      if (this.porcupine) {
        await WebVoiceProcessor.unsubscribe(this.porcupine);
      }

      this.isListening = false;
      this.detectionCallback = null;
      console.log('[PorcupineWakeWord] Stopped listening');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[PorcupineWakeWord] Failed to stop listening:', errorMessage);
    }
  }

  /**
   * Release all resources
   */
  async release(): Promise<void> {
    try {
      console.log('[PorcupineWakeWord] Releasing resources...');

      await this.stop();

      if (this.porcupine) {
        this.porcupine.terminate();
        this.porcupine = null;
      }

      this.isInitialized = false;
      console.log('[PorcupineWakeWord] Resources released');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[PorcupineWakeWord] Failed to release resources:', errorMessage);
    }
  }

  /**
   * Check if detector is initialized and ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Check if detector is currently listening
   */
  isActive(): boolean {
    return this.isListening;
  }

  /**
   * Set cooldown period between detections
   */
  setCooldown(ms: number): void {
    this.cooldownMs = Math.max(500, Math.min(10000, ms));
  }

  /**
   * Get time since last detection
   */
  getTimeSinceLastDetection(): number {
    if (this.lastDetectionTime === 0) return Infinity;
    return Date.now() - this.lastDetectionTime;
  }
}

/**
 * Get Picovoice access key from environment
 */
export function getPicovoiceAccessKey(): string {
  // Try Vite env first (web apps)
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PICOVOICE_ACCESS_KEY) {
    return import.meta.env.VITE_PICOVOICE_ACCESS_KEY;
  }

  // Try process.env (Node/build time)
  if (typeof process !== 'undefined' && process.env?.VITE_PICOVOICE_ACCESS_KEY) {
    return process.env.VITE_PICOVOICE_ACCESS_KEY;
  }

  console.warn('[PorcupineWakeWord] No Picovoice access key found in environment');
  return '';
}

/**
 * Check if Porcupine is supported in the current environment
 */
export function isPorcupineSupported(): boolean {
  // Check for browser environment
  if (typeof window === 'undefined') {
    return false;
  }

  // Check for AudioContext support
  const hasAudioContext = typeof AudioContext !== 'undefined' ||
    typeof (window as unknown as { webkitAudioContext: unknown }).webkitAudioContext !== 'undefined';

  // Check for Web Workers support
  const hasWorkers = typeof Worker !== 'undefined';

  // Check for MediaDevices support
  const hasMediaDevices = typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    !!navigator.mediaDevices.getUserMedia;

  return hasAudioContext && hasWorkers && hasMediaDevices;
}

/**
 * Create a Porcupine wake word detector instance
 */
export function createPorcupineDetector(): PorcupineWakeWordDetector {
  return new PorcupineWakeWordDetector();
}

export default PorcupineWakeWordDetector;
