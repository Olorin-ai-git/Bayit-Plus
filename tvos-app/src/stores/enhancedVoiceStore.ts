/**
 * Enhanced Voice Store for tvOS with Shared Services Integration
 * Integrates emotional intelligence, voice processing, and conversation context
 */

import { create } from 'zustand';
import {
  voiceProcessor,
  emotionalIntelligenceService,
  conversationContextManager,
  voiceAnalytics
} from '@bayit/shared-voice-services';
import type { VoiceStoreState } from '../types/voice';
import type { VoiceAnalysis } from '@bayit/shared-voice-services';

interface EnhancedVoiceStoreState extends VoiceStoreState {
  // Enhanced state with emotional intelligence
  emotionalAnalysis: VoiceAnalysis | null;
  sessionId: string | null;

  // Enhanced actions
  processTranscriptionWithEI: (transcription: string, confidence: number) => void;
  getAdaptiveTTSRate: () => number;
  shouldOfferHelp: () => boolean;
  getHelpSuggestion: () => string | undefined;
}

export const useEnhancedVoiceStore = create<EnhancedVoiceStoreState>((set, get) => ({
  // Original state
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

  // Enhanced state
  emotionalAnalysis: null,
  sessionId: null,

  startListening: (trigger) => {
    const sessionId = `voice-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Start analytics session
    voiceAnalytics.startSession(sessionId);

    set({
      isListening: true,
      isProcessing: false,
      currentTranscription: '',
      error: null,
      isMenuButtonListening: trigger === 'menu-button',
      isWakeWordActive: trigger === 'wake-word',
      sessionId,
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
    const { sessionMetrics, sessionId } = get();
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

      // End analytics session
      if (sessionId) {
        voiceAnalytics.endSession(sessionId);
      }
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

  clearCommandHistory: () => {
    set({ commandHistory: [] });
    voiceProcessor.clearHistory();
    conversationContextManager.clearContext(get().sessionId || 'default');
  },

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

  // Enhanced actions with emotional intelligence

  processTranscriptionWithEI: (transcription, confidence) => {
    const { commandHistory, sessionId } = get();

    // Process with voice processor
    const processedCommand = voiceProcessor.processTranscript(transcription, confidence);

    // Get command history for emotional analysis
    const recentCommands = commandHistory.map(entry => entry.command);
    const successHistory = commandHistory.map(entry => entry.success);

    // Analyze emotional state
    const analysis = emotionalIntelligenceService.analyzeVoicePattern(
      transcription,
      recentCommands,
      successHistory
    );

    // Track in analytics
    if (sessionId && processedCommand.intent) {
      voiceAnalytics.trackCommand(
        sessionId,
        processedCommand.intent.action,
        processedCommand.shouldExecute,
        confidence,
        analysis.frustrationLevel
      );
    }

    // Add to conversation context
    if (sessionId) {
      conversationContextManager.addUserMessage(
        sessionId,
        transcription,
        {
          intent: processedCommand.intent.action,
          confidence,
          frustrationLevel: analysis.frustrationLevel
        }
      );
    }

    set({
      emotionalAnalysis: analysis,
      currentTranscription: transcription
    });
  },

  getAdaptiveTTSRate: () => {
    const { emotionalAnalysis } = get();
    if (!emotionalAnalysis) return 1.0;

    return emotionalIntelligenceService.adjustTTSRate(1.0, emotionalAnalysis.frustrationLevel);
  },

  shouldOfferHelp: () => {
    const { emotionalAnalysis, commandHistory } = get();
    if (!emotionalAnalysis) return false;

    const recentCommands = commandHistory.map(entry => entry.command);
    return emotionalIntelligenceService.shouldOfferHelp(emotionalAnalysis, recentCommands);
  },

  getHelpSuggestion: () => {
    const { emotionalAnalysis } = get();
    if (!emotionalAnalysis) return undefined;

    return emotionalAnalysis.suggestion;
  },
}));

export default useEnhancedVoiceStore;
