/**
 * useFinancialMetrics Hook
 * Feature: 025-financial-analysis-frontend
 *
 * Fetches financial metrics for a single completed investigation.
 */

import { useState, useEffect, useCallback } from 'react';
import { financialService } from '../services/financialService';
import {
  transformRevenueMetrics,
  transformConfusionMetrics,
} from '../types/financialApiTypes';
import type { RevenueMetrics, ConfusionMetrics } from '../types/financialMetrics';
import { isFinancialAnalysisEnabled } from '../config/financialConfig';

interface UseFinancialMetricsResult {
  revenueMetrics: RevenueMetrics | null;
  confusionMetrics: ConfusionMetrics | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useFinancialMetrics(
  investigationId: string | null,
  status: string | null
): UseFinancialMetricsResult {
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics | null>(null);
  const [confusionMetrics, setConfusionMetrics] = useState<ConfusionMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!investigationId || status !== 'COMPLETED' || !isFinancialAnalysisEnabled()) {
      setRevenueMetrics(null);
      setConfusionMetrics(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await financialService.getMetrics(investigationId);

      setRevenueMetrics(
        response.revenue_metrics ? transformRevenueMetrics(response.revenue_metrics) : null
      );
      setConfusionMetrics(
        response.confusion_metrics
          ? transformConfusionMetrics(response.confusion_metrics)
          : null
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch financial metrics';
      setError(message);
      setRevenueMetrics(null);
      setConfusionMetrics(null);
    } finally {
      setLoading(false);
    }
  }, [investigationId, status]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    revenueMetrics,
    confusionMetrics,
    loading,
    error,
    refetch: fetchMetrics,
  };
}
