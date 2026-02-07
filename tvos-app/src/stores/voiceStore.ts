/**
 * Voice Store for tvOS - TV-optimized voice commands and Siri integration
 * Ephemeral state - no persistence (voice sessions are transient)
 */

import { create } from 'zustand';
import type { VoiceStoreState } from '../types/voice';

// Re-export types for backward compatibility
export type { VoiceSessionMetrics, VoiceResponse, VoiceError, VoiceErrorType, VoiceStoreState } from '../types/voice';

export const useVoiceStore = create<VoiceStoreState>((set, get) => ({
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
    set({ isListening: false, isMenuButtonListening: false, currentTranscription: '' });
  },

  setProcessing: (isProcessing) => set({ isProcessing }),

  setTranscription: (text) => {
    const { sessionMetrics } = get();
    const wordCount = text.trim().split(/\s+/).length;
    set({
      currentTranscription: text,
      sessionMetrics: sessionMetrics
        ? { ...sessionMetrics, wordsDetected: Math.max(sessionMetrics.wordsDetected, wordCount) }
        : null,
    });
  },

  setCommand: (command) => {
    set({ lastCommand: command, currentTranscription: '', isListening: false, isMenuButtonListening: false });
  },

  setResponse: (response) => set({ lastResponse: response }),
  clearTranscription: () => set({ currentTranscription: '' }),

  setError: (error) => {
    set({
      error,
      isListening: false,
      isProcessing: false,
      isMenuButtonListening: false,
      currentTranscription: '',
    });
  },

  clearError: () => set({ error: null }),

  setSessionMetrics: (metrics) => set({ sessionMetrics: metrics }),

  updateSessionMetrics: (updates) => {
    const { sessionMetrics } = get();
    if (sessionMetrics) {
      set({ sessionMetrics: { ...sessionMetrics, ...updates } });
    }
  },

  endSession: (success) => {
    const { sessionMetrics } = get();
    if (sessionMetrics) {
      const endTime = Date.now();
      set({
        sessionMetrics: {
          ...sessionMetrics,
          endTime,
          durationMs: endTime - sessionMetrics.startTime,
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

  setAudioDucked: (ducked) => set({ isAudioDucked: ducked }),
  setWakeWordActive: (active) => set({ isWakeWordActive: active }),

  addCommandToHistory: (command, success) => {
    const { commandHistory } = get();
    const newEntry = { command, timestamp: Date.now(), success };
    const updatedHistory = [newEntry, ...commandHistory].slice(0, 5);
    set({ commandHistory: updatedHistory });
  },

  clearCommandHistory: () => set({ commandHistory: [] }),

  getLastNCommands: (n) => get().commandHistory.slice(0, n),

  isActiveSession: () => {
    const { isListening, isProcessing } = get();
    return isListening || isProcessing;
  },

  getSessionDuration: () => {
    const { sessionMetrics } = get();
    if (!sessionMetrics) return null;
    if (sessionMetrics.durationMs) return sessionMetrics.durationMs;
    if (get().isActiveSession()) return Date.now() - sessionMetrics.startTime;
    return null;
  },
}));

export default useVoiceStore;
