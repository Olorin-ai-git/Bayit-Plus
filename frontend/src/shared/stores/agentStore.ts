/**
 * Agent State Store
 *
 * Unified Zustand store for all agent state management.
 * Replaces: AgentContext, inline agent state
 *
 * @module shared/stores/agentStore
 */

import { create } from 'zustand';
import {
  AgentConfig,
  AgentLog,
  AgentAnalytics,
  AgentStatus
} from '../validation/schemas';

// ============================================================================
// Types
// ============================================================================

export interface AgentFilters {
  status?: AgentStatus[];
  searchQuery?: string;
}

export interface AgentState {
  // Data
  agents: Record<string, AgentConfig>;
  logs: Record<string, AgentLog[]>; // Keyed by agentId
  analytics: Record<string, AgentAnalytics>; // Keyed by agentId

  // Selection
  selectedAgentId: string | null;
  filters: AgentFilters;

  // UI State
  isLoading: boolean;
  error: Error | null;

  // Actions - Agents
  setAgents: (agents: AgentConfig[]) => void;
  addAgent: (agent: AgentConfig) => void;
  updateAgent: (agentId: string, updates: Partial<AgentConfig>) => void;
  removeAgent: (agentId: string) => void;

  // Actions - Logs
  setLogs: (agentId: string, logs: AgentLog[]) => void;
  addLog: (agentId: string, log: AgentLog) => void;
  clearLogs: (agentId: string) => void;

  // Actions - Analytics
  setAnalytics: (agentId: string, analytics: AgentAnalytics) => void;

  // Actions - Selection
  selectAgent: (agentId: string | null) => void;

  // Actions - Filters
  setFilters: (filters: Partial<AgentFilters>) => void;
  clearFilters: () => void;

  // Actions - Loading/Error
  setLoading: (isLoading: boolean) => void;
  setError: (error: Error | null) => void;

  // Selectors
  getAgent: (agentId: string) => AgentConfig | undefined;
  getAgentLogs: (agentId: string) => AgentLog[];
  getAgentAnalytics: (agentId: string) => AgentAnalytics | undefined;
  getFilteredAgents: () => AgentConfig[];

  // Actions - State Management
  reset: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState = {
  agents: {},
  logs: {},
  analytics: {},
  selectedAgentId: null,
  filters: {},
  isLoading: false,
  error: null
};

// ============================================================================
// Store Implementation
// ============================================================================

/**
 * Agent state store
 *
 * @example
 * ```tsx
 * // Access state
 * const { agents, selectAgent } = useAgentStore();
 *
 * // Select agent
 * selectAgent('agent-123');
 *
 * // Add log
 * const addLog = useAgentStore(state => state.addLog);
 * addLog('agent-123', newLog);
 *
 * // Get agent logs
 * const getLogs = useAgentStore(state => state.getAgentLogs);
 * const logs = getLogs('agent-123');
 * ```
 */
export const useAgentStore = create<AgentState>((set, get) => ({
  ...initialState,

  // ==========================================================================
  // Actions - Agents
  // ==========================================================================

  setAgents: (agents) => {
    const agentsMap = agents.reduce(
      (acc, agent) => ({
        ...acc,
        [agent.agentId]: agent
      }),
      {} as Record<string, AgentConfig>
    );

    set({ agents: agentsMap });
  },

  addAgent: (agent) => {
    set((state) => ({
      agents: {
        ...state.agents,
        [agent.agentId]: agent
      }
    }));
  },

  updateAgent: (agentId, updates) => {
    set((state) => {
      const existing = state.agents[agentId];
      if (!existing) return state;

      return {
        agents: {
          ...state.agents,
          [agentId]: { ...existing, ...updates }
        }
      };
    });
  },

  removeAgent: (agentId) => {
    set((state) => {
      const { [agentId]: removed, ...restAgents } = state.agents;
      const { [agentId]: removedLogs, ...restLogs } = state.logs;
      const { [agentId]: removedAnalytics, ...restAnalytics } = state.analytics;

      return {
        agents: restAgents,
        logs: restLogs,
        analytics: restAnalytics,
        selectedAgentId: state.selectedAgentId === agentId ? null : state.selectedAgentId
      };
    });
  },

  // ==========================================================================
  // Actions - Logs
  // ==========================================================================

  setLogs: (agentId, logs) => {
    set((state) => ({
      logs: {
        ...state.logs,
        [agentId]: logs
      }
    }));
  },

  addLog: (agentId, log) => {
    set((state) => {
      const existingLogs = state.logs[agentId] || [];

      // Keep last 1000 logs to prevent memory issues
      const updatedLogs = [...existingLogs, log].slice(-1000);

      return {
        logs: {
          ...state.logs,
          [agentId]: updatedLogs
        }
      };
    });
  },

  clearLogs: (agentId) => {
    set((state) => {
      const { [agentId]: removed, ...rest } = state.logs;
      return { logs: rest };
    });
  },

  // ==========================================================================
  // Actions - Analytics
  // ==========================================================================

  setAnalytics: (agentId, analytics) => {
    set((state) => ({
      analytics: {
        ...state.analytics,
        [agentId]: analytics
      }
    }));
  },

  // ==========================================================================
  // Actions - Selection
  // ==========================================================================

  selectAgent: (agentId) => {
    set({ selectedAgentId: agentId });
  },

  // ==========================================================================
  // Actions - Filters
  // ==========================================================================

  setFilters: (filters) => {
    set((state) => ({
      filters: {
        ...state.filters,
        ...filters
      }
    }));
  },

  clearFilters: () => {
    set({ filters: {} });
  },

  // ==========================================================================
  // Actions - Loading/Error
  // ==========================================================================

  setLoading: (isLoading) => {
    set({ isLoading });
  },

  setError: (error) => {
    set({ error });
  },

  // ==========================================================================
  // Selectors
  // ==========================================================================

  getAgent: (agentId) => {
    return get().agents[agentId];
  },

  getAgentLogs: (agentId) => {
    return get().logs[agentId] || [];
  },

  getAgentAnalytics: (agentId) => {
    return get().analytics[agentId];
  },

  getFilteredAgents: () => {
    const { agents, filters } = get();
    let filtered = Object.values(agents);

    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (agent) =>
          agent.name.toLowerCase().includes(query) ||
          agent.agentId.toLowerCase().includes(query) ||
          agent.type.toLowerCase().includes(query)
      );
    }

    return filtered;
  },

  // ==========================================================================
  // Actions - State Management
  // ==========================================================================

  reset: () => {
    set(initialState);
  }
}));

// ============================================================================
// Selectors (for performance optimization)
// ============================================================================

/**
 * Select agent by ID (memoized)
 */
export const useAgentById = (agentId: string | undefined) =>
  useAgentStore((state) => (agentId ? state.agents[agentId] : undefined));

/**
 * Select currently selected agent
 */
export const useSelectedAgent = () =>
  useAgentStore((state) =>
    state.selectedAgentId ? state.agents[state.selectedAgentId] : undefined
  );

/**
 * Select agent logs
 */
export const useAgentLogs = (agentId: string | undefined) =>
  useAgentStore((state) => (agentId ? state.logs[agentId] || [] : []));

/**
 * Select agent analytics
 */
export const useAgentAnalytics = (agentId: string | undefined) =>
  useAgentStore((state) => (agentId ? state.analytics[agentId] : undefined));

/**
 * Select filtered agents
 */
export const useFilteredAgents = () =>
  useAgentStore((state) => state.getFilteredAgents());

/**
 * Select agent loading state
 */
export const useAgentLoading = () =>
  useAgentStore((state) => state.isLoading);

/**
 * Select agent error
 */
export const useAgentError = () =>
  useAgentStore((state) => state.error);

// ============================================================================
// Actions (for convenient access)
// ============================================================================

export const agentActions = {
  setAgents: (agents: AgentConfig[]) =>
    useAgentStore.getState().setAgents(agents),

  addAgent: (agent: AgentConfig) =>
    useAgentStore.getState().addAgent(agent),

  updateAgent: (agentId: string, updates: Partial<AgentConfig>) =>
    useAgentStore.getState().updateAgent(agentId, updates),

  removeAgent: (agentId: string) =>
    useAgentStore.getState().removeAgent(agentId),

  addLog: (agentId: string, log: AgentLog) =>
    useAgentStore.getState().addLog(agentId, log),

  clearLogs: (agentId: string) =>
    useAgentStore.getState().clearLogs(agentId),

  setAnalytics: (agentId: string, analytics: AgentAnalytics) =>
    useAgentStore.getState().setAnalytics(agentId, analytics),

  selectAgent: (agentId: string | null) =>
    useAgentStore.getState().selectAgent(agentId),

  setFilters: (filters: Partial<AgentFilters>) =>
    useAgentStore.getState().setFilters(filters),

  clearFilters: () =>
    useAgentStore.getState().clearFilters(),

  reset: () =>
    useAgentStore.getState().reset()
};
