/**
 * useEnhancedVoiceCommandProcessor - Enhanced Voice Command Processing with EI
 *
 * Integrates emotional intelligence, adaptive TTS, and conversation context
 */

import { useCallback, useRef } from 'react';
import { ttsService } from '../services/tts';
import { backendProxyService } from '../services/backendProxyService';
import { config } from '../config/appConfig';
import { useEnhancedVoiceStore } from '../stores/enhancedVoiceStore';
import {
  emotionalIntelligenceService,
  conversationContextManager
} from '@bayit/shared-voice-services';

import logger from '@/utils/logger';

const moduleLogger = logger.scope('useEnhancedVoiceCommandProcessor');

interface ProcessorCallbacks {
  setIsProcessing: (v: boolean) => void;
  setTranscript: (v: string) => void;
  setError: (v: string | null) => void;
}

/**
 * Enhanced hook for processing voice commands with emotional intelligence
 */
export function useEnhancedVoiceCommandProcessor(callbacks: ProcessorCallbacks) {
  const { setIsProcessing, setTranscript, setError } = callbacks;
  const voiceStore = useEnhancedVoiceStore();
  const commandHistoryRef = useRef<string[]>([]);

  const processCommand = useCallback(async (transcription: string, confidence: number = 0.8) => {
    if (!transcription.trim()) return;

    setIsProcessing(true);
    setTranscript(transcription);
    voiceStore.setProcessing(true);

    // Process with emotional intelligence
    voiceStore.processTranscriptionWithEI(transcription, confidence);

    try {
      // Get emotional analysis
      const emotionalAnalysis = voiceStore.getState().emotionalAnalysis;
      const adaptiveTTSRate = voiceStore.getAdaptiveTTSRate();
      const shouldOfferHelp = voiceStore.shouldOfferHelp();
      const helpSuggestion = voiceStore.getHelpSuggestion();

      // Send command to backend
      const commandResponse = await backendProxyService.processVoiceCommand({
        transcription,
        language: config.voice.speechLanguage,
        confidence,
      });

      commandHistoryRef.current = [transcription, ...commandHistoryRef.current].slice(0, 5);
      voiceStore.addCommandToHistory(transcription, true);

      // Adapt response based on emotional state
      let spokenResponse = commandResponse.spokenResponse || 'Command executed';

      if (emotionalAnalysis) {
        spokenResponse = emotionalIntelligenceService.generateAdaptiveResponse(
          spokenResponse,
          emotionalAnalysis.frustrationLevel
        );

        // Append help suggestion if needed
        if (shouldOfferHelp && helpSuggestion) {
          spokenResponse += ` ${helpSuggestion}`;
        }
      }

      // Speak with adaptive TTS rate
      if (spokenResponse) {
        await ttsService.speak(spokenResponse, {
          language: config.voice.ttsLanguage,
          rate: adaptiveTTSRate,
        });
      }

      // Add assistant response to conversation context
      const sessionId = voiceStore.getState().sessionId;
      if (sessionId) {
        conversationContextManager.addAssistantMessage(
          sessionId,
          spokenResponse,
          true,
          emotionalAnalysis?.frustrationLevel
        );
      }

      voiceStore.setResponse({
        type: 'success',
        message: spokenResponse,
        timestamp: Date.now(),
      });

      setError(null);
    } catch (err: any) {
      moduleLogger.error('Command processing failed:', err);
      const errorMessage = err.message || 'Failed to process command';
      setError(errorMessage);
      voiceStore.addCommandToHistory(transcription, false);

      // Get emotional analysis for error response
      const emotionalAnalysis = voiceStore.getState().emotionalAnalysis;
      const adaptiveTTSRate = voiceStore.getAdaptiveTTSRate();

      // Generate empathetic error message based on frustration
      let errorResponse = 'Sorry, I did not understand that command.';

      if (emotionalAnalysis) {
        if (emotionalAnalysis.frustrationLevel > 0.7) {
          errorResponse = "I apologize for the confusion. Let me help you find what you're looking for. Try saying 'show me what's popular' or 'browse categories'.";
        } else if (emotionalAnalysis.frustrationLevel > 0.5) {
          errorResponse = "I'm sorry, I didn't quite catch that. Could you try rephrasing your request?";
        }
      }

      await ttsService.speak(errorResponse, {
        language: config.voice.ttsLanguage,
        rate: adaptiveTTSRate,
      });

      // Add failed assistant response to conversation context
      const sessionId = voiceStore.getState().sessionId;
      if (sessionId) {
        conversationContextManager.addAssistantMessage(
          sessionId,
          errorResponse,
          false,
          emotionalAnalysis?.frustrationLevel
        );
      }

      voiceStore.setResponse({
        type: 'error',
        message: errorMessage,
        timestamp: Date.now(),
      });
    } finally {
      setIsProcessing(false);
      voiceStore.setProcessing(false);
    }
  }, [voiceStore, setIsProcessing, setTranscript, setError]);

  return processCommand;
}
