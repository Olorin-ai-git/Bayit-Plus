/**
 * TTSModule.ts - TypeScript Bridge for Text-to-Speech Synthesis
 * Provides unified TTS API across Android/iOS platforms
 *
 * Emits events:
 * - tts_initialized: Engine ready
 * - speech_start: Speaking began
 * - speech_done: Speaking completed
 * - speech_error: Error occurred
 * - speech_stop: Speech interrupted
 */

import { NativeModules, NativeEventEmitter } from 'react-native';

const TTSModuleNative = NativeModules.TTSModule;

export interface TTSEvent {
  utteranceId?: string;
  status?: string;
  language?: string;
  message?: string;
  code?: string;
  interrupted?: boolean;
}

export class TTSModule {
  private eventEmitter: NativeEventEmitter;
  private listeners: Map<string, ((data: TTSEvent) => void)[]> = new Map();
  private isInitialized = false;

  constructor() {
    this.eventEmitter = new NativeEventEmitter(TTSModuleNative);
    this.setupEventListeners();
  }

  private setupEventListeners() {
    const events = ['tts_initialized', 'speech_start', 'speech_done', 'speech_error', 'speech_stop'];

    events.forEach(event => {
      this.eventEmitter.addListener(event, (data: TTSEvent) => {
        const callbacks = this.listeners.get(event) || [];
        callbacks.forEach(callback => callback(data));
      });
    });
  }

  /**
   * Initialize TTS engine
   * Must be called before speaking
   * @returns Promise with status
   */
  async initialize(): Promise<{ status: string }> {
    const result = await TTSModuleNative.initialize();
    this.isInitialized = true;
    return result;
  }

  /**
   * Speak text in specified language
   * @param text Text to speak
   * @param language Language code: 'he', 'en', 'es'
   * @returns Promise with status and utteranceId
   */
  async speak(text: string, language: string = 'en'): Promise<{ status: string; language: string; utteranceId: string }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const validLanguages = ['he', 'en', 'es'];
    if (!validLanguages.includes(language)) {
      throw new Error(`Unsupported language: ${language}`);
    }

    return TTSModuleNative.speak(text, language);
  }

  /**
   * Set speech rate (speed)
   * @param rate Rate multiplier: 0.5 (half speed) to 2.0 (double speed), default 1.0
   * @returns Promise with rate value
   */
  async setRate(rate: number): Promise<{ rate: number }> {
    if (rate < 0.5 || rate > 2.0) {
      throw new Error('Rate must be between 0.5 and 2.0');
    }
    return TTSModuleNative.setRate(rate);
  }

  /**
   * Set pitch (tone)
   * @param pitch Pitch multiplier: 0.5 (low) to 2.0 (high), default 1.0
   * @returns Promise with pitch value
   */
  async setPitch(pitch: number): Promise<{ pitch: number }> {
    if (pitch < 0.5 || pitch > 2.0) {
      throw new Error('Pitch must be between 0.5 and 2.0');
    }
    return TTSModuleNative.setPitch(pitch);
  }

  /**
   * Stop current speech
   * @returns Promise with status
   */
  async stop(): Promise<{ status: string }> {
    return TTSModuleNative.stop();
  }

  /**
   * Shutdown TTS engine and release resources
   * @returns Promise with status
   */
  async shutdown(): Promise<{ status: string }> {
    const result = await TTSModuleNative.shutdown();
    this.isInitialized = false;
    return result;
  }

  /**
   * Register event listener
   */
  addEventListener(event: string, callback: (data: TTSEvent) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  /**
   * Remove event listener
   */
  removeEventListener(event: string, callback: (data: TTSEvent) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }
}

export const ttsModule = new TTSModule();
export default ttsModule;
