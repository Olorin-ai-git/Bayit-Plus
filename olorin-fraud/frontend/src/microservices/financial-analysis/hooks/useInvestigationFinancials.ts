/**
 * useInvestigationFinancials Hook
 * Feature: 025-financial-analysis-frontend
 *
 * Fetches financial details for a single investigation.
 */

import { useState, useEffect, useCallback } from 'react';
import { financialAnalysisService } from '../services/financialAnalysisService';
import type { InvestigationFinancialAnalysis } from '../../investigation/types/financialMetrics';

interface UseInvestigationFinancialsResult {
  data: InvestigationFinancialAnalysis | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useInvestigationFinancials(investigationId: string): UseInvestigationFinancialsResult {
  const [data, setData] = useState<InvestigationFinancialAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!investigationId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await financialAnalysisService.getInvestigationFinancials(investigationId);
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch investigation financials';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [investigationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
