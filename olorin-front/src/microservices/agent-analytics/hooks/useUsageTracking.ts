import { useState, useEffect, useCallback } from 'react';
import {
  UsagePattern,
  RealtimeMetrics,
  AnalyticsFilter
} from '../types/agentAnalytics';
import { agentAnalyticsService } from '../services/agentAnalyticsService';

interface UseUsageTrackingState {
  usagePatterns: UsagePattern[];
  realtimeMetrics: RealtimeMetrics | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface UseUsageTrackingActions {
  // Data fetching
  loadUsagePatterns: (agentIds?: string[], filters?: AnalyticsFilter) => Promise<void>;
  loadRealtimeMetrics: () => Promise<void>;
  refreshAll: () => Promise<void>;

  // Filtering and analysis
  applyFilters: (filters: AnalyticsFilter) => void;
  clearFilters: () => void;

  // Pattern analysis
  getPeakUsageHours: () => { hour: number; callCount: number }[];
  getPeakUsageDays: () => { day: number; callCount: number }[];
  getUsageHeatmap: () => Array<{
    hour: number;
    day: number;
    callCount: number;
    intensity: number;
  }>;
  getUsageTrends: () => {
    period: string;
    callCount: number;
    change: number;
  }[];

  // Capacity planning
  predictUsage: (days: number) => {
    date: string;
    predictedCalls: number;
    confidence: number;
  }[];
  getCapacityRecommendations: () => {
    timeSlot: string;
    currentCapacity: number;
    recommendedCapacity: number;
    reason: string;
  }[];

  // Optimization insights
  getOffPeakOpportunities: () => {
    hour: number;
    potentialSavings: number;
    recommendation: string;
  }[];
  getLoadBalancingRecommendations: () => {
    agentId: string;
    currentLoad: number;
    recommendedAdjustment: string;
    impact: string;
  }[];

  // Utility
  clearError: () => void;
  getUsageAtTime: (hour: number, day: number) => UsagePattern | null;
}

interface UseUsageTrackingOptions {
  autoLoad?: boolean;
  autoRefreshInterval?: number;
  enableRealtimeUpdates?: boolean;
  defaultFilters?: AnalyticsFilter;
}

export function useUsageTracking(
  options: UseUsageTrackingOptions = {}
): UseUsageTrackingState & UseUsageTrackingActions {
  const {
    autoLoad = true,
    autoRefreshInterval = 30000, // 30 seconds
    enableRealtimeUpdates = true,
    defaultFilters
  } = options;

  const [state, setState] = useState<UseUsageTrackingState>({
    usagePatterns: [],
    realtimeMetrics: null,
    isLoading: false,
    isRefreshing: false,
    error: null,
    lastUpdated: null
  });

  const [currentFilters, setCurrentFilters] = useState<AnalyticsFilter | undefined>(defaultFilters);

  // Data fetching methods
  const loadUsagePatterns = useCallback(async (
    agentIds?: string[],
    filters?: AnalyticsFilter
  ) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const filtersToUse = filters || currentFilters;
      const response = await agentAnalyticsService.getUsagePatterns(agentIds, filtersToUse);

      if (!response.success) {
        throw new Error(response.error || 'Failed to load usage patterns');
      }

      setState(prev => ({
        ...prev,
        usagePatterns: response.data || [],
        isLoading: false,
        lastUpdated: new Date()
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load usage patterns',
        isLoading: false
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
        loadUsagePatterns(),
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
  }, [loadUsagePatterns, loadRealtimeMetrics]);

  // Filter management
  const applyFilters = useCallback((filters: AnalyticsFilter) => {
    setCurrentFilters(filters);
    loadUsagePatterns(undefined, filters);
  }, [loadUsagePatterns]);

  const clearFilters = useCallback(() => {
    setCurrentFilters(undefined);
    loadUsagePatterns();
  }, [loadUsagePatterns]);

  // Pattern analysis methods
  const getPeakUsageHours = useCallback(() => {
    const hourlyUsage = new Map<number, number>();

    state.usagePatterns.forEach(pattern => {
      const current = hourlyUsage.get(pattern.timeOfDay) || 0;
      hourlyUsage.set(pattern.timeOfDay, current + pattern.callCount);
    });

    return Array.from(hourlyUsage.entries())
      .map(([hour, callCount]) => ({ hour, callCount }))
      .sort((a, b) => b.callCount - a.callCount);
  }, [state.usagePatterns]);

  const getPeakUsageDays = useCallback(() => {
    const dailyUsage = new Map<number, number>();

    state.usagePatterns.forEach(pattern => {
      const current = dailyUsage.get(pattern.dayOfWeek) || 0;
      dailyUsage.set(pattern.dayOfWeek, current + pattern.callCount);
    });

    return Array.from(dailyUsage.entries())
      .map(([day, callCount]) => ({ day, callCount }))
      .sort((a, b) => b.callCount - a.callCount);
  }, [state.usagePatterns]);

  const getUsageHeatmap = useCallback(() => {
    const heatmapData = [];
    const maxCalls = Math.max(...state.usagePatterns.map(p => p.callCount));

    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const pattern = state.usagePatterns.find(
          p => p.dayOfWeek === day && p.timeOfDay === hour
        );

        heatmapData.push({
          hour,
          day,
          callCount: pattern?.callCount || 0,
          intensity: pattern ? (pattern.callCount / maxCalls) * 100 : 0
        });
      }
    }

    return heatmapData;
  }, [state.usagePatterns]);

  const getUsageTrends = useCallback(() => {
    // Group patterns by time periods and calculate trends
    const trends = [];
    const now = new Date();

    // Generate weekly trends for the last 8 weeks
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (i * 7));

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      // Simulate trend data based on usage patterns
      const baseCalls = state.usagePatterns.reduce((sum, p) => sum + p.callCount, 0);
      const weekCalls = baseCalls * (0.8 + Math.random() * 0.4);

      const previousWeekCalls: number = i < 7 ? trends[trends.length - 1]?.callCount || weekCalls : weekCalls;
      const change: number = previousWeekCalls > 0 ? ((weekCalls - previousWeekCalls) / previousWeekCalls) * 100 : 0;

      trends.push({
        period: `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`,
        callCount: Math.round(weekCalls),
        change: Math.round(change * 100) / 100
      });
    }

    return trends;
  }, [state.usagePatterns]);

  // Capacity planning methods
  const predictUsage = useCallback((days: number) => {
    const predictions = [];
    const avgDailyUsage = state.usagePatterns.reduce((sum, p) => sum + p.callCount, 0) / 7;

    for (let i = 1; i <= days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);

      const dayOfWeek = date.getDay();
      const dayMultiplier = state.usagePatterns
        .filter(p => p.dayOfWeek === dayOfWeek)
        .reduce((sum, p) => sum + p.callCount, 0) / avgDailyUsage || 1;

      const seasonalVariation = 1 + (Math.sin(i / 7) * 0.1); // Weekly seasonal pattern
      const trendMultiplier = 1 + (i * 0.01); // Slight upward trend

      const predictedCalls = Math.round(
        avgDailyUsage * dayMultiplier * seasonalVariation * trendMultiplier
      );

      predictions.push({
        date: date.toISOString().split('T')[0] || '',
        predictedCalls,
        confidence: Math.max(0.6, 1 - (i * 0.02)) // Decreasing confidence over time
      });
    }

    return predictions;
  }, [state.usagePatterns]);

  const getCapacityRecommendations = useCallback(() => {
    const peakHours = getPeakUsageHours().slice(0, 3);
    const lowHours = getPeakUsageHours().slice(-3);

    const recommendations: Array<{
      timeSlot: string;
      currentCapacity: number;
      recommendedCapacity: number;
      reason: string;
    }> = [];

    // Recommendations for peak hours
    peakHours.forEach(peak => {
      recommendations.push({
        timeSlot: `${peak.hour}:00-${peak.hour + 1}:00`,
        currentCapacity: Math.round(peak.callCount * 1.2), // Assume 20% overhead
        recommendedCapacity: Math.round(peak.callCount * 1.5), // 50% overhead for peak
        reason: 'High usage period - increase capacity to prevent bottlenecks'
      });
    });

    // Recommendations for low hours
    lowHours.forEach(low => {
      recommendations.push({
        timeSlot: `${low.hour}:00-${low.hour + 1}:00`,
        currentCapacity: Math.round(low.callCount * 1.2),
        recommendedCapacity: Math.round(low.callCount * 1.1), // Minimal overhead
        reason: 'Low usage period - reduce capacity to save costs'
      });
    });

    return recommendations;
  }, [getPeakUsageHours]);

  // Optimization insights
  const getOffPeakOpportunities = useCallback(() => {
    const hourlyUsage = getPeakUsageHours();
    const minUsage = Math.min(...hourlyUsage.map(h => h.callCount));
    const maxUsage = Math.max(...hourlyUsage.map(h => h.callCount));

    return hourlyUsage
      .filter(usage => usage.callCount < (minUsage + maxUsage) / 3) // Bottom third
      .map(usage => ({
        hour: usage.hour,
        potentialSavings: Math.round((maxUsage - usage.callCount) * 0.05), // $0.05 per call savings
        recommendation: 'Schedule non-urgent tasks during this low-usage period'
      }))
      .sort((a, b) => b.potentialSavings - a.potentialSavings);
  }, [getPeakUsageHours]);

  const getLoadBalancingRecommendations = useCallback(() => {
    if (!state.realtimeMetrics) return [];

    const currentLoad = state.realtimeMetrics.systemLoad;
    const recommendations = [];

    if (currentLoad > 80) {
      recommendations.push({
        agentId: 'system',
        currentLoad,
        recommendedAdjustment: 'Scale up by 2-3 additional agents',
        impact: 'Reduce response time and prevent system overload'
      });
    } else if (currentLoad < 30) {
      recommendations.push({
        agentId: 'system',
        currentLoad,
        recommendedAdjustment: 'Scale down by 1-2 agents',
        impact: 'Reduce operational costs while maintaining performance'
      });
    }

    // Add agent-specific recommendations based on usage patterns
    const peakHours = getPeakUsageHours().slice(0, 2);
    peakHours.forEach(peak => {
      recommendations.push({
        agentId: `peak-hour-${peak.hour}`,
        currentLoad: (peak.callCount / 1000) * 100, // Simulate load percentage
        recommendedAdjustment: 'Add dedicated agents for this time slot',
        impact: 'Improve performance during peak usage periods'
      });
    });

    return recommendations;
  }, [state.realtimeMetrics, getPeakUsageHours]);

  // Utility methods
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const getUsageAtTime = useCallback((hour: number, day: number): UsagePattern | null => {
    return state.usagePatterns.find(
      pattern => pattern.timeOfDay === hour && pattern.dayOfWeek === day
    ) || null;
  }, [state.usagePatterns]);

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

  // Real-time updates
  useEffect(() => {
    if (enableRealtimeUpdates) {
      const interval = setInterval(() => {
        loadRealtimeMetrics();
      }, 10000); // Update every 10 seconds

      return () => clearInterval(interval);
    }
    return undefined;
  }, [enableRealtimeUpdates, loadRealtimeMetrics]);

  return {
    // State
    ...state,

    // Actions
    loadUsagePatterns,
    loadRealtimeMetrics,
    refreshAll,
    applyFilters,
    clearFilters,
    getPeakUsageHours,
    getPeakUsageDays,
    getUsageHeatmap,
    getUsageTrends,
    predictUsage,
    getCapacityRecommendations,
    getOffPeakOpportunities,
    getLoadBalancingRecommendations,
    clearError,
    getUsageAtTime
  };
}