/**
 * useWidgetData hook - Fetch and cache investigation statistics for widgets
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ReportService } from '../services/reportService';
import { InvestigationStatistics } from '../types/reports';

const CACHE_DURATION = 30000; // 30 seconds

interface UseWidgetDataResult {
  data: InvestigationStatistics | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useWidgetData(): UseWidgetDataResult {
  const [data, setData] = useState<InvestigationStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<{ data: InvestigationStatistics; timestamp: number } | null>(null);

  const fetchData = useCallback(async (force = false) => {
    const now = Date.now();
    
    // Check cache
    if (!force && cacheRef.current) {
      const age = now - cacheRef.current.timestamp;
      if (age < CACHE_DURATION) {
        setData(cacheRef.current.data);
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      console.log('[useWidgetData] Fetching investigation statistics...');
      const statistics = await ReportService.getInvestigationStatistics();
      console.log('[useWidgetData] Received statistics:', statistics);
      setData(statistics);
      cacheRef.current = { data: statistics, timestamp: now };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch statistics';
      console.error('[useWidgetData] Error fetching statistics:', err);
      setError(message);
      // Don't clear existing data on error, use cached if available
      if (cacheRef.current) {
        setData(cacheRef.current.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh,
  };
}

