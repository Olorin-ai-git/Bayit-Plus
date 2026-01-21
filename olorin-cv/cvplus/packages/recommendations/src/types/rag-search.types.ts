/**
 * RAG/AI Types
 * Type definitions for the recommendations AI and search functionality
  */

// Import CVSection from main types to avoid duplication
import { CVSection } from './index';

export interface RAGEmbedding {
  id: string;
  content: string;
  embedding: number[];
  vector?: number[];
  tokens?: number;
  metadata: EmbeddingMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmbeddingMetadata {
  sourceDocument: string;
  documentType: ContentType;
  section: CVSection;
  chunkIndex: number;
  wordCount: number;
  confidence: number;
  importance?: number;
  tags?: string[];
  source?: string;
  dateRange?: string;
  subsection?: string;
  createdAt?: Date;
}

export enum ContentType {
  CV_SECTION = 'cv_section',
  JOB_DESCRIPTION = 'job_description',
  RECOMMENDATION = 'recommendation',
  TEMPLATE = 'template',
  EXAMPLE = 'example'
}

// Note: CVSection is imported from main types file to avoid duplication
// User management types moved to @cvplus/auth where they belong

export interface SearchRequest {
  query: string;
  filters?: SearchFilters;
  limit?: number;
  offset?: number;
}

export interface SearchFilters {
  contentType?: ContentType[];
  section?: CVSection[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  minConfidence?: number;
}

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata: EmbeddingMetadata;
  highlights?: string[];
}