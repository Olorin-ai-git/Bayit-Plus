/**
 * Usage Hook
 *
 * Provides usage analytics and metrics.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import { useCallback, useEffect } from 'react';
import { useUsageStore } from '../stores/usageStore';
import { useB2BAuthStore } from '../stores/authStore';
import { UsageGranularity, CapabilityType } from '../types';

export function useUsage() {
  const {
    summary,
    breakdown,
    dateRange,
    granularity,
    capability,
    isLoading,
    error,
    setDateRange,
    setGranularity,
    setCapability,
    fetchSummary,
    fetchBreakdown,
    exportUsage,
    clearError,
  } = useUsageStore();

  const { isAuthenticated } = useB2BAuthStore();

  useEffect(() => {
    if (isAuthenticated && !summary) {
      fetchSummary().catch(console.error);
    }
  }, [isAuthenticated, summary, fetchSummary]);

  const handleSetDateRange = useCallback(
    (startDate: string, endDate: string) => {
      setDateRange(startDate, endDate);
    },
    [setDateRange]
  );

  const handleSetGranularity = useCallback(
    (newGranularity: UsageGranularity) => {
      setGranularity(newGranularity);
    },
    [setGranularity]
  );

  const handleSetCapability = useCallback(
    (newCapability: CapabilityType) => {
      setCapability(newCapability);
    },
    [setCapability]
  );

  const handleExport = useCallback(
    async (format: 'csv' | 'json') => {
      const url = await exportUsage(format);
      window.open(url, '_blank');
    },
    [exportUsage]
  );

  const refreshData = useCallback(async () => {
    await Promise.all([fetchSummary(), fetchBreakdown()]);
  }, [fetchSummary, fetchBreakdown]);

  return {
    summary,
    breakdown,
    dateRange,
    granularity,
    capability,
    isLoading,
    error,
    setDateRange: handleSetDateRange,
    setGranularity: handleSetGranularity,
    setCapability: handleSetCapability,
    fetchSummary,
    fetchBreakdown,
    exportUsage: handleExport,
    refreshData,
    clearError,
  };
}
