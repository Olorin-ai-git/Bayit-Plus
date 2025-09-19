import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  SearchQuery,
  SearchResult,
  SearchFilter,
  SearchOptions,
  SearchResultDocument,
  SearchResultChunk
} from '../types/ragIntelligence';
import { ragServices } from '../services';
import { handleRAGError, RAGError } from '../services/errorService';

// Search history item
export interface SearchHistoryItem {
  query: SearchQuery;
  result: SearchResult;
  timestamp: string;
}

// Search suggestions
export interface SearchSuggestions {
  queries: string[];
  filters: SearchFilter[];
  knowledgeBases: string[];
}

// Hook options
export interface UseSearchOptions {
  knowledgeBaseIds?: string[];
  defaultSearchMode?: 'semantic' | 'keyword' | 'hybrid';
  defaultOptions?: Partial<SearchOptions>;
  maxHistoryItems?: number;
  enableSuggestions?: boolean;
}

// Hook state
export interface SearchState {
  currentQuery: string;
  currentResult: SearchResult | null;
  searchHistory: SearchHistoryItem[];
  suggestions: SearchSuggestions;
  filters: SearchFilter[];
  searchOptions: SearchOptions;
  searchMode: 'semantic' | 'keyword' | 'hybrid';
  loading: {
    search: boolean;
    suggestions: boolean;
    history: boolean;
  };
  errors: {
    search: RAGError | null;
    suggestions: RAGError | null;
    history: RAGError | null;
  };
}

// Default search options
const defaultOptions: SearchOptions = {
  limit: 10,
  offset: 0,
  includeMetadata: true,
  includeChunks: true,
  includeEmbeddings: false,
  similarityThreshold: 0.7,
  hybridSearch: false,
  rerank: true,
  rerankModel: 'rerank-english-v2.0',
  highlightTerms: true,
  expandQuery: false,
  useSemanticSearch: true,
  useBM25: false,
  weights: {
    semantic: 0.7,
    bm25: 0.3,
    boost: 0.1
  }
};

// Initial state
const initialState: SearchState = {
  currentQuery: '',
  currentResult: null,
  searchHistory: [],
  suggestions: {
    queries: [],
    filters: [],
    knowledgeBases: []
  },
  filters: [],
  searchOptions: defaultOptions,
  searchMode: 'hybrid',
  loading: {
    search: false,
    suggestions: false,
    history: false
  },
  errors: {
    search: null,
    suggestions: null,
    history: null
  }
};

export const useSearch = (options: UseSearchOptions = {}) => {
  const {
    knowledgeBaseIds = [],
    defaultSearchMode = 'hybrid',
    defaultOptions: customDefaultOptions = {},
    maxHistoryItems = 50,
    enableSuggestions = true
  } = options;

  const [state, setState] = useState<SearchState>({
    ...initialState,
    searchOptions: { ...defaultOptions, ...customDefaultOptions },
    searchMode: defaultSearchMode
  });

  // Update loading state
  const setLoading = useCallback((key: keyof SearchState['loading'], loading: boolean) => {
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, [key]: loading }
    }));
  }, []);

  // Update error state
  const setError = useCallback((key: keyof SearchState['errors'], error: RAGError | null) => {
    setState(prev => ({
      ...prev,
      errors: { ...prev.errors, [key]: error }
    }));
  }, []);

  // Update current query
  const setQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, currentQuery: query }));
  }, []);

  // Update search mode
  const setSearchMode = useCallback((mode: 'semantic' | 'keyword' | 'hybrid') => {
    setState(prev => {
      const newOptions = { ...prev.searchOptions };

      // Update search options based on mode
      switch (mode) {
        case 'semantic':
          newOptions.useSemanticSearch = true;
          newOptions.useBM25 = false;
          newOptions.hybridSearch = false;
          newOptions.weights = { semantic: 1.0, bm25: 0.0, boost: 0.1 };
          break;
        case 'keyword':
          newOptions.useSemanticSearch = false;
          newOptions.useBM25 = true;
          newOptions.hybridSearch = false;
          newOptions.weights = { semantic: 0.0, bm25: 1.0, boost: 0.1 };
          break;
        case 'hybrid':
          newOptions.useSemanticSearch = true;
          newOptions.useBM25 = true;
          newOptions.hybridSearch = true;
          newOptions.weights = { semantic: 0.7, bm25: 0.3, boost: 0.1 };
          break;
      }

      return {
        ...prev,
        searchMode: mode,
        searchOptions: newOptions
      };
    });
  }, []);

  // Update search options
  const updateSearchOptions = useCallback((updates: Partial<SearchOptions>) => {
    setState(prev => ({
      ...prev,
      searchOptions: { ...prev.searchOptions, ...updates }
    }));
  }, []);

  // Add filter
  const addFilter = useCallback((filter: SearchFilter) => {
    setState(prev => ({
      ...prev,
      filters: [...prev.filters.filter(f => f.field !== filter.field), filter]
    }));
  }, []);

  // Remove filter
  const removeFilter = useCallback((field: string) => {
    setState(prev => ({
      ...prev,
      filters: prev.filters.filter(f => f.field !== field)
    }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setState(prev => ({ ...prev, filters: [] }));
  }, []);

  // Add knowledge base filter
  const addKnowledgeBaseFilter = useCallback((knowledgeBaseIds: string[]) => {
    const filter: SearchFilter = {
      field: 'knowledgeBaseId',
      operator: 'in',
      value: knowledgeBaseIds
    };
    addFilter(filter);
  }, [addFilter]);

  // Perform search
  const search = useCallback(async (
    query?: string,
    customFilters?: SearchFilter[],
    customOptions?: Partial<SearchOptions>
  ) => {
    const searchQuery = query || state.currentQuery;
    if (!searchQuery.trim()) {
      throw new Error('Search query cannot be empty');
    }

    setLoading('search', true);
    setError('search', null);

    try {
      const filters = [
        ...(customFilters || state.filters),
        // Add knowledge base filter if provided
        ...(knowledgeBaseIds.length > 0 ? [{
          field: 'knowledgeBaseId',
          operator: 'in' as const,
          value: knowledgeBaseIds
        }] : [])
      ];

      const searchQueryObject: SearchQuery = {
        id: `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        query: searchQuery,
        filters,
        options: { ...state.searchOptions, ...customOptions },
        userId: 'current-user', // This should come from auth context
        timestamp: new Date().toISOString()
      };

      let result: SearchResult;

      // Use appropriate search method based on mode
      switch (state.searchMode) {
        case 'semantic':
          result = await ragServices.search.semanticSearch(
            searchQuery,
            knowledgeBaseIds,
            searchQueryObject.options
          );
          break;
        case 'keyword':
          result = await ragServices.search.keywordSearch(
            searchQuery,
            knowledgeBaseIds,
            searchQueryObject.options
          );
          break;
        case 'hybrid':
        default:
          result = await ragServices.search.hybridSearch(
            searchQuery,
            knowledgeBaseIds,
            searchQueryObject.options
          );
          break;
      }

      // Update state with result
      setState(prev => {
        const historyItem: SearchHistoryItem = {
          query: searchQueryObject,
          result,
          timestamp: new Date().toISOString()
        };

        const newHistory = [historyItem, ...prev.searchHistory]
          .slice(0, maxHistoryItems);

        return {
          ...prev,
          currentQuery: searchQuery,
          currentResult: result,
          searchHistory: newHistory
        };
      });

      return result;
    } catch (error) {
      const ragError = handleRAGError(error as Error, {
        operation: 'search',
        query: searchQuery,
        searchMode: state.searchMode,
        knowledgeBaseIds
      });
      setError('search', ragError);
      throw ragError;
    } finally {
      setLoading('search', false);
    }
  }, [state.currentQuery, state.filters, state.searchOptions, state.searchMode, knowledgeBaseIds, maxHistoryItems, setLoading, setError]);

  // Load search history
  const loadSearchHistory = useCallback(async (userId?: string, limit?: number) => {
    setLoading('history', true);
    setError('history', null);

    try {
      const history = await ragServices.search.getHistory(userId, limit || maxHistoryItems);

      const historyItems: SearchHistoryItem[] = history.map(query => ({
        query,
        result: {
          documents: [],
          chunks: [],
          totalResults: 0,
          executionTime: 0,
          query: query.query,
          filters: query.filters
        }, // Placeholder result
        timestamp: query.timestamp
      }));

      setState(prev => ({ ...prev, searchHistory: historyItems }));
      return historyItems;
    } catch (error) {
      const ragError = handleRAGError(error as Error, { operation: 'loadSearchHistory' });
      setError('history', ragError);
      throw ragError;
    } finally {
      setLoading('history', false);
    }
  }, [maxHistoryItems, setLoading, setError]);

  // Load suggestions
  const loadSuggestions = useCallback(async () => {
    if (!enableSuggestions) return;

    setLoading('suggestions', true);
    setError('suggestions', null);

    try {
      const popularQueries = await ragServices.search.getPopularQueries(20);

      setState(prev => ({
        ...prev,
        suggestions: {
          ...prev.suggestions,
          queries: popularQueries
        }
      }));

      return popularQueries;
    } catch (error) {
      const ragError = handleRAGError(error as Error, { operation: 'loadSuggestions' });
      setError('suggestions', ragError);
      throw ragError;
    } finally {
      setLoading('suggestions', false);
    }
  }, [enableSuggestions, setLoading, setError]);

  // Clear search results
  const clearResults = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentResult: null,
      currentQuery: ''
    }));
    setError('search', null);
  }, [setError]);

  // Clear search history
  const clearHistory = useCallback(() => {
    setState(prev => ({ ...prev, searchHistory: [] }));
  }, []);

  // Re-run search from history
  const searchFromHistory = useCallback(async (historyItem: SearchHistoryItem) => {
    const { query } = historyItem.query;
    return search(query, historyItem.query.filters, historyItem.query.options);
  }, [search]);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setState(prev => ({
      ...prev,
      errors: {
        search: null,
        suggestions: null,
        history: null
      }
    }));
  }, []);

  // Reset hook state
  const reset = useCallback(() => {
    setState({
      ...initialState,
      searchOptions: { ...defaultOptions, ...customDefaultOptions },
      searchMode: defaultSearchMode
    });
  }, [customDefaultOptions, defaultSearchMode]);

  // Auto-load suggestions on mount
  useEffect(() => {
    if (enableSuggestions) {
      loadSuggestions();
    }
  }, [enableSuggestions, loadSuggestions]);

  // Computed values
  const computed = useMemo(() => ({
    hasResults: state.currentResult && state.currentResult.totalResults > 0,
    hasDocuments: state.currentResult && state.currentResult.documents.length > 0,
    hasChunks: state.currentResult && state.currentResult.chunks.length > 0,
    hasErrors: Object.values(state.errors).some(error => error !== null),
    isLoading: Object.values(state.loading).some(loading => loading),
    hasHistory: state.searchHistory.length > 0,
    hasSuggestions: state.suggestions.queries.length > 0,
    hasFilters: state.filters.length > 0,

    // Search result utilities
    totalDocuments: state.currentResult?.documents.length || 0,
    totalChunks: state.currentResult?.chunks.length || 0,
    totalResults: state.currentResult?.totalResults || 0,
    executionTime: state.currentResult?.executionTime || 0,

    // Document utilities
    documentsWithHighlights: state.currentResult?.documents.filter(doc => doc.highlights.length > 0) || [],
    chunksWithHighlights: state.currentResult?.chunks.filter(chunk => chunk.highlights.length > 0) || [],

    // Score statistics
    maxDocumentScore: state.currentResult?.documents.length
      ? Math.max(...state.currentResult.documents.map(doc => doc.score))
      : 0,
    avgDocumentScore: state.currentResult?.documents.length
      ? state.currentResult.documents.reduce((sum, doc) => sum + doc.score, 0) / state.currentResult.documents.length
      : 0,

    // Filter utilities
    activeFilters: state.filters.filter(filter => filter.value !== undefined && filter.value !== null),
    knowledgeBaseFilter: state.filters.find(f => f.field === 'knowledgeBaseId'),
    categoryFilter: state.filters.find(f => f.field === 'category'),
    dateRangeFilter: state.filters.find(f => f.field === 'dateRange'),

    // Search mode info
    isSemanticSearch: state.searchMode === 'semantic',
    isKeywordSearch: state.searchMode === 'keyword',
    isHybridSearch: state.searchMode === 'hybrid',

    // Recent searches
    recentQueries: state.searchHistory.slice(0, 10).map(item => item.query.query),
    recentSuccessfulSearches: state.searchHistory.filter(item => item.result.totalResults > 0),

    // Search performance
    averageExecutionTime: state.searchHistory.length
      ? state.searchHistory.reduce((sum, item) => sum + item.result.executionTime, 0) / state.searchHistory.length
      : 0,

    // Get specific result
    getDocument: (id: string): SearchResultDocument | undefined =>
      state.currentResult?.documents.find(doc => doc.document.id === id),
    getChunk: (id: string): SearchResultChunk | undefined =>
      state.currentResult?.chunks.find(chunk => chunk.chunk.id === id)
  }), [state]);

  return {
    // State
    ...state,

    // Operations
    search,
    setQuery,
    setSearchMode,
    updateSearchOptions,
    addFilter,
    removeFilter,
    clearFilters,
    addKnowledgeBaseFilter,
    loadSearchHistory,
    loadSuggestions,
    clearResults,
    clearHistory,
    searchFromHistory,

    // Utilities
    clearErrors,
    reset,

    // Computed values
    ...computed
  };
};

export default useSearch;