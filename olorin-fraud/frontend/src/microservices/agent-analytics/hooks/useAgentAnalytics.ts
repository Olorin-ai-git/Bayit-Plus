import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AgentMetrics,
  AgentAlert,
  AnalyticsFilter,
  AnalyticsSummary,
  RealtimeMetrics
} from '../types/agentAnalytics';
import { agentAnalyticsService } from '../services/agentAnalyticsService';

interface UseAgentAnalyticsState {
  agents: AgentMetrics[];
  alerts: AgentAlert[];
  summary: AnalyticsSummary | null;
  realtimeMetrics: RealtimeMetrics | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface UseAgentAnalyticsActions {
  // Data fetching
  loadAgents: (agentIds?: string[], filters?: AnalyticsFilter) => Promise<void>;
  loadAgent: (agentId: string) => Promise<AgentMetrics | null>;
  loadAlerts: (agentIds?: string[], severity?: string[], acknowledged?: boolean) => Promise<void>;
  loadSummary: (filters?: AnalyticsFilter) => Promise<void>;
  loadRealtimeMetrics: () => Promise<void>;
  refreshAll: () => Promise<void>;

  // Alert management
  acknowledgeAlert: (alertId: string, acknowledgedBy: string) => Promise<boolean>;
  resolveAlert: (alertId: string) => Promise<boolean>;

  // Filtering
  applyFilters: (filters: AnalyticsFilter) => void;
  clearFilters: () => void;

  // Real-time updates
  startRealtimeUpdates: () => void;
  stopRealtimeUpdates: () => void;

  // Utility
  clearError: () => void;
  getAgentById: (agentId: string) => AgentMetrics | null;
  getAlertsByAgent: (agentId: string) => AgentAlert[];
}

interface UseAgentAnalyticsOptions {
  autoLoad?: boolean;
  autoRefreshInterval?: number; // in milliseconds
  enableRealtimeUpdates?: boolean;
  defaultFilters?: AnalyticsFilter;
}

export function useAgentAnalytics(
  options: UseAgentAnalyticsOptions = {}
): UseAgentAnalyticsState & UseAgentAnalyticsActions {
  const {
    autoLoad = true,
    autoRefreshInterval = 30000, // 30 seconds
    enableRealtimeUpdates = true,
    defaultFilters
  } = options;

  const [state, setState] = useState<UseAgentAnalyticsState>({
    agents: [],
    alerts: [],
    summary: null,
    realtimeMetrics: null,
    isLoading: false,
    isRefreshing: false,
    error: null,
    lastUpdated: null
  });

  const [currentFilters, setCurrentFilters] = useState<AnalyticsFilter | undefined>(defaultFilters);
  const refreshIntervalRef = useRef<ReturnType<typeof setTimeout>>();
  const isRealtimeActiveRef = useRef(false);

  // Data fetching methods
  const loadAgents = useCallback(async (
    agentIds?: string[],
    filters?: AnalyticsFilter
  ) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const filtersToUse = filters || currentFilters;
      const response = await agentAnalyticsService.getAgentMetrics(agentIds, filtersToUse);

      if (!response.success) {
        throw new Error(response.error || 'Failed to load agents');
      }

      setState(prev => ({
        ...prev,
        agents: response.data || [],
        isLoading: false,
        lastUpdated: new Date()
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load agents',
        isLoading: false
      }));
    }
  }, [currentFilters]);

  const loadAgent = useCallback(async (agentId: string): Promise<AgentMetrics | null> => {
    try {
      const response = await agentAnalyticsService.getAgentMetric(agentId);

      if (!response.success) {
        throw new Error(response.error || 'Failed to load agent');
      }

      // Update the agent in the current list if it exists
      setState(prev => ({
        ...prev,
        agents: prev.agents.map(agent =>
          agent.id === agentId ? response.data! : agent
        )
      }));

      return response.data || null;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load agent'
      }));
      return null;
    }
  }, []);

  const loadAlerts = useCallback(async (
    agentIds?: string[],
    severity?: string[],
    acknowledged?: boolean
  ) => {
    try {
      const response = await agentAnalyticsService.getAgentAlerts(agentIds, severity, acknowledged);

      if (!response.success) {
        throw new Error(response.error || 'Failed to load alerts');
      }

      setState(prev => ({
        ...prev,
        alerts: response.data || []
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load alerts'
      }));
    }
  }, []);

  const loadSummary = useCallback(async (filters?: AnalyticsFilter) => {
    try {
      const filtersToUse = filters || currentFilters;
      const response = await agentAnalyticsService.getAnalyticsSummary(filtersToUse);

      if (!response.success) {
        throw new Error(response.error || 'Failed to load summary');
      }

      setState(prev => ({
        ...prev,
        summary: response.data || null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load summary'
      }));
    }
  }, [currentFilters]);

  const loadRealtimeMetrics = useCallback(async () => {
    try {
      const response = await agentAnalyticsService.getRealtimeMetrics();

      if (!response.success) {
        throw new Error(response.error || 'Failed to load realtime metrics');
      }

      setState(prev => ({
        ...prev,
        realtimeMetrics: response.data || null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load realtime metrics'
      }));
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setState(prev => ({ ...prev, isRefreshing: true, error: null }));

    try {
      await Promise.all([
        loadAgents(),
        loadAlerts(),
        loadSummary(),
        loadRealtimeMetrics()
      ]);

      setState(prev => ({
        ...prev,
        isRefreshing: false,
        lastUpdated: new Date()
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to refresh data',
        isRefreshing: false
      }));
    }
  }, [loadAgents, loadAlerts, loadSummary, loadRealtimeMetrics]);

  // Alert management methods
  const acknowledgeAlert = useCallback(async (
    alertId: string,
    acknowledgedBy: string
  ): Promise<boolean> => {
    try {
      const response = await agentAnalyticsService.acknowledgeAlert(alertId, acknowledgedBy);

      if (!response.success) {
        throw new Error(response.error || 'Failed to acknowledge alert');
      }

      // Update the alert in the current list
      setState(prev => ({
        ...prev,
        alerts: prev.alerts.map(alert =>
          alert.id === alertId ? response.data! : alert
        )
      }));

      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to acknowledge alert'
      }));
      return false;
    }
  }, []);

  const resolveAlert = useCallback(async (alertId: string): Promise<boolean> => {
    try {
      const response = await agentAnalyticsService.resolveAlert(alertId);

      if (!response.success) {
        throw new Error(response.error || 'Failed to resolve alert');
      }

      // Update the alert in the current list
      setState(prev => ({
        ...prev,
        alerts: prev.alerts.map(alert =>
          alert.id === alertId ? response.data! : alert
        )
      }));

      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to resolve alert'
      }));
      return false;
    }
  }, []);

  // Filter management
  const applyFilters = useCallback((filters: AnalyticsFilter) => {
    setCurrentFilters(filters);
    // Reload data with new filters
    loadAgents(undefined, filters);
    loadSummary(filters);
  }, [loadAgents, loadSummary]);

  const clearFilters = useCallback(() => {
    setCurrentFilters(undefined);
    // Reload data without filters
    loadAgents();
    loadSummary();
  }, [loadAgents, loadSummary]);

  // Real-time updates
  const startRealtimeUpdates = useCallback(() => {
    if (isRealtimeActiveRef.current) return;

    isRealtimeActiveRef.current = true;

    agentAnalyticsService.connectWebSocket(
      // On metrics update
      (metrics: RealtimeMetrics) => {
        setState(prev => ({
          ...prev,
          realtimeMetrics: metrics,
          lastUpdated: new Date()
        }));
      },
      // On alert
      (alert: AgentAlert) => {
        setState(prev => ({
          ...prev,
          alerts: [alert, ...prev.alerts.filter(a => a.id !== alert.id)]
        }));
      },
      // On error
      (error: string) => {
        setState(prev => ({ ...prev, error }));
      }
    );
  }, []);

  const stopRealtimeUpdates = useCallback(() => {
    isRealtimeActiveRef.current = false;
    agentAnalyticsService.disconnectWebSocket();
  }, []);

  // Utility methods
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const getAgentById = useCallback((agentId: string): AgentMetrics | null => {
    return state.agents.find(agent => agent.id === agentId) || null;
  }, [state.agents]);

  const getAlertsByAgent = useCallback((agentId: string): AgentAlert[] => {
    return state.alerts.filter(alert => alert.agentId === agentId);
  }, [state.alerts]);

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        if (!state.isLoading && !state.isRefreshing) {
          refreshAll();
        }
      }, autoRefreshInterval);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
    return undefined;
  }, [autoRefreshInterval, refreshAll, state.isLoading, state.isRefreshing]);

  // Auto-load data on mount
  useEffect(() => {
    if (autoLoad) {
      refreshAll();
    }
  }, [autoLoad, refreshAll]);

  // Enable real-time updates
  useEffect(() => {
    if (enableRealtimeUpdates) {
      startRealtimeUpdates();
    }

    return () => {
      if (enableRealtimeUpdates) {
        stopRealtimeUpdates();
      }
    };
  }, [enableRealtimeUpdates, startRealtimeUpdates, stopRealtimeUpdates]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      stopRealtimeUpdates();
    };
  }, [stopRealtimeUpdates]);

  return {
    // State
    ...state,

    // Actions
    loadAgents,
    loadAgent,
    loadAlerts,
    loadSummary,
    loadRealtimeMetrics,
    refreshAll,
    acknowledgeAlert,
    resolveAlert,
    applyFilters,
    clearFilters,
    startRealtimeUpdates,
    stopRealtimeUpdates,
    clearError,
    getAgentById,
    getAlertsByAgent
  };
}