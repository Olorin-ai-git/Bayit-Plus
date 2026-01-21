/**
 * useInvestigationState Hook
 *
 * State management for investigation service.
 * Integrates with Event Bus for real-time updates.
 */

import { useState, useEffect, useCallback } from 'react';
import { useEventListener as useEventBusSubscription, useEventEmitter as useEventBusPublish } from '../events/UnifiedEventBus';
import type {
  Investigation,
  InvestigationParams,
  InvestigationFilters,
  PaginationState
} from '../types';

interface InvestigationState {
  current: Investigation | null;
  history: Investigation[];
  active: Investigation[];
  filters: InvestigationFilters;
  pagination: PaginationState;
  loading: boolean;
  error: string | null;
}

const initialPagination: PaginationState = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0
};

/**
 * Hook for managing investigation state
 */
export function useInvestigationState() {
  const [state, setState] = useState<InvestigationState>({
    current: null,
    history: [],
    active: [],
    filters: {},
    pagination: initialPagination,
    loading: false,
    error: null
  });

  const publish = useEventBusPublish();

  // Subscribe to investigation events
  useEventBusSubscription('investigation:started', (event) => {
    setState(prev => ({
      ...prev,
      current: event.investigation,
      active: [...prev.active, event.investigation]
    }));
  });

  useEventBusSubscription('investigation:updated', (event) => {
    setState(prev => ({
      ...prev,
      current: prev.current?.id === event.investigationId
        ? { ...prev.current, ...event.updates }
        : prev.current,
      active: prev.active.map(inv =>
        inv.id === event.investigationId ? { ...inv, ...event.updates } : inv
      )
    }));
  });

  useEventBusSubscription('investigation:completed', (event) => {
    setState(prev => ({
      ...prev,
      active: prev.active.filter(inv => inv.id !== event.investigationId),
      history: [
        ...prev.history,
        prev.active.find(inv => inv.id === event.investigationId)!
      ].filter(Boolean)
    }));
  });

  /**
   * Set current investigation
   */
  const setCurrent = useCallback((investigation: Investigation | null) => {
    setState(prev => ({ ...prev, current: investigation }));
  }, []);

  /**
   * Set filters
   */
  const setFilters = useCallback((filters: InvestigationFilters) => {
    setState(prev => ({ ...prev, filters }));
  }, []);

  /**
   * Clear filters
   */
  const clearFilters = useCallback(() => {
    setState(prev => ({ ...prev, filters: {} }));
  }, []);

  /**
   * Set pagination
   */
  const setPagination = useCallback((pagination: Partial<PaginationState>) => {
    setState(prev => ({
      ...prev,
      pagination: { ...prev.pagination, ...pagination }
    }));
  }, []);

  /**
   * Set loading state
   */
  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  /**
   * Set error
   */
  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  /**
   * Add investigation to history
   */
  const addToHistory = useCallback((investigation: Investigation) => {
    setState(prev => ({
      ...prev,
      history: [investigation, ...prev.history].slice(0, 50) // Keep last 50
    }));
  }, []);

  /**
   * Clear history
   */
  const clearHistory = useCallback(() => {
    setState(prev => ({ ...prev, history: [] }));
  }, []);

  return {
    ...state,
    setCurrent,
    setFilters,
    clearFilters,
    setPagination,
    setLoading,
    setError,
    addToHistory,
    clearHistory
  };
}
