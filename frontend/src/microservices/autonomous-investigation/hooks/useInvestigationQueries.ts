/**
 * React Query hooks for investigation data fetching
 * Provides type-safe, optimized data fetching with error handling and caching
 */

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Investigation, Evidence, InvestigationStatus, EntityType } from '../types';
import { Domain } from '../components/shared/DomainCard';
import { env, getBooleanEnv } from '../utils/env';

// Mock data for development - this would be replaced by actual API calls
const mockInvestigation: Investigation = {
  id: 'INV-123',
  entity: { type: 'user', value: 'user_12345' },
  time_window: {
    start: '2025-01-21T10:00:00Z',
    end: '2025-01-22T10:00:00Z',
    duration_hours: 24
  },
  current_phase: 'analysis',
  status: 'running',
  priority: 'high',
  confidence: 0.85,
  quality_score: 0.78,
  completeness: 0.65,
  risk_score: 0.72,
  risk_progression: [
    {
      timestamp: '2025-01-21T10:00:00Z',
      score: 0.3,
      source: 'initial',
      reason: 'Investigation started',
      confidence: 0.5,
      evidence_count: 0
    },
    {
      timestamp: '2025-01-21T12:00:00Z',
      score: 0.72,
      source: 'device_analysis',
      reason: 'Suspicious device patterns detected',
      confidence: 0.85,
      evidence_count: 15
    }
  ],
  created_by: 'analyst_001',
  assigned_to: ['analyst_001', 'analyst_002'],
  created_at: '2025-01-21T10:00:00Z',
  updated_at: '2025-01-21T12:30:00Z'
};

const mockDomains: Domain[] = [
  {
    id: 'domain-device-001',
    name: 'Device Analysis',
    type: 'device',
    riskScore: 0.8,
    confidence: 0.92,
    evidenceCount: 12,
    lastUpdated: '2025-01-22T10:30:00Z',
    description: 'Analysis of device fingerprints and behavioral patterns',
    metadata: {
      source: 'device_analyzer',
      category: 'security',
      priority: 'high',
      tags: ['device', 'fingerprint', 'behavioral'],
      attributes: { status: 'completed' }
    },
    relationships: {
      connectedDomains: ['domain-network-001', 'domain-location-001'],
      evidenceIds: ['EVD-001', 'EVD-004', 'EVD-007'],
      agentIds: ['agent-device-analyzer']
    },
    insights: {
      summary: 'Detected unusual device fingerprint patterns',
      keyFindings: ['Multiple device IDs from same IP', 'Inconsistent browser signatures'],
      anomalies: ['Device fingerprint mismatch']
    }
  },
  {
    id: 'domain-location-001',
    name: 'Location Analysis',
    type: 'location',
    riskScore: 0.6,
    confidence: 0.85,
    evidenceCount: 8,
    lastUpdated: '2025-01-22T11:15:00Z',
    description: 'Geographic location validation and impossible travel detection',
    metadata: {
      source: 'location_analyzer',
      category: 'geographical',
      priority: 'medium',
      tags: ['location', 'travel', 'geographic'],
      attributes: { status: 'in_progress' }
    },
    relationships: {
      connectedDomains: ['domain-device-001'],
      evidenceIds: ['EVD-002', 'EVD-005'],
      agentIds: ['agent-location-analyzer']
    },
    insights: {
      summary: 'Analyzing geographic patterns and travel feasibility',
      keyFindings: ['Rapid location changes detected'],
      patterns: ['Cross-continental activity within hours']
    }
  },
  {
    id: 'domain-network-001',
    name: 'Network Analysis',
    type: 'network',
    riskScore: 0.9,
    confidence: 0.88,
    evidenceCount: 15,
    lastUpdated: '2025-01-22T12:00:00Z',
    description: 'Network connection patterns and IP address analysis',
    metadata: {
      source: 'network_analyzer',
      category: 'network',
      priority: 'critical',
      tags: ['network', 'ip', 'connections'],
      attributes: { status: 'completed' }
    },
    relationships: {
      connectedDomains: ['domain-device-001'],
      evidenceIds: ['EVD-003', 'EVD-006', 'EVD-008'],
      agentIds: ['agent-network-analyzer']
    },
    insights: {
      summary: 'High-risk network patterns identified',
      keyFindings: ['VPN usage detected', 'Multiple IP addresses', 'Suspicious network hops'],
      anomalies: ['TOR network activity', 'Proxy chain detected']
    }
  }
];

const mockEvidence: Evidence[] = [
  {
    id: 'EVD-001',
    domain: 'Device Analysis',
    summary: 'Unusual device fingerprint detected',
    confidence: 0.9,
    risk_score: 0.8,
    timestamp: '2025-01-21T11:00:00Z',
    source: 'device_analyzer',
    type: 'anomaly'
  },
  {
    id: 'EVD-002',
    domain: 'Network Analysis',
    summary: 'Multiple IP addresses from different countries',
    confidence: 0.85,
    risk_score: 0.7,
    timestamp: '2025-01-21T11:30:00Z',
    source: 'network_analyzer',
    type: 'pattern'
  }
];

// API base configuration
const API_BASE = env.REACT_APP_API_BASE_URL + '/api/v1';

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

/**
 * Combined hook that provides current investigation data
 * Uses mock data by default for development
 */
export function useInvestigationQueries() {
  const USE_MOCK_DATA = getBooleanEnv('REACT_APP_USE_MOCK_DATA', true);

  return {
    investigation: USE_MOCK_DATA ? mockInvestigation : undefined,
    domains: USE_MOCK_DATA ? mockDomains : [],
    evidence: USE_MOCK_DATA ? mockEvidence : [],
    isLoading: false,
    error: null
  };
}