/**
 * useVoiceTV - tvOS Voice Command Integration Hook
 *
 * TV-optimized voice orchestration integrating:
 * - Menu button long-press detection (primary trigger)
 * - Speech recognition with tvOS Speech Framework
 * - Voice command processing via backend (useVoiceCommandProcessor)
 * - Text-to-speech responses
 * - 45-second timeout for 10-foot speaking distance
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { speechService } from '../services/speech';
import { useVoiceStore } from '../stores/voiceStore';
import { useVoiceCommandProcessor } from './useVoiceCommandProcessor';

import logger from '@/utils/logger';

const moduleLogger = logger.scope('useVoiceTV');

import type { UseVoiceTVResult } from './types/voiceTV.types';

// Re-export types for backward compatibility
export type { UseVoiceTVResult };

/**
 * Main tvOS voice hook for Menu button and voice command integration
 */
export function useVoiceTV(): UseVoiceTVResult {
  const voiceStore = useVoiceStore();

  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasPermissions, setHasPermissions] = useState(false);

  const currentTranscriptRef = useRef('');
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const processCommand = useVoiceCommandProcessor({ setIsProcessing, setTranscript, setError });

  useEffect(() => { checkPermissions(); }, []);

  useEffect(() => {
    if (isListening) voiceStore.startListening('menu-button');
  }, [isListening, voiceStore]);

  const checkPermissions = useCallback(async () => {
    try {
      const permissions = await speechService.checkPermissions();
      setHasPermissions(permissions.microphone && permissions.speech);
    } catch (err) {
      moduleLogger.error('Permission check failed:', err);
      setHasPermissions(false);
    }
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const result = await speechService.requestPermissions();
      setHasPermissions(result.granted);
      return result.granted;
    } catch (err: any) {
      moduleLogger.error('Permission request failed:', err);
      setError('Failed to request microphone permissions');
      setHasPermissions(false);
      return false;
    }
  }, []);

  const handleRecognitionResult = useCallback(
    (result: any) => {
      currentTranscriptRef.current = result.transcription;
      setTranscript(result.transcription);

      if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current);

      if (result.isFinal || result.confidence > 0.8) {
        processCommand(result.transcription);
      } else {
        processingTimeoutRef.current = setTimeout(() => {
          if (currentTranscriptRef.current) processCommand(currentTranscriptRef.current);
        }, 1500);
      }
    },
    [processCommand],
  );

  const handleRecognitionError = useCallback((errorEvent: { error: string }) => {
    moduleLogger.error('Recognition error:', errorEvent.error);
    setError(errorEvent.error);
    setIsListening(false);
    voiceStore.stopListening();
  }, [voiceStore]);

  const startListening = useCallback(async () => {
    if (isListening) return;

    if (!hasPermissions) {
      const granted = await requestPermissions();
      if (!granted) return;
    }

    try {
      speechService.addResultListener(handleRecognitionResult);
      speechService.addErrorListener(handleRecognitionError);

      await speechService.startRecognition();
      setIsListening(true);
      setError(null);
      setTranscript('');
      currentTranscriptRef.current = '';

      moduleLogger.info('Voice listening started (TV - Menu button trigger)');
    } catch (err: any) {
      moduleLogger.error('Failed to start listening:', err);
      setError(err.message || 'Failed to start voice recognition');
      setIsListening(false);

      speechService.removeResultListener(handleRecognitionResult);
      speechService.removeErrorListener(handleRecognitionError);
    }
  }, [isListening, hasPermissions, requestPermissions, handleRecognitionResult, handleRecognitionError]);

  const stopListening = useCallback(async () => {
    if (!isListening) return;

    try {
      await speechService.stopRecognition();
      if (currentTranscriptRef.current.trim()) {
        await processCommand(currentTranscriptRef.current);
      }
    } catch (err) {
      moduleLogger.error('Failed to stop listening:', err);
    } finally {
      setIsListening(false);
      speechService.removeResultListener(handleRecognitionResult);
      speechService.removeErrorListener(handleRecognitionError);
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }
      voiceStore.stopListening();
    }
  }, [isListening, handleRecognitionResult, handleRecognitionError, processCommand, voiceStore]);

  useEffect(() => {
    return () => { if (isListening) stopListening(); };
  }, [isListening, stopListening]);

  return { isListening, isProcessing, transcript, error, hasPermissions, startListening, stopListening, requestPermissions };
}
