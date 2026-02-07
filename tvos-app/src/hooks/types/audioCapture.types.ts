/**
 * Types for useAudioCapture Hook
 *
 * tvOS native audio capture types for TurboModule integration,
 * audio level monitoring, and speech detection events.
 */

export interface AudioLevel {
  average: number;
  peak: number;
}

export interface UseAudioCaptureOptions {
  onAudioLevel?: (level: AudioLevel) => void;
  onSpeechDetected?: () => void;
  onSilenceDetected?: () => void;
  onError?: (error: Error) => void;
}

export interface UseAudioCaptureReturn {
  isListening: boolean;
  isSupported: boolean;
  audioLevel: AudioLevel;
  startListening: () => Promise<void>;
  stopListening: () => Promise<string | null>;
  getAudioLevel: () => Promise<AudioLevel>;
  clearBuffer: () => Promise<void>;
  error: Error | null;
}
