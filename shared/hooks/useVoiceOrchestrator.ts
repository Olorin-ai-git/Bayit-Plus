/**
 * useVoiceOrchestrator Hook
 * React hook for integrating with OlorinVoiceOrchestrator
 * Manages voice interaction lifecycle and orchestrator state
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { OlorinVoiceOrchestrator } from '../services/olorinVoiceOrchestrator';
import { createVoiceOrchestrator } from '../services/voiceOrchestratorFactory';
import { useSupportStore } from '../stores/supportStore';
import { VoiceConfig } from '../types/voiceAvatar';
import { isTV } from '../utils/platform';
import { logger } from '../utils/logger';
import { useVoiceLifecycle } from './useVoiceLifecycle';

const hookLogger = logger.scope('useVoiceOrchestrator');

export interface UseVoiceOrchestratorOptions {
  /** Enable wake word detection */
  enableWakeWord?: boolean;
  /** Enable streaming mode */
  enableStreaming?: boolean;
  /** User's language (ISO 639-1) */
  language?: string;
  /** Auto-initialize on mount */
  autoInitialize?: boolean;
}

export interface UseVoiceOrchestratorReturn {
  /** Orchestrator instance */
  orchestrator: OlorinVoiceOrchestrator | null;
  /** Is orchestrator initialized */
  isInitialized: boolean;
  /** Is currently listening */
  isListening: boolean;
  /** Start listening for voice input */
  startListening: (trigger?: 'manual' | 'wake-word') => Promise<void>;
  /** Stop listening */
  stopListening: () => Promise<void>;
  /** Interrupt current interaction */
  interrupt: () => Promise<void>;
  /** Process voice transcript */
  processTranscript: (transcript: string) => Promise<void>;
  /** Initialize orchestrator */
  initialize: (config?: Partial<VoiceConfig>) => Promise<void>;
}

/**
 * Hook for voice orchestrator integration
 */
export function useVoiceOrchestrator(
  options: UseVoiceOrchestratorOptions = {}
): UseVoiceOrchestratorReturn {
  const {
    enableWakeWord = false,
    enableStreaming = false,
    language = 'he',
    autoInitialize = true,
  } = options;

  const [isInitialized, setIsInitialized] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const orchestratorRef = useRef<OlorinVoiceOrchestrator | null>(null);

  const {
    avatarVisibilityMode,
    isWakeWordEnabled,
    openVoiceModal,
    setVoiceState,
    setError,
  } = useSupportStore();

  // Determine platform
  const platform =
    Platform.OS === 'web' ? 'web' : isTV ? 'tvos' : Platform.OS === 'ios' ? 'ios' : 'android';

  // Initialize orchestrator
  const initialize = useCallback(
    async (config?: Partial<VoiceConfig>) => {
      try {
        if (orchestratorRef.current) {
          hookLogger.info('Already initialized');
          return;
        }

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

        orchestratorRef.current = createVoiceOrchestrator(defaultConfig);
        await orchestratorRef.current.initialize();

        setIsInitialized(true);
        hookLogger.info('Initialized successfully');
      } catch (error) {
        hookLogger.error('Initialization failed', error);
        setError('Failed to initialize voice system');
        throw error;
      }
    },
    [
      platform,
      language,
      enableWakeWord,
      enableStreaming,
      avatarVisibilityMode,
      isWakeWordEnabled,
      setError,
    ]
  );

  // Auto-initialize on mount
  useEffect(() => {
    if (autoInitialize && !isInitialized) {
      initialize();
    }

    // Cleanup on unmount
    return () => {
      if (orchestratorRef.current && isListening) {
        orchestratorRef.current.stopListening();
      }
    };
  }, [autoInitialize, isInitialized, initialize, isListening]);

  // Get lifecycle operations
  const { startListening, stopListening, interrupt, processTranscript } = useVoiceLifecycle(
    orchestratorRef,
    setIsListening
  );

  return {
    orchestrator: orchestratorRef.current,
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
