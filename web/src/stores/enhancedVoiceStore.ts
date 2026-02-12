/**
 * Enhanced Voice Store for Web with Shared Services Integration
 * Integrates emotional intelligence, voice processing, and conversation context
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  voiceProcessor,
  emotionalIntelligenceService,
  conversationContextManager,
  voiceAnalytics
} from '@bayit/shared-voice-services';
import type { VoiceAnalysis } from '@bayit/shared-voice-services';

interface VoiceSession {
  sessionId: string;
  startTime: number;
  commandCount: number;
}

interface EnhancedVoiceState {
  // Session state
  currentSession: VoiceSession | null;
  isListening: boolean;
  isProcessing: boolean;
  currentTranscript: string;
  lastCommand: string | null;
  lastResponse: string | null;
  error: string | null;

  // Command history
  commandHistory: Array<{ command: string; timestamp: number; success: boolean }>;

  // Emotional intelligence
  emotionalAnalysis: VoiceAnalysis | null;

  // Actions - Session
  startSession: () => void;
  endSession: () => void;

  // Actions - State
  setListening: (listening: boolean) => void;
  setProcessing: (processing: boolean) => void;
  setTranscript: (transcript: string) => void;
  setError: (error: string | null) => void;

  // Actions - Commands
  processTranscriptionWithEI: (transcription: string, confidence: number) => void;
  addCommandToHistory: (command: string, success: boolean) => void;
  clearCommandHistory: () => void;

  // Selectors
  getAdaptiveTTSRate: () => number;
  shouldOfferHelp: () => boolean;
  getHelpSuggestion: () => string | undefined;
  getRecentCommands: (count: number) => string[];
}

export const useEnhancedVoiceStore = create<EnhancedVoiceState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentSession: null,
      isListening: false,
      isProcessing: false,
      currentTranscript: '',
      lastCommand: null,
      lastResponse: null,
      error: null,
      commandHistory: [],
      emotionalAnalysis: null,

      // Session management
      startSession: () => {
        const sessionId = `voice-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        voiceAnalytics.startSession(sessionId);

        set({
          currentSession: {
            sessionId,
            startTime: Date.now(),
            commandCount: 0
          },
          isListening: false,
          isProcessing: false,
          error: null
        });
      },

      endSession: () => {
        const { currentSession } = get();
        if (currentSession) {
          voiceAnalytics.endSession(currentSession.sessionId);
        }

        set({
          currentSession: null,
          isListening: false,
          isProcessing: false,
          currentTranscript: ''
        });
      },

      // State updates
      setListening: (listening) => set({ isListening: listening }),

      setProcessing: (processing) => set({ isProcessing: processing }),

      setTranscript: (transcript) => set({ currentTranscript: transcript }),

      setError: (error) => set({ error, isListening: false, isProcessing: false }),

      // Command processing with EI
      processTranscriptionWithEI: (transcription, confidence) => {
        const { commandHistory, currentSession } = get();

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
        if (currentSession && processedCommand.intent) {
          voiceAnalytics.trackCommand(
            currentSession.sessionId,
            processedCommand.intent.action,
            processedCommand.shouldExecute,
            confidence,
            analysis.frustrationLevel
          );
        }

        // Add to conversation context
        if (currentSession) {
          conversationContextManager.addUserMessage(
            currentSession.sessionId,
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
          lastCommand: transcription,
          currentTranscript: transcription
        });
      },

      // Command history
      addCommandToHistory: (command, success) => {
        const { commandHistory, currentSession } = get();
        const newEntry = { command, timestamp: Date.now(), success };
        const updatedHistory = [newEntry, ...commandHistory].slice(0, 10);

        set({
          commandHistory: updatedHistory,
          currentSession: currentSession
            ? { ...currentSession, commandCount: currentSession.commandCount + 1 }
            : null
        });
      },

      clearCommandHistory: () => {
        const { currentSession } = get();
        set({ commandHistory: [] });
        voiceProcessor.clearHistory();
        if (currentSession) {
          conversationContextManager.clearContext(currentSession.sessionId);
        }
      },

      // Selectors
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
        return emotionalAnalysis?.suggestion;
      },

      getRecentCommands: (count) => {
        const { commandHistory } = get();
        return commandHistory.slice(0, count).map(entry => entry.command);
      }
    }),
    {
      name: 'bayit-enhanced-voice',
      partialize: (state) => ({
        commandHistory: state.commandHistory.slice(0, 5), // Only persist last 5
      }),
    }
  )
);

export default useEnhancedVoiceStore;
