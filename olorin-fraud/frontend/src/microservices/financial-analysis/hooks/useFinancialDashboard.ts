/**
 * useFinancialDashboard Hook
 * Feature: 025-financial-analysis-frontend
 *
 * Fetches and manages financial dashboard data.
 */

import { useState, useEffect, useCallback } from 'react';
import { financialAnalysisService, type DashboardData } from '../services/financialAnalysisService';

interface UseFinancialDashboardResult {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useFinancialDashboard(): UseFinancialDashboardResult {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await financialAnalysisService.getDashboardData();
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch dashboard data';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

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
