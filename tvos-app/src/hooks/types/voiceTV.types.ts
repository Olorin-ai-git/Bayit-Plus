/**
 * Types for useVoiceTV Hook
 *
 * tvOS voice command integration types for Menu button
 * trigger, speech recognition, and TTS response.
 */

export interface UseVoiceTVResult {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  error: string | null;
  hasPermissions: boolean;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  requestPermissions: () => Promise<boolean>;
}
