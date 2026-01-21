/**
 * Adaptive Polling Hook
 * Task: T028 and T031 - Phase 4 User Story 2
 * Feature: 001-investigation-state-management
 *
 * Intelligent polling that adapts interval based on investigation status.
 * Pauses when tab is hidden to conserve resources.
 *
 * SYSTEM MANDATE Compliance:
 * - Configuration-driven intervals
 * - No hardcoded values
 * - Proper lifecycle management
 *
 * Reference: /specs/001-investigation-state-management/research.md section 4.1
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { env } from '../../../shared/config/env.config';

/**
 * Investigation lifecycle stage type
 */
type LifecycleStage = 'draft' | 'submitted' | 'in_progress' | 'completed' | 'failed';

/**
 * Investigation status type
 */
type InvestigationStatus = 
  | 'pending' 
  | 'initializing' 
  | 'running' 
  | 'paused' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

/**
 * Adaptive polling hook parameters
 */
interface UseAdaptivePollingParams {
  investigationId: string | undefined;
  status: InvestigationStatus;
  lifecycleStage?: LifecycleStage;
  callback: () => void | Promise<void>;
  enabled?: boolean;
}

/**
 * Calculate poll interval based on status and lifecycle stage
 *
 * @param status - Investigation status
 * @param lifecycleStage - Investigation lifecycle stage
 * @returns Poll interval in milliseconds
 */
function calculatePollInterval(
  status: InvestigationStatus,
  lifecycleStage?: LifecycleStage
): number {
  // Active states: poll frequently (default 30 seconds, configurable via REACT_APP_POLLING_FAST_INTERVAL_MS)
  const activeStatuses: InvestigationStatus[] = ['running', 'initializing'];
  if (activeStatuses.includes(status) || lifecycleStage === 'in_progress') {
    return env.polling.fastInterval;
  }

  // Idle states: poll slowly (30-60 seconds)
  const idleStatuses: InvestigationStatus[] = ['pending', 'paused'];
  if (idleStatuses.includes(status) || lifecycleStage === 'submitted') {
    return env.polling.slowInterval;
  }

  // Terminal states: use slow interval (will be stopped by caller)
  const terminalStatuses: InvestigationStatus[] = ['completed', 'failed', 'cancelled'];
  if (terminalStatuses.includes(status) || ['completed', 'failed'].includes(lifecycleStage || '')) {
    return env.polling.slowInterval;
  }

  // Default to base interval
  return env.polling.baseInterval;
}

/**
 * Check if status is terminal
 */
function isTerminalStatus(status: InvestigationStatus): boolean {
  return ['completed', 'failed', 'cancelled'].includes(status);
}

/**
 * Adaptive polling hook
 *
 * Adjusts polling interval based on investigation status and lifecycle.
 * Pauses polling when document is hidden (tab background).
 *
 * @param params - Polling parameters
 * @returns Polling control methods
 */
export function useAdaptivePolling({
  investigationId,
  status,
  lifecycleStage,
  callback,
  enabled = true
}: UseAdaptivePollingParams) {
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Calculate current poll interval
  const pollInterval = calculatePollInterval(status, lifecycleStage);

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  /**
   * Start polling
   */
  const startPolling = useCallback(() => {
    if (!investigationId || !enabled || isPaused) {
      console.log('⏸️ [useAdaptivePolling] Not starting polling:', {
        investigationId: !!investigationId,
        enabled,
        isPaused
      });
      return;
    }

    console.log('▶️ [useAdaptivePolling] Starting polling:', {
      investigationId,
      pollInterval,
      status
    });

    stopPolling();
    setIsPolling(true);

    // Execute callback immediately
    callback();

    // Set up polling interval
    intervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        console.log('⏰ [useAdaptivePolling] Interval tick - calling callback');
        callback();
      } else {
        console.log('⚠️ [useAdaptivePolling] Component unmounted, skipping callback');
      }
    }, pollInterval);

    console.log('✅ [useAdaptivePolling] Polling started with interval:', pollInterval, 'ms');
  }, [investigationId, enabled, isPaused, pollInterval, callback, stopPolling, status]);

  /**
   * Handle visibility change (tab hidden/visible)
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isHidden = document.hidden;
      setIsPaused(isHidden);

      if (isHidden) {
        // Tab hidden: pause polling
        stopPolling();
      } else {
        // Tab visible: resume polling at appropriate interval
        if (enabled && investigationId) {
          startPolling();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, investigationId, startPolling, stopPolling]);

  /**
   * Auto-start/restart polling when parameters change
   * CRITICAL: Don't restart polling if status is terminal
   */
  useEffect(() => {
    // Stop polling immediately if status is terminal
    if (isTerminalStatus(status)) {
      stopPolling();
      return;
    }

    // Only restart polling if enabled and not paused
    if (investigationId && enabled && !isPaused) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [investigationId, enabled, isPaused, pollInterval, status, startPolling, stopPolling]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      stopPolling();
    };
  }, [stopPolling]);

  return {
    pollInterval,
    isPolling,
    isPaused,
    startPolling,
    stopPolling
  };
}
