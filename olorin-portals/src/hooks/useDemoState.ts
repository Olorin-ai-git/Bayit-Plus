/**
 * Demo State Hook
 *
 * Manages the overall state of the interactive demo experience,
 * including scenario selection, investigation lifecycle, and results.
 */

import { useCallback, useState } from 'react';
import {
  DemoRateLimitError,
  DemoScenario,
  DemoStartResponse,
  DemoStatusResponse,
  getDemoApiService,
  RateLimitInfo,
} from '../services/demoApiService';
import { useDemoPolling } from './useDemoPolling';

export type DemoPhase = 'idle' | 'selecting' | 'starting' | 'running' | 'completed' | 'error';

export interface UseDemoStateResult {
  // State
  phase: DemoPhase;
  scenarios: DemoScenario[];
  selectedScenario: DemoScenario | null;
  investigationId: string | null;
  progress: DemoStatusResponse | null;
  rateLimit: RateLimitInfo | null;
  error: Error | null;
  isLoading: boolean;

  // Actions
  loadScenarios: () => Promise<void>;
  selectScenario: (scenario: DemoScenario) => void;
  startDemo: () => Promise<void>;
  reset: () => void;
  checkRateLimit: () => Promise<void>;
}

export const useDemoState = (): UseDemoStateResult => {
  // Core state
  const [phase, setPhase] = useState<DemoPhase>('idle');
  const [scenarios, setScenarios] = useState<DemoScenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<DemoScenario | null>(null);
  const [investigationId, setInvestigationId] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Polling hook
  const {
    status: progress,
    startPolling,
    stopPolling,
  } = useDemoPolling({
    onComplete: () => setPhase('completed'),
    onError: (err) => {
      setError(err);
      setPhase('error');
    },
  });

  // Load available scenarios
  const loadScenarios = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const api = getDemoApiService();
      const loadedScenarios = await api.getScenarios();
      setScenarios(loadedScenarios);
      setPhase('selecting');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load scenarios');
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Select a scenario
  const selectScenario = useCallback((scenario: DemoScenario) => {
    setSelectedScenario(scenario);
    setError(null);
  }, []);

  // Start the demo investigation
  const startDemo = useCallback(async () => {
    if (!selectedScenario) {
      setError(new Error('Please select a scenario first'));
      return;
    }

    setIsLoading(true);
    setError(null);
    setPhase('starting');

    try {
      const api = getDemoApiService();
      const response: DemoStartResponse = await api.startInvestigation(selectedScenario.id);

      setInvestigationId(response.investigation_id);
      setRateLimit(response.rate_limit);
      setPhase('running');

      // Start polling for progress
      startPolling(response.investigation_id);
    } catch (err) {
      if (err instanceof DemoRateLimitError) {
        setRateLimit({
          remaining: 0,
          reset_at: new Date(Date.now() + err.retryAfterSeconds * 1000).toISOString(),
          retry_after_seconds: err.retryAfterSeconds,
        });
      }

      const error = err instanceof Error ? err : new Error('Failed to start demo');
      setError(error);
      setPhase('error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedScenario, startPolling]);

  // Reset to initial state
  const reset = useCallback(() => {
    stopPolling();
    setPhase('idle');
    setSelectedScenario(null);
    setInvestigationId(null);
    setError(null);
    // Keep scenarios loaded
  }, [stopPolling]);

  // Check current rate limit status
  const checkRateLimit = useCallback(async () => {
    try {
      const api = getDemoApiService();
      const status = await api.getRateLimitStatus();
      setRateLimit(status);
    } catch {
      // Silently fail rate limit check
    }
  }, []);

  return {
    // State
    phase,
    scenarios,
    selectedScenario,
    investigationId,
    progress,
    rateLimit,
    error,
    isLoading,

    // Actions
    loadScenarios,
    selectScenario,
    startDemo,
    reset,
    checkRateLimit,
  };
};

export default useDemoState;
