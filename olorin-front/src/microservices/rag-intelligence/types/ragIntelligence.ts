// Document and Knowledge Base Types
export interface Document {
  id: string;
  title: string;
  content: string;
  summary: string;
  metadata: DocumentMetadata;
  embeddings?: number[];
  chunks: DocumentChunk[];
  status: 'processing' | 'indexed' | 'failed' | 'archived';
  createdAt: string;
  updatedAt: string;
  lastAccessedAt?: string;
  accessCount: number;
}

export interface DocumentMetadata {
  fileName: string;
  fileType: 'pdf' | 'docx' | 'txt' | 'html' | 'markdown' | 'json' | 'csv';
  fileSize: number;
  sourceUrl?: string;
  author?: string;
  language: string;
  tags: string[];
  category: DocumentCategory;
  confidentialityLevel: 'public' | 'internal' | 'confidential' | 'restricted';
  version: string;
  checksum: string;
  extractedAt: string;
  processingDuration?: number;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  embeddings: number[];
  startPosition: number;
  endPosition: number;
  chunkIndex: number;
  totalChunks: number;
  metadata: ChunkMetadata;
  relevanceScore?: number;
}

export interface ChunkMetadata {
  tokens: number;
  sentences: number;
  paragraphs: number;
  headings: string[];
  entities: NamedEntity[];
  keywords: string[];
  topics: string[];
  summary: string;
}

export interface NamedEntity {
  text: string;
  label: 'PERSON' | 'ORG' | 'GPE' | 'MONEY' | 'DATE' | 'TIME' | 'PERCENT' | 'CARDINAL' | 'ORDINAL';
  confidence: number;
  startPosition: number;
  endPosition: number;
}

export type DocumentCategory =
  | 'fraud_patterns'
  | 'investigation_procedures'
  | 'regulatory_guidelines'
  | 'case_studies'
  | 'technical_documentation'
  | 'policies'
  | 'training_materials'
  | 'external_sources'
  | 'other';

// Knowledge Base Types
export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  category: KnowledgeBaseCategory;
  documents: Document[];
  totalDocuments: number;
  totalChunks: number;
  totalSize: number;
  status: 'active' | 'inactive' | 'updating' | 'error';
  settings: KnowledgeBaseSettings;
  statistics: KnowledgeBaseStatistics;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  permissions: KnowledgeBasePermission[];
}

export type KnowledgeBaseCategory =
  | 'fraud_detection'
  | 'investigation_procedures'
  | 'compliance'
  | 'training'
  | 'reference'
  | 'external';

export interface KnowledgeBaseSettings {
  chunkSize: number;
  chunkOverlap: number;
  embeddingModel: string;
  indexingStrategy: 'immediate' | 'batch' | 'scheduled';
  autoUpdate: boolean;
  retentionPolicy: {
    enabled: boolean;
    maxAge: number; // days
    maxDocuments: number;
  };
  accessLogging: boolean;
  versioning: boolean;
}

export interface KnowledgeBaseStatistics {
  documentsAdded: number;
  documentsRemoved: number;
  totalQueries: number;
  averageQueryTime: number;
  popularDocuments: string[];
  popularQueries: string[];
  lastIndexed: string;
  indexSize: number;
  errorRate: number;
}

export interface KnowledgeBasePermission {
  userId: string;
  role: 'viewer' | 'editor' | 'admin';
  permissions: ('read' | 'write' | 'delete' | 'manage')[];
  grantedAt: string;
  grantedBy: string;
}

// Search and Retrieval Types
export interface SearchQuery {
  id: string;
  query: string;
  filters: SearchFilter[];
  options: SearchOptions;
  userId: string;
  timestamp: string;
  executionTime?: number;
  resultCount?: number;
}

export interface SearchFilter {
  field: string;
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'in' | 'range' | 'exists';
  value: any;
  boost?: number;
}

export interface SearchOptions {
  limit: number;
  offset: number;
  includeMetadata: boolean;
  includeChunks: boolean;
  includeEmbeddings: boolean;
  similarityThreshold: number;
  hybridSearch: boolean;
  rerank: boolean;
  rerankModel?: string;
  highlightTerms: boolean;
  expandQuery: boolean;
  useSemanticSearch: boolean;
  useBM25: boolean;
  weights: {
    semantic: number;
    bm25: number;
    boost: number;
  };
}

export interface SearchResult {
  documents: SearchResultDocument[];
  chunks: SearchResultChunk[];
  totalResults: number;
  executionTime: number;
  query: string;
  suggestions?: string[];
  filters: SearchFilter[];
  aggregations?: SearchAggregation[];
  explanation?: SearchExplanation;
}

export interface SearchResultDocument {
  document: Document;
  score: number;
  explanation: string;
  highlights: SearchHighlight[];
  matchedChunks: string[];
  relevanceFactors: RelevanceFactor[];
}

export interface SearchResultChunk {
  chunk: DocumentChunk;
  document: Document;
  score: number;
  explanation: string;
  highlights: SearchHighlight[];
  context: ChunkContext;
}

export interface SearchHighlight {
  field: string;
  fragments: string[];
  startPositions: number[];
  endPositions: number[];
}

export interface ChunkContext {
  previousChunk?: DocumentChunk;
  nextChunk?: DocumentChunk;
  surroundingText: string;
  position: 'beginning' | 'middle' | 'end';
}

export interface RelevanceFactor {
  factor: string;
  value: number;
  weight: number;
  contribution: number;
  explanation: string;
}

export interface SearchAggregation {
  field: string;
  buckets: {
    key: string;
    count: number;
    percentage: number;
  }[];
}

export interface SearchExplanation {
  totalScore: number;
  maxScore: number;
  queryParsing: string;
  indexUsed: string[];
  processingSteps: string[];
  optimizations: string[];
}

// Vector Database Types
export interface VectorIndex {
  id: string;
  name: string;
  description: string;
  dimension: number;
  metric: 'cosine' | 'euclidean' | 'dot_product';
  algorithm: 'hnsw' | 'ivf' | 'flat';
  parameters: VectorIndexParameters;
  status: 'building' | 'ready' | 'updating' | 'error';
  vectorCount: number;
  memoryUsage: number;
  buildTime?: number;
  createdAt: string;
  updatedAt: string;
}

export interface VectorIndexParameters {
  efConstruction?: number;
  m?: number;
  efSearch?: number;
  nprobe?: number;
  nlist?: number;
  trainSize?: number;
}

export interface VectorSearchQuery {
  vector: number[];
  k: number;
  filters?: VectorFilter[];
  searchParams?: VectorSearchParameters;
}

export interface VectorFilter {
  field: string;
  operator: string;
  value: any;
}

export interface VectorSearchParameters {
  ef?: number;
  nprobe?: number;
  searchList?: number;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  vector?: number[];
  metadata: Record<string, any>;
  document?: Document;
  chunk?: DocumentChunk;
}

// RAG Generation Types
export interface RAGQuery {
  id: string;
  question: string;
  context: string;
  knowledgeBases: string[];
  userId: string;
  sessionId?: string;
  retrievalOptions: RetrievalOptions;
  generationOptions: GenerationOptions;
  timestamp: string;
}

export interface RetrievalOptions {
  maxDocuments: number;
  maxChunks: number;
  similarityThreshold: number;
  diversityThreshold: number;
  temporalWeight: number;
  authorityWeight: number;
  freshnessWeight: number;
  useHybridSearch: boolean;
  expandQuery: boolean;
  includeMetadata: boolean;
}

export interface GenerationOptions {
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
  frequencyPenalty: number;
  presencePenalty: number;
  stopSequences: string[];
  systemPrompt?: string;
  includeSources: boolean;
  includeConfidence: boolean;
  includeCitations: boolean;
  responseFormat: 'text' | 'markdown' | 'structured';
}

export interface RAGResponse {
  id: string;
  query: RAGQuery;
  answer: string;
  confidence: number;
  sources: RAGSource[];
  retrievalResults: SearchResult;
  generationMetadata: GenerationMetadata;
  processingTime: number;
  totalTokens: number;
  cost: number;
  timestamp: string;
  feedback?: RAGFeedback;
}

export interface RAGSource {
  documentId: string;
  chunkId: string;
  title: string;
  content: string;
  score: number;
  citation: string;
  url?: string;
  metadata: Record<string, any>;
}

export interface GenerationMetadata {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  finishReason: string;
  processingTime: number;
  cost: number;
  requestId: string;
}

export interface RAGFeedback {
  rating: 1 | 2 | 3 | 4 | 5;
  helpful: boolean;
  accurate: boolean;
  complete: boolean;
  relevant: boolean;
  comments?: string;
  userId: string;
  timestamp: string;
}

// Analytics and Monitoring Types
export interface RAGAnalytics {
  totalQueries: number;
  averageResponseTime: number;
  averageConfidence: number;
  successRate: number;
  popularQueries: QueryAnalytics[];
  knowledgeBaseUsage: KnowledgeBaseUsage[];
  userActivity: UserActivity[];
  performanceMetrics: PerformanceMetrics;
  errorAnalysis: ErrorAnalysis;
  trends: RAGTrends;
}

export interface QueryAnalytics {
  query: string;
  count: number;
  averageConfidence: number;
  averageRating: number;
  lastUsed: string;
  knowledgeBasesUsed: string[];
}

export interface KnowledgeBaseUsage {
  knowledgeBaseId: string;
  knowledgeBaseName: string;
  queryCount: number;
  documentHits: number;
  averageRelevance: number;
  lastAccessed: string;
}

export interface UserActivity {
  userId: string;
  userName: string;
  queryCount: number;
  averageSessionLength: number;
  favoriteTopics: string[];
  lastActivity: string;
}

export interface PerformanceMetrics {
  retrieval: {
    averageTime: number;
    p95Time: number;
    p99Time: number;
    throughput: number;
  };
  generation: {
    averageTime: number;
    p95Time: number;
    p99Time: number;
    throughput: number;
  };
  endToEnd: {
    averageTime: number;
    p95Time: number;
    p99Time: number;
    throughput: number;
  };
}

export interface ErrorAnalysis {
  totalErrors: number;
  errorRate: number;
  errorTypes: {
    type: string;
    count: number;
    percentage: number;
    lastOccurrence: string;
  }[];
  failureReasons: {
    reason: string;
    count: number;
    impact: 'low' | 'medium' | 'high';
  }[];
}

export interface RAGTrends {
  queryVolume: TrendData[];
  responseTime: TrendData[];
  confidence: TrendData[];
  userSatisfaction: TrendData[];
  knowledgeBaseGrowth: TrendData[];
}

export interface TrendData {
  timestamp: string;
  value: number;
  change: number;
  period: 'hour' | 'day' | 'week' | 'month';
}

// Configuration and Settings Types
export interface RAGConfiguration {
  retrieval: {
    defaultSimilarityThreshold: number;
    defaultMaxDocuments: number;
    defaultMaxChunks: number;
    embeddingModel: string;
    chunkSize: number;
    chunkOverlap: number;
    indexingBatchSize: number;
  };
  generation: {
    defaultModel: string;
    defaultTemperature: number;
    defaultMaxTokens: number;
    systemPrompts: Record<string, string>;
    safetyFilters: boolean;
    contentModeration: boolean;
  };
  caching: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
    strategy: 'lru' | 'lfu' | 'ttl';
  };
  monitoring: {
    enabled: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    metricsRetention: number;
    alertThresholds: {
      responseTime: number;
      errorRate: number;
      confidence: number;
    };
  };
}

// Export and Import Types
export interface RAGExport {
  format: 'json' | 'csv' | 'excel';
  data: RAGQuery[] | RAGResponse[] | Document[] | RAGAnalytics;
  filters: any;
  generatedAt: string;
  generatedBy: string;
  metadata: {
    totalRecords: number;
    dateRange: {
      start: string;
      end: string;
    };
    knowledgeBases: string[];
  };
}

export interface RAGImport {
  id: string;
  type: 'documents' | 'knowledge_base' | 'configuration';
  source: 'file' | 'url' | 'api';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  errors: string[];
  startedAt: string;
  completedAt?: string;
  createdBy: string;
}

// Real-time Types
export interface RAGEvent {
  id: string;
  type: 'query' | 'response' | 'error' | 'index_update' | 'document_added' | 'document_removed';
  payload: any;
  timestamp: string;
  userId?: string;
  sessionId?: string;
  knowledgeBaseId?: string;
}

export interface RAGSession {
  id: string;
  userId: string;
  knowledgeBaseIds: string[];
  queries: RAGQuery[];
  responses: RAGResponse[];
  startedAt: string;
  lastActivity: string;
  totalQueries: number;
  averageConfidence: number;
  context: Record<string, any>;
}

// Filter and Pagination Types
export interface RAGFilter {
  knowledgeBaseIds?: string[];
  documentCategories?: DocumentCategory[];
  confidentialityLevels?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  userIds?: string[];
  minConfidence?: number;
  maxResults?: number;
}

export interface PaginatedRAGResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}