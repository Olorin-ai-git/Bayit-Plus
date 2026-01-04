/**
 * Investigation Data Hooks
 *
 * Specialized hooks for investigation data fetching using unified useQuery.
 * Replaces: useInvestigationData, scattered investigation fetch logic
 *
 * @module shared/hooks/useInvestigation
 */

import { useQuery, UseQueryOptions, UseQueryReturn } from './useQuery';
import { Investigation, InvestigationListItem } from '../validation/schemas';
import { getConfig } from '../../config/env.config';

const config = getConfig();
const API_BASE_URL = config.api.baseUrl;

// ============================================================================
// API Functions
// ============================================================================

async function fetchInvestigation(id: string): Promise<Investigation> {
  const response = await fetch(`${API_BASE_URL}/api/v1/investigation-state/${id}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch investigation: ${response.statusText}`);
  }

  return response.json();
}

async function fetchInvestigations(): Promise<InvestigationListItem[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/investigation-state/`);

  if (!response.ok) {
    throw new Error(`Failed to fetch investigations: ${response.statusText}`);
  }

  return response.json();
}

async function fetchInvestigationProgress(id: string): Promise<{
  progress: number;
  phase: string;
  status: string;
}> {
  const response = await fetch(`${API_BASE_URL}/api/v1/investigation-state/${id}/progress`);

  if (!response.ok) {
    throw new Error(`Failed to fetch progress: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch single investigation by ID
 *
 * @example
 * ```tsx
 * const { data: investigation, isLoading, error } = useInvestigationQuery('123');
 * ```
 */
export function useInvestigationQuery(
  id: string | undefined,
  options?: UseQueryOptions<Investigation>
): UseQueryReturn<Investigation> {
  return useQuery<Investigation>(
    ['investigation', id || ''],
    () => fetchInvestigation(id!),
    {
      enabled: !!id,
      staleTime: 30000, // 30 seconds
      ...options
    }
  );
}

/**
 * Fetch list of all investigations
 *
 * @example
 * ```tsx
 * const { data: investigations, isLoading, refetch } = useInvestigationsQuery({
 *   refetchInterval: 10000 // Refetch every 10 seconds
 * });
 * ```
 */
export function useInvestigationsQuery(
  options?: UseQueryOptions<InvestigationListItem[]>
): UseQueryReturn<InvestigationListItem[]> {
  return useQuery<InvestigationListItem[]>(
    ['investigations', 'list'],
    fetchInvestigations,
    {
      staleTime: 60000, // 1 minute
      ...options
    }
  );
}

/**
 * Fetch investigation progress (real-time)
 *
 * @example
 * ```tsx
 * const { data: progress, isLoading } = useInvestigationProgress('123', {
 *   refetchInterval: 2000 // Poll every 2 seconds
 * });
 * ```
 */
export function useInvestigationProgress(
  id: string | undefined,
  options?: UseQueryOptions<{ progress: number; phase: string; status: string }>
): UseQueryReturn<{ progress: number; phase: string; status: string }> {
  return useQuery<{ progress: number; phase: string; status: string }>(
    ['investigation', id || '', 'progress'],
    () => fetchInvestigationProgress(id!),
    {
      enabled: !!id,
      refetchInterval: 2000, // Default 2-second polling
      staleTime: 0, // Always fresh
      ...options
    }
  );
}

// ============================================================================
// Exports
// ============================================================================

export const investigationQueries = {
  useInvestigation: useInvestigationQuery,
  useInvestigations: useInvestigationsQuery,
  useProgress: useInvestigationProgress
};
