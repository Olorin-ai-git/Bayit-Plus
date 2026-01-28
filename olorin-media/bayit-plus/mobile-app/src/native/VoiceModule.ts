/**
 * VoiceModule.ts - TypeScript Bridge for Android/iOS Voice Recognition
 * Provides unified API for voice-to-text across platforms
 *
 * Emits events:
 * - recognition_start: Listening started
 * - partial_result: Interim speech results
 * - final_result: Final recognized text with confidence
 * - error: Recognition error occurred
 * - volume_change: Audio levels (0-100)
 * - ready_for_speech: Ready to listen
 * - speech_started: User started speaking
 * - speech_ended: User stopped speaking
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const VoiceModuleNative = NativeModules.VoiceModule;

export interface VoiceRecognitionEvent {
  text?: string;
  confidence?: number;
  isFinal?: boolean;
  language?: string;
  level?: number;
  message?: string;
  code?: string;
  errorCode?: number;
}

export interface VoiceModuleType {
  startRecognition: (language: string) => Promise<{ status: string; language: string }>;
  stopRecognition: () => Promise<{ status: string }>;
  cancelRecognition: () => Promise<{ status: string }>;
  destroy: () => Promise<{ status: string }>;
  addEventListener: (event: string, callback: (data: VoiceRecognitionEvent) => void) => void;
  removeEventListener: (event: string, callback: (data: VoiceRecognitionEvent) => void) => void;
}

class VoiceModule implements VoiceModuleType {
  private eventEmitter: NativeEventEmitter;
  private listeners: Map<string, ((data: VoiceRecognitionEvent) => void)[]> = new Map();
  private isInitialized = false;

  constructor() {
    this.eventEmitter = new NativeEventEmitter(VoiceModuleNative);
    this.setupEventListeners();
    this.isInitialized = true;
  }

  private setupEventListeners() {
    const events = [
      'recognition_start',
      'partial_result',
      'final_result',
      'error',
      'volume_change',
      'ready_for_speech',
      'speech_started',
      'speech_ended',
    ];

    events.forEach(event => {
      this.eventEmitter.addListener(event, (data: VoiceRecognitionEvent) => {
        const callbacks = this.listeners.get(event) || [];
        callbacks.forEach(callback => callback(data));
      });
    });
  }

  /**
   * Start voice recognition in specified language
   * @param language 'he' (Hebrew), 'en' (English), 'es' (Spanish)
   * @returns Promise with status and language
   */
  async startRecognition(language: string = 'en'): Promise<{ status: string; language: string }> {
    if (!this.isInitialized) {
      throw new Error('VoiceModule not initialized');
    }

    const validLanguages = ['he', 'en', 'es'];
    if (!validLanguages.includes(language)) {
      throw new Error(`Unsupported language: ${language}. Must be one of: ${validLanguages.join(', ')}`);
    }

    return VoiceModuleNative.startRecognition(language);
  }

  /**
   * Stop voice recognition
   * @returns Promise with status
   */
  async stopRecognition(): Promise<{ status: string }> {
    return VoiceModuleNative.stopRecognition();
  }

  /**
   * Cancel voice recognition
   * @returns Promise with status
   */
  async cancelRecognition(): Promise<{ status: string }> {
    return VoiceModuleNative.cancelRecognition();
  }

  /**
   * Cleanup resources
   * @returns Promise with status
   */
  async destroy(): Promise<{ status: string }> {
    const result = await VoiceModuleNative.destroy();
    this.isInitialized = false;
    return result;
  }

  /**
   * Register event listener
   * @param event Event name
   * @param callback Callback function
   */
  addEventListener(event: string, callback: (data: VoiceRecognitionEvent) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  /**
   * Remove event listener
   * @param event Event name
   * @param callback Callback function
   */
  removeEventListener(event: string, callback: (data: VoiceRecognitionEvent) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }
}

export const voiceModule = new VoiceModule();
export default voiceModule;
