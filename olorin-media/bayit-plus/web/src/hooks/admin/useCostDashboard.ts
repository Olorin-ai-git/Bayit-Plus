// Custom hook for Cost Dashboard state management and data fetching

import { useState, useCallback, useEffect } from "react";
import { costDashboardService } from "@/services/adminApi/costDashboard";

export type CostScope = "system_wide" | "per_user";
export type CostTab = "overview" | "timeline" | "categories" | "spenders";

interface CostDashboardState {
  scope: CostScope;
  selectedUserId?: string;
  dateRange: { start: Date; end: Date };
  activeTab: CostTab;
  data: {
    overview: any | null;
    timeline: any[] | null;
    breakdown: any | null;
    balanceSheet: any[] | null;
    topSpenders: any[] | null;
  };
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
}

export const useCostDashboard = () => {
  const [state, setState] = useState<CostDashboardState>({
    scope: "system_wide",
    selectedUserId: undefined,
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
    },
    activeTab: "overview",
    data: {
      overview: null,
      timeline: null,
      breakdown: null,
      balanceSheet: null,
      topSpenders: null,
    },
    loading: {
      overview: false,
      timeline: false,
      breakdown: false,
      balanceSheet: false,
      topSpenders: false,
    },
    errors: {
      overview: null,
      timeline: null,
      breakdown: null,
      balanceSheet: null,
      topSpenders: null,
    },
  });

  const setScope = useCallback((scope: CostScope, userId?: string) => {
    setState((prev) => ({
      ...prev,
      scope,
      selectedUserId: userId,
    }));
  }, []);

  const setDateRange = useCallback((range: { start: Date; end: Date }) => {
    setState((prev) => ({ ...prev, dateRange: range }));
  }, []);

  const setActiveTab = useCallback((tab: CostTab) => {
    setState((prev) => ({ ...prev, activeTab: tab }));
  }, []);

  const fetchOverview = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      loading: { ...prev.loading, overview: true },
      errors: { ...prev.errors, overview: null },
    }));

    try {
      const data = await costDashboardService.getOverview({
        scope: state.scope,
        userId: state.selectedUserId,
      });

      setState((prev) => ({
        ...prev,
        data: { ...prev.data, overview: data },
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        errors: { ...prev.errors, overview: (error as Error).message },
      }));
    } finally {
      setState((prev) => ({
        ...prev,
        loading: { ...prev.loading, overview: false },
      }));
    }
  }, [state.scope, state.selectedUserId]);

  const fetchTimeline = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      loading: { ...prev.loading, timeline: true },
      errors: { ...prev.errors, timeline: null },
    }));

    try {
      const data = await costDashboardService.getTimeline({
        scope: state.scope,
        userId: state.selectedUserId,
        startDate: state.dateRange.start,
        endDate: state.dateRange.end,
      });

      setState((prev) => ({
        ...prev,
        data: { ...prev.data, timeline: data },
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        errors: { ...prev.errors, timeline: (error as Error).message },
      }));
    } finally {
      setState((prev) => ({
        ...prev,
        loading: { ...prev.loading, timeline: false },
      }));
    }
  }, [state.scope, state.selectedUserId, state.dateRange]);

  const refresh = useCallback(async () => {
    await Promise.all([fetchOverview(), fetchTimeline()]);
  }, [fetchOverview, fetchTimeline]);

  // Fetch data when scope, user, or date range changes
  useEffect(() => {
    refresh();
  }, [state.scope, state.selectedUserId, state.dateRange]);

  return {
    ...state,
    setScope,
    setDateRange,
    setActiveTab,
    refresh,
    fetchOverview,
    fetchTimeline,
  };
};
