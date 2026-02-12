/**
 * useEnhancedVoiceTV - Enhanced tvOS Voice with Emotional Intelligence
 *
 * TV-optimized voice orchestration with:
 * - Emotional intelligence and frustration detection
 * - Adaptive TTS based on user emotion
 * - Conversation context tracking
 * - Smart help suggestions
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { speechService } from '../services/speech';
import { useEnhancedVoiceStore } from '../stores/enhancedVoiceStore';
import { useEnhancedVoiceCommandProcessor } from './useEnhancedVoiceCommandProcessor';

import logger from '@/utils/logger';

const moduleLogger = logger.scope('useEnhancedVoiceTV');

import type { UseVoiceTVResult } from './types/voiceTV.types';

/**
 * Enhanced tvOS voice hook with emotional intelligence
 */
export function useEnhancedVoiceTV(): UseVoiceTVResult {
  const voiceStore = useEnhancedVoiceStore();

  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasPermissions, setHasPermissions] = useState(false);

  const currentTranscriptRef = useRef('');
  const currentConfidenceRef = useRef(0);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const processCommand = useEnhancedVoiceCommandProcessor({
    setIsProcessing,
    setTranscript,
    setError
  });

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
      currentConfidenceRef.current = result.confidence || 0.8;
      setTranscript(result.transcription);

      if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current);

      if (result.isFinal || result.confidence > 0.8) {
        processCommand(result.transcription, result.confidence || 0.8);
      } else {
        processingTimeoutRef.current = setTimeout(() => {
          if (currentTranscriptRef.current) {
            processCommand(currentTranscriptRef.current, currentConfidenceRef.current);
          }
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
      currentConfidenceRef.current = 0;

      moduleLogger.info('Enhanced voice listening started with EI');
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
        await processCommand(currentTranscriptRef.current, currentConfidenceRef.current);
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

  return {
    isListening,
    isProcessing,
    transcript,
    error,
    hasPermissions,
    startListening,
    stopListening,
    requestPermissions
  };
}
