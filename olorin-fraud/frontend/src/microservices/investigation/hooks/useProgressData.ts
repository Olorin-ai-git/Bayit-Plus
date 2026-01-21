/**
 * Progress Data Polling Hook
 * Task: T030 - Phase 4 User Story 2
 * Feature: 007-progress-wizard-page, 001-investigation-state-management
 *
 * Polls investigation progress endpoint with adaptive intervals and ETag caching.
 * Stops polling when investigation reaches terminal status.
 *
 * SYSTEM MANDATE Compliance:
 * - Configuration-driven polling intervals
 * - No hardcoded values
 * - Handles errors gracefully
 * - Terminal status detection
 * - ETag-based conditional requests
 *
 * Reference: /specs/001-investigation-state-management/quickstart.md Example 2
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { InvestigationProgress } from '../../../shared/types/investigation/core';
import { investigationService } from '../services/investigationService';
import { POLLING_CONFIG, isTerminalStatus } from '../constants/pollingConfig';
import { useAdaptivePolling } from './useAdaptivePolling';
import { useETagCache } from './useETagCache';

/**
 * Progress data polling hook
 *
 * Polls investigation progress with intelligent interval calculation and ETag caching.
 * - 30s polling when IN_PROGRESS
 * - 30-60s polling when idle
 * - Pauses when tab hidden
 * - 80% bandwidth reduction via 304 Not Modified
 *
 * @param investigationId - Investigation ID to poll
 * @param enabled - Whether polling is enabled (default: true)
 * @returns Progress data, loading state, error, and polling control
 */
export function useProgressData(
  investigationId: string | undefined,
  enabled: boolean = true
) {
  const [progress, setProgress] = useState<InvestigationProgress | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  // CRITICAL (FR-011): Memoize API service to prevent infinite loop
  const service = useMemo(() => investigationService, []);

  // Track component mount state and latest progress
  const isMountedRef = useRef<boolean>(true);
  const progressRef = useRef<InvestigationProgress | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isCallInProgressRef = useRef<boolean>(false);

  // Update ref when progress changes
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  // ETag cache for conditional requests
  const { getETag, saveETag, clearETag } = useETagCache(investigationId);

  /**
   * Fetches progress data from backend with ETag support
   */
  const fetchProgress = useCallback(async (forceFetch: boolean = false) => {
    if (!investigationId) {
      setIsLoading(false);
      return;
    }

    // Prevent concurrent calls - if a call is already in progress, skip this one
    // UNLESS we are forcing a fetch (e.g. on ID change/reset), in which case we proceed
    // assuming the previous call was aborted by the useEffect cleanup
    if (isCallInProgressRef.current && !forceFetch) {
      console.log('[useProgressData] ⏸️ Call already in progress, skipping this request');
      return;
    }

    // Mark call as in progress
    isCallInProgressRef.current = true;

    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      // Get cached ETag for conditional request
      // CRITICAL: Only use ETag if we have progress data AND it matches the current investigation ID
      // If we switched investigations or forced fetch, we need to force a full fetch
      const currentProgress = progressRef.current;
      const hasRelevantData = currentProgress && 
                             (currentProgress.id === investigationId || currentProgress.investigationId === investigationId);
      
      const cachedETag = (hasRelevantData && !forceFetch) ? getETag() : null;

      console.log('🚨🚨🚨 [useProgressData] Fetching with ETag logic:', {
        investigationId,
        currentProgressId: currentProgress?.id,
        hasRelevantData,
        forceFetch,
        usingETag: !!cachedETag,
        cachedETag
      });

      // Make request through service with ETag support
      const result = await service.getProgress(investigationId, cachedETag);
      
      // Handle 304 Not Modified - no changes, keep existing state
      if (result.data === null) {
        console.log('🚨🚨🚨 [useProgressData] 304 Not Modified - no changes, keeping existing state');
        // Save ETag even on 304 (it might have been updated)
        if (result.etag) {
          saveETag(result.etag);
        }
        // Don't update state, but also don't set error - this is expected behavior
        return;
      }
      
      // Save ETag from successful response
      if (result.etag) {
        saveETag(result.etag);
      }
      
      const data = result.data;

      // Check if request was aborted or component unmounted
      if (abortController.signal.aborted) {
        console.log('🚨🚨🚨 [useProgressData] Request aborted, skipping state update');
        return;
      }

      // Only update if component still mounted (double-check)
      if (!isMountedRef.current) {
        console.log('🚨🚨🚨 [useProgressData] Component unmounted, skipping state update');
        return;
      }

      console.log('🚨🚨🚨 [useProgressData] Received progress data:', {
        hasData: !!data,
        hasDomainFindings: !!(data as any)?.domainFindings && Object.keys((data as any).domainFindings || {}).length > 0,
        domainFindingsCount: (data as any)?.domainFindings ? Object.keys((data as any).domainFindings).length : 0,
        domainFindingsKeys: (data as any)?.domainFindings ? Object.keys((data as any).domainFindings) : [],
        toolExecutionsCount: data?.toolExecutions?.length || 0,
        id: data?.id,
        investigationId: data?.investigationId,
        status: data?.status,
        completionPercent: data?.completionPercent
      });

      // Update progress state - CRITICAL: This triggers re-render of components
      console.log('🚨🚨🚨 [useProgressData] Setting progress state...');
      setProgress(data as any); // Use 'as any' to allow domainFindings field
      setError(null);
      setRetryCount(0);
      setIsLoading(false);
      console.log('🚨🚨🚨 [useProgressData] Progress state updated successfully');

      // Check if investigation reached terminal status
      if (isTerminalStatus(data.status)) {
        // Clear ETag cache when investigation completes
        clearETag();
      }
    } catch (err) {
      // Don't update state if request was aborted or component unmounted
      if (abortController.signal.aborted || !isMountedRef.current) {
        console.log('🚨🚨🚨 [useProgressData] Error occurred but component unmounted/aborted, skipping state update');
        return;
      }

      const error = err instanceof Error ? err : new Error('Failed to fetch progress');
      setError(error);
      setIsLoading(false);

      // Increment retry count for exponential backoff
      setRetryCount(prev => Math.min(prev + 1, POLLING_CONFIG.MAX_RETRIES));
    } finally {
      // Always clear the in-progress flag when done
      isCallInProgressRef.current = false;
      // Clear abort controller reference
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, [investigationId, service, getETag, clearETag]);

  /**
   * Adaptive polling with intelligent intervals
   */
  const {
    pollInterval,
    isPolling,
    isPaused,
    startPolling,
    stopPolling
  } = useAdaptivePolling({
    investigationId,
    status: progress?.status || 'pending',
    lifecycleStage: progress?.lifecycleStage,
    callback: fetchProgress,
    enabled
  });

  /**
   * Reset progress and fetch when investigationId changes
   * This ensures we fetch data at least once, even if polling is disabled
   */
  useEffect(() => {
    console.log('🚨🚨🚨 [useProgressData] useEffect triggered:', {
      investigationId,
      hasFetchProgress: !!fetchProgress,
      isMounted: isMountedRef.current
    });
    
    // CRITICAL: Ensure component is marked as mounted when effect runs
    // This prevents false "unmounted" detection during React Strict Mode double-renders
    isMountedRef.current = true;
    
    // Reset state when investigationId changes
    if (investigationId) {
      console.log('🚨🚨🚨 [useProgressData] Resetting state and fetching progress for:', investigationId);
      
      // Abort any pending requests from previous ID
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      // Reset concurrency flag since we aborted previous request
      isCallInProgressRef.current = false;
      
      setProgress(null);
      progressRef.current = null; // Clear ref immediately to prevent ETag usage
      setError(null);
      setIsLoading(true);
      
      // Initial fetch - force fetch to bypass concurrency check and ETag
      fetchProgress(true).catch(err => {
        console.error('🚨🚨🚨 [useProgressData] Error in fetchProgress:', err);
      });
    } else {
      // Clear state when no investigationId
      console.log('🚨🚨🚨 [useProgressData] No investigationId, clearing state');
      setProgress(null);
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // fetchProgress is included but it's memoized and depends on investigationId, so it's safe
  }, [investigationId, fetchProgress]);
  
  /**
   * Debug: Log when progress state changes
   */
  useEffect(() => {
    console.log('🚨🚨🚨 [useProgressData] Progress state changed:', {
      hasProgress: !!progress,
      progressId: progress?.id,
      progressStatus: progress?.status,
      toolExecutionsCount: progress?.toolExecutions?.length || 0,
      domainFindingsCount: progress ? Object.keys((progress as any).domainFindings || {}).length : 0
    });
  }, [progress]);

  /**
   * Check for terminal status on progress updates
   */
  useEffect(() => {
    if (progress && isTerminalStatus(progress.status)) {
      stopPolling();
    }
  }, [progress, stopPolling]);

  /**
   * Cleanup on unmount - abort any pending requests
   */
  useEffect(() => {
    return () => {
      console.log('🚨🚨🚨 [useProgressData] Component unmounting, aborting pending requests');
      isMountedRef.current = false;
      // Abort any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  return {
    progress,
    isLoading,
    isPolling,
    isPaused,
    pollInterval,
    error,
    retryCount,
    refetch: fetchProgress,
    startPolling,
    stopPolling
  };
}
