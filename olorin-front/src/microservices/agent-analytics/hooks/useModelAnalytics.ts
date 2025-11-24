import { useState, useEffect, useCallback } from 'react';
import {
  ModelUsageData,
  CostBreakdown,
  AnalyticsFilter
} from '../types/agentAnalytics';
import { agentAnalyticsService } from '../services/agentAnalyticsService';

interface UseModelAnalyticsState {
  models: ModelUsageData[];
  costBreakdown: CostBreakdown[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface UseModelAnalyticsActions {
  // Data fetching
  loadModels: (modelNames?: string[], providers?: string[], filters?: AnalyticsFilter) => Promise<void>;
  loadCostBreakdown: (filters?: AnalyticsFilter) => Promise<void>;
  refreshAll: () => Promise<void>;

  // Filtering and analysis
  applyFilters: (filters: AnalyticsFilter) => void;
  clearFilters: () => void;
  getModelsByProvider: (provider: string) => ModelUsageData[];
  getTopModelsByUsage: (limit?: number) => ModelUsageData[];
  getTopModelsByCost: (limit?: number) => ModelUsageData[];
  getMostEfficientModels: (limit?: number) => ModelUsageData[];

  // Cost analysis
  getTotalCostByProvider: () => Record<string, number>;
  getCostTrends: () => { provider: string; cost: number; trend: number }[];
  getOptimizationOpportunities: () => {
    modelName: string;
    currentCost: number;
    potentialSavings: number;
    recommendation: string;
  }[];

  // Utility
  clearError: () => void;
  getModelByName: (modelName: string) => ModelUsageData | null;
}

interface UseModelAnalyticsOptions {
  autoLoad?: boolean;
  autoRefreshInterval?: number;
  defaultFilters?: AnalyticsFilter;
}

export function useModelAnalytics(
  options: UseModelAnalyticsOptions = {}
): UseModelAnalyticsState & UseModelAnalyticsActions {
  const {
    autoLoad = true,
    autoRefreshInterval = 60000, // 1 minute
    defaultFilters
  } = options;

  const [state, setState] = useState<UseModelAnalyticsState>({
    models: [],
    costBreakdown: [],
    isLoading: false,
    isRefreshing: false,
    error: null,
    lastUpdated: null
  });

  const [currentFilters, setCurrentFilters] = useState<AnalyticsFilter | undefined>(defaultFilters);

  // Data fetching methods
  const loadModels = useCallback(async (
    modelNames?: string[],
    providers?: string[],
    filters?: AnalyticsFilter
  ) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const filtersToUse = filters || currentFilters;
      const response = await agentAnalyticsService.getModelUsageData(
        modelNames,
        providers,
        filtersToUse
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to load models');
      }

      setState(prev => ({
        ...prev,
        models: response.data || [],
        isLoading: false,
        lastUpdated: new Date()
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load models',
        isLoading: false
      }));
    }
  }, [currentFilters]);

  const loadCostBreakdown = useCallback(async (filters?: AnalyticsFilter) => {
    try {
      const filtersToUse = filters || currentFilters;
      const response = await agentAnalyticsService.getCostBreakdown(filtersToUse);

      if (!response.success) {
        throw new Error(response.error || 'Failed to load cost breakdown');
      }

      setState(prev => ({
        ...prev,
        costBreakdown: response.data || []
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load cost breakdown'
      }));
    }
  }, [currentFilters]);

  const refreshAll = useCallback(async () => {
    setState(prev => ({ ...prev, isRefreshing: true, error: null }));

    try {
      await Promise.all([
        loadModels(),
        loadCostBreakdown()
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
  }, [loadModels, loadCostBreakdown]);

  // Filter management
  const applyFilters = useCallback((filters: AnalyticsFilter) => {
    setCurrentFilters(filters);
    loadModels(undefined, undefined, filters);
    loadCostBreakdown(filters);
  }, [loadModels, loadCostBreakdown]);

  const clearFilters = useCallback(() => {
    setCurrentFilters(undefined);
    loadModels();
    loadCostBreakdown();
  }, [loadModels, loadCostBreakdown]);

  // Analysis methods
  const getModelsByProvider = useCallback((provider: string): ModelUsageData[] => {
    return state.models.filter(model => model.provider === provider);
  }, [state.models]);

  const getTopModelsByUsage = useCallback((limit = 5): ModelUsageData[] => {
    return [...state.models]
      .sort((a, b) => b.totalCalls - a.totalCalls)
      .slice(0, limit);
  }, [state.models]);

  const getTopModelsByCost = useCallback((limit = 5): ModelUsageData[] => {
    return [...state.models]
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, limit);
  }, [state.models]);

  const getMostEfficientModels = useCallback((limit = 5): ModelUsageData[] => {
    return [...state.models]
      .sort((a, b) => {
        const efficiencyA = a.totalCalls / Math.max(a.averageResponseTime, 1);
        const efficiencyB = b.totalCalls / Math.max(b.averageResponseTime, 1);
        return efficiencyB - efficiencyA;
      })
      .slice(0, limit);
  }, [state.models]);

  // Cost analysis methods
  const getTotalCostByProvider = useCallback((): Record<string, number> => {
    const costByProvider: Record<string, number> = {};

    state.models.forEach(model => {
      costByProvider[model.provider] = (costByProvider[model.provider] || 0) + model.totalCost;
    });

    return costByProvider;
  }, [state.models]);

  const getCostTrends = useCallback(() => {
    const providerCosts = getTotalCostByProvider();

    return Object.entries(providerCosts).map(([provider, cost]) => {
      // Calculate trend based on recent usage data
      const providerModels = getModelsByProvider(provider);
      const recentUsage = providerModels.reduce((sum, model) => {
        const recentCosts = model.usage.slice(-7).reduce((total, usage) => total + usage.cost, 0);
        return sum + recentCosts;
      }, 0);

      const previousUsage = providerModels.reduce((sum, model) => {
        const previousCosts = model.usage.slice(-14, -7).reduce((total, usage) => total + usage.cost, 0);
        return sum + previousCosts;
      }, 0);

      const trend = previousUsage > 0 ? ((recentUsage - previousUsage) / previousUsage) * 100 : 0;

      return {
        provider,
        cost,
        trend
      };
    });
  }, [getTotalCostByProvider, getModelsByProvider]);

  const getOptimizationOpportunities = useCallback(() => {
    const opportunities: {
      modelName: string;
      currentCost: number;
      potentialSavings: number;
      recommendation: string;
    }[] = [];

    state.models.forEach(model => {
      const costPerCall = model.totalCost / Math.max(model.totalCalls, 1);

      // Identify high-cost, low-usage models
      if (model.totalCost > 100 && model.totalCalls < 1000) {
        opportunities.push({
          modelName: model.modelName,
          currentCost: model.totalCost,
          potentialSavings: model.totalCost * 0.4,
          recommendation: 'Consider using a more cost-effective model for low-volume tasks'
        });
      }

      // Identify models with high error rates
      if (model.errorRate > 5) {
        const errorCost = model.totalCost * (model.errorRate / 100);
        opportunities.push({
          modelName: model.modelName,
          currentCost: model.totalCost,
          potentialSavings: errorCost * 0.7,
          recommendation: 'Reduce errors by improving input validation and retry logic'
        });
      }

      // Identify slow, expensive models
      if (model.averageResponseTime > 5000 && costPerCall > 0.01) {
        opportunities.push({
          modelName: model.modelName,
          currentCost: model.totalCost,
          potentialSavings: model.totalCost * 0.2,
          recommendation: 'Consider switching to a faster model or optimizing prompts'
        });
      }
    });

    return opportunities.sort((a, b) => b.potentialSavings - a.potentialSavings).slice(0, 10);
  }, [state.models]);

  // Utility methods
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const getModelByName = useCallback((modelName: string): ModelUsageData | null => {
    return state.models.find(model => model.modelName === modelName) || null;
  }, [state.models]);

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefreshInterval > 0) {
      const interval = setInterval(() => {
        if (!state.isLoading && !state.isRefreshing) {
          refreshAll();
        }
      }, autoRefreshInterval);

      return () => clearInterval(interval);
    }
    return undefined;
  }, [autoRefreshInterval, refreshAll, state.isLoading, state.isRefreshing]);

  // Auto-load data on mount
  useEffect(() => {
    if (autoLoad) {
      refreshAll();
    }
  }, [autoLoad, refreshAll]);

  return {
    // State
    ...state,

    // Actions
    loadModels,
    loadCostBreakdown,
    refreshAll,
    applyFilters,
    clearFilters,
    getModelsByProvider,
    getTopModelsByUsage,
    getTopModelsByCost,
    getMostEfficientModels,
    getTotalCostByProvider,
    getCostTrends,
    getOptimizationOpportunities,
    clearError,
    getModelByName
  };
}