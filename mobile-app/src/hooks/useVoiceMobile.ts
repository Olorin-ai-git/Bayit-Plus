/**
 * useVoiceMobile - Mobile voice integration hook
 *
 * Integrates iOS Speech framework with shared voice command processor:
 * - Speech recognition with native iOS Speech framework
 * - Voice command processing with shared voiceCommandProcessor
 * - TTS responses with shared ttsService
 * - Permission handling
 * - Multi-language support (Hebrew, English, Spanish)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import { speechService } from '../services/speech';
import type { SpeechRecognitionResult } from '../services/speech';
import { voiceCommandProcessor, emotionalIntelligenceService } from '@bayit/shared-services';
import { ttsService } from '@bayit/shared-services';
import { useVoiceSettingsStore } from '@bayit/shared-stores';
import { useNavigation } from '@react-navigation/native';
import { usePiPWidgetStore } from '../stores/pipWidgetStore';

interface UseVoiceMobileResult {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  error: string | null;
  hasPermissions: boolean;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  requestPermissions: () => Promise<boolean>;
}

export function useVoiceMobile(): UseVoiceMobileResult {
  const navigation = useNavigation();
  const widgetStore = usePiPWidgetStore();
  const { language, speechRate } = useVoiceSettingsStore();

  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasPermissions, setHasPermissions] = useState(false);

  const currentTranscriptRef = useRef('');
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Command history for emotional intelligence (last 5 commands)
  const commandHistoryRef = useRef<string[]>([]);

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, []);

  // Set speech recognition language based on app language
  useEffect(() => {
    if (hasPermissions) {
      speechService.setLanguage(language).catch((err) => {
        console.error('[useVoiceMobile] Failed to set language:', err);
      });
    }
  }, [language, hasPermissions]);

  // Check if permissions are granted
  const checkPermissions = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      setHasPermissions(false);
      return;
    }

    try {
      const permissions = await speechService.checkPermissions();
      setHasPermissions(permissions.microphone && permissions.speech);
    } catch (err) {
      console.error('[useVoiceMobile] Permission check failed:', err);
      setHasPermissions(false);
    }
  }, []);

  // Request permissions
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Not Supported', 'Voice commands are only available on iOS');
      return false;
    }

    try {
      const result = await speechService.requestPermissions();
      setHasPermissions(result.granted);
      return result.granted;
    } catch (err: any) {
      console.error('[useVoiceMobile] Permission request failed:', err);

      let message = 'Failed to request permissions';
      if (err.code === 'PERMISSION_DENIED') {
        message = 'Microphone or speech recognition permission denied. Please enable in Settings.';
      } else if (err.code === 'PERMISSION_RESTRICTED') {
        message = 'Speech recognition is restricted on this device.';
      }

      Alert.alert('Permission Required', message);
      setHasPermissions(false);
      return false;
    }
  }, []);

  // Process voice command
  const processCommand = useCallback(
    async (transcription: string) => {
      if (!transcription.trim()) return;

      setIsProcessing(true);
      setTranscript(transcription);

      try {
        // Analyze emotional state using command history
        const voiceAnalysis = emotionalIntelligenceService.analyzeVoicePattern(
          transcription,
          commandHistoryRef.current
        );

        console.log('[useVoiceMobile] Voice analysis:', {
          frustration: voiceAnalysis.frustrationLevel,
          isRepeat: voiceAnalysis.isRepeatQuery,
          hesitation: voiceAnalysis.hesitationDetected,
        });

        // Process command with shared voiceCommandProcessor
        const result = await voiceCommandProcessor.processCommand(transcription, {
          navigation,
          widgetStore,
          language,
        });

        // Adapt response based on frustration level
        let responseText = result.response || '';
        if (responseText) {
          responseText = emotionalIntelligenceService.generateAdaptiveResponse(
            responseText,
            voiceAnalysis.frustrationLevel
          );
        }

        // If user needs help, offer assistance
        if (emotionalIntelligenceService.shouldOfferHelp(voiceAnalysis, commandHistoryRef.current)) {
          const helpSuggestion = emotionalIntelligenceService.generateHelpSuggestion(voiceAnalysis);
          responseText = responseText ? `${responseText} ${helpSuggestion}` : helpSuggestion;
        }

        // Speak response with adaptive tone
        if (responseText) {
          const toneAdjustment = emotionalIntelligenceService.getToneAdjustment(
            voiceAnalysis.frustrationLevel
          );

          // Adjust speech rate based on frustration
          let adjustedRate = speechRate;
          if (toneAdjustment.responseSpeed === 'slow') {
            adjustedRate = Math.max(0.5, speechRate - 0.2);
          } else if (toneAdjustment.responseSpeed === 'fast') {
            adjustedRate = Math.min(2.0, speechRate + 0.2);
          }

          await ttsService.speak(responseText, {
            language,
            rate: adjustedRate,
          });
        }

        // Add to command history (keep last 5)
        commandHistoryRef.current = [transcription, ...commandHistoryRef.current].slice(0, 5);

        // Handle navigation if needed
        if (result.action === 'navigate' && result.screen) {
          // @ts-ignore - navigation types vary
          navigation.navigate(result.screen, result.params);
        }

        // Handle widget actions
        if (result.action === 'widget') {
          if (result.widgetAction === 'open' && result.widgetId) {
            widgetStore.showWidget(result.widgetId);
          } else if (result.widgetAction === 'close' && result.widgetId) {
            widgetStore.closeWidget(result.widgetId);
          } else if (result.widgetAction === 'mute' && result.widgetId) {
            widgetStore.toggleMute(result.widgetId);
          }
        }

        setError(null);
      } catch (err: any) {
        console.error('[useVoiceMobile] Command processing failed:', err);
        setError(err.message || 'Failed to process command');

        // Speak error message
        ttsService.speak('Sorry, I did not understand that command.', {
          language,
          rate: speechRate,
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [navigation, widgetStore, language, speechRate]
  );

  // Handle speech recognition result
  const handleRecognitionResult = useCallback(
    (result: SpeechRecognitionResult) => {
      currentTranscriptRef.current = result.transcription;
      setTranscript(result.transcription);

      // Clear existing timeout
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }

      // If final result or high confidence, process immediately
      if (result.isFinal || result.confidence > 0.8) {
        processCommand(result.transcription);
      } else {
        // Wait for more input (debounce)
        processingTimeoutRef.current = setTimeout(() => {
          if (currentTranscriptRef.current) {
            processCommand(currentTranscriptRef.current);
          }
        }, 1500);
      }
    },
    [processCommand]
  );

  // Handle speech recognition error
  const handleRecognitionError = useCallback((errorEvent: { error: string }) => {
    console.error('[useVoiceMobile] Recognition error:', errorEvent.error);
    setError(errorEvent.error);
    setIsListening(false);
  }, []);

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

      // Start recognition
      await speechService.startRecognition();
      setIsListening(true);
      setError(null);
      setTranscript('');
      currentTranscriptRef.current = '';
    } catch (err: any) {
      console.error('[useVoiceMobile] Failed to start listening:', err);
      setError(err.message || 'Failed to start voice recognition');
      setIsListening(false);

      // Clean up listeners
      speechService.removeResultListener(handleRecognitionResult);
      speechService.removeErrorListener(handleRecognitionError);
    }
  }, [
    isListening,
    hasPermissions,
    requestPermissions,
    handleRecognitionResult,
    handleRecognitionError,
  ]);

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
      console.error('[useVoiceMobile] Failed to stop listening:', err);
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
    }
  }, [isListening, handleRecognitionResult, handleRecognitionError, processCommand]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isListening) {
        stopListening();
      }
    };
  }, [isListening]);

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
