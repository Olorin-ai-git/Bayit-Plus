import axios, { AxiosResponse } from 'axios';

export interface RAGQuery {
  query: string;
  context?: string;
  temperature?: number;
  max_tokens?: number;
  top_k?: number;
  top_p?: number;
}

export interface RAGResponse {
  answer: string;
  sources: {
    id: string;
    content: string;
    score: number;
    metadata?: Record<string, any>;
  }[];
  confidence: number;
  processing_time: number;
  model_used: string;
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
    this.baseURL = process.env.REACT_APP_RAG_API_URL || 'http://localhost:8090/api/rag';
    this.apiKey = process.env.REACT_APP_RAG_API_KEY;
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
        queryData,
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
}

export default new RAGApiService();