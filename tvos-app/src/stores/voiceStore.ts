/**
 * Voice Store for tvOS
 * Voice system state management for TV-optimized voice commands and Siri integration
 * Ephemeral state - no persistence (voice sessions are transient)
 */

import { create } from 'zustand';

// Voice session metrics for analytics and debugging
export interface VoiceSessionMetrics {
  sessionId: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  wordsDetected: number;
  confidenceAvg: number;
  silenceDurationMs: number;
  interruptions: number;
  commandType?: string;
  successfulExecution: boolean;
}

// Voice command response types
export interface VoiceResponse {
  type: 'success' | 'error' | 'clarification' | 'feedback';
  message: string;
  timestamp: number;
  ttsDurationMs?: number;
}

// Voice error types
export type VoiceErrorType =
  | 'microphone_permission'
  | 'microphone_unavailable'
  | 'network_error'
  | 'recognition_failed'
  | 'command_not_understood'
  | 'execution_failed'
  | 'timeout'
  | 'unknown';

export interface VoiceError {
  type: VoiceErrorType;
  message: string;
  timestamp: number;
  recoverable: boolean;
}

interface VoiceStoreState {
  // Voice session state
  isListening: boolean;
  isProcessing: boolean;
  currentTranscription: string;
  lastCommand: string | null;
  lastResponse: VoiceResponse | null;
  error: VoiceError | null;
  sessionMetrics: VoiceSessionMetrics | null;

  // Voice activation state (TV-specific)
  isWakeWordActive: boolean; // Whether wake word detection is currently active
  isMenuButtonListening: boolean; // Whether Menu button long-press activated listening

  // Audio ducking state (for TTS playback)
  isAudioDucked: boolean; // Whether media audio is ducked for voice feedback

  // Command history (last 5 commands for context)
  commandHistory: Array<{
    command: string;
    timestamp: number;
    success: boolean;
  }>;

  // Actions - Session control
  startListening: (trigger: 'menu-button' | 'wake-word' | 'manual') => void;
  stopListening: () => void;
  setProcessing: (isProcessing: boolean) => void;

  // Actions - Transcription and command updates
  setTranscription: (text: string) => void;
  setCommand: (command: string) => void;
  setResponse: (response: VoiceResponse) => void;
  clearTranscription: () => void;

  // Actions - Error handling
  setError: (error: VoiceError) => void;
  clearError: () => void;

  // Actions - Session metrics
  setSessionMetrics: (metrics: VoiceSessionMetrics) => void;
  updateSessionMetrics: (updates: Partial<VoiceSessionMetrics>) => void;
  endSession: (success: boolean) => void;

  // Actions - Audio ducking (TV-specific)
  setAudioDucked: (ducked: boolean) => void;

  // Actions - Wake word state (TV-specific)
  setWakeWordActive: (active: boolean) => void;

  // Actions - Command history
  addCommandToHistory: (command: string, success: boolean) => void;
  clearCommandHistory: () => void;

  // Selectors
  getLastNCommands: (n: number) => Array<{ command: string; timestamp: number; success: boolean }>;
  isActiveSession: () => boolean;
  getSessionDuration: () => number | null;
}

export const useVoiceStore = create<VoiceStoreState>((set, get) => ({
  // Initial state
  isListening: false,
  isProcessing: false,
  currentTranscription: '',
  lastCommand: null,
  lastResponse: null,
  error: null,
  sessionMetrics: null,
  isWakeWordActive: false,
  isMenuButtonListening: false,
  isAudioDucked: false,
  commandHistory: [],

  // Session control
  startListening: (trigger) => {
    const sessionId = `voice-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    set({
      isListening: true,
      isProcessing: false,
      currentTranscription: '',
      error: null,
      isMenuButtonListening: trigger === 'menu-button',
      isWakeWordActive: trigger === 'wake-word',
      sessionMetrics: {
        sessionId,
        startTime: Date.now(),
        wordsDetected: 0,
        confidenceAvg: 0,
        silenceDurationMs: 0,
        interruptions: 0,
        successfulExecution: false,
      },
    });
  },

  stopListening: () => {
    set({
      isListening: false,
      isMenuButtonListening: false,
      currentTranscription: '',
    });
  },

  setProcessing: (isProcessing) => {
    set({ isProcessing });
  },

  // Transcription and command updates
  setTranscription: (text) => {
    const { sessionMetrics } = get();
    const wordCount = text.trim().split(/\s+/).length;

    set({
      currentTranscription: text,
      sessionMetrics: sessionMetrics
        ? {
            ...sessionMetrics,
            wordsDetected: Math.max(sessionMetrics.wordsDetected, wordCount),
          }
        : null,
    });
  },

  setCommand: (command) => {
    set({
      lastCommand: command,
      currentTranscription: '',
      isListening: false,
      isMenuButtonListening: false,
    });
  },

  setResponse: (response) => {
    set({ lastResponse: response });
  },

  clearTranscription: () => {
    set({ currentTranscription: '' });
  },

  // Error handling
  setError: (error) => {
    set({
      error,
      isListening: false,
      isProcessing: false,
      isMenuButtonListening: false,
      currentTranscription: '',
    });
  },

  clearError: () => {
    set({ error: null });
  },

  // Session metrics
  setSessionMetrics: (metrics) => {
    set({ sessionMetrics: metrics });
  },

  updateSessionMetrics: (updates) => {
    const { sessionMetrics } = get();
    if (sessionMetrics) {
      set({
        sessionMetrics: {
          ...sessionMetrics,
          ...updates,
        },
      });
    }
  },

  endSession: (success) => {
    const { sessionMetrics } = get();
    if (sessionMetrics) {
      const endTime = Date.now();
      const durationMs = endTime - sessionMetrics.startTime;

      set({
        sessionMetrics: {
          ...sessionMetrics,
          endTime,
          durationMs,
          successfulExecution: success,
        },
        isListening: false,
        isProcessing: false,
        isMenuButtonListening: false,
        isWakeWordActive: false,
        currentTranscription: '',
      });
    }
  },

  // Audio ducking (TV-specific)
  setAudioDucked: (ducked) => {
    set({ isAudioDucked: ducked });
  },

  // Wake word state (TV-specific)
  setWakeWordActive: (active) => {
    set({ isWakeWordActive: active });
  },

  // Command history
  addCommandToHistory: (command, success) => {
    const { commandHistory } = get();
    const newEntry = {
      command,
      timestamp: Date.now(),
      success,
    };

    // Keep only last 5 commands
    const updatedHistory = [newEntry, ...commandHistory].slice(0, 5);

    set({ commandHistory: updatedHistory });
  },

  clearCommandHistory: () => {
    set({ commandHistory: [] });
  },

  // Selectors
  getLastNCommands: (n) => {
    const { commandHistory } = get();
    return commandHistory.slice(0, n);
  },

  isActiveSession: () => {
    const { isListening, isProcessing } = get();
    return isListening || isProcessing;
  },

  getSessionDuration: () => {
    const { sessionMetrics } = get();
    if (!sessionMetrics) return null;

    if (sessionMetrics.durationMs) {
      return sessionMetrics.durationMs;
    }

    // If session is still active, calculate current duration
    if (get().isActiveSession()) {
      return Date.now() - sessionMetrics.startTime;
    }

    return null;
  },
}));

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

export default useVoiceStore;
