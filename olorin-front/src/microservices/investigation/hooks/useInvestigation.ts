import { useState, useEffect, useCallback } from 'react';
import {
  Investigation,
  InvestigationParams,
  InvestigationUpdateParams,
  InvestigationFilters,
  PaginatedInvestigations,
  InvestigationStatistics,
  InvestigationFinding,
  EvidenceItem,
  investigationService
} from '../services/investigationService';

export interface UseInvestigationState {
  investigation: Investigation | null;
  loading: boolean;
  error: string | null;
  updating: boolean;
}

export interface UseInvestigationsState {
  investigations: Investigation[];
  totalCount: number;
  loading: boolean;
  error: string | null;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  currentPage: number;
}

export interface UseInvestigationStatisticsState {
  statistics: InvestigationStatistics | null;
  loading: boolean;
  error: string | null;
}

export const useInvestigation = (id?: string) => {
  const [state, setState] = useState<UseInvestigationState>({
    investigation: null,
    loading: false,
    error: null,
    updating: false,
  });

  const fetchInvestigation = useCallback(async (investigationId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const investigation = await investigationService.getInvestigation(investigationId);
      setState(prev => ({ ...prev, investigation, loading: false }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to fetch investigation'
      }));
    }
  }, []);

  const updateInvestigation = useCallback(async (investigationId: string, params: InvestigationUpdateParams) => {
    setState(prev => ({ ...prev, updating: true, error: null }));

    try {
      const updatedInvestigation = await investigationService.updateInvestigation(investigationId, params);
      setState(prev => ({
        ...prev,
        investigation: updatedInvestigation,
        updating: false
      }));
      return updatedInvestigation;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        updating: false,
        error: error.message || 'Failed to update investigation'
      }));
      throw error;
    }
  }, []);

  const startInvestigation = useCallback(async (investigationId: string) => {
    setState(prev => ({ ...prev, updating: true, error: null }));

    try {
      const updatedInvestigation = await investigationService.startInvestigation(investigationId);
      setState(prev => ({
        ...prev,
        investigation: updatedInvestigation,
        updating: false
      }));
      return updatedInvestigation;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        updating: false,
        error: error.message || 'Failed to start investigation'
      }));
      throw error;
    }
  }, []);

  const pauseInvestigation = useCallback(async (investigationId: string) => {
    setState(prev => ({ ...prev, updating: true, error: null }));

    try {
      const updatedInvestigation = await investigationService.pauseInvestigation(investigationId);
      setState(prev => ({
        ...prev,
        investigation: updatedInvestigation,
        updating: false
      }));
      return updatedInvestigation;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        updating: false,
        error: error.message || 'Failed to pause investigation'
      }));
      throw error;
    }
  }, []);

  const cancelInvestigation = useCallback(async (investigationId: string, reason?: string) => {
    setState(prev => ({ ...prev, updating: true, error: null }));

    try {
      const updatedInvestigation = await investigationService.cancelInvestigation(investigationId, reason);
      setState(prev => ({
        ...prev,
        investigation: updatedInvestigation,
        updating: false
      }));
      return updatedInvestigation;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        updating: false,
        error: error.message || 'Failed to cancel investigation'
      }));
      throw error;
    }
  }, []);

  const subscribeToUpdates = useCallback((investigationId: string) => {
    return investigationService.subscribeToUpdates(investigationId, (updatedInvestigation) => {
      setState(prev => ({ ...prev, investigation: updatedInvestigation }));
    });
  }, []);

  useEffect(() => {
    if (id) {
      fetchInvestigation(id);
    }
  }, [id, fetchInvestigation]);

  return {
    ...state,
    fetchInvestigation,
    updateInvestigation,
    startInvestigation,
    pauseInvestigation,
    cancelInvestigation,
    subscribeToUpdates,
  };
};

export const useInvestigations = (
  filters?: InvestigationFilters,
  pageSize: number = 20,
  autoRefresh: boolean = false,
  refreshInterval: number = 30000
) => {
  const [state, setState] = useState<UseInvestigationsState>({
    investigations: [],
    totalCount: 0,
    loading: false,
    error: null,
    hasNextPage: false,
    hasPreviousPage: false,
    currentPage: 1,
  });

  const fetchInvestigations = useCallback(async (page: number = 1) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await investigationService.getInvestigations(filters, page, pageSize);
      setState(prev => ({
        ...prev,
        investigations: result.investigations,
        totalCount: result.totalCount,
        hasNextPage: result.hasNextPage,
        hasPreviousPage: result.hasPreviousPage,
        currentPage: result.page,
        loading: false
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to fetch investigations'
      }));
    }
  }, [filters, pageSize]);

  const createInvestigation = useCallback(async (params: InvestigationParams) => {
    try {
      const newInvestigation = await investigationService.createInvestigation(params);
      setState(prev => ({
        ...prev,
        investigations: [newInvestigation, ...prev.investigations],
        totalCount: prev.totalCount + 1
      }));
      return newInvestigation;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to create investigation'
      }));
      throw error;
    }
  }, []);

  const deleteInvestigation = useCallback(async (investigationId: string) => {
    try {
      await investigationService.deleteInvestigation(investigationId);
      setState(prev => ({
        ...prev,
        investigations: prev.investigations.filter(inv => inv.id !== investigationId),
        totalCount: prev.totalCount - 1
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to delete investigation'
      }));
      throw error;
    }
  }, []);

  const refresh = useCallback(() => {
    fetchInvestigations(state.currentPage);
  }, [fetchInvestigations, state.currentPage]);

  const goToPage = useCallback((page: number) => {
    fetchInvestigations(page);
  }, [fetchInvestigations]);

  const nextPage = useCallback(() => {
    if (state.hasNextPage) {
      fetchInvestigations(state.currentPage + 1);
    }
  }, [fetchInvestigations, state.hasNextPage, state.currentPage]);

  const previousPage = useCallback(() => {
    if (state.hasPreviousPage) {
      fetchInvestigations(state.currentPage - 1);
    }
  }, [fetchInvestigations, state.hasPreviousPage, state.currentPage]);

  useEffect(() => {
    fetchInvestigations(1);
  }, [fetchInvestigations]);

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(refresh, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, refresh]);

  return {
    ...state,
    fetchInvestigations,
    createInvestigation,
    deleteInvestigation,
    refresh,
    goToPage,
    nextPage,
    previousPage,
  };
};

export const useInvestigationStatistics = (timeframe?: 'day' | 'week' | 'month' | 'year') => {
  const [state, setState] = useState<UseInvestigationStatisticsState>({
    statistics: null,
    loading: false,
    error: null,
  });

  const fetchStatistics = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const statistics = await investigationService.getInvestigationStatistics(timeframe);
      setState(prev => ({ ...prev, statistics, loading: false }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to fetch statistics'
      }));
    }
  }, [timeframe]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  return {
    ...state,
    fetchStatistics,
  };
};

export const useInvestigationFindings = (investigationId: string) => {
  const [findings, setFindings] = useState<InvestigationFinding[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFindings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await investigationService.getInvestigationFindings(investigationId);
      setFindings(result);
    } catch (error: any) {
      setError(error.message || 'Failed to fetch findings');
    } finally {
      setLoading(false);
    }
  }, [investigationId]);

  const addFinding = useCallback(async (finding: Omit<InvestigationFinding, 'id' | 'timestamp'>) => {
    try {
      const newFinding = await investigationService.addInvestigationFinding(investigationId, finding);
      setFindings(prev => [...prev, newFinding]);
      return newFinding;
    } catch (error: any) {
      setError(error.message || 'Failed to add finding');
      throw error;
    }
  }, [investigationId]);

  useEffect(() => {
    if (investigationId) {
      fetchFindings();
    }
  }, [investigationId, fetchFindings]);

  return {
    findings,
    loading,
    error,
    fetchFindings,
    addFinding,
  };
};

export const useInvestigationEvidence = (investigationId: string) => {
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvidence = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await investigationService.getInvestigationEvidence(investigationId);
      setEvidence(result);
    } catch (error: any) {
      setError(error.message || 'Failed to fetch evidence');
    } finally {
      setLoading(false);
    }
  }, [investigationId]);

  const addEvidence = useCallback(async (evidenceData: Omit<EvidenceItem, 'id' | 'timestamp' | 'investigationId'>) => {
    try {
      const newEvidence = await investigationService.addEvidence(investigationId, evidenceData);
      setEvidence(prev => [...prev, newEvidence]);
      return newEvidence;
    } catch (error: any) {
      setError(error.message || 'Failed to add evidence');
      throw error;
    }
  }, [investigationId]);

  const verifyEvidence = useCallback(async (evidenceId: string, verified: boolean) => {
    try {
      const updatedEvidence = await investigationService.verifyEvidence(investigationId, evidenceId, verified);
      setEvidence(prev => prev.map(item =>
        item.id === evidenceId ? updatedEvidence : item
      ));
      return updatedEvidence;
    } catch (error: any) {
      setError(error.message || 'Failed to verify evidence');
      throw error;
    }
  }, [investigationId]);

  useEffect(() => {
    if (investigationId) {
      fetchEvidence();
    }
  }, [investigationId, fetchEvidence]);

  return {
    evidence,
    loading,
    error,
    fetchEvidence,
    addEvidence,
    verifyEvidence,
  };
};