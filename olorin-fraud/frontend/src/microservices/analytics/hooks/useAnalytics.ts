/**
 * useAnalytics hook for dashboard data fetching.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import { useState, useEffect } from 'react';
import { analyticsService } from '../services/analyticsService';
import type { AnalyticsDashboardResponse, AnalyticsFilter } from '../types/analytics';

export const useAnalytics = (filters?: AnalyticsFilter) => {
  const [data, setData] = useState<AnalyticsDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await analyticsService.getDashboard(filters);
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analytics';
          console.error('[useAnalytics] Error fetching analytics data:', err);
          setError(new Error(errorMessage));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [filters?.startDate, filters?.endDate, filters?.timeWindow, filters?.investigationId]);

  return { data, loading, error, refetch: () => {
    setLoading(true);
    analyticsService.getDashboard(filters).then(setData).catch(setError).finally(() => setLoading(false));
  } };
};

