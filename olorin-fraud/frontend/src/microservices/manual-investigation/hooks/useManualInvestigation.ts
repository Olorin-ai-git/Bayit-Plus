import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ManualInvestigation,
  InvestigationFilter,
  InvestigationStats,
  ManualInvestigationStatus
} from '../types/manualInvestigation';
import { manualInvestigationService, ApiResponse, PaginatedResponse } from '../services/manualInvestigationService';
import { collaborationService } from '../services/collaborationService';
import { notificationService } from '../services/notificationService';

interface UseManualInvestigationState {
  investigations: ManualInvestigation[];
  currentInvestigation: ManualInvestigation | null;
  stats: InvestigationStats | null;
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  error: string | null;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface UseManualInvestigationActions {
  // Data fetching
  loadInvestigations: (filters?: InvestigationFilter, page?: number) => Promise<void>;
  loadInvestigation: (id: string) => Promise<void>;
  loadStats: () => Promise<void>;
  refreshCurrent: () => Promise<void>;

  // CRUD operations
  createInvestigation: (investigation: Omit<ManualInvestigation, 'id' | 'createdAt' | 'updatedAt' | 'timeline' | 'progress'>) => Promise<ManualInvestigation | null>;
  updateInvestigation: (id: string, updates: Partial<ManualInvestigation>) => Promise<void>;
  deleteInvestigation: (id: string) => Promise<void>;
  changeStatus: (id: string, status: ManualInvestigationStatus) => Promise<void>;

  // Search and filtering
  searchInvestigations: (query: string, filters?: InvestigationFilter) => Promise<ManualInvestigation[]>;
  setFilters: (filters: InvestigationFilter) => void;
  clearFilters: () => void;

  // Pagination
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;

  // Error handling
  clearError: () => void;
}

interface UseManualInvestigationOptions {
  autoLoad?: boolean;
  pageSize?: number;
  enableRealtime?: boolean;
  pollingInterval?: number;
}

export function useManualInvestigation(
  options: UseManualInvestigationOptions = {}
): UseManualInvestigationState & UseManualInvestigationActions {
  const {
    autoLoad = true,
    pageSize = 20,
    enableRealtime = true,
    pollingInterval = 30000
  } = options;

  const [state, setState] = useState<UseManualInvestigationState>({
    investigations: [],
    currentInvestigation: null,
    stats: null,
    isLoading: false,
    isCreating: false,
    isUpdating: false,
    error: null,
    pagination: {
      page: 1,
      pageSize,
      total: 0,
      totalPages: 0
    }
  });

  const [filters, setFiltersState] = useState<InvestigationFilter>({});
  const pollingRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();

  // Data fetching functions
  const loadInvestigations = useCallback(async (
    newFilters?: InvestigationFilter,
    page = state.pagination.page
  ) => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const filtersToUse = newFilters || filters;
      const response = await manualInvestigationService.getInvestigations(
        filtersToUse,
        page,
        state.pagination.pageSize
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to load investigations');
      }

      setState(prev => ({
        ...prev,
        investigations: response.data?.items || [],
        pagination: {
          ...prev.pagination,
          page: response.data?.page || 1,
          total: response.data?.total || 0,
          totalPages: response.data?.totalPages || 0
        },
        isLoading: false
      }));

      if (newFilters) {
        setFiltersState(newFilters);
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        setState(prev => ({
          ...prev,
          error: error.message,
          isLoading: false
        }));
      }
    }
  }, [filters, state.pagination.page, state.pagination.pageSize]);

  const loadInvestigation = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await manualInvestigationService.getInvestigation(id);

      if (!response.success) {
        throw new Error(response.error || 'Failed to load investigation');
      }

      setState(prev => ({
        ...prev,
        currentInvestigation: response.data!,
        isLoading: false
      }));

      // Connect to real-time collaboration if enabled
      if (enableRealtime && response.data) {
        const currentUserId = localStorage.getItem('currentUserId') || '';
        const currentUserName = localStorage.getItem('currentUserName') || '';

        if (currentUserId && currentUserName) {
          await collaborationService.connect(id, currentUserId, currentUserName);
        }
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load investigation',
        isLoading: false
      }));
    }
  }, [enableRealtime]);

  const loadStats = useCallback(async () => {
    try {
      const response = await manualInvestigationService.getInvestigationStats();

      if (response.success) {
        setState(prev => ({
          ...prev,
          stats: response.data!
        }));
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  const refreshCurrent = useCallback(async () => {
    if (state.currentInvestigation) {
      await loadInvestigation(state.currentInvestigation.id);
    }
  }, [state.currentInvestigation, loadInvestigation]);

  // CRUD operations
  const createInvestigation = useCallback(async (
    investigation: Omit<ManualInvestigation, 'id' | 'createdAt' | 'updatedAt' | 'timeline' | 'progress'>
  ): Promise<ManualInvestigation | null> => {
    setState(prev => ({ ...prev, isCreating: true, error: null }));

    try {
      const response = await manualInvestigationService.createInvestigation({ investigation });

      if (!response.success) {
        throw new Error(response.error || 'Failed to create investigation');
      }

      const newInvestigation = response.data!;

      // Update local state
      setState(prev => ({
        ...prev,
        investigations: [newInvestigation, ...prev.investigations],
        currentInvestigation: newInvestigation,
        isCreating: false
      }));

      // Create notification
      await notificationService.createNotification({
        type: 'investigation_updated',
        investigationId: newInvestigation.id,
        investigationTitle: newInvestigation.title,
        variables: { action: 'created' }
      });

      // Refresh stats
      await loadStats();

      return newInvestigation;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create investigation',
        isCreating: false
      }));
      return null;
    }
  }, [loadStats]);

  const updateInvestigation = useCallback(async (
    id: string,
    updates: Partial<ManualInvestigation>
  ) => {
    setState(prev => ({ ...prev, isUpdating: true, error: null }));

    try {
      const response = await manualInvestigationService.updateInvestigation({ id, updates });

      if (!response.success) {
        throw new Error(response.error || 'Failed to update investigation');
      }

      const updatedInvestigation = response.data!;

      // Update local state
      setState(prev => ({
        ...prev,
        investigations: prev.investigations.map(inv =>
          inv.id === id ? updatedInvestigation : inv
        ),
        currentInvestigation: prev.currentInvestigation?.id === id
          ? updatedInvestigation
          : prev.currentInvestigation,
        isUpdating: false
      }));

      // Send real-time update
      if (enableRealtime) {
        collaborationService.sendInvestigationUpdated(updates);
      }

      // Create notification for status changes
      if (updates.status && updates.status !== state.currentInvestigation?.status) {
        await notificationService.createNotification({
          type: 'status_changed',
          investigationId: id,
          investigationTitle: updatedInvestigation.title,
          variables: { newStatus: updates.status }
        });
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update investigation',
        isUpdating: false
      }));
    }
  }, [state.currentInvestigation, enableRealtime]);

  const deleteInvestigation = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, isUpdating: true, error: null }));

    try {
      const response = await manualInvestigationService.deleteInvestigation(id);

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete investigation');
      }

      // Update local state
      setState(prev => ({
        ...prev,
        investigations: prev.investigations.filter(inv => inv.id !== id),
        currentInvestigation: prev.currentInvestigation?.id === id
          ? null
          : prev.currentInvestigation,
        isUpdating: false
      }));

      // Refresh stats
      await loadStats();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to delete investigation',
        isUpdating: false
      }));
    }
  }, [loadStats]);

  const changeStatus = useCallback(async (id: string, status: ManualInvestigationStatus) => {
    await updateInvestigation(id, { status });
  }, [updateInvestigation]);

  // Search and filtering
  const searchInvestigations = useCallback(async (
    query: string,
    searchFilters?: InvestigationFilter
  ): Promise<ManualInvestigation[]> => {
    try {
      const response = await manualInvestigationService.searchInvestigations(query, searchFilters);

      if (response.success) {
        return response.data || [];
      } else {
        throw new Error(response.error || 'Search failed');
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Search failed'
      }));
      return [];
    }
  }, []);

  const setFilters = useCallback((newFilters: InvestigationFilter) => {
    setFiltersState(newFilters);
    loadInvestigations(newFilters, 1);
  }, [loadInvestigations]);

  const clearFilters = useCallback(() => {
    setFiltersState({});
    loadInvestigations({}, 1);
  }, [loadInvestigations]);

  // Pagination
  const setPage = useCallback((page: number) => {
    setState(prev => ({
      ...prev,
      pagination: { ...prev.pagination, page }
    }));
    loadInvestigations(filters, page);
  }, [filters, loadInvestigations]);

  const setPageSize = useCallback((newPageSize: number) => {
    setState(prev => ({
      ...prev,
      pagination: { ...prev.pagination, pageSize: newPageSize, page: 1 }
    }));
    loadInvestigations(filters, 1);
  }, [filters, loadInvestigations]);

  // Error handling
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Real-time event handlers
  useEffect(() => {
    if (!enableRealtime) return;

    const handleInvestigationUpdated = (event: any) => {
      if (event.data.investigation && state.currentInvestigation?.id === event.investigationId) {
        setState(prev => ({
          ...prev,
          currentInvestigation: {
            ...prev.currentInvestigation!,
            ...event.data.investigation
          }
        }));
      }
    };

    const unsubscribe = collaborationService.onEvent('investigation_updated', handleInvestigationUpdated);

    return unsubscribe;
  }, [enableRealtime, state.currentInvestigation?.id]);

  // Polling for non-real-time updates
  useEffect(() => {
    if (!pollingInterval || enableRealtime) return;

    pollingRef.current = setInterval(() => {
      if (state.currentInvestigation) {
        refreshCurrent();
      } else {
        loadInvestigations();
      }
    }, pollingInterval);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [pollingInterval, enableRealtime, state.currentInvestigation, refreshCurrent, loadInvestigations]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadInvestigations();
      loadStats();
    }
  }, [autoLoad]); // Only run on mount

  // Cleanup
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      if (enableRealtime) {
        collaborationService.disconnect();
      }
    };
  }, [enableRealtime]);

  return {
    // State
    ...state,

    // Actions
    loadInvestigations,
    loadInvestigation,
    loadStats,
    refreshCurrent,
    createInvestigation,
    updateInvestigation,
    deleteInvestigation,
    changeStatus,
    searchInvestigations,
    setFilters,
    clearFilters,
    setPage,
    setPageSize,
    clearError
  };
}