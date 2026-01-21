/**
 * useWizardPolling React Hook.
 * Feature: 005-polling-and-persistence
 *
 * Custom hook for adaptive polling with ETag caching, exponential backoff,
 * and automatic interval adjustment based on investigation status.
 *
 * SYSTEM MANDATE Compliance:
 * - No hardcoded values (all from environment)
 * - Configuration-driven intervals
 * - Complete error handling
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { getConfig } from '../config/env.config';
import { useWizardStore } from '../store/wizardStore';
import { wizardStateService } from '../services/wizardStateService';
import { WizardStep, InvestigationStatus } from '../types/wizardState';

// Load validated configuration
const config = getConfig();
const pollingConfig = {
  fastInterval: config.polling.fastInterval,
  normalInterval: config.polling.baseInterval,
  slowInterval: config.polling.slowInterval,
  maxRetries: config.polling.maxRetries,
  backoffMultiplier: config.polling.backoffMultiplier,
  maxBackoff: config.polling.maxBackoff
};

interface UseWizardPollingResult {
  isPolling: boolean;
  currentInterval: number;
  retryCount: number;
  error: string | null;
  startPolling: () => void;
  stopPolling: () => void;
}

/**
 * Custom React hook for adaptive polling with ETag caching.
 */
export function useWizardPolling(investigationId: string): UseWizardPollingResult {
  const { wizardState, loadState, stopPolling: stopStorePolling } = useWizardStore();

  const [isPolling, setIsPolling] = useState(false);
  const [currentInterval, setCurrentInterval] = useState(pollingConfig.normalInterval);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastETag, setLastETag] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Calculate polling interval based on wizard state.
   */
  const calculateInterval = useCallback((wizardStep: WizardStep, status: InvestigationStatus): number => {
    if (status === InvestigationStatus.IN_PROGRESS && wizardStep === WizardStep.PROGRESS) {
      return pollingConfig.fastInterval;
    }
    if (status === InvestigationStatus.IN_PROGRESS && wizardStep === WizardStep.SETTINGS) {
      return pollingConfig.normalInterval;
    }
    if (status === InvestigationStatus.COMPLETED || wizardStep === WizardStep.RESULTS) {
      return pollingConfig.slowInterval;
    }
    return pollingConfig.normalInterval;
  }, []);

  /**
   * Handle polling errors with exponential backoff.
   */
  const handleError = useCallback((err: Error) => {
    setError(err.message);

    if (retryCount >= pollingConfig.maxRetries) {
      setError('Max retries exceeded. Stopping polling.');
      stopPolling();
      return;
    }

    setRetryCount(prev => prev + 1);
    const backoffInterval = Math.min(
      currentInterval * Math.pow(pollingConfig.backoffMultiplier, retryCount + 1),
      pollingConfig.maxBackoff
    );
    setCurrentInterval(backoffInterval);
  }, [retryCount, currentInterval]);

  /**
   * Poll for wizard state updates.
   */
  const poll = useCallback(async () => {
    try {
      const state = await wizardStateService.getState(investigationId, lastETag || undefined);

      if (state === null) {
        // 304 Not Modified - no update needed
        return;
      }

      // Update store with new state
      await loadState(investigationId);

      // Extract ETag from response for next poll
      const version = state.version;
      setLastETag(`"version-${version}"`);

      // Reset retry count on success
      setRetryCount(0);
      setError(null);

      // Adjust interval based on state
      const newInterval = calculateInterval(state.wizard_step, state.status);
      if (newInterval !== currentInterval) {
        setCurrentInterval(newInterval);
      }
    } catch (err) {
      handleError(err instanceof Error ? err : new Error('Polling failed'));
    }
  }, [investigationId, lastETag, currentInterval, loadState, calculateInterval, handleError]);

  /**
   * Start polling loop.
   */
  const startPolling = useCallback(() => {
    if (isPolling) return;

    setIsPolling(true);
    setError(null);
    setRetryCount(0);

    // Initial poll
    poll();

    // Set up polling interval
    intervalRef.current = setInterval(() => {
      poll();
    }, currentInterval);
  }, [isPolling, currentInterval, poll]);

  /**
   * Stop polling loop.
   */
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
    setRetryCount(0);
    setError(null);
    stopStorePolling();
  }, [stopStorePolling]);

  /**
   * Update polling interval when it changes.
   */
  useEffect(() => {
    if (isPolling && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        poll();
      }, currentInterval);
    }
  }, [currentInterval, isPolling, poll]);

  /**
   * Cleanup on unmount.
   */
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    isPolling,
    currentInterval,
    retryCount,
    error,
    startPolling,
    stopPolling
  };
}
