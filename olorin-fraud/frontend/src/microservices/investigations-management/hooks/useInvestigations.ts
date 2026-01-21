/**
 * useInvestigations Hook
 * Manages investigation list state, fetching, and filtering
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Investigation, InvestigationFilters, InvestigationTab } from '../types/investigations';
import { investigationsManagementService } from '../services/investigationsManagementService';

interface UseInvestigationsReturn {
  investigations: Investigation[];
  filteredInvestigations: Investigation[];
  isLoading: boolean;
  error: string | null;
  filters: InvestigationFilters;
  setFilters: (filters: Partial<InvestigationFilters>) => void;
  reload: () => Promise<void>;
}

export const useInvestigations = (): UseInvestigationsReturn => {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<InvestigationFilters>({
    searchQuery: '',
    status: undefined,
    tab: 'all'
  });

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(filters.searchQuery || '');
    }, 300);

    return () => clearTimeout(timer);
  }, [filters.searchQuery]);

  const loadInvestigations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await investigationsManagementService.list({
        status: filters.status === 'all' ? undefined : filters.status,
        search: debouncedSearchQuery || undefined
      });
      setInvestigations(data);
    } catch (err: any) {
      // Handle rate limiting gracefully
      if (err?.response?.status === 429) {
        const errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
        setError(errorMessage);
        console.warn('[useInvestigations] Rate limited:', err);
        // Don't clear investigations on rate limit - keep existing data
        return;
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to load investigations';
      setError(errorMessage);
      console.error('[useInvestigations] Error loading investigations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters.status, debouncedSearchQuery]);

  useEffect(() => {
    // Load investigations when filters or search query changes
    // Request deduplication in the service layer will prevent duplicate simultaneous requests
    loadInvestigations();
  }, [loadInvestigations]);

  const setFilters = useCallback((newFilters: Partial<InvestigationFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Filter investigations based on current filters
  const filteredInvestigations = investigations.filter(inv => {
    // Tab filter
    if (filters.tab === 'mine') {
      // TODO: Get current user from auth context
      const currentUser = 'analyst.a'; // Placeholder
      if (!inv.owner?.toLowerCase().includes(currentUser.toLowerCase())) {
        return false;
      }
    } else if (filters.tab !== 'all') {
      const tabStatusMap: Record<InvestigationTab, Investigation['status'] | null> = {
        'all': null,
        'mine': null,
        'in-progress': 'in-progress',
        'completed': 'completed',
        'failed': 'failed',
        'archived': 'archived'
      };
      const expectedStatus = tabStatusMap[filters.tab];
      if (expectedStatus && inv.status !== expectedStatus) {
        return false;
      }
    }

    // Search filter (already handled by API, but apply client-side as well for consistency)
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      const matchesName = inv.name?.toLowerCase().includes(query);
      const matchesDescription = inv.description?.toLowerCase().includes(query);
      if (!matchesName && !matchesDescription) {
        return false;
      }
    }

    return true;
  });

  return {
    investigations,
    filteredInvestigations,
    isLoading,
    error,
    filters,
    setFilters,
    reload: loadInvestigations
  };
};

