/**
 * Types for useTVConstantListening Hook
 *
 * tvOS-specific types for native audio capture, VAD detection,
 * and transcription integration.
 */

import { VADSensitivity } from '@bayit/shared-services';

export interface AudioLevel {
  average: number;
  peak: number;
}

export type TranscribeFunction = (audioBlob: Blob) => Promise<{ text: string }>;

export interface UseTVConstantListeningOptions {
  enabled: boolean;
  onTranscript: (text: string) => void;
  onError: (error: Error) => void;
  silenceThresholdMs?: number;
  vadSensitivity?: VADSensitivity;
  transcribeAudio?: TranscribeFunction;
}

export interface UseTVConstantListeningReturn {
  isListening: boolean;
  isProcessing: boolean;
  isSendingToServer: boolean;
  audioLevel: AudioLevel;
  start: () => Promise<void>;
  stop: () => void;
  error: Error | null;
  isSupported: boolean;
}
