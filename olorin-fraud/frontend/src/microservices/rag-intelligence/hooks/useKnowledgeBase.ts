import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  KnowledgeBase,
  Document,
  RAGFilter,
  KnowledgeBaseSettings,
  KnowledgeBaseStatistics,
  KnowledgeBasePermission
} from '../types/ragIntelligence';
import { ragServices } from '../services';
import { handleRAGError, RAGError } from '../services/errorService';

// Hook options
export interface UseKnowledgeBaseOptions {
  autoLoad?: boolean;
  refreshInterval?: number;
  filter?: RAGFilter;
}

// Hook state
export interface KnowledgeBaseState {
  knowledgeBases: KnowledgeBase[];
  selectedKnowledgeBase: KnowledgeBase | null;
  documents: Document[];
  statistics: KnowledgeBaseStatistics | null;
  loading: {
    list: boolean;
    details: boolean;
    documents: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
    statistics: boolean;
  };
  errors: {
    list: RAGError | null;
    details: RAGError | null;
    documents: RAGError | null;
    create: RAGError | null;
    update: RAGError | null;
    delete: RAGError | null;
    statistics: RAGError | null;
  };
}

// Initial state
const initialState: KnowledgeBaseState = {
  knowledgeBases: [],
  selectedKnowledgeBase: null,
  documents: [],
  statistics: null,
  loading: {
    list: false,
    details: false,
    documents: false,
    create: false,
    update: false,
    delete: false,
    statistics: false
  },
  errors: {
    list: null,
    details: null,
    documents: null,
    create: null,
    update: null,
    delete: null,
    statistics: null
  }
};

export const useKnowledgeBase = (options: UseKnowledgeBaseOptions = {}) => {
  const {
    autoLoad = true,
    refreshInterval = 0,
    filter
  } = options;

  const [state, setState] = useState<KnowledgeBaseState>(initialState);

  // Update loading state
  const setLoading = useCallback((key: keyof KnowledgeBaseState['loading'], loading: boolean) => {
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, [key]: loading }
    }));
  }, []);

  // Update error state
  const setError = useCallback((key: keyof KnowledgeBaseState['errors'], error: RAGError | null) => {
    setState(prev => ({
      ...prev,
      errors: { ...prev.errors, [key]: error }
    }));
  }, []);

  // Load knowledge bases
  const loadKnowledgeBases = useCallback(async (customFilter?: RAGFilter) => {
    setLoading('list', true);
    setError('list', null);

    try {
      const knowledgeBases = await ragServices.knowledgeBase.getKnowledgeBases(customFilter || filter);
      setState(prev => ({ ...prev, knowledgeBases }));
      return knowledgeBases;
    } catch (error) {
      const ragError = handleRAGError(error as Error, { operation: 'loadKnowledgeBases', filter: customFilter || filter });
      setError('list', ragError);
      throw ragError;
    } finally {
      setLoading('list', false);
    }
  }, [filter, setLoading, setError]);

  // Select knowledge base and load details
  const selectKnowledgeBase = useCallback(async (id: string) => {
    setLoading('details', true);
    setError('details', null);

    try {
      const knowledgeBase = await ragServices.knowledgeBase.getKnowledgeBase(id);
      setState(prev => ({ ...prev, selectedKnowledgeBase: knowledgeBase }));
      return knowledgeBase;
    } catch (error) {
      const ragError = handleRAGError(error as Error, { operation: 'selectKnowledgeBase', id });
      setError('details', ragError);
      throw ragError;
    } finally {
      setLoading('details', false);
    }
  }, [setLoading, setError]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedKnowledgeBase: null,
      documents: [],
      statistics: null
    }));
    setError('details', null);
    setError('documents', null);
    setError('statistics', null);
  }, [setError]);

  // Create knowledge base
  const createKnowledgeBase = useCallback(async (
    knowledgeBaseData: Omit<KnowledgeBase, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    setLoading('create', true);
    setError('create', null);

    try {
      const created = await ragServices.knowledgeBase.createKnowledgeBase(knowledgeBaseData);
      setState(prev => ({
        ...prev,
        knowledgeBases: [...prev.knowledgeBases, created]
      }));
      return created;
    } catch (error) {
      const ragError = handleRAGError(error as Error, {
        operation: 'createKnowledgeBase',
        name: knowledgeBaseData.name
      });
      setError('create', ragError);
      throw ragError;
    } finally {
      setLoading('create', false);
    }
  }, [setLoading, setError]);

  // Update knowledge base
  const updateKnowledgeBase = useCallback(async (id: string, updates: Partial<KnowledgeBase>) => {
    setLoading('update', true);
    setError('update', null);

    try {
      const updated = await ragServices.knowledgeBase.updateKnowledgeBase(id, updates);

      setState(prev => ({
        ...prev,
        knowledgeBases: prev.knowledgeBases.map(kb => kb.id === id ? updated : kb),
        selectedKnowledgeBase: prev.selectedKnowledgeBase?.id === id ? updated : prev.selectedKnowledgeBase
      }));

      return updated;
    } catch (error) {
      const ragError = handleRAGError(error as Error, { operation: 'updateKnowledgeBase', id });
      setError('update', ragError);
      throw ragError;
    } finally {
      setLoading('update', false);
    }
  }, [setLoading, setError]);

  // Delete knowledge base
  const deleteKnowledgeBase = useCallback(async (id: string) => {
    setLoading('delete', true);
    setError('delete', null);

    try {
      await ragServices.knowledgeBase.deleteKnowledgeBase(id);

      setState(prev => ({
        ...prev,
        knowledgeBases: prev.knowledgeBases.filter(kb => kb.id !== id),
        selectedKnowledgeBase: prev.selectedKnowledgeBase?.id === id ? null : prev.selectedKnowledgeBase
      }));
    } catch (error) {
      const ragError = handleRAGError(error as Error, { operation: 'deleteKnowledgeBase', id });
      setError('delete', ragError);
      throw ragError;
    } finally {
      setLoading('delete', false);
    }
  }, [setLoading, setError]);

  // Update settings
  const updateSettings = useCallback(async (id: string, settings: KnowledgeBaseSettings) => {
    setLoading('update', true);
    setError('update', null);

    try {
      await ragServices.knowledgeBase.updateSettings(id, settings);

      // Reload the knowledge base to get updated settings
      if (state.selectedKnowledgeBase?.id === id) {
        const updated = await ragServices.knowledgeBase.getKnowledgeBase(id);
        setState(prev => ({
          ...prev,
          selectedKnowledgeBase: updated,
          knowledgeBases: prev.knowledgeBases.map(kb => kb.id === id ? updated : kb)
        }));
      }
    } catch (error) {
      const ragError = handleRAGError(error as Error, { operation: 'updateSettings', id });
      setError('update', ragError);
      throw ragError;
    } finally {
      setLoading('update', false);
    }
  }, [state.selectedKnowledgeBase, setLoading, setError]);

  // Load statistics
  const loadStatistics = useCallback(async (id: string) => {
    setLoading('statistics', true);
    setError('statistics', null);

    try {
      const statistics = await ragServices.knowledgeBase.getStatistics(id);
      setState(prev => ({ ...prev, statistics }));
      return statistics;
    } catch (error) {
      const ragError = handleRAGError(error as Error, { operation: 'loadStatistics', id });
      setError('statistics', ragError);
      throw ragError;
    } finally {
      setLoading('statistics', false);
    }
  }, [setLoading, setError]);

  // Add document to knowledge base
  const addDocument = useCallback(async (knowledgeBaseId: string, documentId: string) => {
    try {
      await ragServices.knowledgeBase.addDocument(knowledgeBaseId, documentId);

      // Refresh the selected knowledge base if it's the one we're adding to
      if (state.selectedKnowledgeBase?.id === knowledgeBaseId) {
        const updated = await ragServices.knowledgeBase.getKnowledgeBase(knowledgeBaseId);
        setState(prev => ({
          ...prev,
          selectedKnowledgeBase: updated,
          knowledgeBases: prev.knowledgeBases.map(kb => kb.id === knowledgeBaseId ? updated : kb)
        }));
      }
    } catch (error) {
      const ragError = handleRAGError(error as Error, {
        operation: 'addDocument',
        knowledgeBaseId,
        documentId
      });
      throw ragError;
    }
  }, [state.selectedKnowledgeBase]);

  // Remove document from knowledge base
  const removeDocument = useCallback(async (knowledgeBaseId: string, documentId: string) => {
    try {
      await ragServices.knowledgeBase.removeDocument(knowledgeBaseId, documentId);

      // Refresh the selected knowledge base if it's the one we're removing from
      if (state.selectedKnowledgeBase?.id === knowledgeBaseId) {
        const updated = await ragServices.knowledgeBase.getKnowledgeBase(knowledgeBaseId);
        setState(prev => ({
          ...prev,
          selectedKnowledgeBase: updated,
          knowledgeBases: prev.knowledgeBases.map(kb => kb.id === knowledgeBaseId ? updated : kb),
          documents: prev.documents.filter(doc => doc.id !== documentId)
        }));
      }
    } catch (error) {
      const ragError = handleRAGError(error as Error, {
        operation: 'removeDocument',
        knowledgeBaseId,
        documentId
      });
      throw ragError;
    }
  }, [state.selectedKnowledgeBase]);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setState(prev => ({
      ...prev,
      errors: {
        list: null,
        details: null,
        documents: null,
        create: null,
        update: null,
        delete: null,
        statistics: null
      }
    }));
  }, []);

  // Reset hook state
  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadKnowledgeBases();
    }
  }, [autoLoad, loadKnowledgeBases]);

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(() => {
        if (!state.loading.list) {
          loadKnowledgeBases();
        }
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [refreshInterval, loadKnowledgeBases, state.loading.list]);

  // Computed values
  const computed = useMemo(() => ({
    hasKnowledgeBases: state.knowledgeBases.length > 0,
    hasErrors: Object.values(state.errors).some(error => error !== null),
    isLoading: Object.values(state.loading).some(loading => loading),

    // Knowledge base utilities
    getKnowledgeBase: (id: string) => state.knowledgeBases.find(kb => kb.id === id),

    // Filter utilities
    activeKnowledgeBases: state.knowledgeBases.filter(kb => kb.status === 'active'),
    knowledgeBasesByCategory: state.knowledgeBases.reduce((acc, kb) => {
      if (!acc[kb.category]) acc[kb.category] = [];
      acc[kb.category].push(kb);
      return acc;
    }, {} as Record<string, KnowledgeBase[]>),

    // Statistics
    totalDocuments: state.knowledgeBases.reduce((total, kb) => total + kb.totalDocuments, 0),
    totalSize: state.knowledgeBases.reduce((total, kb) => total + kb.totalSize, 0),

    // Selected knowledge base info
    selectedDocumentCount: state.selectedKnowledgeBase?.totalDocuments || 0,
    selectedSize: state.selectedKnowledgeBase?.totalSize || 0,
    selectedStatus: state.selectedKnowledgeBase?.status || null,

    // Permissions (if available)
    canEdit: (id: string) => {
      const kb = state.knowledgeBases.find(kb => kb.id === id);
      if (!kb) return false;
      // Add permission checking logic here based on current user
      return true; // Placeholder
    },

    canDelete: (id: string) => {
      const kb = state.knowledgeBases.find(kb => kb.id === id);
      if (!kb) return false;
      // Add permission checking logic here based on current user
      return true; // Placeholder
    }
  }), [state]);

  return {
    // State
    ...state,

    // Operations
    loadKnowledgeBases,
    selectKnowledgeBase,
    clearSelection,
    createKnowledgeBase,
    updateKnowledgeBase,
    deleteKnowledgeBase,
    updateSettings,
    loadStatistics,
    addDocument,
    removeDocument,

    // Utilities
    clearErrors,
    reset,

    // Computed values
    ...computed
  };
};

export default useKnowledgeBase;