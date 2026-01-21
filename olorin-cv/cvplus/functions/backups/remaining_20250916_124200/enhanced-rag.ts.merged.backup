// @ts-ignore - Export conflicts/**
 * Enhanced RAG (Retrieval-Augmented Generation) Types
 * 
 * RAG processing types for enhanced CV features.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

export interface RAGConfiguration {
  vectorStoreProvider: 'pinecone' | 'weaviate' | 'qdrant' | 'local';
  embeddingModel: string;
  chunkSize: number;
  chunkOverlap: number;
  retrievalTopK: number;
  similarityThreshold: number;
}

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: ChunkMetadata;
  embedding?: number[];
  score?: number;
}

export interface ChunkMetadata {
  documentId: string;
  userId: string;
  jobId: string;
  chunkIndex: number;
  source: string;
  lastUpdated: Date;
  tags?: string[];
}

export interface RAGQuery {
  query: string;
  userId: string;
  jobId?: string;
  filters?: Record<string, any>;
  maxResults?: number;
  includeMetadata?: boolean;
}

export interface RAGResult {
  chunks: DocumentChunk[];
  totalResults: number;
  queryTime: number;
  relevanceScore: number;
  generatedResponse?: string;
}

export interface RAGIndexingJob {
  id: string;
  userId: string;
  documents: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  createdAt: Date;
  completedAt?: Date;
}

export interface VectorStore {
  name: string;
  dimensions: number;
  metric: 'cosine' | 'euclidean' | 'dotproduct';
  indexCount: number;
  lastUpdated: Date;
}

export interface UserRAGProfile {
  userId: string;
  vectorStoreId: string;
  indexedDocuments: string[];
  totalChunks: number;
  lastIndexed: Date;
  preferences: RAGConfiguration;
}

export interface CVChunk extends DocumentChunk {
  cvSectionType: 'experience' | 'education' | 'skills' | 'projects' | 'summary';
  relevanceScore?: number;
  keywords: string[];
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  ragEnabled: boolean;
  createdAt: Date;
  lastMessageAt: Date;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  ragSources?: DocumentChunk[];
  timestamp: Date;
}