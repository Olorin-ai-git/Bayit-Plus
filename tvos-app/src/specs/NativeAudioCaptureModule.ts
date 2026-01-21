/**
 * NativeAudioCaptureModule TurboModule Spec
 *
 * Defines the interface for the native audio capture module.
 * Used by React Native's codegen to generate native bindings.
 */

import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface AudioLevel {
  average: number;
  peak: number;
}

export interface StartListeningResult {
  status: string;
}

export interface StopListeningResult {
  status: string;
  audioFilePath: string | null;
}

export interface IsListeningResult {
  listening: boolean;
}

export interface ClearBufferResult {
  status: string;
}

export interface Spec extends TurboModule {
  // Start listening for audio
  startListening(): Promise<StartListeningResult>;

  // Stop listening and export audio buffer
  stopListening(): Promise<StopListeningResult>;

  // Get current audio level
  getAudioLevel(): Promise<AudioLevel>;

  // Clear the audio buffer
  clearBuffer(): Promise<ClearBufferResult>;

  // Check if currently listening
  isCurrentlyListening(): Promise<IsListeningResult>;

  // Event emitter methods
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('AudioCaptureModule');
