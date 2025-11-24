// Main service classes
<<<<<<< HEAD
=======
// Import services for factory usage
import {
  KnowledgeBaseService,
  DocumentService,
  SearchService,
  VectorDatabaseService,
  RAGGenerationService,
  RAGAnalyticsService
} from './ragIntelligenceService';

import { withErrorHandling } from './errorService';

>>>>>>> 001-modify-analyzer-method
export {
  KnowledgeBaseService,
  DocumentService,
  SearchService,
  VectorDatabaseService,
  RAGGenerationService,
  RAGAnalyticsService,
  RAGConfigurationService,
  RAGImportExportService,
  RAGSessionService,
  RAGEventsService,
  RAGHealthService
} from './ragIntelligenceService';

// API utilities
export {
  api,
  ragApi,
  apiCache,
  ApiHelpers,
  createApiInstance,
  enhanceError,
  generateRequestId,
  withRetry,
  uploadFile,
  downloadFile,
  streamResponse,
  healthCheck
} from './apiService';

export type { ApiError } from './apiService';

<<<<<<< HEAD
// WebSocket services
export {
  RAGWebSocketService,
  RAGEventManager,
  ragEventManager,
  createRAGWebSocketService
} from './websocketService';

export type {
  WebSocketState,
  WebSocketEventHandlers,
  WebSocketConfig
} from './websocketService';

=======
>>>>>>> 001-modify-analyzer-method
// Error handling
export {
  RAGErrorService,
  handleRAGError,
  withErrorHandling
} from './errorService';

export type {
  RAGError,
  RAGErrorType
} from './errorService';

// Service factory for creating configured service instances
export class RAGServiceFactory {
  // Create knowledge base service with error handling
  static createKnowledgeBaseService() {
    return {
      async getKnowledgeBases(filter?: any) {
        return withErrorHandling(
          () => KnowledgeBaseService.getKnowledgeBases(filter),
          { operation: 'getKnowledgeBases', filter }
        );
      },

      async getKnowledgeBase(id: string) {
        return withErrorHandling(
          () => KnowledgeBaseService.getKnowledgeBase(id),
          { operation: 'getKnowledgeBase', id }
        );
      },

      async createKnowledgeBase(knowledgeBase: any) {
        return withErrorHandling(
          () => KnowledgeBaseService.createKnowledgeBase(knowledgeBase),
          { operation: 'createKnowledgeBase', knowledgeBase: knowledgeBase.name }
        );
      },

      async updateKnowledgeBase(id: string, updates: any) {
        return withErrorHandling(
          () => KnowledgeBaseService.updateKnowledgeBase(id, updates),
          { operation: 'updateKnowledgeBase', id }
        );
      },

      async deleteKnowledgeBase(id: string) {
        return withErrorHandling(
          () => KnowledgeBaseService.deleteKnowledgeBase(id),
          { operation: 'deleteKnowledgeBase', id }
        );
      },

      async addDocument(knowledgeBaseId: string, documentId: string) {
        return withErrorHandling(
          () => KnowledgeBaseService.addDocumentToKnowledgeBase(knowledgeBaseId, documentId),
          { operation: 'addDocument', knowledgeBaseId, documentId }
        );
      },

      async removeDocument(knowledgeBaseId: string, documentId: string) {
        return withErrorHandling(
          () => KnowledgeBaseService.removeDocumentFromKnowledgeBase(knowledgeBaseId, documentId),
          { operation: 'removeDocument', knowledgeBaseId, documentId }
        );
      },

      async updateSettings(id: string, settings: any) {
        return withErrorHandling(
          () => KnowledgeBaseService.updateKnowledgeBaseSettings(id, settings),
          { operation: 'updateSettings', id }
        );
      },

      async getStatistics(id: string) {
        return withErrorHandling(
          () => KnowledgeBaseService.getKnowledgeBaseStatistics(id),
          { operation: 'getStatistics', id }
        );
      }
    };
  }

  // Create document service with error handling
  static createDocumentService() {
    return {
      async getDocuments(knowledgeBaseId?: string, filter?: any) {
        return withErrorHandling(
          () => DocumentService.getDocuments(knowledgeBaseId, filter),
          { operation: 'getDocuments', knowledgeBaseId, filter }
        );
      },

      async getDocument(id: string) {
        return withErrorHandling(
          () => DocumentService.getDocument(id),
          { operation: 'getDocument', id }
        );
      },

      async uploadDocument(file: File, metadata: any, knowledgeBaseId?: string) {
        return withErrorHandling(
          () => DocumentService.uploadDocument(file, metadata, knowledgeBaseId),
          { operation: 'uploadDocument', fileName: file.name, fileSize: file.size, knowledgeBaseId }
        );
      },

      async updateDocument(id: string, updates: any) {
        return withErrorHandling(
          () => DocumentService.updateDocument(id, updates),
          { operation: 'updateDocument', id }
        );
      },

      async deleteDocument(id: string) {
        return withErrorHandling(
          () => DocumentService.deleteDocument(id),
          { operation: 'deleteDocument', id }
        );
      },

      async reprocessDocument(id: string) {
        return withErrorHandling(
          () => DocumentService.reprocessDocument(id),
          { operation: 'reprocessDocument', id }
        );
      },

      async getChunks(documentId: string) {
        return withErrorHandling(
          () => DocumentService.getDocumentChunks(documentId),
          { operation: 'getChunks', documentId }
        );
      },

      async updateChunkMetadata(chunkId: string, metadata: any) {
        return withErrorHandling(
          () => DocumentService.updateChunkMetadata(chunkId, metadata),
          { operation: 'updateChunkMetadata', chunkId }
        );
      }
    };
  }

  // Create search service with error handling
  static createSearchService() {
    return {
      async search(query: any) {
        return withErrorHandling(
          () => SearchService.search(query),
          { operation: 'search', query: query.query }
        );
      },

      async semanticSearch(query: string, knowledgeBaseIds: string[], options?: any) {
        return withErrorHandling(
          () => SearchService.semanticSearch(query, knowledgeBaseIds, options),
          { operation: 'semanticSearch', query, knowledgeBaseIds }
        );
      },

      async keywordSearch(query: string, knowledgeBaseIds: string[], options?: any) {
        return withErrorHandling(
          () => SearchService.keywordSearch(query, knowledgeBaseIds, options),
          { operation: 'keywordSearch', query, knowledgeBaseIds }
        );
      },

      async hybridSearch(query: string, knowledgeBaseIds: string[], options?: any) {
        return withErrorHandling(
          () => SearchService.hybridSearch(query, knowledgeBaseIds, options),
          { operation: 'hybridSearch', query, knowledgeBaseIds }
        );
      },

      async getHistory(userId?: string, limit?: number) {
        return withErrorHandling(
          () => SearchService.getSearchHistory(userId, limit),
          { operation: 'getSearchHistory', userId, limit }
        );
      },

      async getPopularQueries(limit?: number) {
        return withErrorHandling(
          () => SearchService.getPopularQueries(limit),
          { operation: 'getPopularQueries', limit }
        );
      }
    };
  }

  // Create RAG generation service with error handling
  static createRAGGenerationService() {
    return {
      async generateResponse(query: any) {
        return withErrorHandling(
          () => RAGGenerationService.generateResponse(query),
          { operation: 'generateResponse', question: query.question }
        );
      },

      async streamResponse(query: any, onChunk: (chunk: string) => void, onComplete: (response: any) => void) {
        return withErrorHandling(
          () => RAGGenerationService.streamResponse(query, onChunk, onComplete),
          { operation: 'streamResponse', question: query.question }
        );
      },

      async getHistory(userId?: string, sessionId?: string, limit?: number) {
        return withErrorHandling(
          () => RAGGenerationService.getRAGHistory(userId, sessionId, limit),
          { operation: 'getRAGHistory', userId, sessionId, limit }
        );
      },

      async provideFeedback(responseId: string, feedback: any) {
        return withErrorHandling(
          () => RAGGenerationService.provideFeedback(responseId, feedback),
          { operation: 'provideFeedback', responseId }
        );
      },

      async regenerateResponse(responseId: string, newQuery?: any) {
        return withErrorHandling(
          () => RAGGenerationService.regenerateResponse(responseId, newQuery),
          { operation: 'regenerateResponse', responseId }
        );
      }
    };
  }

  // Create vector database service with error handling
  static createVectorDatabaseService() {
    return {
      async getIndexes() {
        return withErrorHandling(
          () => VectorDatabaseService.getVectorIndexes(),
          { operation: 'getVectorIndexes' }
        );
      },

      async getIndex(id: string) {
        return withErrorHandling(
          () => VectorDatabaseService.getVectorIndex(id),
          { operation: 'getVectorIndex', id }
        );
      },

      async createIndex(index: any) {
        return withErrorHandling(
          () => VectorDatabaseService.createVectorIndex(index),
          { operation: 'createVectorIndex', name: index.name }
        );
      },

      async updateIndex(id: string, updates: any) {
        return withErrorHandling(
          () => VectorDatabaseService.updateVectorIndex(id, updates),
          { operation: 'updateVectorIndex', id }
        );
      },

      async deleteIndex(id: string) {
        return withErrorHandling(
          () => VectorDatabaseService.deleteVectorIndex(id),
          { operation: 'deleteVectorIndex', id }
        );
      },

      async rebuildIndex(id: string) {
        return withErrorHandling(
          () => VectorDatabaseService.rebuildVectorIndex(id),
          { operation: 'rebuildVectorIndex', id }
        );
      },

      async vectorSearch(indexId: string, query: any) {
        return withErrorHandling(
          () => VectorDatabaseService.vectorSearch(indexId, query),
          { operation: 'vectorSearch', indexId, k: query.k }
        );
      },

      async textToVector(text: string, model?: string) {
        return withErrorHandling(
          () => VectorDatabaseService.textToVector(text, model),
          { operation: 'textToVector', textLength: text.length, model }
        );
      },

      async addVectors(indexId: string, vectors: any[]) {
        return withErrorHandling(
          () => VectorDatabaseService.addVectors(indexId, vectors),
          { operation: 'addVectors', indexId, count: vectors.length }
        );
      },

      async removeVectors(indexId: string, vectorIds: string[]) {
        return withErrorHandling(
          () => VectorDatabaseService.removeVectors(indexId, vectorIds),
          { operation: 'removeVectors', indexId, count: vectorIds.length }
        );
      }
    };
  }

  // Create analytics service with error handling
  static createAnalyticsService() {
    return {
      async getAnalytics(filter?: any) {
        return withErrorHandling(
          () => RAGAnalyticsService.getAnalytics(filter),
          { operation: 'getAnalytics', filter }
        );
      },

      async getQueryAnalytics(limit?: number) {
        return withErrorHandling(
          () => RAGAnalyticsService.getQueryAnalytics(limit),
          { operation: 'getQueryAnalytics', limit }
        );
      },

      async getKnowledgeBaseUsage(knowledgeBaseId?: string) {
        return withErrorHandling(
          () => RAGAnalyticsService.getKnowledgeBaseUsage(knowledgeBaseId),
          { operation: 'getKnowledgeBaseUsage', knowledgeBaseId }
        );
      },

      async getUserActivity(userId?: string) {
        return withErrorHandling(
          () => RAGAnalyticsService.getUserActivity(userId),
          { operation: 'getUserActivity', userId }
        );
      },

      async getPerformanceMetrics(timeRange?: any) {
        return withErrorHandling(
          () => RAGAnalyticsService.getPerformanceMetrics(timeRange),
          { operation: 'getPerformanceMetrics', timeRange }
        );
      },

      async getErrorAnalysis(timeRange?: any) {
        return withErrorHandling(
          () => RAGAnalyticsService.getErrorAnalysis(timeRange),
          { operation: 'getErrorAnalysis', timeRange }
        );
      },

      async exportAnalytics(format: any, filter?: any) {
        return withErrorHandling(
          () => RAGAnalyticsService.exportAnalytics(format, filter),
          { operation: 'exportAnalytics', format, filter }
        );
      }
    };
  }
}

// Export convenience functions
export const ragServices = {
  knowledgeBase: RAGServiceFactory.createKnowledgeBaseService(),
  document: RAGServiceFactory.createDocumentService(),
  search: RAGServiceFactory.createSearchService(),
  generation: RAGServiceFactory.createRAGGenerationService(),
  vectorDatabase: RAGServiceFactory.createVectorDatabaseService(),
  analytics: RAGServiceFactory.createAnalyticsService()
<<<<<<< HEAD
};
=======
};
>>>>>>> 001-modify-analyzer-method
