// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Portal Vector Database Configuration Types
 *
 * Vector database configuration for RAG systems in portal generation.
 *
 * @author Gil Klainert
 * @version 1.0.0
 */

/**
 * Vector database configuration
 */
export interface VectorDatabaseConfig {
  /** Database provider */
  provider: VectorDatabaseProvider;

  /** Connection configuration */
  connection: VectorDatabaseConnection;

  /** Index configuration */
  index: VectorIndexConfig;

  /** Query configuration */
  query: QueryConfig;
}

/**
 * Supported vector database providers
 */
export enum VectorDatabaseProvider {
  PINECONE = 'pinecone',
  CHROMA = 'chroma',
  WEAVIATE = 'weaviate',
  QDRANT = 'qdrant',
  FAISS = 'faiss'
}

/**
 * Vector database connection settings
 */
export interface VectorDatabaseConnection {
  /** API endpoint */
  endpoint?: string;

  /** API key for authentication */
  apiKey?: string;

  /** Environment/region */
  environment?: string;

  /** Connection timeout in milliseconds */
  timeout?: number;

  /** Max retry attempts */
  maxRetries?: number;

  /** Connection pooling settings */
  pooling?: ConnectionPoolingConfig;

  /** SSL/TLS configuration */
  ssl?: SSLConfig;
}

/**
 * Vector index configuration
 */
export interface VectorIndexConfig {
  /** Index name */
  name: string;

  /** Vector dimension */
  dimension: number;

  /** Distance metric */
  metric: 'cosine' | 'euclidean' | 'dotproduct' | 'manhattan' | 'hamming';

  /** Index-specific metadata */
  metadata?: Record<string, any>;

  /** Sharding configuration */
  sharding?: ShardingConfig;

  /** Replication settings */
  replication?: ReplicationConfig;
}

/**
 * Query configuration for vector search
 */
export interface QueryConfig {
  /** Top-k results to retrieve */
  topK: number;

  /** Similarity threshold (0.0 to 1.0) */
  threshold: number;

  /** Include metadata in results */
  includeMetadata: boolean;

  /** Include source text in results */
  includeSource: boolean;

  /** Maximum tokens per result */
  maxTokensPerResult?: number;

  /** Query timeout in milliseconds */
  timeout?: number;

  /** Hybrid search configuration */
  hybridSearch?: HybridSearchConfig;
}

/**
 * Connection pooling configuration
 */
export interface ConnectionPoolingConfig {
  /** Minimum pool size */
  minSize: number;

  /** Maximum pool size */
  maxSize: number;

  /** Connection idle timeout */
  idleTimeout: number;

  /** Connection validation interval */
  validationInterval: number;
}

/**
 * SSL/TLS configuration
 */
export interface SSLConfig {
  /** Enable SSL/TLS */
  enabled: boolean;

  /** Verify certificates */
  verifyCertificates: boolean;

  /** CA certificate path */
  caCertPath?: string;

  /** Client certificate path */
  clientCertPath?: string;

  /** Client key path */
  clientKeyPath?: string;
}

/**
 * Index sharding configuration
 */
export interface ShardingConfig {
  /** Number of shards */
  shardCount: number;

  /** Sharding strategy */
  strategy: 'hash' | 'range' | 'custom';

  /** Shard key field */
  shardKey?: string;

  /** Custom sharding function */
  customFunction?: string;
}

/**
 * Replication configuration
 */
export interface ReplicationConfig {
  /** Number of replicas */
  replicas: number;

  /** Replication strategy */
  strategy: 'sync' | 'async' | 'eventual';

  /** Cross-region replication */
  crossRegion?: boolean;

  /** Backup configuration */
  backup?: BackupConfig;
}

/**
 * Backup configuration
 */
export interface BackupConfig {
  /** Enable automatic backups */
  enabled: boolean;

  /** Backup frequency in hours */
  frequency: number;

  /** Retention period in days */
  retentionDays: number;

  /** Backup storage location */
  storageLocation: string;
}

/**
 * Hybrid search configuration
 */
export interface HybridSearchConfig {
  /** Enable keyword search */
  keywordSearch: boolean;

  /** Semantic search weight (0.0 to 1.0) */
  semanticWeight: number;

  /** Keyword search weight (0.0 to 1.0) */
  keywordWeight: number;

  /** Fusion algorithm */
  fusionAlgorithm: 'rrf' | 'weighted_sum' | 'max' | 'min';

  /** Keyword search configuration */
  keywordConfig?: KeywordSearchConfig;
}

/**
 * Keyword search configuration
 */
export interface KeywordSearchConfig {
  /** Search algorithm */
  algorithm: 'bm25' | 'tf_idf' | 'boolean';

  /** Enable stemming */
  enableStemming: boolean;

  /** Enable stop word removal */
  removeStopWords: boolean;

  /** Language for text processing */
  language: string;

  /** Custom analyzer settings */
  analyzer?: AnalyzerConfig;
}

/**
 * Text analyzer configuration
 */
export interface AnalyzerConfig {
  /** Tokenizer type */
  tokenizer: 'standard' | 'keyword' | 'pattern' | 'whitespace';

  /** Character filters */
  charFilters?: string[];

  /** Token filters */
  tokenFilters?: string[];

  /** Custom patterns */
  patterns?: Record<string, string>;
}