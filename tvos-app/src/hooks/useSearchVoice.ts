/**
 * useSearchVoice - Speech recognition for AI search on tvOS
 *
 * Connects the native SpeechService to a search input,
 * auto-stops after silence, and passes transcripts to the caller.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  speechService,
  type SpeechRecognitionResult,
} from '../services/speech';
import { logger } from '../utils/logger';

interface UseSearchVoiceOptions {
  onTranscript: (text: string) => void;
  language?: string;
}

interface UseSearchVoiceReturn {
  isListening: boolean;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  transcript: string;
}

export function useSearchVoice({
  onTranscript,
  language = 'he',
}: UseSearchVoiceOptions): UseSearchVoiceReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  // Handle speech results
  const handleResult = useCallback(
    (result: SpeechRecognitionResult) => {
      setTranscript(result.transcription);

      if (result.isFinal) {
        logger.info('Voice search transcript finalized', {
          confidence: result.confidence,
          length: result.transcription.length,
        });
        onTranscriptRef.current(result.transcription);
        setIsListening(false);
      }
    },
    [],
  );

  // Handle speech errors
  const handleError = useCallback((error: { error: string }) => {
    logger.error('Voice search recognition error', { error: error.error });
    setIsListening(false);
  }, []);

  // Register and clean up listeners
  useEffect(() => {
    speechService.addResultListener(handleResult);
    speechService.addErrorListener(handleError);

    return () => {
      speechService.removeResultListener(handleResult);
      speechService.removeErrorListener(handleError);
    };
  }, [handleResult, handleError]);

  const startListening = useCallback(async () => {
    try {
      const permissions = await speechService.requestPermissions();
      if (!permissions.granted) {
        logger.warn('Speech permissions not granted for voice search');
        return;
      }

      await speechService.setLanguage(language);
      await speechService.startRecognition();
      setIsListening(true);
      setTranscript('');

      logger.info('Voice search listening started', { language });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Failed to start voice search', { error: message });
      setIsListening(false);
    }
  }, [language]);

  const stopListening = useCallback(async () => {
    try {
      await speechService.stopRecognition();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Failed to stop voice search', { error: message });
    } finally {
      setIsListening(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isListening) {
        speechService.stopRecognition().catch(() => {});
      }
    };
  }, [isListening]);

  return { isListening, startListening, stopListening, transcript };
}
