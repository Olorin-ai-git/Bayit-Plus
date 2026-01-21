/**
 * useInvestigationsWithFinancials Hook
 * Feature: 025-financial-analysis-frontend
 *
 * Enriches investigation data with financial metrics for completed investigations.
 * Fetches metrics in batches and caches results to minimize API calls.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { financialService } from '../services/financialService';
import { transformRevenueMetrics, transformConfusionMetrics } from '../types/financialApiTypes';
import type { RevenueMetrics, ConfusionMetrics } from '../types/financialMetrics';
import { isFinancialAnalysisEnabled } from '../config/financialConfig';

interface FinancialData {
  revenueMetrics: RevenueMetrics | null;
  confusionMetrics: ConfusionMetrics | null;
}

type FinancialDataMap = Record<string, FinancialData>;

interface UseInvestigationsWithFinancialsResult {
  financialDataMap: FinancialDataMap;
  loading: boolean;
  error: string | null;
}

export function useInvestigationsWithFinancials(
  investigationIds: string[],
  statusMap: Record<string, string>
): UseInvestigationsWithFinancialsResult {
  const [financialDataMap, setFinancialDataMap] = useState<FinancialDataMap>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<FinancialDataMap>({});
  const fetchedRef = useRef<Set<string>>(new Set());

  const completedIds = useMemo(() => {
    return investigationIds.filter((id) => statusMap[id] === 'COMPLETED');
  }, [investigationIds, statusMap]);

  const idsToFetch = useMemo(() => {
    return completedIds.filter((id) => !fetchedRef.current.has(id));
  }, [completedIds]);

  const fetchFinancialData = useCallback(async () => {
    if (!isFinancialAnalysisEnabled() || idsToFetch.length === 0) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const results = await Promise.allSettled(
        idsToFetch.map(async (id) => {
          const response = await financialService.getMetrics(id);
          return { id, response };
        })
      );

      const newData: FinancialDataMap = {};

      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { id, response } = result.value;
          const data: FinancialData = {
            revenueMetrics: response.revenue_metrics
              ? transformRevenueMetrics(response.revenue_metrics)
              : null,
            confusionMetrics: response.confusion_metrics
              ? transformConfusionMetrics(response.confusion_metrics)
              : null,
          };
          newData[id] = data;
          cacheRef.current[id] = data;
          fetchedRef.current.add(id);
        }
      }

      setFinancialDataMap((prev) => ({ ...prev, ...newData }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch financial data';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [idsToFetch]);

  useEffect(() => {
    fetchFinancialData();
  }, [fetchFinancialData]);

  useEffect(() => {
    const cachedData: FinancialDataMap = {};
    for (const id of completedIds) {
      if (cacheRef.current[id]) {
        cachedData[id] = cacheRef.current[id];
      }
    }
    if (Object.keys(cachedData).length > 0) {
      setFinancialDataMap((prev) => ({ ...prev, ...cachedData }));
    }
  }, [completedIds]);

  return {
    financialDataMap,
    loading,
    error,
  };
}
