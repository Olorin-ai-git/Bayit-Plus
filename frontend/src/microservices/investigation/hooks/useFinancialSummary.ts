/**
 * useFinancialSummary Hook
 * Feature: 025-financial-analysis-frontend
 *
 * Fetches aggregated financial summary for multiple investigations.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { financialService } from '../services/financialService';
import { transformFinancialSummary } from '../types/financialApiTypes';
import type { FinancialSummary } from '../types/financialMetrics';
import { isFinancialAnalysisEnabled, getFinancialConfig } from '../config/financialConfig';

interface UseFinancialSummaryResult {
  summary: FinancialSummary | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useFinancialSummary(
  investigationIds: string[]
): UseFinancialSummaryResult {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!isFinancialAnalysisEnabled() || investigationIds.length === 0) {
      setSummary(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await financialService.getSummary(investigationIds);
      setSummary(transformFinancialSummary(response.summary));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch financial summary';
      setError(message);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [investigationIds]);

  useEffect(() => {
    fetchSummary();

    // Set up auto-refresh if enabled
    if (isFinancialAnalysisEnabled()) {
      try {
        const config = getFinancialConfig();
        intervalRef.current = window.setInterval(fetchSummary, config.refreshIntervalMs);
      } catch {
        // Config failed, no auto-refresh
      }
    }

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [fetchSummary]);

  return {
    summary,
    loading,
    error,
    refetch: fetchSummary,
  };
}
