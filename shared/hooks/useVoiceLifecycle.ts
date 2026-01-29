/**
 * useVoiceLifecycle Hook
 * Extracted lifecycle operations for voice orchestrator
 * Handles start, stop, interrupt, and process operations
 */

import { useCallback } from 'react';
import { OlorinVoiceOrchestrator } from '../services/olorinVoiceOrchestrator';
import { useSupportStore } from '../stores/supportStore';
import { logger } from '../utils/logger';
import {
  voiceListeningFeedback,
  voiceSuccessFeedback,
  voiceErrorFeedback,
} from '../utils/voiceHaptics';

const lifecycleLogger = logger.scope('useVoiceLifecycle');

export interface VoiceLifecycleOperations {
  startListening: (trigger?: 'manual' | 'wake-word') => Promise<void>;
  stopListening: () => Promise<void>;
  interrupt: () => Promise<void>;
  processTranscript: (transcript: string) => Promise<void>;
}

export function useVoiceLifecycle(
  orchestratorRef: React.MutableRefObject<OlorinVoiceOrchestrator | null>,
  setIsListening: (listening: boolean) => void
): VoiceLifecycleOperations {
  const { setVoiceState, setError } = useSupportStore();

  // Start listening
  const startListening = useCallback(
    async (trigger: 'manual' | 'wake-word' = 'manual') => {
      try {
        if (!orchestratorRef.current) {
          throw new Error('Orchestrator not initialized');
        }

        await orchestratorRef.current.startListening(trigger);
        setIsListening(true);

        // Haptic feedback when listening starts
        await voiceListeningFeedback();

        lifecycleLogger.info('Started listening', { trigger });
      } catch (error) {
        lifecycleLogger.error('Failed to start listening', error);
        setError('Failed to start voice input');

        // Haptic feedback on error
        await voiceErrorFeedback();

        throw error;
      }
    },
    [orchestratorRef, setIsListening, setError]
  );

  // Stop listening
  const stopListening = useCallback(async () => {
    try {
      if (!orchestratorRef.current) {
        return;
      }

      await orchestratorRef.current.stopListening();
      setIsListening(false);

      lifecycleLogger.info('Stopped listening');
    } catch (error) {
      lifecycleLogger.error('Failed to stop listening', error);
      throw error;
    }
  }, [orchestratorRef, setIsListening]);

  // Interrupt
  const interrupt = useCallback(async () => {
    try {
      if (!orchestratorRef.current) {
        return;
      }

      await orchestratorRef.current.interrupt();
      setIsListening(false);

      lifecycleLogger.info('Interrupted');
    } catch (error) {
      lifecycleLogger.error('Failed to interrupt', error);
      throw error;
    }
  }, [orchestratorRef, setIsListening]);

  // Process transcript
  const processTranscript = useCallback(
    async (transcript: string) => {
      try {
        if (!orchestratorRef.current) {
          throw new Error('Orchestrator not initialized');
        }

        const response = await orchestratorRef.current.processTranscript(transcript);

        lifecycleLogger.info('Processed transcript', {
          intent: response.intent,
          confidence: response.confidence,
        });

        // Update voice state based on response
        setVoiceState('speaking');

        // Haptic feedback on successful processing
        await voiceSuccessFeedback();

        // Action execution is handled by the component consuming this hook
        // The VoiceCommandResponse contains all necessary action details
      } catch (error) {
        lifecycleLogger.error('Failed to process transcript', error);
        setError('Failed to process voice input');
        setVoiceState('error');

        // Haptic feedback on error
        await voiceErrorFeedback();

        throw error;
      }
    },
    [orchestratorRef, setVoiceState, setError]
  );

  return {
    startListening,
    stopListening,
    interrupt,
    processTranscript,
  };
}
