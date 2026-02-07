/**
 * Voice Helper Hooks for tvOS
 * Convenience hooks derived from the voice store
 */

import { useVoiceStore } from '../stores/voiceStore';

// Helper hook for voice session state
export function useVoiceSession() {
  const isListening = useVoiceStore((state) => state.isListening);
  const isProcessing = useVoiceStore((state) => state.isProcessing);
  const currentTranscription = useVoiceStore((state) => state.currentTranscription);
  const lastCommand = useVoiceStore((state) => state.lastCommand);
  const lastResponse = useVoiceStore((state) => state.lastResponse);
  const error = useVoiceStore((state) => state.error);
  const isActiveSession = useVoiceStore((state) => state.isActiveSession());
  const sessionDuration = useVoiceStore((state) => state.getSessionDuration());

  const startListening = useVoiceStore((state) => state.startListening);
  const stopListening = useVoiceStore((state) => state.stopListening);
  const clearError = useVoiceStore((state) => state.clearError);

  return {
    isListening,
    isProcessing,
    currentTranscription,
    lastCommand,
    lastResponse,
    error,
    isActiveSession,
    sessionDuration,
    startListening,
    stopListening,
    clearError,
  };
}

// Helper hook for audio ducking state (TV-specific)
export function useAudioDucking() {
  const isAudioDucked = useVoiceStore((state) => state.isAudioDucked);
  const setAudioDucked = useVoiceStore((state) => state.setAudioDucked);

  return {
    isAudioDucked,
    setAudioDucked,
  };
}

// Helper hook for wake word detection state (TV-specific)
export function useWakeWord() {
  const isWakeWordActive = useVoiceStore((state) => state.isWakeWordActive);
  const setWakeWordActive = useVoiceStore((state) => state.setWakeWordActive);

  return {
    isWakeWordActive,
    setWakeWordActive,
  };
}
