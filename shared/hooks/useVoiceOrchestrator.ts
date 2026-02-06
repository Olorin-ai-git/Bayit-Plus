/**
 * useVoiceOrchestrator Hook
 * React hook for integrating with the singleton OlorinVoiceOrchestrator.
 * Simplified: orchestrator now owns all voice lifecycle operations directly.
 */

import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import i18n from '../i18n';
import { OlorinVoiceOrchestrator, voiceOrchestrator } from '../services/olorinVoiceOrchestrator';
import { useSupportStore } from '../stores/supportStore';
import { VoiceConfig } from '../types/voiceAvatar';
import { isTV } from '../utils/platform';
import { logger } from '../utils/logger';
import {
  voiceListeningFeedback,
  voiceSuccessFeedback,
  voiceErrorFeedback,
} from '../utils/voiceHaptics';

const hookLogger = logger.scope('useVoiceOrchestrator');

export interface UseVoiceOrchestratorOptions {
  enableWakeWord?: boolean;
  enableStreaming?: boolean;
  language?: string;
  autoInitialize?: boolean;
}

export interface UseVoiceOrchestratorReturn {
  orchestrator: OlorinVoiceOrchestrator | null;
  isInitialized: boolean;
  isListening: boolean;
  startListening: (trigger?: 'manual' | 'wake-word') => Promise<void>;
  stopListening: () => Promise<void>;
  interrupt: () => Promise<void>;
  processTranscript: (transcript: string) => Promise<void>;
  initialize: (config?: Partial<VoiceConfig>) => Promise<void>;
}

export function useVoiceOrchestrator(
  options: UseVoiceOrchestratorOptions = {}
): UseVoiceOrchestratorReturn {
  const {
    enableWakeWord = false,
    enableStreaming = false,
    language = i18n.language || 'en',
    autoInitialize = true,
  } = options;

  const [isInitialized, setIsInitialized] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const {
    avatarVisibilityMode,
    isWakeWordEnabled,
    setError,
  } = useSupportStore();

  const platform =
    Platform.OS === 'web' ? 'web' : isTV ? 'tvos' : Platform.OS === 'ios' ? 'ios' : 'android';

  const initialize = useCallback(
    async (config?: Partial<VoiceConfig>) => {
      try {
        const defaultConfig: Partial<VoiceConfig> = {
          platform: platform as any,
          language,
          wakeWordEnabled: enableWakeWord || isWakeWordEnabled,
          streamingMode: enableStreaming,
          initialAvatarMode: avatarVisibilityMode,
          autoExpandOnWakeWord: true,
          collapseDelay: 10000,
          ...config,
        };

        await voiceOrchestrator.initialize(defaultConfig);
        setIsInitialized(true);
        hookLogger.info('Orchestrator initialized');
      } catch (error) {
        hookLogger.error('Initialization failed', error);
        setError('Failed to initialize voice system');
        throw error;
      }
    },
    [platform, language, enableWakeWord, enableStreaming, avatarVisibilityMode, isWakeWordEnabled, setError]
  );

  // Auto-initialize on mount
  useEffect(() => {
    if (autoInitialize && !isInitialized) {
      initialize();
    }
  }, [autoInitialize, isInitialized, initialize]);

  // Start listening - delegates directly to orchestrator
  const startListening = useCallback(
    async (trigger: 'manual' | 'wake-word' = 'manual') => {
      try {
        await voiceOrchestrator.startVoiceInteraction(trigger);
        setIsListening(true);
        await voiceListeningFeedback();
        hookLogger.info('Started listening', { trigger });
      } catch (error) {
        hookLogger.error('Failed to start listening', error);
        setError('Failed to start voice input');
        await voiceErrorFeedback();
        throw error;
      }
    },
    [setError]
  );

  // Stop listening
  const stopListening = useCallback(async () => {
    voiceOrchestrator.stopListening();
    setIsListening(false);
    hookLogger.info('Stopped listening');
  }, []);

  // Interrupt
  const interrupt = useCallback(async () => {
    voiceOrchestrator.interrupt();
    setIsListening(false);
    hookLogger.info('Interrupted');
  }, []);

  // Process transcript
  const processTranscript = useCallback(
    async (transcript: string) => {
      try {
        const response = await voiceOrchestrator.processTranscript(transcript);
        hookLogger.info('Processed transcript', {
          intent: response.intent,
          confidence: response.confidence,
        });
        await voiceSuccessFeedback();
      } catch (error) {
        hookLogger.error('Failed to process transcript', error);
        setError('Failed to process voice input');
        await voiceErrorFeedback();
        throw error;
      }
    },
    [setError]
  );

  return {
    orchestrator: voiceOrchestrator,
    isInitialized,
    isListening,
    startListening,
    stopListening,
    interrupt,
    processTranscript,
    initialize,
  };
}

export default useVoiceOrchestrator;
