/**
 * useFilters hook for filter state management.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { AnalyticsFilter } from '../types/analytics';
import { analyticsEventBus } from '../services/eventBus';

export const useFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<AnalyticsFilter>(() => {
    const investigationId = searchParams.get('id');
    const timeWindow = searchParams.get('timeWindow') || '30d';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const cohort = searchParams.get('cohort');
    
    return {
      investigationId: investigationId || undefined,
      timeWindow: timeWindow as any,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      cohort: cohort || undefined,
    };
  });

  useEffect(() => {
    const investigationId = searchParams.get('id');
    const timeWindow = searchParams.get('timeWindow');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const cohort = searchParams.get('cohort');
    
    setFilters(prev => ({
      ...prev,
      investigationId: investigationId || undefined,
      timeWindow: (timeWindow as any) || prev.timeWindow,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      cohort: cohort || undefined,
    }));
  }, [searchParams]);

  // Listen for filter changes from event bus
  useEffect(() => {
    const subscription = analyticsEventBus.onFilterChanged((event) => {
      if (event.source !== 'analytics') {
        setFilters(prev => ({ ...prev, ...event.filters }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const updateFilters = useCallback((newFilters: Partial<AnalyticsFilter>) => {
    setFilters(prev => {
      const updated = { ...prev, ...newFilters };
      analyticsEventBus.publishFilterChanged({
        filters: updated,
        source: 'analytics',
      });
      return updated;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ timeWindow: '30d' });
    setSearchParams({});
  }, [setSearchParams]);

  return {
    filters,
    updateFilters,
    clearFilters,
  };
};

