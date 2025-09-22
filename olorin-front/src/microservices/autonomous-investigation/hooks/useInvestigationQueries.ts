/**
 * React Query hooks for investigation data fetching
 * Provides type-safe, optimized data fetching with error handling and caching
 */

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Investigation, Domain, Evidence, InvestigationStatus, EntityType } from '../types';

// API base configuration
const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8090/api/v1';

// Query keys for consistent cache management
export const investigationKeys = {
  all: ['investigations'] as const,
  lists: () => [...investigationKeys.all, 'list'] as const,
  list: (filters: InvestigationListFilters) => [...investigationKeys.lists(), { filters }] as const,
  details: () => [...investigationKeys.all, 'detail'] as const,
  detail: (id: string) => [...investigationKeys.details(), id] as const,
  domains: (id: string) => [...investigationKeys.detail(id), 'domains'] as const,
  evidence: (id: string) => [...investigationKeys.detail(id), 'evidence'] as const,
  graph: (id: string) => [...investigationKeys.detail(id), 'graph'] as const,
} as const;

// Types for API requests
interface InvestigationListFilters {
  status?: InvestigationStatus[];
  entity_type?: EntityType[];
  assigned_to?: string[];
  date_range?: {
    start: string;
    end: string;
  };
  search?: string;
}

interface CreateInvestigationRequest {
  entity: {
    type: EntityType;
    value: string;
  };
  time_window: {
    start: string;
    end: string;
  };
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assigned_to?: string[];
}

// Custom error class for API errors
class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// HTTP client with error handling
async function fetchWithError<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const token = localStorage.getItem('auth_token');

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new APIError(
      errorData.message || `HTTP ${response.status}: ${response.statusText}`,
      response.status,
      errorData.code,
      errorData.details
    );
  }

  return response.json();
}

/**
 * Hook to fetch paginated list of investigations
 */
export function useInvestigations(filters: InvestigationListFilters = {}) {
  return useQuery({
    queryKey: investigationKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters.status?.length) {
        params.append('status', filters.status.join(','));
      }
      if (filters.entity_type?.length) {
        params.append('entity_type', filters.entity_type.join(','));
      }
      if (filters.assigned_to?.length) {
        params.append('assigned_to', filters.assigned_to.join(','));
      }
      if (filters.date_range) {
        params.append('start_date', filters.date_range.start);
        params.append('end_date', filters.date_range.end);
      }
      if (filters.search) {
        params.append('search', filters.search);
      }

      return fetchWithError<{
        investigations: Investigation[];
        total: number;
        has_more: boolean;
      }>(`/investigations?${params}`);
    },
    staleTime: 30 * 1000, // 30 seconds
    retry: (failureCount, error) => {
      if (error instanceof APIError && error.status >= 400 && error.status < 500) {
        return false; // Don't retry client errors
      }
      return failureCount < 3;
    },
  });
}

/**
 * Hook to fetch single investigation details
 */
export function useInvestigation(investigationId: string | null) {
  return useQuery({
    queryKey: investigationKeys.detail(investigationId || ''),
    queryFn: () => fetchWithError<Investigation>(`/investigations/${investigationId}`),
    enabled: !!investigationId,
    staleTime: 60 * 1000, // 1 minute
    retry: (failureCount, error) => {
      if (error instanceof APIError && error.status === 404) {
        return false; // Don't retry not found errors
      }
      return failureCount < 3;
    },
  });
}

/**
 * Hook to fetch investigation domain analysis data
 */
export function useInvestigationDomains(investigationId: string | null) {
  return useQuery({
    queryKey: investigationKeys.domains(investigationId || ''),
    queryFn: () => fetchWithError<Domain[]>(`/investigations/${investigationId}/domains`),
    enabled: !!investigationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch investigation evidence with infinite scroll
 */
export function useInvestigationEvidence(investigationId: string | null) {
  return useInfiniteQuery({
    queryKey: investigationKeys.evidence(investigationId || ''),
    queryFn: async ({ pageParam = 0 }) => {
      return fetchWithError<{
        evidence: Evidence[];
        next_cursor: number | null;
        has_more: boolean;
      }>(`/investigations/${investigationId}/evidence?cursor=${pageParam}&limit=50`);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
    enabled: !!investigationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch investigation graph data
 */
export function useInvestigationGraph(investigationId: string | null) {
  return useQuery({
    queryKey: investigationKeys.graph(investigationId || ''),
    queryFn: () => fetchWithError<{
      nodes: any[];
      edges: any[];
      metadata: {
        total_nodes: number;
        total_edges: number;
        layout_algorithm: string;
        last_updated: string;
      };
    }>(`/investigations/${investigationId}/graph`),
    enabled: !!investigationId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    retry: (failureCount, error) => {
      if (error instanceof APIError && error.status >= 400 && error.status < 500) {
        return false;
      }
      return failureCount < 2; // Fewer retries for large graph data
    },
  });
}

/**
 * Hook to create new investigation
 */
export function useCreateInvestigation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInvestigationRequest) =>
      fetchWithError<Investigation>('/investigations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      // Invalidate and refetch investigation lists
      queryClient.invalidateQueries({ queryKey: investigationKeys.lists() });
    },
  });
}

/**
 * Hook to update investigation status
 */
export function useUpdateInvestigationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: InvestigationStatus }) =>
      fetchWithError<Investigation>(`/investigations/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),
    onSuccess: (data) => {
      // Update the specific investigation in cache
      queryClient.setQueryData(investigationKeys.detail(data.id), data);
      // Invalidate lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: investigationKeys.lists() });
    },
  });
}