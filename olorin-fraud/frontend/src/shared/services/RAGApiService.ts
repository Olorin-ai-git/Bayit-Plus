import axios, { AxiosResponse } from 'axios';
import { getConfig } from '../config/env.config';

export interface RAGQuery {
  query_text: string;
  data_source_ids?: string[];
  limit?: number;
  similarity_threshold?: number;
  investigation_id?: string;
  entity_id?: string;
  user_id?: string;
}

export interface Citation {
  chunk_id: string;
  source_type: string;
  source_name: string;
  similarity_score: number;
  investigation_id?: string;
  document_id?: string;
  metadata?: Record<string, any>;
}

export interface RAGResponse {
  answer: string;
  sources: {
    chunk_id: string;
    content: string;
    similarity_score: number;
    source_type: string;
    source_name: string;
    metadata?: Record<string, any>;
  }[];
  citations: Citation[];
  confidence: number;
  processing_time_ms: number;
  query_id?: string;
}

export interface RAGConfiguration {
  model: string;
  temperature: number;
  max_tokens: number;
  top_k: number;
  top_p: number;
  chunk_size: number;
  overlap_size: number;
  similarity_threshold: number;
}

export interface DocumentUpload {
  file: File;
  category?: string;
  metadata?: Record<string, any>;
}

export interface DocumentInfo {
  id: string;
  filename: string;
  category: string;
  upload_date: string;
  size: number;
  status: 'processing' | 'ready' | 'error';
  chunk_count?: number;
  metadata?: Record<string, any>;
}

class RAGApiService {
  private baseURL: string;
  private apiKey?: string;

  constructor() {
    const config = getConfig();
    this.baseURL = `${config.api.baseUrl}/api/v1/rag`;
    // Get API key from config (handles browser environment)
    this.apiKey = config.api.apiKey;
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  private getFormHeaders() {
    const headers: Record<string, string> = {};

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  async query(queryData: RAGQuery): Promise<RAGResponse> {
    try {
      const response: AxiosResponse<RAGResponse> = await axios.post(
        `${this.baseURL}/query`,
        {
          query_text: queryData.query_text,
          data_source_ids: queryData.data_source_ids,
          limit: queryData.limit || 10,
          similarity_threshold: queryData.similarity_threshold || 0.7,
          investigation_id: queryData.investigation_id,
          entity_id: queryData.entity_id,
          user_id: queryData.user_id
        },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('RAG query failed:', error);
      throw new Error('Failed to process RAG query');
    }
  }

  async getConfiguration(): Promise<RAGConfiguration> {
    try {
      const response: AxiosResponse<RAGConfiguration> = await axios.get(
        `${this.baseURL}/config`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get RAG configuration:', error);
      throw new Error('Failed to get RAG configuration');
    }
  }

  async updateConfiguration(config: Partial<RAGConfiguration>): Promise<RAGConfiguration> {
    try {
      const response: AxiosResponse<RAGConfiguration> = await axios.put(
        `${this.baseURL}/config`,
        config,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to update RAG configuration:', error);
      throw new Error('Failed to update RAG configuration');
    }
  }

  async uploadDocument(uploadData: DocumentUpload): Promise<DocumentInfo> {
    try {
      const formData = new FormData();
      formData.append('file', uploadData.file);

      if (uploadData.category) {
        formData.append('category', uploadData.category);
      }

      if (uploadData.metadata) {
        formData.append('metadata', JSON.stringify(uploadData.metadata));
      }

      const response: AxiosResponse<DocumentInfo> = await axios.post(
        `${this.baseURL}/documents/upload`,
        formData,
        { headers: this.getFormHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Document upload failed:', error);
      throw new Error('Failed to upload document');
    }
  }

  async getDocuments(): Promise<DocumentInfo[]> {
    try {
      const response: AxiosResponse<DocumentInfo[]> = await axios.get(
        `${this.baseURL}/documents`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get documents:', error);
      throw new Error('Failed to get documents');
    }
  }

  async deleteDocument(documentId: string): Promise<void> {
    try {
      await axios.delete(
        `${this.baseURL}/documents/${documentId}`,
        { headers: this.getHeaders() }
      );
    } catch (error) {
      console.error('Failed to delete document:', error);
      throw new Error('Failed to delete document');
    }
  }

  async searchDocuments(query: string, limit: number = 10): Promise<DocumentInfo[]> {
    try {
      const response: AxiosResponse<DocumentInfo[]> = await axios.get(
        `${this.baseURL}/documents/search`,
        {
          params: { query, limit },
          headers: this.getHeaders()
        }
      );
      return response.data;
    } catch (error) {
      console.error('Document search failed:', error);
      throw new Error('Failed to search documents');
    }
  }

  async getDocumentChunks(documentId: string): Promise<any[]> {
    try {
      const response: AxiosResponse<any[]> = await axios.get(
        `${this.baseURL}/documents/${documentId}/chunks`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get document chunks:', error);
      throw new Error('Failed to get document chunks');
    }
  }

  async getSystemStatus(): Promise<any> {
    try {
      const response: AxiosResponse<any> = await axios.get(
        `${this.baseURL}/status`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get system status:', error);
      throw new Error('Failed to get system status');
    }
  }

  async getDataSources(): Promise<any[]> {
    try {
      const response: AxiosResponse<any[]> = await axios.get(
        `${this.baseURL}/data-sources`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get data sources:', error);
      throw new Error('Failed to get data sources');
    }
  }

  async createDataSource(data: any): Promise<any> {
    try {
      const response: AxiosResponse<any> = await axios.post(
        `${this.baseURL}/data-sources`,
        data,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to create data source:', error);
      throw new Error('Failed to create data source');
    }
  }

  async updateDataSource(id: string, data: any): Promise<any> {
    try {
      const response: AxiosResponse<any> = await axios.put(
        `${this.baseURL}/data-sources/${id}`,
        data,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to update data source:', error);
      throw new Error('Failed to update data source');
    }
  }

  async deleteDataSource(id: string): Promise<void> {
    try {
      await axios.delete(
        `${this.baseURL}/data-sources/${id}`,
        { headers: this.getHeaders() }
      );
    } catch (error) {
      console.error('Failed to delete data source:', error);
      throw new Error('Failed to delete data source');
    }
  }

  async testDataSourceConnection(id: string): Promise<any> {
    try {
      const response: AxiosResponse<any> = await axios.post(
        `${this.baseURL}/data-sources/${id}/test`,
        {},
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to test data source connection:', error);
      throw new Error('Failed to test data source connection');
    }
  }

  // Chat Session Methods
  async createChatSession(title?: string, metadata?: Record<string, any>): Promise<any> {
    try {
      const response: AxiosResponse<any> = await axios.post(
        `${this.baseURL}/chats`,
        { title, metadata },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to create chat session:', error);
      throw new Error('Failed to create chat session');
    }
  }

  async getChatSessions(includeInactive: boolean = false): Promise<any[]> {
    try {
      const response: AxiosResponse<any[]> = await axios.get(
        `${this.baseURL}/chats`,
        {
          params: { include_inactive: includeInactive },
          headers: this.getHeaders()
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get chat sessions:', error);
      throw new Error('Failed to get chat sessions');
    }
  }

  async getChatSession(sessionId: string): Promise<any> {
    try {
      const response: AxiosResponse<any> = await axios.get(
        `${this.baseURL}/chats/${sessionId}`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get chat session:', error);
      throw new Error('Failed to get chat session');
    }
  }

  async updateChatSession(sessionId: string, data: { title?: string; is_active?: boolean; metadata?: Record<string, any> }): Promise<any> {
    try {
      const response: AxiosResponse<any> = await axios.put(
        `${this.baseURL}/chats/${sessionId}`,
        data,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to update chat session:', error);
      throw new Error('Failed to update chat session');
    }
  }

  async deleteChatSession(sessionId: string): Promise<void> {
    try {
      await axios.delete(
        `${this.baseURL}/chats/${sessionId}`,
        { headers: this.getHeaders() }
      );
    } catch (error) {
      console.error('Failed to delete chat session:', error);
      throw new Error('Failed to delete chat session');
    }
  }

  async addChatMessage(sessionId: string, message: {
    sender: string;
    content: string;
    natural_query?: string;
    translated_query?: string;
    query_metadata?: Record<string, any>;
    structured_data?: Record<string, any>;
  }): Promise<any> {
    try {
      const response: AxiosResponse<any> = await axios.post(
        `${this.baseURL}/chats/${sessionId}/messages`,
        message,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to add chat message:', error);
      throw new Error('Failed to add chat message');
    }
  }
}

export default new RAGApiService();