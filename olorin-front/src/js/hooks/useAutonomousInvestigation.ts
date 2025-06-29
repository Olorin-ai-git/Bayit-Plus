import { useState, useCallback, useRef, useEffect } from 'react';
import {
  AutonomousInvestigationClient,
  InvestigationEventHandler,
  InvestigationPhaseData,
  InvestigationStatusData,
  InvestigationErrorData,
} from '../services/AutonomousInvestigationClient';
import { LogLevel } from '../types/RiskAssessment';

export interface AutonomousInvestigationState {
  isRunning: boolean;
  isPaused: boolean;
  investigationId: string | null;
  currentPhase: string | null;
  progress: number;
  results: Record<string, any>;
  error: string | null;
  executionMode: 'parallel' | 'sequential';
}

export interface AutonomousInvestigationControls {
  startInvestigation: (
    entityId: string,
    entityType: 'user_id' | 'device_id',
    parallel?: boolean,
  ) => Promise<void>;
  pauseInvestigation: () => void;
  resumeInvestigation: () => void;
  cancelInvestigation: () => void;
  stopInvestigation: () => void;
  setExecutionMode: (mode: 'parallel' | 'sequential') => void;
}

export interface UseAutonomousInvestigationOptions {
  onLog?: (message: string, level: LogLevel) => void;
  onComplete?: (results: Record<string, any>) => void;
  onPhaseUpdate?: (phase: string, progress: number, message: string) => void;
  onError?: (error: string) => void;
}

export function useAutonomousInvestigation(
  options: UseAutonomousInvestigationOptions = {},
): [AutonomousInvestigationState, AutonomousInvestigationControls] {
  const [state, setState] = useState<AutonomousInvestigationState>({
    isRunning: false,
    isPaused: false,
    investigationId: null,
    currentPhase: null,
    progress: 0,
    results: {},
    error: null,
    executionMode: 'parallel',
  });

  const clientRef = useRef<AutonomousInvestigationClient | null>(null);

  // Initialize client
  useEffect(() => {
    clientRef.current = new AutonomousInvestigationClient({
      parallel: state.executionMode === 'parallel',
    });
  }, [state.executionMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.stopInvestigation();
      }
    };
  }, []);

  const updateState = useCallback(
    (updates: Partial<AutonomousInvestigationState>) => {
      setState((prev) => ({ ...prev, ...updates }));
    },
    [],
  );

  const startInvestigation = useCallback(
    async (
      entityId: string,
      entityType: 'user_id' | 'device_id' = 'user_id',
      parallel: boolean = true,
    ) => {
      if (!clientRef.current) {
        return;
      }

      try {
        // Reset state
        updateState({
          isRunning: false,
          isPaused: false,
          investigationId: null,
          currentPhase: 'initialization',
          progress: 0,
          results: {},
          error: null,
          executionMode: parallel ? 'parallel' : 'sequential',
        });

        // Update client execution mode
        clientRef.current = new AutonomousInvestigationClient({
          parallel,
        });

        const eventHandlers: InvestigationEventHandler = {
          onPhaseUpdate: (data: InvestigationPhaseData) => {
            updateState({
              currentPhase: data.phase,
              progress: data.progress,
              error: null,
            });

            // Store results
            if (data.agent_response) {
              setState((prev) => ({
                ...prev,
                results: { ...prev.results, [data.phase]: data.agent_response },
              }));
            }

            options.onPhaseUpdate?.(data.phase, data.progress, data.message);
          },

          onStatusUpdate: (data: InvestigationStatusData) => {
            const isPaused = data.status === 'PAUSED';
            const isRunning = data.status === 'IN_PROGRESS';

            updateState({
              isPaused,
              isRunning: isRunning || state.isRunning,
              currentPhase: data.current_phase || state.currentPhase,
              progress: data.progress || state.progress,
            });
          },

          onError: (data: InvestigationErrorData) => {
            const errorMsg = `${data.message} (${data.error_code})`;
            updateState({
              error: errorMsg,
              isRunning: false,
            });
            options.onError?.(errorMsg);
          },

          onComplete: (results: Record<string, any>) => {
            updateState({
              isRunning: false,
              isPaused: false,
              currentPhase: 'completed',
              progress: 1.0,
              results,
            });
            options.onComplete?.(results);
          },

          onCancelled: () => {
            updateState({
              isRunning: false,
              isPaused: false,
              currentPhase: 'cancelled',
              error: 'Investigation was cancelled',
            });
          },

          onLog: options.onLog,
        };

        // Start the investigation
        const investigationId = await clientRef.current.startInvestigation(
          entityId,
          entityType,
          eventHandlers,
        );

        updateState({
          isRunning: true,
          investigationId,
          currentPhase: 'initialization',
        });
      } catch (error) {
        const errorMsg =
          error instanceof Error
            ? error.message
            : 'Failed to start investigation';
        updateState({
          error: errorMsg,
          isRunning: false,
        });
        options.onError?.(errorMsg);
      }
    },
    [options, updateState, state.isRunning, state.currentPhase, state.progress],
  );

  const pauseInvestigation = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.pauseInvestigation();
      updateState({ isPaused: true });
    }
  }, [updateState]);

  const resumeInvestigation = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.resumeInvestigation();
      updateState({ isPaused: false });
    }
  }, [updateState]);

  const cancelInvestigation = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.cancelInvestigation();
      updateState({
        isRunning: false,
        isPaused: false,
        currentPhase: 'cancelled',
      });
    }
  }, [updateState]);

  const stopInvestigation = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.stopInvestigation();
      updateState({
        isRunning: false,
        isPaused: false,
        investigationId: null,
        currentPhase: null,
        progress: 0,
        error: null,
      });
    }
  }, [updateState]);

  const setExecutionMode = useCallback(
    (mode: 'parallel' | 'sequential') => {
      updateState({ executionMode: mode });
    },
    [updateState],
  );

  const controls: AutonomousInvestigationControls = {
    startInvestigation,
    pauseInvestigation,
    resumeInvestigation,
    cancelInvestigation,
    stopInvestigation,
    setExecutionMode,
  };

  return [state, controls];
}

// Simplified hook for the AutonomousInvestigationPanel component
export const useSimpleAutonomousInvestigation = () => {
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const startInvestigation = async (
    entityId: string,
    entityType: string,
    investigationId: string
  ) => {
    setIsLoading(true);
    setError(null);
    setStatus('IN_PROGRESS');
    setProgress(0);

    // Simulate investigation progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setStatus('COMPLETED');
          setIsLoading(false);
          return 100;
        }
        return prev + 10;
      });
    }, 500);

    return Promise.resolve();
  };

  const checkStatus = async (investigationId: string) => {
    // Simulate status check
    return Promise.resolve();
  };

  return {
    startInvestigation,
    checkStatus,
    status,
    isLoading,
    error,
    progress,
  };
};
