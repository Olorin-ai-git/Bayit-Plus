/**
 * Investigation Results Hook
 * Feature: 008-live-investigation-updates
 *
 * Fetches investigation results from the API endpoint.
 * Handles loading states, errors, and data transformation.
 *
 * SYSTEM MANDATE Compliance:
 * - No hardcoded values
 * - Handles errors gracefully
 * - Real data only (no mocks/stubs)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { hybridGraphInvestigationService } from '../services/hybridGraphInvestigationService';
import type { InvestigationResults } from '../types/hybridGraphTypes';
import type { TransformedInvestigationResults } from '../types/resultsTypes';

interface UseInvestigationResultsReturn {
  results: TransformedInvestigationResults | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Fetches investigation results from API
 * 
 * Note: BaseApiService automatically transforms snake_case → camelCase,
 * so we cast the result to TransformedInvestigationResults which uses camelCase.
 *
 * @param investigationId - Investigation ID to fetch results for
 * @param enabled - Whether to fetch results (default: true)
 * @returns Results data, loading state, error, and refetch function
 */
export function useInvestigationResults(
  investigationId: string | undefined,
  enabled: boolean = true
): UseInvestigationResultsReturn {
  const [results, setResults] = useState<TransformedInvestigationResults | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const fetchResults = useCallback(async () => {
    if (!investigationId || !enabled) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const data = await hybridGraphInvestigationService.getInvestigationResults(investigationId);

      if (!isMountedRef.current) return;

      // BaseApiService transforms snake_case → camelCase automatically
      // Cast to TransformedInvestigationResults which matches the transformed format
      setResults(data as unknown as TransformedInvestigationResults);
      setError(null);
    } catch (err) {
      if (!isMountedRef.current) return;

      const error = err instanceof Error ? err : new Error('Failed to fetch investigation results');
      setError(error);
      setResults(null);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [investigationId, enabled]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    results,
    isLoading,
    error,
    refetch: fetchResults
  };
}

