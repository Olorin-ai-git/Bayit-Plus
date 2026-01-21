// Main RAG Intelligence hook
// Composite hooks for common use cases
import { useKnowledgeBase } from './useKnowledgeBase';
import { useDocuments } from './useDocuments';
import { useSearch } from './useSearch';
import { useRAGGeneration } from './useRAGGeneration';

export {
  useRAGIntelligence,
  default as useRAGIntelligenceDefault
} from './useRAGIntelligence';

export type {
  RAGIntelligenceState
} from './useRAGIntelligence';

// Knowledge Base management hook
export {
  useKnowledgeBase,
  default as useKnowledgeBaseDefault
} from './useKnowledgeBase';

export type {
  UseKnowledgeBaseOptions,
  KnowledgeBaseState
} from './useKnowledgeBase';

// Document management hook
export {
  useDocuments,
  default as useDocumentsDefault
} from './useDocuments';

export type {
  UseDocumentsOptions,
  DocumentsState,
  UploadProgress
} from './useDocuments';

// Search functionality hook
export {
  useSearch,
  default as useSearchDefault
} from './useSearch';

export type {
  UseSearchOptions,
  SearchState,
  SearchHistoryItem,
  SearchSuggestions
} from './useSearch';

// RAG Generation hook
export {
  useRAGGeneration,
  default as useRAGGenerationDefault
} from './useRAGGeneration';

export type {
  UseRAGGenerationOptions,
  RAGGenerationState,
  ConversationTurn,
  StreamingState
} from './useRAGGeneration';

// Combined hook for complete RAG workflow
export const useRAGWorkflow = (knowledgeBaseIds: string[]) => {
  const knowledgeBase = useKnowledgeBase({
    autoLoad: true,
    filter: { knowledgeBaseIds }
  });

  const documents = useDocuments({
    knowledgeBaseId: knowledgeBaseIds[0], // Primary knowledge base
    autoLoad: true
  });

  const search = useSearch({
    knowledgeBaseIds,
    defaultSearchMode: 'hybrid',
    enableSuggestions: true
  });

  const generation = useRAGGeneration({
    knowledgeBaseIds,
    enableStreaming: true
  });

  return {
    knowledgeBase,
    documents,
    search,
    generation,

    // Convenience methods
    async performRAGQuery(question: string) {
      // First search for relevant documents
      const searchResults = await search.hybridSearch(question, knowledgeBaseIds);

      // Then generate response using found context
      return generation.generate(question);
    },

    async uploadAndIndex(file: File, metadata: any) {
      // Upload document
      const document = await documents.uploadDocument(file, metadata);

      // Refresh knowledge base to include new document
      if (knowledgeBaseIds[0]) {
        await knowledgeBase.selectKnowledgeBase(knowledgeBaseIds[0]);
      }

      return document;
    },

    // Combined state
    isLoading: knowledgeBase.isLoading || documents.isLoading || search.isLoading || generation.isLoading,
    hasErrors: knowledgeBase.hasErrors || documents.hasErrors || search.hasErrors || generation.hasErrors,

    allErrors: [
      ...Object.values(knowledgeBase.errors),
      ...Object.values(documents.errors),
      ...Object.values(search.errors),
      ...Object.values(generation.errors)
    ].filter(Boolean)
  };
};

// Hook for managing vector search workflow
export const useVectorSearch = (knowledgeBaseIds: string[]) => {
  const search = useSearch({
    knowledgeBaseIds,
    defaultSearchMode: 'semantic',
    defaultOptions: {
      useSemanticSearch: true,
      useBM25: false,
      includeEmbeddings: true,
      rerank: true
    }
  });

  const enhancedSearch = {
    ...search,

    // Vector-specific search methods
    async findSimilarDocuments(query: string, threshold = 0.8) {
      const results = await search.semanticSearch(query, knowledgeBaseIds, {
        similarityThreshold: threshold,
        limit: 20
      });

      return results.documents.filter(doc => doc.score >= threshold);
    },

    async clusterDocuments(queries: string[]) {
      const clusters = await Promise.all(
        queries.map(async query => ({
          query,
          documents: await search.semanticSearch(query, knowledgeBaseIds, { limit: 10 })
        }))
      );

      return clusters;
    }
  };

  return enhancedSearch;
};

// Hook for analytics and monitoring
export const useRAGAnalytics = () => {
  const knowledgeBase = useKnowledgeBase({ autoLoad: false });
  const documents = useDocuments({ autoLoad: false });
  const search = useSearch({});
  const generation = useRAGGeneration({});

  return {
    // Combined analytics
    async getOverallStatistics() {
      const [kbStats, searchHistory, generationHistory] = await Promise.all([
        knowledgeBase.loadKnowledgeBases(),
        search.loadSearchHistory(),
        generation.loadHistory()
      ]);

      return {
        totalKnowledgeBases: kbStats.length,
        activeKnowledgeBases: kbStats.filter(kb => kb.status === 'active').length,
        totalDocuments: kbStats.reduce((sum, kb) => sum + kb.totalDocuments, 0),
        totalSearches: searchHistory.length,
        totalGenerations: generationHistory.length,
        averageSearchTime: searchHistory.reduce((sum, item) => sum + item.result.executionTime, 0) / searchHistory.length,
        averageGenerationTime: generationHistory.reduce((sum, turn) => sum + turn.response.processingTime, 0) / generationHistory.length
      };
    },

    // Performance monitoring
    getPerformanceMetrics() {
      return {
        searchPerformance: {
          totalQueries: search.searchHistory.length,
          averageTime: search.averageExecutionTime,
          successRate: search.recentSuccessfulSearches.length / Math.max(1, search.searchHistory.length)
        },
        generationPerformance: {
          totalResponses: generation.conversationLength,
          averageTime: generation.averageResponseTime,
          averageConfidence: generation.averageConfidence,
          totalCost: generation.totalCost
        }
      };
    },

    // Error analysis
    getErrorAnalysis() {
      const allErrors = [
        ...Object.values(knowledgeBase.errors),
        ...Object.values(documents.errors),
        ...Object.values(search.errors),
        ...Object.values(generation.errors)
      ].filter(Boolean);

      const errorTypes = allErrors.reduce((acc, error) => {
        if (error && 'type' in error) {
          acc[error.type] = (acc[error.type] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      return {
        totalErrors: allErrors.length,
        errorTypes,
        recentErrors: allErrors.slice(0, 10)
      };
    }
  };
};

// Hook for real-time updates
export const useRAGRealtime = (knowledgeBaseIds: string[]) => {
  // This would integrate with WebSocket service when implemented
  const knowledgeBase = useKnowledgeBase({ autoLoad: true });
  const documents = useDocuments({ knowledgeBaseId: knowledgeBaseIds[0] });

  return {
    // Real-time document processing updates
    processingDocuments: documents.processingDocuments,

    // Real-time knowledge base status updates
    updatingKnowledgeBases: knowledgeBase.knowledgeBases.filter(kb => kb.status === 'updating'),

    // Methods to subscribe to real-time events
    subscribeToDocumentUpdates: (callback: (document: any) => void) => {
      // Implementation would connect to WebSocket service
      console.log('Subscribing to document updates...');
    },

    subscribeToKnowledgeBaseUpdates: (callback: (kb: any) => void) => {
      // Implementation would connect to WebSocket service
      console.log('Subscribing to knowledge base updates...');
    }
  };
};

// Export all hooks and utilities
export * from './useRAGIntelligence';
export * from './useKnowledgeBase';
export * from './useDocuments';
export * from './useSearch';
export * from './useRAGGeneration';