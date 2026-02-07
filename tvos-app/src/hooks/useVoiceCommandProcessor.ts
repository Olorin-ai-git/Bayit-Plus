/**
 * useVoiceCommandProcessor - Voice Command Processing Hook
 *
 * Handles sending voice commands to backend, updating store,
 * and triggering TTS responses.
 */

import { useCallback, useRef } from 'react';
import { ttsService } from '../services/tts';
import { backendProxyService } from '../services/backendProxyService';
import { config } from '../config/appConfig';
import { useVoiceStore } from '../stores/voiceStore';

import logger from '@/utils/logger';

const moduleLogger = logger.scope('useVoiceCommandProcessor');

interface ProcessorCallbacks {
  setIsProcessing: (v: boolean) => void;
  setTranscript: (v: string) => void;
  setError: (v: string | null) => void;
}

/**
 * Hook for processing voice commands via the backend API
 */
export function useVoiceCommandProcessor(callbacks: ProcessorCallbacks) {
  const { setIsProcessing, setTranscript, setError } = callbacks;
  const voiceStore = useVoiceStore();
  const commandHistoryRef = useRef<string[]>([]);

  const processCommand = useCallback(async (transcription: string) => {
    if (!transcription.trim()) return;

    setIsProcessing(true);
    setTranscript(transcription);
    voiceStore.setProcessing(true);
    voiceStore.setTranscription(transcription);

    try {
      const commandResponse = await backendProxyService.processVoiceCommand({
        transcription,
        language: config.voice.speechLanguage,
        confidence: 0.8,
      });

      commandHistoryRef.current = [transcription, ...commandHistoryRef.current].slice(0, 5);
      voiceStore.addCommandToHistory(transcription, true);

      if (commandResponse.spokenResponse) {
        await ttsService.speak(commandResponse.spokenResponse, {
          language: config.voice.ttsLanguage,
          rate: config.voice.ttsRate,
        });
      }

      voiceStore.setResponse({
        type: 'success',
        message: commandResponse.spokenResponse || 'Command executed',
        timestamp: Date.now(),
      });

      setError(null);
    } catch (err: any) {
      moduleLogger.error('Command processing failed:', err);
      const errorMessage = err.message || 'Failed to process command';
      setError(errorMessage);
      voiceStore.addCommandToHistory(transcription, false);

      await ttsService.speak('Sorry, I did not understand that command.', {
        language: config.voice.ttsLanguage,
        rate: config.voice.ttsRate,
      });

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
