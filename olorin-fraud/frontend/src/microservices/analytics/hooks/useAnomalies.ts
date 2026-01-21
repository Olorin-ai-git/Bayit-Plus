/**
 * useAnomalies Hook - Fetch anomalies with URL state sync
 * Uses useUrlState for shareable filter URLs
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUrlState } from './useUrlState';
import { AnomalyApiService } from '../services/anomalyApi';
import type { AnomalyEvent, AnomalyFilter } from '../types/anomaly';

export interface UseAnomaliesOptions {
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useAnomalies(options: UseAnomaliesOptions = {}) {
  const { limit = 100, autoRefresh = false, refreshInterval = 30000 } = options;

  const [filters, updateFilters] = useUrlState<AnomalyFilter>({
    severity: undefined,
    metric: undefined,
    detector_id: undefined,
    status: undefined,
    window_start: undefined,
    window_end: undefined,
    min_score: undefined,
    max_score: undefined,
    limit: limit.toString(),
    offset: '0',
  });

  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);

  // Memoize apiService to prevent recreation on every render
  const apiService = useMemo(() => new AnomalyApiService(), []);

  const fetchAnomalies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filter: AnomalyFilter = {
        severity: filters.severity,
        metric: filters.metric,
        detector_id: filters.detector_id,
        status: filters.status,
        window_start: filters.window_start,
        window_end: filters.window_end,
        min_score: filters.min_score ? parseFloat(filters.min_score) : undefined,
        max_score: filters.max_score ? parseFloat(filters.max_score) : undefined,
        limit: parseInt(filters.limit || limit.toString()),
        offset: parseInt(filters.offset || '0'),
      };

      const response = await apiService.listAnomalies(filter);
      setAnomalies(response.anomalies);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch anomalies'));
    } finally {
      setLoading(false);
    }
  }, [filters, limit, apiService]); // apiService is memoized and stable

  useEffect(() => {
    fetchAnomalies();
  }, [fetchAnomalies]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchAnomalies();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchAnomalies]);

  return {
    anomalies,
    loading,
    error,
    total,
    filters,
    updateFilters,
    refresh: fetchAnomalies,
  };
}

