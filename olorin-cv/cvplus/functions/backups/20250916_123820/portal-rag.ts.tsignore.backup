// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Portal RAG System Types
 * 
 * RAG (Retrieval-Augmented Generation) configuration and service types
 * for portal AI chat functionality. Extracted from portal.ts to maintain <200 line compliance.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

/**
 * RAG system configuration for AI chat functionality
 */
export interface RAGConfig {
  /** Whether RAG chat is enabled */
  enabled: boolean;
  
  /** Vector database configuration */
  vectorDatabase: VectorDatabaseConfig;
  
  /** Embedding generation settings */
  embeddings: EmbeddingConfig;
  
  /** Chat service configuration */
  chatService: ChatServiceConfig;
  
  /** Knowledge base settings */
  knowledgeBase: KnowledgeBaseConfig;
  
  /** Query processing configuration */
  queryProcessing: QueryProcessingConfig;
  
  /** Response generation settings */
  responseGeneration: ResponseGenerationConfig;
}

/**
 * Vector database configuration
 */
export interface VectorDatabaseConfig {
  /** Database provider */
  provider: 'pinecone' | 'weaviate' | 'chroma' | 'qdrant';
  
  /** API endpoint */
  endpoint: string;
  
  /** Index name */
  indexName: string;
  
  /** Embedding dimensions */
  dimensions: number;
  
  /** Distance metric */
  metric: 'cosine' | 'euclidean' | 'manhattan';
  
  /** Connection settings */
  connection: {
    /** API key for authentication */
    apiKey: string;
    
    /** Connection timeout in ms */
    timeout: number;
    
    /** Max retries */
    maxRetries: number;
  };
}

/**
 * Embedding configuration
 */
export interface EmbeddingConfig {
  /** Embedding model provider */
  provider: 'openai' | 'huggingface' | 'cohere';
  
  /** Model name */
  modelName: string;
  
  /** Embedding dimensions */
  dimensions: number;
  
  /** Batch size for processing */
  batchSize: number;
  
  /** Model-specific settings */
  settings: {
    /** API key */
    apiKey: string;
    
    /** Model parameters */
    parameters?: Record<string, any>;
  };
}

/**
 * Chat service configuration
 */
export interface ChatServiceConfig {
  /** Chat model provider */
  provider: 'anthropic' | 'openai' | 'huggingface';
  
  /** Model name */
  modelName: string;
  
  /** Max tokens in response */
  maxTokens: number;
  
  /** Temperature for generation */
  temperature: number;
  
  /** Top-p for nucleus sampling */
  topP: number;
  
  /** System prompt template */
  systemPrompt: string;
  
  /** Model settings */
  settings: {
    /** API key */
    apiKey: string;
    
    /** Additional parameters */
    parameters?: Record<string, any>;
  };
}

/**
 * Knowledge base configuration
 */
export interface KnowledgeBaseConfig {
  /** Source documents */
  sources: KnowledgeSource[];
  
  /** Chunking strategy */
  chunking: ChunkingConfig;
  
  /** Content filters */
  filters: ContentFilter[];
  
  /** Update frequency */
  updateFrequency: 'manual' | 'hourly' | 'daily' | 'weekly';
  
  /** Version tracking */
  versioning: {
    /** Current version */
    currentVersion: string;
    
    /** Auto-update enabled */
    autoUpdate: boolean;
  };
}

/**
 * Knowledge source definition
 */
export interface KnowledgeSource {
  /** Source type */
  type: 'cv' | 'portfolio' | 'documents' | 'web' | 'api';
  
  /** Source identifier */
  sourceId: string;
  
  /** Source URL or path */
  location: string;
  
  /** Content weight */
  weight: number;
  
  /** Last updated */
  lastUpdated: Date;
  
  /** Processing status */
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

/**
 * Content chunking configuration
 */
export interface ChunkingConfig {
  /** Chunk size in tokens */
  chunkSize: number;
  
  /** Chunk overlap in tokens */
  chunkOverlap: number;
  
  /** Chunking strategy */
  strategy: 'fixed' | 'semantic' | 'paragraph' | 'sentence';
  
  /** Minimum chunk size */
  minChunkSize: number;
  
  /** Maximum chunks per document */
  maxChunks: number;
}

/**
 * Content filter for knowledge processing
 */
export interface ContentFilter {
  /** Filter type */
  type: 'include' | 'exclude' | 'transform';
  
  /** Filter pattern (regex) */
  pattern: string;
  
  /** Replacement text (for transform filters) */
  replacement?: string;
  
  /** Filter description */
  description: string;
}

/**
 * Query processing configuration
 */
export interface QueryProcessingConfig {
  /** Query expansion enabled */
  expandQuery: boolean;
  
  /** Maximum expanded queries */
  maxExpansions: number;
  
  /** Query rewriting enabled */
  rewriteQuery: boolean;
  
  /** Intent classification */
  intentClassification: {
    /** Enabled */
    enabled: boolean;
    
    /** Known intents */
    intents: string[];
    
    /** Default intent */
    defaultIntent: string;
  };
  
  /** Query validation */
  validation: {
    /** Min query length */
    minLength: number;
    
    /** Max query length */
    maxLength: number;
    
    /** Blocked patterns */
    blockedPatterns: string[];
  };
}

/**
 * Response generation configuration
 */
export interface ResponseGenerationConfig {
  /** Max context chunks to include */
  maxContextChunks: number;
  
  /** Context relevance threshold */
  relevanceThreshold: number;
  
  /** Response style */
  responseStyle: 'professional' | 'casual' | 'technical' | 'friendly';
  
  /** Include sources in response */
  includeSources: boolean;
  
  /** Source citation format */
  citationFormat: 'numbered' | 'inline' | 'footnote';
  
  /** Fallback responses */
  fallbackResponses: string[];
  
  /** Content safety filters */
  safetyFilters: {
    /** Enabled */
    enabled: boolean;
    
    /** Filter level */
    level: 'low' | 'medium' | 'high';
    
    /** Custom filters */
    customFilters: string[];
  };
}

/**
 * RAG embedding data structure
 */
export interface RAGEmbedding {
  /** Unique embedding ID */
  id: string;
  
  /** Text content */
  content: string;
  
  /** Metadata about the content */
  metadata: EmbeddingMetadata;
  
  /** Vector embedding array */
  vector: number[];
  
  /** Token count */
  tokens: number;
  
  /** Creation timestamp */
  createdAt: Date;
}

/**
 * Embedding metadata
 */
export interface EmbeddingMetadata {
  /** CV section this embedding belongs to */
  section: CVSection;
  
  /** Subsection if applicable */
  subsection?: string;
  
  /** Importance score (1-10) */
  importance: number;
  
  /** Date range if applicable */
  dateRange?: {
    start: Date;
    end?: Date;
  };
  
  /** Tags for categorization */
  tags: string[];
  
  /** Source page/document */
  source: string;
  
  /** Keywords extracted from content */
  keywords?: string[];
  
  /** Technologies mentioned in content */
  technologies?: string[];
  
  /** Type of content */
  contentType?: string;
}

/**
 * CV sections for embedding categorization
 */
export enum CVSection {
  PERSONAL = 'personal',
  SUMMARY = 'summary',
  EXPERIENCE = 'experience',
  EDUCATION = 'education',
  SKILLS = 'skills',
  ACHIEVEMENTS = 'achievements',
  PROJECTS = 'projects',
  CERTIFICATIONS = 'certifications',
  PUBLICATIONS = 'publications',
  INTERESTS = 'interests',
  LANGUAGES = 'languages',
  REFERENCES = 'references',
  PORTFOLIO = 'portfolio',
  CUSTOM = 'custom',
  OTHER = 'other'
}