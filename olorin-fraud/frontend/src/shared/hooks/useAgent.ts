/**
 * Agent Data Hooks
 *
 * Specialized hooks for agent data fetching using unified useQuery.
 * Replaces: useAgentData, scattered agent fetch logic
 *
 * @module shared/hooks/useAgent
 */

import { useQuery, UseQueryOptions, UseQueryReturn } from './useQuery';
import { AgentConfig, AgentLog, AgentAnalytics } from '../validation/schemas';
import { getConfig } from '../../config/env.config';

const config = getConfig();
const API_BASE_URL = config.api.baseUrl;

// ============================================================================
// API Functions
// ============================================================================

async function fetchAgentConfig(agentId: string): Promise<AgentConfig> {
  const response = await fetch(`${API_BASE_URL}/api/agents/${agentId}/config`);

  if (!response.ok) {
    throw new Error(`Failed to fetch agent config: ${response.statusText}`);
  }

  return response.json();
}

async function fetchAgentLogs(
  agentId: string,
  limit?: number
): Promise<AgentLog[]> {
  const url = new URL(`${API_BASE_URL}/api/agents/${agentId}/logs`);
  if (limit) {
    url.searchParams.set('limit', String(limit));
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Failed to fetch agent logs: ${response.statusText}`);
  }

  return response.json();
}

async function fetchAgentAnalytics(agentId: string): Promise<AgentAnalytics> {
  const response = await fetch(`${API_BASE_URL}/api/agents/${agentId}/analytics`);

  if (!response.ok) {
    throw new Error(`Failed to fetch agent analytics: ${response.statusText}`);
  }

  return response.json();
}

async function fetchAllAgents(): Promise<AgentConfig[]> {
  const response = await fetch(`${API_BASE_URL}/api/agents`);

  if (!response.ok) {
    throw new Error(`Failed to fetch agents: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch single agent configuration
 *
 * @example
 * ```tsx
 * const { data: agent, isLoading } = useAgentQuery('agent-123');
 * ```
 */
export function useAgentQuery(
  agentId: string | undefined,
  options?: UseQueryOptions<AgentConfig>
): UseQueryReturn<AgentConfig> {
  return useQuery<AgentConfig>(
    ['agent', agentId || ''],
    () => fetchAgentConfig(agentId!),
    {
      enabled: !!agentId,
      staleTime: 60000, // 1 minute
      ...options
    }
  );
}

/**
 * Fetch agent logs with optional limit
 *
 * @example
 * ```tsx
 * const { data: logs, refetch } = useAgentLogsQuery('agent-123', 100, {
 *   refetchInterval: 5000 // Poll every 5 seconds
 * });
 * ```
 */
export function useAgentLogsQuery(
  agentId: string | undefined,
  limit?: number,
  options?: UseQueryOptions<AgentLog[]>
): UseQueryReturn<AgentLog[]> {
  return useQuery<AgentLog[]>(
    ['agent', agentId || '', 'logs', limit],
    () => fetchAgentLogs(agentId!, limit),
    {
      enabled: !!agentId,
      staleTime: 0, // Always fresh
      refetchInterval: 5000, // Default 5-second polling
      ...options
    }
  );
}

/**
 * Fetch agent analytics and performance metrics
 *
 * @example
 * ```tsx
 * const { data: analytics, isLoading } = useAgentAnalyticsQuery('agent-123');
 * ```
 */
export function useAgentAnalyticsQuery(
  agentId: string | undefined,
  options?: UseQueryOptions<AgentAnalytics>
): UseQueryReturn<AgentAnalytics> {
  return useQuery<AgentAnalytics>(
    ['agent', agentId || '', 'analytics'],
    () => fetchAgentAnalytics(agentId!),
    {
      enabled: !!agentId,
      staleTime: 30000, // 30 seconds
      ...options
    }
  );
}

/**
 * Fetch list of all agents
 *
 * @example
 * ```tsx
 * const { data: agents, isLoading } = useAgentsQuery();
 * ```
 */
export function useAgentsQuery(
  options?: UseQueryOptions<AgentConfig[]>
): UseQueryReturn<AgentConfig[]> {
  return useQuery<AgentConfig[]>(
    ['agents', 'list'],
    fetchAllAgents,
    {
      staleTime: 120000, // 2 minutes
      ...options
    }
  );
}

// ============================================================================
// Exports
// ============================================================================

export const agentQueries = {
  useAgent: useAgentQuery,
  useLogs: useAgentLogsQuery,
  useAnalytics: useAgentAnalyticsQuery,
  useAgents: useAgentsQuery
};
