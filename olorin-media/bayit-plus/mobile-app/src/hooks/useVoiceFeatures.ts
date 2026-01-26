/**
 * Voice Feature Hooks
 *
 * Comprehensive hooks for managing voice commands, state, and metrics in the mobile app.
 * Provides type-safe interfaces to the VoiceManager service and backend voice API.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { backendProxyService, VoiceCommandRequest, VoiceCommandResponse } from '../services';
import { voiceManager, VoiceStage, VoiceSessionMetrics } from '../services/voiceManager';
import { queryKeys } from '../config/queryConfig';

import logger from '@/utils/logger';


const moduleLogger = logger.scope('useVoiceFeatures');

// ============================================
// Voice Command Hook
// ============================================

/**
 * Hook for sending voice commands to backend
 * Handles transcription → command processing → action execution
 */
export const useVoiceCommand = () => {
  const mutation = useMutation({
    mutationFn: async (request: VoiceCommandRequest) => {
      return backendProxyService.processVoiceCommand(request);
    },
    meta: {
      context: 'voice-command'
    }
  });

  return {
    processCommand: mutation.mutate,
    processCommandAsync: mutation.mutateAsync,
    isProcessing: mutation.isPending,
    response: mutation.data,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset
  };
};

// ============================================
// Voice State Hook
// ============================================

export interface VoiceStateHookOptions {
  autoStart?: boolean;
  language?: string;
  onStateChange?: (stage: VoiceStage) => void;
  onError?: (error: Error) => void;
  onSuccess?: (response: VoiceCommandResponse) => void;
}

/**
 * Hook for managing voice manager lifecycle and state
 * Provides real-time access to voice stage and event listeners
 */
export const useVoiceState = (options: VoiceStateHookOptions = {}) => {
  const {
    autoStart = false,
    language = 'en',
    onStateChange,
    onError,
    onSuccess
  } = options;

  const [stage, setStage] = useState<VoiceStage>('idle');
  const [isListening, setIsListening] = useState(false);
  const [transcription, setTranscription] = useState<string>('');
  const [error, setError] = useState<Error | null>(null);
  const stageListenerRef = useRef<((stage: VoiceStage) => void) | null>(null);
  const errorListenerRef = useRef<((error: Error) => void) | null>(null);

  // Register listeners
  useEffect(() => {
    const handleStageChange = (newStage: VoiceStage) => {
      setStage(newStage);
      setIsListening(newStage === 'listening' || newStage === 'wake-word');
      onStateChange?.(newStage);
    };

    const handleError = (err: Error) => {
      setError(err);
      onError?.(err);
    };

    stageListenerRef.current = handleStageChange;
    errorListenerRef.current = handleError;

    voiceManager.addEventListener('stageChange', handleStageChange);
    voiceManager.addEventListener('error', handleError);

    return () => {
      voiceManager.removeEventListener('stageChange', handleStageChange);
      voiceManager.removeEventListener('error', handleError);
    };
  }, [onStateChange, onError]);

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart && stage === 'idle') {
      startListening();
    }
  }, [autoStart]);

  const startListening = useCallback(async () => {
    try {
      setError(null);
      await voiceManager.startBackgroundListening();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
    }
  }, []);

  const stopListening = useCallback(async () => {
    try {
      await voiceManager.stopListening();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
    }
  }, []);

  const startManualListening = useCallback(async () => {
    try {
      setError(null);
      await voiceManager.startManualListening();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
    }
  }, []);

  return {
    stage,
    isListening,
    isIdle: stage === 'idle',
    isWakeWordDetecting: stage === 'wake-word',
    isSpeaking: stage === 'listening',
    isProcessing: stage === 'processing',
    isResponding: stage === 'responding',
    hasError: stage === 'error',
    isTimeout: stage === 'timeout',
    transcription,
    error,
    startListening,
    stopListening,
    startManualListening,
    setTranscription
  };
};

// ============================================
// Voice Metrics Hook
// ============================================

/**
 * Hook for accessing voice session metrics and performance data
 */
export const useVoiceMetrics = () => {
  const [metrics, setMetrics] = useState<VoiceSessionMetrics | null>(null);
  const metricsListenerRef = useRef<((metrics: VoiceSessionMetrics) => void) | null>(null);

  useEffect(() => {
    const handleMetrics = (newMetrics: VoiceSessionMetrics) => {
      setMetrics(newMetrics);
    };

    metricsListenerRef.current = handleMetrics;
    voiceManager.addEventListener('metrics', handleMetrics);

    return () => {
      voiceManager.removeEventListener('metrics', handleMetrics);
    };
  }, []);

  return {
    metrics,
    wakeWordTime: metrics?.wakeWordTime ?? 0,
    listeningTime: metrics?.listeningTime ?? 0,
    processingTime: metrics?.processingTime ?? 0,
    ttsTime: metrics?.ttsTime ?? 0,
    totalTime: metrics?.totalTime ?? 0,
    transcription: metrics?.transcription ?? '',
    confidence: metrics?.confidence ?? 0,
    response: metrics?.response ?? ''
  };
};

// ============================================
// Voice Suggestions Hook
// ============================================

/**
 * Hook for getting command suggestions for partial transcription
 */
export const useVoiceCommandSuggestions = (partial: string, language: string = 'en') => {
  const query = useQuery({
    queryKey: queryKeys.voice.suggestions(partial, language),
    queryFn: () => backendProxyService.getVoiceCommandSuggestions(partial, language),
    enabled: partial.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    suggestions: query.data?.suggestions ?? [],
    isLoading: query.isLoading,
    error: query.error,
    isError: query.isError
  };
};

// ============================================
// Voice Health Check Hook
// ============================================

/**
 * Hook for checking voice service health
 */
export const useVoiceHealth = () => {
  const query = useQuery({
    queryKey: queryKeys.voice.health(),
    queryFn: () => backendProxyService.checkVoiceHealth(),
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  return {
    status: query.data?.status ?? 'unknown',
    service: query.data?.service ?? 'voice_proxy',
    features: query.data?.features ?? [],
    isHealthy: query.data?.status === 'healthy',
    isLoading: query.isLoading,
    error: query.error
  };
};

// ============================================
// Composite Voice Feature Hook
// ============================================

export interface VoiceFeatureOptions extends VoiceStateHookOptions {
  enableHealthCheck?: boolean;
}

/**
 * Composite hook combining all voice features
 * Use this for components that need complete voice functionality
 */
export const useVoiceFeatures = (options: VoiceFeatureOptions = {}) => {
  const { enableHealthCheck = true, ...voiceStateOptions } = options;

  const voiceState = useVoiceState(voiceStateOptions);
  const voiceCommand = useVoiceCommand();
  const voiceMetrics = useVoiceMetrics();
  const voiceSuggestions = useVoiceCommandSuggestions(voiceState.transcription);
  const voiceHealth = useVoiceHealth();

  const handleCommandExecution = useCallback(async (transcription: string, confidence: number) => {
    try {
      const response = await voiceCommand.processCommandAsync({
        transcription,
        confidence,
        language: voiceStateOptions.language || 'en'
      });

      // Log successful execution
      if (response.success) {
        moduleLogger.debug('Command executed', { type: response.commandType, action: response.action, confidence: response.confidence });
      }

      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      moduleLogger.error('Command execution failed:', error);
      throw error;
    }
  }, [voiceCommand, voiceStateOptions.language]);

  return {
    // Voice state
    stage: voiceState.stage,
    isListening: voiceState.isListening,
    isIdle: voiceState.isIdle,
    isWakeWordDetecting: voiceState.isWakeWordDetecting,
    isSpeaking: voiceState.isSpeaking,
    isProcessing: voiceState.isProcessing,
    isResponding: voiceState.isResponding,
    error: voiceState.error,

    // Voice control
    startListening: voiceState.startListening,
    stopListening: voiceState.stopListening,
    startManualListening: voiceState.startManualListening,

    // Voice metrics
    metrics: voiceMetrics.metrics,
    totalTime: voiceMetrics.totalTime,
    confidence: voiceMetrics.confidence,

    // Voice suggestions
    suggestions: voiceSuggestions.suggestions,
    suggestionsLoading: voiceSuggestions.isLoading,

    // Voice health
    isServiceHealthy: voiceHealth.isHealthy,
    voiceServiceError: voiceHealth.error,

    // Command execution
    executeCommand: handleCommandExecution,
    isCommandProcessing: voiceCommand.isProcessing,
    lastCommandResponse: voiceCommand.response
  };
};
