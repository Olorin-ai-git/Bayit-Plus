/**
 * Investigation Snapshot Hook
 * Feature: Phase 3 - User Story 1 (T016)
 *
 * Custom React hook for fetching investigation snapshot data.
 * Provides loading, error, and data states for snapshot retrieval.
 *
 * SYSTEM MANDATE Compliance:
 * - Configuration-driven API endpoint
 * - No hardcoded values
 * - Proper error handling with type safety
 * - Performance target: <100ms resolution
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { investigationService } from '../services/investigationService';
import { useAdaptivePolling } from './useAdaptivePolling';
import { InvestigationStatus } from '../../../shared/types/investigation/core';
import { isTerminalStatus } from '../constants/pollingConfig';
import { mapBackendStatus } from '../services/dataAdapters/progressMappers';

/**
 * Investigation snapshot interface
 * Minimal subset for page load rehydration
 */
export interface InvestigationSnapshot {
  id: string;
  status: 'pending' | 'initializing' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: number;  // 0-100
  version: number;
  updatedAt: string;
}

/**
 * Hook return type
 */
export interface UseInvestigationSnapshotResult {
  loading: boolean;
  snapshot: InvestigationSnapshot | null;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching investigation snapshot
 *
 * @param investigationId - Investigation ID to fetch snapshot for
 * @returns Hook result with loading, snapshot, error states, and refetch function
 */
export function useInvestigationSnapshot(
  investigationId: string | undefined
): UseInvestigationSnapshotResult {
  const [loading, setLoading] = useState<boolean>(true);
  const [snapshot, setSnapshot] = useState<InvestigationSnapshot | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const hasFetchedRef = useRef<string | null>(null); // Track which investigationId we've fetched

  /**
   * Fetches snapshot from backend API
   * Maps full progress response to lightweight snapshot
   * @param isPollingCall - If true, don't set loading state (used for polling)
   */
  const fetchSnapshot = useCallback(async (isPollingCall: boolean = false) => {
    if (!investigationId) {
      setLoading(false);
      setError(new Error('Investigation ID is required'));
      return;
    }

    try {
      // Only set loading state on initial fetch, not during polling
      if (!isPollingCall) {
        setLoading(true);
      }
      setError(null);

      console.log('🌐 [useInvestigationSnapshot] Making API call:', {
        investigationId,
        isPollingCall,
        timestamp: new Date().toISOString()
      });

      // Use getInvestigation() instead of instance.get() to benefit from request deduplication
      // This prevents multiple simultaneous calls when investigation starts
      const response = await investigationService.instance.getInvestigation(investigationId);
      
      if (response === null) {
        console.log('⚠️ [useInvestigationSnapshot] API returned 304 Not Modified (no changes)', {
          investigationId,
          isPollingCall
        });
        // Don't update snapshot if no changes (304)
        return;
      }
      
      console.log('✅ [useInvestigationSnapshot] API response received:', {
        hasResponse: !!response,
        status: response?.status,
        investigationId,
        isPollingCall
      });

      // Map backend status to frontend status enum (handles 'IN_PROGRESS' -> 'running', etc.)
      const backendStatus = response.status || 'pending';
      const mappedStatus = mapBackendStatus(backendStatus);
      console.log('📊 [useInvestigationSnapshot] Status mapping:', {
        backendStatus,
        mappedStatus,
        investigationId
      });

      // Map response to snapshot interface
      const snapshotData: InvestigationSnapshot = {
        id: response.id || investigationId,
        status: mappedStatus,
        progress: response.completionPercent || response.progress || 0,
        version: response.version || 1,
        updatedAt: response.lastUpdatedAt || response.updatedAt || new Date().toISOString()
      };

      setSnapshot(snapshotData);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch investigation snapshot';
      const errorObj = new Error(errorMessage);

      // Handle specific error codes
      if (err && typeof err === 'object' && 'status' in err) {
        const status = (err as any).status;
        if (status === 404) {
          errorObj.message = 'Investigation not found';
        } else if (status === 403) {
          errorObj.message = 'Access denied to investigation';
        }
      }

      setError(errorObj);
      setSnapshot(null);
    } finally {
      if (!isPollingCall) {
        setLoading(false);
      }
    }
  }, [investigationId]);

  /**
   * Wrapper for fetchSnapshot that marks it as a polling call
   */
  const fetchSnapshotForPolling = useCallback(async () => {
    const timestamp = new Date().toISOString();
    console.log('🔄 [useInvestigationSnapshot] Polling callback triggered at:', timestamp);
    try {
      await fetchSnapshot(true);
      console.log('✅ [useInvestigationSnapshot] Polling callback completed at:', timestamp);
    } catch (error) {
      console.error('❌ [useInvestigationSnapshot] Polling callback failed:', error);
    }
  }, [fetchSnapshot]);

  /**
   * Adaptive polling with intelligent intervals
   * Polls every 5 seconds for active investigations, slower for idle/terminal
   */
  const currentStatus = (snapshot?.status as InvestigationStatus) || 'pending';
  const {
    pollInterval,
    isPolling,
    isPaused,
    startPolling,
    stopPolling
  } = useAdaptivePolling({
    investigationId,
    status: currentStatus,
    lifecycleStage: undefined,
    callback: fetchSnapshotForPolling,
    enabled: !!investigationId
  });

  /**
   * Debug: Log polling state changes
   */
  useEffect(() => {
    console.log('🔍 [useInvestigationSnapshot] Polling state:', {
      investigationId,
      status: currentStatus,
      isPolling,
      isPaused,
      pollInterval,
      enabled: !!investigationId
    });
  }, [investigationId, currentStatus, isPolling, isPaused, pollInterval]);

  /**
   * Auto-fetch on mount or when investigationId changes
   * Only fetch once initially - polling will handle subsequent updates
   */
  useEffect(() => {
    // Clear snapshot when investigationId becomes null/undefined
    if (!investigationId) {
      console.log('🧹 [useInvestigationSnapshot] Clearing snapshot - no investigationId');
      setSnapshot(null);
      setError(null);
      setLoading(false);
      hasFetchedRef.current = null;
      return;
    }

    // Only fetch if we haven't fetched for this investigationId yet
    if (hasFetchedRef.current !== investigationId) {
      console.log('🚀 [useInvestigationSnapshot] Initial fetch triggered for:', investigationId);
      hasFetchedRef.current = investigationId;
      // Call fetchSnapshot directly - it's stable and we're tracking with ref
      fetchSnapshot(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // fetchSnapshot is stable (useCallback with investigationId dependency), 
    // and we use hasFetchedRef to prevent duplicate calls
  }, [investigationId]);

  /**
   * Stop polling when investigation reaches terminal status
   */
  useEffect(() => {
    if (snapshot && isTerminalStatus(snapshot.status as InvestigationStatus)) {
      console.log('🛑 [useInvestigationSnapshot] Stopping polling - terminal status:', snapshot.status);
      stopPolling();
    }
  }, [snapshot, stopPolling]);

  return {
    loading,
    snapshot,
    error,
    refetch: fetchSnapshot
  };
}
