/**
 * useVoiceTV - tvOS Voice Command Integration Hook
 *
 * TV-optimized voice orchestration integrating:
 * - Menu button long-press detection (primary trigger)
 * - Speech recognition with tvOS Speech Framework
 * - Voice command processing via backend
 * - Text-to-speech responses
 * - 45-second timeout for 10-foot speaking distance
 *
 * TV-SPECIFIC DESIGN:
 * - Menu button primary trigger (500ms long-press)
 * - Longer 45s timeout vs 30s mobile for TV viewing distance
 * - Slower TTS rate (0.9x) for TV clarity
 * - Focus-aware visual feedback during listening
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { speechService } from '../services/speech';
import { ttsService } from '../services/tts';
import { voiceManager } from '../services/voiceManager';
import { backendProxyService } from '../services/backendProxyService';
import { config } from '../config/appConfig';
import { useVoiceStore } from '../stores/voiceStore';

import logger from '@/utils/logger';

const moduleLogger = logger.scope('useVoiceTV');

export interface UseVoiceTVResult {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  error: string | null;
  hasPermissions: boolean;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  requestPermissions: () => Promise<boolean>;
}

/**
 * Main tvOS voice hook for Menu button and voice command integration
 * Manages complete voice lifecycle: listening → processing → response
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
  const commandHistoryRef = useRef<string[]>([]);

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, []);

  // Sync listening state with store
  useEffect(() => {
    if (isListening) {
      voiceStore.startListening('menu-button');
    }
  }, [isListening, voiceStore]);

  // Check if permissions are granted
  const checkPermissions = useCallback(async () => {
    try {
      const permissions = await speechService.checkPermissions();
      setHasPermissions(permissions.microphone && permissions.speech);
    } catch (err) {
      moduleLogger.error('Permission check failed:', err);
      setHasPermissions(false);
    }
  }, []);

  // Request permissions
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const result = await speechService.requestPermissions();
      setHasPermissions(result.granted);
      return result.granted;
    } catch (err: any) {
      moduleLogger.error('Permission request failed:', err);
      const message = 'Failed to request microphone permissions';
      setError(message);
      setHasPermissions(false);
      return false;
    }
  }, []);

  // Process voice command via backend
  const processCommand = useCallback(async (transcription: string) => {
    if (!transcription.trim()) return;

    setIsProcessing(true);
    setTranscript(transcription);
    voiceStore.setProcessing(true);
    voiceStore.setTranscription(transcription);

    try {
      // Send transcription to backend for processing
      const commandResponse = await backendProxyService.processVoiceCommand({
        transcription,
        language: config.voice.speechLanguage,
        confidence: 0.8,
      });

      // Add to command history (last 5)
      commandHistoryRef.current = [transcription, ...commandHistoryRef.current].slice(0, 5);
      voiceStore.addCommandToHistory(transcription, true);

      // Speak response
      if (commandResponse.spokenResponse) {
        await ttsService.speak(commandResponse.spokenResponse, {
          language: config.voice.ttsLanguage,
          rate: config.voice.ttsRate,
        });
      }

      // Update store with response
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

      // Speak error message
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
  }, [voiceStore]);

  // Handle speech recognition result
  const handleRecognitionResult = useCallback(
    (result: any) => {
      currentTranscriptRef.current = result.transcription;
      setTranscript(result.transcription);

      // Clear existing timeout
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }

      // Process immediately if final or high confidence
      if (result.isFinal || result.confidence > 0.8) {
        processCommand(result.transcription);
      } else {
        // Debounce: wait for more input (1.5s)
        processingTimeoutRef.current = setTimeout(() => {
          if (currentTranscriptRef.current) {
            processCommand(currentTranscriptRef.current);
          }
        }, 1500);
      }
    },
    [processCommand],
  );

  // Handle speech recognition error
  const handleRecognitionError = useCallback((errorEvent: { error: string }) => {
    moduleLogger.error('Recognition error:', errorEvent.error);
    setError(errorEvent.error);
    setIsListening(false);
    voiceStore.stopListening();
  }, [voiceStore]);

  // Start listening
  const startListening = useCallback(async () => {
    if (isListening) return;

    // Check permissions first
    if (!hasPermissions) {
      const granted = await requestPermissions();
      if (!granted) return;
    }

    try {
      // Add listeners
      speechService.addResultListener(handleRecognitionResult);
      speechService.addErrorListener(handleRecognitionError);

      // Start recognition with TV timeout (45s)
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

      // Clean up listeners
      speechService.removeResultListener(handleRecognitionResult);
      speechService.removeErrorListener(handleRecognitionError);
    }
  }, [isListening, hasPermissions, requestPermissions, handleRecognitionResult, handleRecognitionError]);

  // Stop listening
  const stopListening = useCallback(async () => {
    if (!isListening) return;

    try {
      await speechService.stopRecognition();

      // Process any remaining transcript
      if (currentTranscriptRef.current.trim()) {
        await processCommand(currentTranscriptRef.current);
      }
    } catch (err) {
      moduleLogger.error('Failed to stop listening:', err);
    } finally {
      setIsListening(false);

      // Clean up listeners
      speechService.removeResultListener(handleRecognitionResult);
      speechService.removeErrorListener(handleRecognitionError);

      // Clear timeout
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }

      voiceStore.stopListening();
    }
  }, [isListening, handleRecognitionResult, handleRecognitionError, processCommand, voiceStore]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isListening) {
        stopListening();
      }
    };
  }, [isListening, stopListening]);

  return {
    isListening,
    isProcessing,
    transcript,
    error,
    hasPermissions,
    startListening,
    stopListening,
    requestPermissions,
  };
}
