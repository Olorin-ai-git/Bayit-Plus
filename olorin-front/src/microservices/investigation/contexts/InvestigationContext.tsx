import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { Investigation, InvestigationFilters, investigationService } from '../services/investigationService';

interface InvestigationState {
  investigations: Investigation[];
  selectedInvestigation: Investigation | null;
  loading: boolean;
  error: string | null;
  filters: InvestigationFilters;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

type InvestigationAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_INVESTIGATIONS'; payload: { investigations: Investigation[]; totalCount: number; page: number; hasNextPage: boolean; hasPreviousPage: boolean } }
  | { type: 'SET_SELECTED_INVESTIGATION'; payload: Investigation | null }
  | { type: 'UPDATE_INVESTIGATION'; payload: Investigation }
  | { type: 'ADD_INVESTIGATION'; payload: Investigation }
  | { type: 'REMOVE_INVESTIGATION'; payload: string }
  | { type: 'SET_FILTERS'; payload: InvestigationFilters }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'SET_PAGE_SIZE'; payload: number };

const initialState: InvestigationState = {
  investigations: [],
  selectedInvestigation: null,
  loading: false,
  error: null,
  filters: {},
  totalCount: 0,
  currentPage: 1,
  pageSize: 20,
  hasNextPage: false,
  hasPreviousPage: false,
};

function investigationReducer(state: InvestigationState, action: InvestigationAction): InvestigationState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };

    case 'SET_INVESTIGATIONS':
      return {
        ...state,
        investigations: action.payload.investigations,
        totalCount: action.payload.totalCount,
        currentPage: action.payload.page,
        hasNextPage: action.payload.hasNextPage,
        hasPreviousPage: action.payload.hasPreviousPage,
        loading: false,
        error: null,
      };

    case 'SET_SELECTED_INVESTIGATION':
      return { ...state, selectedInvestigation: action.payload };

    case 'UPDATE_INVESTIGATION':
      return {
        ...state,
        investigations: state.investigations.map(inv =>
          inv.id === action.payload.id ? action.payload : inv
        ),
        selectedInvestigation: state.selectedInvestigation?.id === action.payload.id
          ? action.payload
          : state.selectedInvestigation,
      };

    case 'ADD_INVESTIGATION':
      return {
        ...state,
        investigations: [action.payload, ...state.investigations],
        totalCount: state.totalCount + 1,
      };

    case 'REMOVE_INVESTIGATION':
      return {
        ...state,
        investigations: state.investigations.filter(inv => inv.id !== action.payload),
        totalCount: state.totalCount - 1,
        selectedInvestigation: state.selectedInvestigation?.id === action.payload
          ? null
          : state.selectedInvestigation,
      };

    case 'SET_FILTERS':
      return { ...state, filters: action.payload, currentPage: 1 };

    case 'SET_PAGE':
      return { ...state, currentPage: action.payload };

    case 'SET_PAGE_SIZE':
      return { ...state, pageSize: action.payload, currentPage: 1 };

    default:
      return state;
  }
}

interface InvestigationContextValue {
  state: InvestigationState;
  actions: {
    fetchInvestigations: () => Promise<void>;
    fetchInvestigation: (id: string) => Promise<void>;
    createInvestigation: (params: any) => Promise<Investigation>;
    updateInvestigation: (id: string, params: any) => Promise<Investigation>;
    deleteInvestigation: (id: string) => Promise<void>;
    startInvestigation: (id: string) => Promise<Investigation>;
    pauseInvestigation: (id: string) => Promise<Investigation>;
    cancelInvestigation: (id: string, reason?: string) => Promise<Investigation>;
    completeInvestigation: (id: string, summary?: string) => Promise<Investigation>;
    selectInvestigation: (investigation: Investigation | null) => void;
    setFilters: (filters: InvestigationFilters) => void;
    setPage: (page: number) => void;
    setPageSize: (pageSize: number) => void;
    goToNextPage: () => void;
    goToPreviousPage: () => void;
    clearError: () => void;
    refresh: () => void;
  };
}

const InvestigationContext = createContext<InvestigationContextValue | undefined>(undefined);

export const useInvestigationContext = () => {
  const context = useContext(InvestigationContext);
  if (!context) {
    throw new Error('useInvestigationContext must be used within an InvestigationProvider');
  }
  return context;
};

interface InvestigationProviderProps {
  children: React.ReactNode;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const InvestigationProvider: React.FC<InvestigationProviderProps> = ({
  children,
  autoRefresh = true,
  refreshInterval = 30000,
}) => {
  const [state, dispatch] = useReducer(investigationReducer, initialState);

  const fetchInvestigations = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const result = await investigationService.getInvestigations(
        state.filters,
        state.currentPage,
        state.pageSize
      );

      dispatch({
        type: 'SET_INVESTIGATIONS',
        payload: {
          investigations: result.investigations,
          totalCount: result.totalCount,
          page: result.page,
          hasNextPage: result.hasNextPage,
          hasPreviousPage: result.hasPreviousPage,
        },
      });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to fetch investigations' });
    }
  }, [state.filters, state.currentPage, state.pageSize]);

  const fetchInvestigation = useCallback(async (id: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const investigation = await investigationService.getInvestigation(id);
      dispatch({ type: 'SET_SELECTED_INVESTIGATION', payload: investigation });
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to fetch investigation' });
    }
  }, []);

  const createInvestigation = useCallback(async (params: any) => {
    try {
      const newInvestigation = await investigationService.createInvestigation(params);
      dispatch({ type: 'ADD_INVESTIGATION', payload: newInvestigation });
      return newInvestigation;
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to create investigation' });
      throw error;
    }
  }, []);

  const updateInvestigation = useCallback(async (id: string, params: any) => {
    try {
      const updatedInvestigation = await investigationService.updateInvestigation(id, params);
      dispatch({ type: 'UPDATE_INVESTIGATION', payload: updatedInvestigation });
      return updatedInvestigation;
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to update investigation' });
      throw error;
    }
  }, []);

  const deleteInvestigation = useCallback(async (id: string) => {
    try {
      await investigationService.deleteInvestigation(id);
      dispatch({ type: 'REMOVE_INVESTIGATION', payload: id });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to delete investigation' });
      throw error;
    }
  }, []);

  const startInvestigation = useCallback(async (id: string) => {
    try {
      const updatedInvestigation = await investigationService.startInvestigation(id);
      dispatch({ type: 'UPDATE_INVESTIGATION', payload: updatedInvestigation });
      return updatedInvestigation;
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to start investigation' });
      throw error;
    }
  }, []);

  const pauseInvestigation = useCallback(async (id: string) => {
    try {
      const updatedInvestigation = await investigationService.pauseInvestigation(id);
      dispatch({ type: 'UPDATE_INVESTIGATION', payload: updatedInvestigation });
      return updatedInvestigation;
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to pause investigation' });
      throw error;
    }
  }, []);

  const cancelInvestigation = useCallback(async (id: string, reason?: string) => {
    try {
      const updatedInvestigation = await investigationService.cancelInvestigation(id, reason);
      dispatch({ type: 'UPDATE_INVESTIGATION', payload: updatedInvestigation });
      return updatedInvestigation;
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to cancel investigation' });
      throw error;
    }
  }, []);

  const completeInvestigation = useCallback(async (id: string, summary?: string) => {
    try {
      const updatedInvestigation = await investigationService.completeInvestigation(id, summary);
      dispatch({ type: 'UPDATE_INVESTIGATION', payload: updatedInvestigation });
      return updatedInvestigation;
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to complete investigation' });
      throw error;
    }
  }, []);

  const selectInvestigation = useCallback((investigation: Investigation | null) => {
    dispatch({ type: 'SET_SELECTED_INVESTIGATION', payload: investigation });
  }, []);

  const setFilters = useCallback((filters: InvestigationFilters) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  }, []);

  const setPage = useCallback((page: number) => {
    dispatch({ type: 'SET_PAGE', payload: page });
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    dispatch({ type: 'SET_PAGE_SIZE', payload: pageSize });
  }, []);

  const goToNextPage = useCallback(() => {
    if (state.hasNextPage) {
      dispatch({ type: 'SET_PAGE', payload: state.currentPage + 1 });
    }
  }, [state.hasNextPage, state.currentPage]);

  const goToPreviousPage = useCallback(() => {
    if (state.hasPreviousPage) {
      dispatch({ type: 'SET_PAGE', payload: state.currentPage - 1 });
    }
  }, [state.hasPreviousPage, state.currentPage]);

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const refresh = useCallback(() => {
    fetchInvestigations();
  }, [fetchInvestigations]);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(refresh, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, refresh]);

  // Fetch investigations when filters, page, or pageSize change
  useEffect(() => {
    fetchInvestigations();
  }, [fetchInvestigations]);

  const contextValue: InvestigationContextValue = {
    state,
    actions: {
      fetchInvestigations,
      fetchInvestigation,
      createInvestigation,
      updateInvestigation,
      deleteInvestigation,
      startInvestigation,
      pauseInvestigation,
      cancelInvestigation,
      completeInvestigation,
      selectInvestigation,
      setFilters,
      setPage,
      setPageSize,
      goToNextPage,
      goToPreviousPage,
      clearError,
      refresh,
    },
  };

  return (
    <InvestigationContext.Provider value={contextValue}>
      {children}
    </InvestigationContext.Provider>
  );
};