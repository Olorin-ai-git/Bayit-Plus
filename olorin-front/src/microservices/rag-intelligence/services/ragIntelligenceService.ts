import axios, { AxiosResponse } from 'axios';
<<<<<<< HEAD
=======
import { getConfig } from '@shared/config/env.config';
import { createAxiosErrorInterceptor } from '@shared/utils/axiosErrorHandler';
>>>>>>> 001-modify-analyzer-method
import {
  KnowledgeBase,
  Document,
  DocumentChunk,
  SearchQuery,
  SearchResult,
  VectorIndex,
  VectorSearchQuery,
  VectorSearchResult,
  RAGQuery,
  RAGResponse,
  RAGAnalytics,
  RAGConfiguration,
  RAGImport,
  RAGExport,
  RAGEvent,
  RAGSession,
  RAGFilter,
  PaginatedRAGResponse,
  DocumentMetadata,
  ChunkMetadata
} from '../types/ragIntelligence';

<<<<<<< HEAD
// Base API configuration
const API_BASE_URL = process.env.REACT_APP_RAG_API_URL || 'http://localhost:8090/api/v1/rag';
=======
// Load validated configuration
const config = getConfig();
const API_BASE_URL = `${config.api.baseUrl}/api/v1/rag`;
>>>>>>> 001-modify-analyzer-method

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 seconds for complex RAG operations
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

<<<<<<< HEAD
=======
// Response interceptor for error handling and toast notifications
api.interceptors.response.use(
  (response) => response,
  createAxiosErrorInterceptor(true)
);

>>>>>>> 001-modify-analyzer-method
// Knowledge Base Service
export class KnowledgeBaseService {
  static async getKnowledgeBases(filter?: RAGFilter): Promise<KnowledgeBase[]> {
    const response: AxiosResponse<KnowledgeBase[]> = await api.get('/knowledge-bases', {
      params: filter
    });
    return response.data;
  }

  static async getKnowledgeBase(id: string): Promise<KnowledgeBase> {
    const response: AxiosResponse<KnowledgeBase> = await api.get(`/knowledge-bases/${id}`);
    return response.data;
  }

  static async createKnowledgeBase(knowledgeBase: Omit<KnowledgeBase, 'id' | 'createdAt' | 'updatedAt'>): Promise<KnowledgeBase> {
    const response: AxiosResponse<KnowledgeBase> = await api.post('/knowledge-bases', knowledgeBase);
    return response.data;
  }

  static async updateKnowledgeBase(id: string, updates: Partial<KnowledgeBase>): Promise<KnowledgeBase> {
    const response: AxiosResponse<KnowledgeBase> = await api.patch(`/knowledge-bases/${id}`, updates);
    return response.data;
  }

  static async deleteKnowledgeBase(id: string): Promise<void> {
    await api.delete(`/knowledge-bases/${id}`);
  }

  static async addDocumentToKnowledgeBase(knowledgeBaseId: string, documentId: string): Promise<void> {
    await api.post(`/knowledge-bases/${knowledgeBaseId}/documents/${documentId}`);
  }

  static async removeDocumentFromKnowledgeBase(knowledgeBaseId: string, documentId: string): Promise<void> {
    await api.delete(`/knowledge-bases/${knowledgeBaseId}/documents/${documentId}`);
  }

  static async updateKnowledgeBaseSettings(id: string, settings: KnowledgeBase['settings']): Promise<void> {
    await api.patch(`/knowledge-bases/${id}/settings`, settings);
  }

  static async getKnowledgeBaseStatistics(id: string): Promise<KnowledgeBase['statistics']> {
    const response: AxiosResponse<KnowledgeBase['statistics']> = await api.get(`/knowledge-bases/${id}/statistics`);
    return response.data;
  }
}

// Document Service
export class DocumentService {
  static async getDocuments(knowledgeBaseId?: string, filter?: RAGFilter): Promise<PaginatedRAGResponse<Document>> {
    const params = {
      ...filter,
      knowledgeBaseId
    };
    const response: AxiosResponse<PaginatedRAGResponse<Document>> = await api.get('/documents', { params });
    return response.data;
  }

  static async getDocument(id: string): Promise<Document> {
    const response: AxiosResponse<Document> = await api.get(`/documents/${id}`);
    return response.data;
  }

  static async uploadDocument(file: File, metadata: Partial<DocumentMetadata>, knowledgeBaseId?: string): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));
    if (knowledgeBaseId) {
      formData.append('knowledgeBaseId', knowledgeBaseId);
    }

    const response: AxiosResponse<Document> = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 300000 // 5 minutes for large file uploads
    });
    return response.data;
  }

  static async updateDocument(id: string, updates: Partial<Document>): Promise<Document> {
    const response: AxiosResponse<Document> = await api.patch(`/documents/${id}`, updates);
    return response.data;
  }

  static async deleteDocument(id: string): Promise<void> {
    await api.delete(`/documents/${id}`);
  }

  static async reprocessDocument(id: string): Promise<Document> {
    const response: AxiosResponse<Document> = await api.post(`/documents/${id}/reprocess`);
    return response.data;
  }

  static async getDocumentChunks(documentId: string): Promise<DocumentChunk[]> {
    const response: AxiosResponse<DocumentChunk[]> = await api.get(`/documents/${documentId}/chunks`);
    return response.data;
  }

  static async updateChunkMetadata(chunkId: string, metadata: Partial<ChunkMetadata>): Promise<DocumentChunk> {
    const response: AxiosResponse<DocumentChunk> = await api.patch(`/chunks/${chunkId}/metadata`, metadata);
    return response.data;
  }
}

// Search Service
export class SearchService {
  static async search(query: SearchQuery): Promise<SearchResult> {
    const response: AxiosResponse<SearchResult> = await api.post('/search', query);
    return response.data;
  }

  static async semanticSearch(query: string, knowledgeBaseIds: string[], options?: Partial<SearchQuery['options']>): Promise<SearchResult> {
    const searchQuery: SearchQuery = {
      id: `semantic-${Date.now()}`,
      query,
      filters: knowledgeBaseIds.map(id => ({
        field: 'knowledgeBaseId',
        operator: 'in',
        value: [id]
      })),
      options: {
        limit: 10,
        offset: 0,
        includeMetadata: true,
        includeChunks: true,
        includeEmbeddings: false,
        similarityThreshold: 0.7,
        hybridSearch: false,
        rerank: true,
        highlightTerms: true,
        expandQuery: false,
        useSemanticSearch: true,
        useBM25: false,
        weights: {
          semantic: 1.0,
          bm25: 0.0,
          boost: 0.1
        },
        ...options
      },
      userId: 'current-user',
      timestamp: new Date().toISOString()
    };
    return this.search(searchQuery);
  }

  static async keywordSearch(query: string, knowledgeBaseIds: string[], options?: Partial<SearchQuery['options']>): Promise<SearchResult> {
    const searchQuery: SearchQuery = {
      id: `keyword-${Date.now()}`,
      query,
      filters: knowledgeBaseIds.map(id => ({
        field: 'knowledgeBaseId',
        operator: 'in',
        value: [id]
      })),
      options: {
        limit: 10,
        offset: 0,
        includeMetadata: true,
        includeChunks: true,
        includeEmbeddings: false,
        similarityThreshold: 0.5,
        hybridSearch: false,
        rerank: false,
        highlightTerms: true,
        expandQuery: true,
        useSemanticSearch: false,
        useBM25: true,
        weights: {
          semantic: 0.0,
          bm25: 1.0,
          boost: 0.1
        },
        ...options
      },
      userId: 'current-user',
      timestamp: new Date().toISOString()
    };
    return this.search(searchQuery);
  }

  static async hybridSearch(query: string, knowledgeBaseIds: string[], options?: Partial<SearchQuery['options']>): Promise<SearchResult> {
    const searchQuery: SearchQuery = {
      id: `hybrid-${Date.now()}`,
      query,
      filters: knowledgeBaseIds.map(id => ({
        field: 'knowledgeBaseId',
        operator: 'in',
        value: [id]
      })),
      options: {
        limit: 10,
        offset: 0,
        includeMetadata: true,
        includeChunks: true,
        includeEmbeddings: false,
        similarityThreshold: 0.6,
        hybridSearch: true,
        rerank: true,
        highlightTerms: true,
        expandQuery: true,
        useSemanticSearch: true,
        useBM25: true,
        weights: {
          semantic: 0.7,
          bm25: 0.3,
          boost: 0.1
        },
        ...options
      },
      userId: 'current-user',
      timestamp: new Date().toISOString()
    };
    return this.search(searchQuery);
  }

  static async getSearchHistory(userId?: string, limit: number = 50): Promise<SearchQuery[]> {
    const response: AxiosResponse<SearchQuery[]> = await api.get('/search/history', {
      params: { userId, limit }
    });
    return response.data;
  }

  static async getPopularQueries(limit: number = 20): Promise<string[]> {
    const response: AxiosResponse<string[]> = await api.get('/search/popular', {
      params: { limit }
    });
    return response.data;
  }
}

// Vector Database Service
export class VectorDatabaseService {
  static async getVectorIndexes(): Promise<VectorIndex[]> {
    const response: AxiosResponse<VectorIndex[]> = await api.get('/vector/indexes');
    return response.data;
  }

  static async getVectorIndex(id: string): Promise<VectorIndex> {
    const response: AxiosResponse<VectorIndex> = await api.get(`/vector/indexes/${id}`);
    return response.data;
  }

  static async createVectorIndex(index: Omit<VectorIndex, 'id' | 'status' | 'vectorCount' | 'memoryUsage' | 'buildTime' | 'createdAt' | 'updatedAt'>): Promise<VectorIndex> {
    const response: AxiosResponse<VectorIndex> = await api.post('/vector/indexes', index);
    return response.data;
  }

  static async updateVectorIndex(id: string, updates: Partial<VectorIndex>): Promise<VectorIndex> {
    const response: AxiosResponse<VectorIndex> = await api.patch(`/vector/indexes/${id}`, updates);
    return response.data;
  }

  static async deleteVectorIndex(id: string): Promise<void> {
    await api.delete(`/vector/indexes/${id}`);
  }

  static async rebuildVectorIndex(id: string): Promise<VectorIndex> {
    const response: AxiosResponse<VectorIndex> = await api.post(`/vector/indexes/${id}/rebuild`);
    return response.data;
  }

  static async vectorSearch(indexId: string, query: VectorSearchQuery): Promise<VectorSearchResult[]> {
    const response: AxiosResponse<VectorSearchResult[]> = await api.post(`/vector/indexes/${indexId}/search`, query);
    return response.data;
  }

  static async textToVector(text: string, model?: string): Promise<number[]> {
    const response: AxiosResponse<{ vector: number[] }> = await api.post('/vector/embed', {
      text,
      model: model || 'text-embedding-ada-002'
    });
    return response.data.vector;
  }

  static async addVectors(indexId: string, vectors: Array<{ id: string; vector: number[]; metadata?: Record<string, any> }>): Promise<void> {
    await api.post(`/vector/indexes/${indexId}/vectors`, { vectors });
  }

  static async removeVectors(indexId: string, vectorIds: string[]): Promise<void> {
    await api.delete(`/vector/indexes/${indexId}/vectors`, { data: { vectorIds } });
  }
}

// RAG Generation Service
export class RAGGenerationService {
  static async generateResponse(query: RAGQuery): Promise<RAGResponse> {
    const response: AxiosResponse<RAGResponse> = await api.post('/rag/generate', query, {
      timeout: 120000 // 2 minutes for RAG generation
    });
    return response.data;
  }

  static async streamResponse(query: RAGQuery, onChunk: (chunk: string) => void, onComplete: (response: RAGResponse) => void): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/rag/generate/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify(query)
    });

    if (!response.body) {
      throw new Error('No response body for streaming');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'chunk') {
                onChunk(parsed.content);
              } else if (parsed.type === 'complete') {
                onComplete(parsed.response);
              }
            } catch (e) {
              console.warn('Failed to parse streaming data:', data);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  static async getRAGHistory(userId?: string, sessionId?: string, limit: number = 50): Promise<RAGResponse[]> {
    const response: AxiosResponse<RAGResponse[]> = await api.get('/rag/history', {
      params: { userId, sessionId, limit }
    });
    return response.data;
  }

  static async provideFeedback(responseId: string, feedback: RAGResponse['feedback']): Promise<void> {
    await api.post(`/rag/responses/${responseId}/feedback`, feedback);
  }

  static async regenerateResponse(responseId: string, newQuery?: Partial<RAGQuery>): Promise<RAGResponse> {
    const response: AxiosResponse<RAGResponse> = await api.post(`/rag/responses/${responseId}/regenerate`, newQuery);
    return response.data;
  }
}

// Analytics Service
export class RAGAnalyticsService {
  static async getAnalytics(filter?: RAGFilter): Promise<RAGAnalytics> {
    const response: AxiosResponse<RAGAnalytics> = await api.get('/analytics', { params: filter });
    return response.data;
  }

  static async getQueryAnalytics(limit: number = 100): Promise<RAGAnalytics['popularQueries']> {
    const response: AxiosResponse<RAGAnalytics['popularQueries']> = await api.get('/analytics/queries', {
      params: { limit }
    });
    return response.data;
  }

  static async getKnowledgeBaseUsage(knowledgeBaseId?: string): Promise<RAGAnalytics['knowledgeBaseUsage']> {
    const response: AxiosResponse<RAGAnalytics['knowledgeBaseUsage']> = await api.get('/analytics/knowledge-bases', {
      params: { knowledgeBaseId }
    });
    return response.data;
  }

  static async getUserActivity(userId?: string): Promise<RAGAnalytics['userActivity']> {
    const response: AxiosResponse<RAGAnalytics['userActivity']> = await api.get('/analytics/users', {
      params: { userId }
    });
    return response.data;
  }

  static async getPerformanceMetrics(timeRange?: { start: string; end: string }): Promise<RAGAnalytics['performanceMetrics']> {
    const response: AxiosResponse<RAGAnalytics['performanceMetrics']> = await api.get('/analytics/performance', {
      params: timeRange
    });
    return response.data;
  }

  static async getErrorAnalysis(timeRange?: { start: string; end: string }): Promise<RAGAnalytics['errorAnalysis']> {
    const response: AxiosResponse<RAGAnalytics['errorAnalysis']> = await api.get('/analytics/errors', {
      params: timeRange
    });
    return response.data;
  }

  static async exportAnalytics(format: RAGExport['format'], filter?: RAGFilter): Promise<Blob> {
    const response = await api.get('/analytics/export', {
      params: { format, ...filter },
      responseType: 'blob'
    });
    return response.data;
  }
}

// Configuration Service
export class RAGConfigurationService {
  static async getConfiguration(): Promise<RAGConfiguration> {
    const response: AxiosResponse<RAGConfiguration> = await api.get('/config');
    return response.data;
  }

  static async updateConfiguration(config: Partial<RAGConfiguration>): Promise<RAGConfiguration> {
    const response: AxiosResponse<RAGConfiguration> = await api.patch('/config', config);
    return response.data;
  }

  static async resetConfiguration(): Promise<RAGConfiguration> {
    const response: AxiosResponse<RAGConfiguration> = await api.post('/config/reset');
    return response.data;
  }

  static async validateConfiguration(config: Partial<RAGConfiguration>): Promise<{ valid: boolean; errors: string[] }> {
    const response: AxiosResponse<{ valid: boolean; errors: string[] }> = await api.post('/config/validate', config);
    return response.data;
  }
}

// Import/Export Service
export class RAGImportExportService {
  static async importData(file: File, type: RAGImport['type']): Promise<RAGImport> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const response: AxiosResponse<RAGImport> = await api.post('/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 600000 // 10 minutes for large imports
    });
    return response.data;
  }

  static async getImportStatus(importId: string): Promise<RAGImport> {
    const response: AxiosResponse<RAGImport> = await api.get(`/import/${importId}`);
    return response.data;
  }

  static async cancelImport(importId: string): Promise<void> {
    await api.delete(`/import/${importId}`);
  }

  static async exportData(type: RAGExport['data'], format: RAGExport['format'], filter?: RAGFilter): Promise<Blob> {
    const response = await api.post('/export', {
      type,
      format,
      filter
    }, {
      responseType: 'blob',
      timeout: 300000 // 5 minutes for exports
    });
    return response.data;
  }

  static async getExportHistory(limit: number = 20): Promise<RAGExport[]> {
    const response: AxiosResponse<RAGExport[]> = await api.get('/export/history', {
      params: { limit }
    });
    return response.data;
  }
}

// Session Service
export class RAGSessionService {
  static async createSession(knowledgeBaseIds: string[]): Promise<RAGSession> {
    const response: AxiosResponse<RAGSession> = await api.post('/sessions', {
      knowledgeBaseIds,
      userId: 'current-user',
      context: {}
    });
    return response.data;
  }

  static async getSession(sessionId: string): Promise<RAGSession> {
    const response: AxiosResponse<RAGSession> = await api.get(`/sessions/${sessionId}`);
    return response.data;
  }

  static async updateSession(sessionId: string, updates: Partial<RAGSession>): Promise<RAGSession> {
    const response: AxiosResponse<RAGSession> = await api.patch(`/sessions/${sessionId}`, updates);
    return response.data;
  }

  static async deleteSession(sessionId: string): Promise<void> {
    await api.delete(`/sessions/${sessionId}`);
  }

  static async getUserSessions(userId?: string, limit: number = 50): Promise<RAGSession[]> {
    const response: AxiosResponse<RAGSession[]> = await api.get('/sessions', {
      params: { userId, limit }
    });
    return response.data;
  }

  static async addContextToSession(sessionId: string, context: Record<string, any>): Promise<RAGSession> {
    const response: AxiosResponse<RAGSession> = await api.patch(`/sessions/${sessionId}/context`, { context });
    return response.data;
  }
}

// Real-time Events Service
export class RAGEventsService {
  private static eventSource: EventSource | null = null;

  static subscribe(onEvent: (event: RAGEvent) => void, onError?: (error: Event) => void): void {
    if (this.eventSource) {
      this.eventSource.close();
    }

    const token = localStorage.getItem('authToken');
    const url = `${API_BASE_URL}/events/stream?token=${encodeURIComponent(token || '')}`;

    this.eventSource = new EventSource(url);

    this.eventSource.onmessage = (event) => {
      try {
        const ragEvent: RAGEvent = JSON.parse(event.data);
        onEvent(ragEvent);
      } catch (e) {
        console.error('Failed to parse RAG event:', e);
      }
    };

    if (onError) {
      this.eventSource.onerror = onError;
    }
  }

  static unsubscribe(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  static getEventHistory(limit: number = 100, types?: RAGEvent['type'][]): Promise<RAGEvent[]> {
    return api.get('/events/history', {
      params: { limit, types: types?.join(',') }
    }).then(response => response.data);
  }
}

// Health Check Service
export class RAGHealthService {
  static async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, { status: string; latency?: number; error?: string }>;
    timestamp: string;
  }> {
    const response = await api.get('/health');
    return response.data;
  }

  static async runHealthCheck(): Promise<void> {
    await api.post('/health/check');
  }
}

<<<<<<< HEAD
// Export all services
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
};
=======
>>>>>>> 001-modify-analyzer-method
