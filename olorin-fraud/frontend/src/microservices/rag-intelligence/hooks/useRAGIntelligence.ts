import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  KnowledgeBase,
  Document,
  SearchQuery,
  SearchResult,
  RAGQuery,
  RAGResponse,
  RAGAnalytics,
  RAGError,
  PaginatedRAGResponse
} from '../types/ragIntelligence';
import { ragServices } from '../services';
import { handleRAGError } from '../services/errorService';

// Hook state interface
export interface RAGIntelligenceState {
  knowledgeBases: KnowledgeBase[];
  documents: PaginatedRAGResponse<Document> | null;
  searchResults: SearchResult | null;
  ragResponses: RAGResponse[];
  analytics: RAGAnalytics | null;
  loading: {
    knowledgeBases: boolean;
    documents: boolean;
    search: boolean;
    generation: boolean;
    analytics: boolean;
  };
  errors: {
    knowledgeBases: RAGError | null;
    documents: RAGError | null;
    search: RAGError | null;
    generation: RAGError | null;
    analytics: RAGError | null;
  };
}

// Initial state
const initialState: RAGIntelligenceState = {
  knowledgeBases: [],
  documents: null,
  searchResults: null,
  ragResponses: [],
  analytics: null,
  loading: {
    knowledgeBases: false,
    documents: false,
    search: false,
    generation: false,
    analytics: false
  },
  errors: {
    knowledgeBases: null,
    documents: null,
    search: null,
    generation: null,
    analytics: null
  }
};

// Main RAG Intelligence hook
export const useRAGIntelligence = () => {
  const [state, setState] = useState<RAGIntelligenceState>(initialState);

  // Update loading state
  const setLoading = useCallback((key: keyof RAGIntelligenceState['loading'], loading: boolean) => {
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, [key]: loading }
    }));
  }, []);

  // Update error state
  const setError = useCallback((key: keyof RAGIntelligenceState['errors'], error: RAGError | null) => {
    setState(prev => ({
      ...prev,
      errors: { ...prev.errors, [key]: error }
    }));
  }, []);

  // Knowledge Base operations
  const knowledgeBaseOperations = useMemo(() => ({
    load: async (filter?: any) => {
      setLoading('knowledgeBases', true);
      setError('knowledgeBases', null);

      try {
        const knowledgeBases = await ragServices.knowledgeBase.getKnowledgeBases(filter);
        setState(prev => ({ ...prev, knowledgeBases }));
        return knowledgeBases;
      } catch (error) {
        const ragError = handleRAGError(error as Error, { operation: 'loadKnowledgeBases' });
        setError('knowledgeBases', ragError);
        throw ragError;
      } finally {
        setLoading('knowledgeBases', false);
      }
    },

    get: async (id: string) => {
      try {
        return await ragServices.knowledgeBase.getKnowledgeBase(id);
      } catch (error) {
        const ragError = handleRAGError(error as Error, { operation: 'getKnowledgeBase', id });
        throw ragError;
      }
    },

    create: async (knowledgeBase: Omit<KnowledgeBase, 'id' | 'createdAt' | 'updatedAt'>) => {
      setLoading('knowledgeBases', true);
      setError('knowledgeBases', null);

      try {
        const created = await ragServices.knowledgeBase.createKnowledgeBase(knowledgeBase);
        setState(prev => ({
          ...prev,
          knowledgeBases: [...prev.knowledgeBases, created]
        }));
        return created;
      } catch (error) {
        const ragError = handleRAGError(error as Error, { operation: 'createKnowledgeBase' });
        setError('knowledgeBases', ragError);
        throw ragError;
      } finally {
        setLoading('knowledgeBases', false);
      }
    },

    update: async (id: string, updates: Partial<KnowledgeBase>) => {
      try {
        const updated = await ragServices.knowledgeBase.updateKnowledgeBase(id, updates);
        setState(prev => ({
          ...prev,
          knowledgeBases: prev.knowledgeBases.map(kb => kb.id === id ? updated : kb)
        }));
        return updated;
      } catch (error) {
        const ragError = handleRAGError(error as Error, { operation: 'updateKnowledgeBase', id });
        throw ragError;
      }
    },

    delete: async (id: string) => {
      try {
        await ragServices.knowledgeBase.deleteKnowledgeBase(id);
        setState(prev => ({
          ...prev,
          knowledgeBases: prev.knowledgeBases.filter(kb => kb.id !== id)
        }));
      } catch (error) {
        const ragError = handleRAGError(error as Error, { operation: 'deleteKnowledgeBase', id });
        throw ragError;
      }
    },

    addDocument: async (knowledgeBaseId: string, documentId: string) => {
      try {
        await ragServices.knowledgeBase.addDocument(knowledgeBaseId, documentId);
        // Refresh knowledge base data
        const updated = await ragServices.knowledgeBase.getKnowledgeBase(knowledgeBaseId);
        setState(prev => ({
          ...prev,
          knowledgeBases: prev.knowledgeBases.map(kb => kb.id === knowledgeBaseId ? updated : kb)
        }));
      } catch (error) {
        const ragError = handleRAGError(error as Error, { operation: 'addDocumentToKnowledgeBase', knowledgeBaseId, documentId });
        throw ragError;
      }
    },

    removeDocument: async (knowledgeBaseId: string, documentId: string) => {
      try {
        await ragServices.knowledgeBase.removeDocument(knowledgeBaseId, documentId);
        // Refresh knowledge base data
        const updated = await ragServices.knowledgeBase.getKnowledgeBase(knowledgeBaseId);
        setState(prev => ({
          ...prev,
          knowledgeBases: prev.knowledgeBases.map(kb => kb.id === knowledgeBaseId ? updated : kb)
        }));
      } catch (error) {
        const ragError = handleRAGError(error as Error, { operation: 'removeDocumentFromKnowledgeBase', knowledgeBaseId, documentId });
        throw ragError;
      }
    }
  }), [setLoading, setError]);

  // Document operations
  const documentOperations = useMemo(() => ({
    load: async (knowledgeBaseId?: string, filter?: any) => {
      setLoading('documents', true);
      setError('documents', null);

      try {
        const documents = await ragServices.document.getDocuments(knowledgeBaseId, filter);
        setState(prev => ({ ...prev, documents }));
        return documents;
      } catch (error) {
        const ragError = handleRAGError(error as Error, { operation: 'loadDocuments' });
        setError('documents', ragError);
        throw ragError;
      } finally {
        setLoading('documents', false);
      }
    },

    get: async (id: string) => {
      try {
        return await ragServices.document.getDocument(id);
      } catch (error) {
        const ragError = handleRAGError(error as Error, { operation: 'getDocument', id });
        throw ragError;
      }
    },

    upload: async (file: File, metadata: any, knowledgeBaseId?: string) => {
      setLoading('documents', true);
      setError('documents', null);

      try {
        const uploaded = await ragServices.document.uploadDocument(file, metadata, knowledgeBaseId);

        // Add to current documents if they're loaded
        if (state.documents) {
          setState(prev => ({
            ...prev,
            documents: prev.documents ? {
              ...prev.documents,
              items: [uploaded, ...prev.documents.items],
              total: prev.documents.total + 1
            } : null
          }));
        }

        return uploaded;
      } catch (error) {
        const ragError = handleRAGError(error as Error, { operation: 'uploadDocument', fileName: file.name });
        setError('documents', ragError);
        throw ragError;
      } finally {
        setLoading('documents', false);
      }
    },

    update: async (id: string, updates: Partial<Document>) => {
      try {
        const updated = await ragServices.document.updateDocument(id, updates);

        if (state.documents) {
          setState(prev => ({
            ...prev,
            documents: prev.documents ? {
              ...prev.documents,
              items: prev.documents.items.map(doc => doc.id === id ? updated : doc)
            } : null
          }));
        }

        return updated;
      } catch (error) {
        const ragError = handleRAGError(error as Error, { operation: 'updateDocument', id });
        throw ragError;
      }
    },

    delete: async (id: string) => {
      try {
        await ragServices.document.deleteDocument(id);

        if (state.documents) {
          setState(prev => ({
            ...prev,
            documents: prev.documents ? {
              ...prev.documents,
              items: prev.documents.items.filter(doc => doc.id !== id),
              total: prev.documents.total - 1
            } : null
          }));
        }
      } catch (error) {
        const ragError = handleRAGError(error as Error, { operation: 'deleteDocument', id });
        throw ragError;
      }
    },

    reprocess: async (id: string) => {
      try {
        const reprocessed = await ragServices.document.reprocessDocument(id);

        if (state.documents) {
          setState(prev => ({
            ...prev,
            documents: prev.documents ? {
              ...prev.documents,
              items: prev.documents.items.map(doc => doc.id === id ? reprocessed : doc)
            } : null
          }));
        }

        return reprocessed;
      } catch (error) {
        const ragError = handleRAGError(error as Error, { operation: 'reprocessDocument', id });
        throw ragError;
      }
    }
  }), [setLoading, setError, state.documents]);

  // Search operations
  const searchOperations = useMemo(() => ({
    search: async (query: SearchQuery) => {
      setLoading('search', true);
      setError('search', null);

      try {
        const results = await ragServices.search.search(query);
        setState(prev => ({ ...prev, searchResults: results }));
        return results;
      } catch (error) {
        const ragError = handleRAGError(error as Error, { operation: 'search', query: query.query });
        setError('search', ragError);
        throw ragError;
      } finally {
        setLoading('search', false);
      }
    },

    semanticSearch: async (query: string, knowledgeBaseIds: string[], options?: any) => {
      setLoading('search', true);
      setError('search', null);

      try {
        const results = await ragServices.search.semanticSearch(query, knowledgeBaseIds, options);
        setState(prev => ({ ...prev, searchResults: results }));
        return results;
      } catch (error) {
        const ragError = handleRAGError(error as Error, { operation: 'semanticSearch', query });
        setError('search', ragError);
        throw ragError;
      } finally {
        setLoading('search', false);
      }
    },

    keywordSearch: async (query: string, knowledgeBaseIds: string[], options?: any) => {
      setLoading('search', true);
      setError('search', null);

      try {
        const results = await ragServices.search.keywordSearch(query, knowledgeBaseIds, options);
        setState(prev => ({ ...prev, searchResults: results }));
        return results;
      } catch (error) {
        const ragError = handleRAGError(error as Error, { operation: 'keywordSearch', query });
        setError('search', ragError);
        throw ragError;
      } finally {
        setLoading('search', false);
      }
    },

    hybridSearch: async (query: string, knowledgeBaseIds: string[], options?: any) => {
      setLoading('search', true);
      setError('search', null);

      try {
        const results = await ragServices.search.hybridSearch(query, knowledgeBaseIds, options);
        setState(prev => ({ ...prev, searchResults: results }));
        return results;
      } catch (error) {
        const ragError = handleRAGError(error as Error, { operation: 'hybridSearch', query });
        setError('search', ragError);
        throw ragError;
      } finally {
        setLoading('search', false);
      }
    },

    clearResults: () => {
      setState(prev => ({ ...prev, searchResults: null }));
      setError('search', null);
    }
  }), [setLoading, setError]);

  // RAG generation operations
  const generationOperations = useMemo(() => ({
    generate: async (query: RAGQuery) => {
      setLoading('generation', true);
      setError('generation', null);

      try {
        const response = await ragServices.generation.generateResponse(query);
        setState(prev => ({
          ...prev,
          ragResponses: [response, ...prev.ragResponses]
        }));
        return response;
      } catch (error) {
        const ragError = handleRAGError(error as Error, { operation: 'generateRAGResponse', question: query.question });
        setError('generation', ragError);
        throw ragError;
      } finally {
        setLoading('generation', false);
      }
    },

    streamGenerate: async (
      query: RAGQuery,
      onChunk: (chunk: string) => void,
      onComplete: (response: RAGResponse) => void
    ) => {
      setLoading('generation', true);
      setError('generation', null);

      try {
        await ragServices.generation.streamResponse(
          query,
          onChunk,
          (response) => {
            setState(prev => ({
              ...prev,
              ragResponses: [response, ...prev.ragResponses]
            }));
            onComplete(response);
          }
        );
      } catch (error) {
        const ragError = handleRAGError(error as Error, { operation: 'streamRAGResponse', question: query.question });
        setError('generation', ragError);
        throw ragError;
      } finally {
        setLoading('generation', false);
      }
    },

    loadHistory: async (userId?: string, sessionId?: string, limit?: number) => {
      setLoading('generation', true);
      setError('generation', null);

      try {
        const responses = await ragServices.generation.getHistory(userId, sessionId, limit);
        setState(prev => ({ ...prev, ragResponses: responses }));
        return responses;
      } catch (error) {
        const ragError = handleRAGError(error as Error, { operation: 'loadRAGHistory' });
        setError('generation', ragError);
        throw ragError;
      } finally {
        setLoading('generation', false);
      }
    },

    provideFeedback: async (responseId: string, feedback: any) => {
      try {
        await ragServices.generation.provideFeedback(responseId, feedback);

        // Update the response in state with feedback
        setState(prev => ({
          ...prev,
          ragResponses: prev.ragResponses.map(response =>
            response.id === responseId
              ? { ...response, feedback }
              : response
          )
        }));
      } catch (error) {
        const ragError = handleRAGError(error as Error, { operation: 'provideFeedback', responseId });
        throw ragError;
      }
    },

    regenerate: async (responseId: string, newQuery?: Partial<RAGQuery>) => {
      setLoading('generation', true);
      setError('generation', null);

      try {
        const response = await ragServices.generation.regenerateResponse(responseId, newQuery);
        setState(prev => ({
          ...prev,
          ragResponses: [response, ...prev.ragResponses]
        }));
        return response;
      } catch (error) {
        const ragError = handleRAGError(error as Error, { operation: 'regenerateResponse', responseId });
        setError('generation', ragError);
        throw ragError;
      } finally {
        setLoading('generation', false);
      }
    }
  }), [setLoading, setError]);

  // Analytics operations
  const analyticsOperations = useMemo(() => ({
    load: async (filter?: any) => {
      setLoading('analytics', true);
      setError('analytics', null);

      try {
        const analytics = await ragServices.analytics.getAnalytics(filter);
        setState(prev => ({ ...prev, analytics }));
        return analytics;
      } catch (error) {
        const ragError = handleRAGError(error as Error, { operation: 'loadAnalytics' });
        setError('analytics', ragError);
        throw ragError;
      } finally {
        setLoading('analytics', false);
      }
    }
  }), [setLoading, setError]);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setState(prev => ({
      ...prev,
      errors: {
        knowledgeBases: null,
        documents: null,
        search: null,
        generation: null,
        analytics: null
      }
    }));
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    // State
    ...state,

    // Operations
    knowledgeBase: knowledgeBaseOperations,
    document: documentOperations,
    search: searchOperations,
    generation: generationOperations,
    analytics: analyticsOperations,

    // Utilities
    clearErrors,
    reset,

    // Computed values
    hasErrors: Object.values(state.errors).some(error => error !== null),
    isLoading: Object.values(state.loading).some(loading => loading),
    selectedKnowledgeBase: (id: string) => state.knowledgeBases.find(kb => kb.id === id),
    getDocument: (id: string) => state.documents?.items.find(doc => doc.id === id),
    getRagResponse: (id: string) => state.ragResponses.find(response => response.id === id)
  };
};

export default useRAGIntelligence;