// @ts-ignore - Export conflicts/**
 * Storage and CDN type definitions for CVPlus multimedia module
 */

import { MediaFile } from './media.types';
// Removed core dependency for minimal build

// Minimal ErrorDetails interface for local use
interface ErrorDetails {
  message: string;
  code?: string;
  context?: Record<string, unknown>;
}

// ============================================================================
// STORAGE PROVIDER TYPES
// ============================================================================

export type StorageProvider = 'firebase' | 'aws-s3' | 's3' | 'azure-blob' | 'gcs' | 'local';
export type StorageClass = 
  | 'standard' | 'reduced-redundancy' | 'cold' | 'archive' | 'deep-archive'
  | 'STANDARD' | 'REDUCED_REDUNDANCY' | 'COLD' | 'ARCHIVE' | 'DEEP_ARCHIVE';
export type AccessLevel = 'public' | 'private' | 'authenticated' | 'premium';

// ============================================================================
// STORAGE CONFIGURATION
// ============================================================================

export interface StorageConfig {
  /** Primary storage provider */
  provider: StorageProvider;
  
  /** Storage configuration by provider */
  providers: Record<StorageProvider, ProviderConfig>;
  
  /** Default storage class */
  defaultStorageClass: StorageClass;
  
  /** Default access level */
  defaultAccessLevel: AccessLevel;
  
  /** Enable multi-provider backup */
  enableBackup?: boolean;
  
  /** Backup provider configuration */
  backupProvider?: StorageProvider;
  
  /** CDN configuration */
  cdn?: CDNConfig;
  
  /** Storage quotas and limits */
  limits: StorageLimits;
  
  /** Retention policies */
  retention: RetentionPolicy;
}

export interface ProviderConfig {
  /** Provider is enabled */
  enabled: boolean;
  
  /** Provider-specific settings */
  settings: Record<string, unknown>;
  
  /** Authentication configuration */
  auth: AuthConfig;
  
  /** Regional configuration */
  regions?: string[];
  
  /** Default bucket/container */
  defaultBucket: string;
  
  /** Connection timeout */
  timeout?: number;
  
  /** Retry configuration */
  retry?: RetryConfig;
}

export interface AuthConfig {
  /** Authentication type */
  type: 'api-key' | 'service-account' | 'oauth' | 'iam';
  
  /** Credentials */
  credentials: Record<string, string>;
  
  /** Token refresh configuration */
  tokenRefresh?: TokenRefreshConfig;
}

export interface TokenRefreshConfig {
  /** Auto refresh tokens */
  autoRefresh: boolean;
  
  /** Refresh threshold (seconds before expiry) */
  refreshThreshold: number;
  
  /** Maximum refresh attempts */
  maxAttempts: number;
}

export interface RetryConfig {
  /** Maximum retry attempts */
  maxAttempts: number;
  
  /** Initial delay (ms) */
  initialDelay: number;
  
  /** Delay multiplier for exponential backoff */
  backoffMultiplier: number;
  
  /** Maximum delay (ms) */
  maxDelay: number;
  
  /** Jitter for retry timing */
  jitter: boolean;
}

// ============================================================================
// CDN CONFIGURATION
// ============================================================================

export interface CDNConfig {
  /** CDN provider */
  provider: CDNProvider;
  
  /** CDN endpoint URL */
  endpoint: string;
  
  /** Custom domains */
  customDomains?: string[];
  
  /** Cache configuration */
  cache: CDNCacheConfig;
  
  /** Security settings */
  security: CDNSecurityConfig;
  
  /** Geographic distribution */
  geoDistribution?: GeoDistributionConfig;
  
  /** Compression settings */
  compression: CompressionConfig;
  
  /** Image optimization */
  imageOptimization?: ImageCDNConfig;
}

export type CDNProvider = 'cloudfront' | 'cloudflare' | 'fastly' | 'azure-cdn' | 'gcs-cdn';

export interface CDNCacheConfig {
  /** Default TTL (seconds) */
  defaultTTL: number;
  
  /** Cache rules by content type */
  rules: CacheRule[];
  
  /** Browser cache settings */
  browserCache: BrowserCacheConfig;
  
  /** Cache invalidation settings */
  invalidation: InvalidationConfig;
}

export interface CacheRule {
  /** Content pattern (glob or regex) */
  pattern: string;
  
  /** TTL for this rule */
  ttl: number;
  
  /** Cache behavior */
  behavior: CacheBehavior;
  
  /** Headers to include in cache key */
  varyHeaders?: string[];
}

export type CacheBehavior = 'cache' | 'no-cache' | 'private' | 'public';

export interface BrowserCacheConfig {
  /** Enable browser caching */
  enabled: boolean;
  
  /** Max age for browser cache */
  maxAge: number;
  
  /** Use immutable caching */
  immutable: boolean;
  
  /** ETags enabled */
  etags: boolean;
}

export interface InvalidationConfig {
  /** Auto invalidation on update */
  autoInvalidate: boolean;
  
  /** Batch invalidations */
  batchInvalidations: boolean;
  
  /** Max invalidations per batch */
  maxBatchSize: number;
  
  /** Invalidation delay (ms) */
  delay: number;
}

export interface CDNSecurityConfig {
  /** HTTPS only */
  httpsOnly: boolean;
  
  /** HSTS settings */
  hsts?: HSTSConfig;
  
  /** Access control */
  accessControl: AccessControlConfig;
  
  /** Rate limiting */
  rateLimiting?: RateLimitingConfig;
  
  /** WAF settings */
  waf?: WAFConfig;
}

export interface HSTSConfig {
  /** HSTS enabled */
  enabled: boolean;
  
  /** Max age (seconds) */
  maxAge: number;
  
  /** Include subdomains */
  includeSubdomains: boolean;
  
  /** Preload */
  preload: boolean;
}

export interface AccessControlConfig {
  /** Allowed origins */
  allowedOrigins: string[];
  
  /** Referrer restrictions */
  referrerRestrictions?: string[];
  
  /** IP restrictions */
  ipRestrictions?: IPRestriction[];
  
  /** Geographic restrictions */
  geoRestrictions?: GeoRestriction[];
}

export interface IPRestriction {
  /** IP address or CIDR */
  ip: string;
  
  /** Allow or deny */
  action: 'allow' | 'deny';
  
  /** Description */
  description?: string;
}

export interface GeoRestriction {
  /** Country codes */
  countries: string[];
  
  /** Allow or deny */
  action: 'allow' | 'deny';
  
  /** Description */
  description?: string;
}

export interface RateLimitingConfig {
  /** Requests per second */
  requestsPerSecond: number;
  
  /** Burst capacity */
  burstCapacity: number;
  
  /** Rate limiting by IP */
  byIP: boolean;
  
  /** Rate limiting by user */
  byUser?: boolean;
  
  /** Rate limiting by API key */
  byApiKey?: boolean;
}

export interface WAFConfig {
  /** WAF enabled */
  enabled: boolean;
  
  /** WAF rules */
  rules: WAFRule[];
  
  /** Default action */
  defaultAction: 'allow' | 'deny';
}

export interface WAFRule {
  /** Rule name */
  name: string;
  
  /** Rule condition */
  condition: string;
  
  /** Action to take */
  action: 'allow' | 'deny' | 'challenge';
  
  /** Priority */
  priority: number;
}

export interface GeoDistributionConfig {
  /** Edge locations */
  edgeLocations: EdgeLocation[];
  
  /** Origin failover */
  originFailover?: OriginFailoverConfig;
  
  /** Load balancing */
  loadBalancing?: LoadBalancingConfig;
}

export interface EdgeLocation {
  /** Location identifier */
  id: string;
  
  /** Region */
  region: string;
  
  /** Country */
  country: string;
  
  /** City */
  city?: string;
  
  /** Enabled */
  enabled: boolean;
  
  /** Priority */
  priority?: number;
}

export interface OriginFailoverConfig {
  /** Enable failover */
  enabled: boolean;
  
  /** Primary origin */
  primaryOrigin: string;
  
  /** Secondary origins */
  secondaryOrigins: string[];
  
  /** Health check settings */
  healthCheck: HealthCheckConfig;
}

export interface LoadBalancingConfig {
  /** Load balancing method */
  method: 'round-robin' | 'least-connections' | 'ip-hash' | 'geographic';
  
  /** Health checks enabled */
  healthChecks: boolean;
  
  /** Session persistence */
  sessionPersistence?: boolean;
}

export interface HealthCheckConfig {
  /** Check interval (seconds) */
  interval: number;
  
  /** Timeout (seconds) */
  timeout: number;
  
  /** Healthy threshold */
  healthyThreshold: number;
  
  /** Unhealthy threshold */
  unhealthyThreshold: number;
  
  /** Check path */
  path: string;
  
  /** Expected status codes */
  expectedStatusCodes: number[];
}

export interface CompressionConfig {
  /** Enable compression */
  enabled: boolean;
  
  /** Compression types */
  types: CompressionType[];
  
  /** Minimum file size for compression */
  minSize: number;
  
  /** Maximum file size for compression */
  maxSize: number;
  
  /** Compression level */
  level: number;
}

export type CompressionType = 'gzip' | 'brotli' | 'deflate';

export interface ImageCDNConfig {
  /** Enable image optimization */
  enabled: boolean;
  
  /** Auto WebP conversion */
  autoWebP: boolean;
  
  /** Auto AVIF conversion */
  autoAVIF: boolean;
  
  /** Resize on demand */
  resizeOnDemand: boolean;
  
  /** Quality optimization */
  qualityOptimization: boolean;
  
  /** Progressive JPEG */
  progressiveJPEG: boolean;
  
  /** Supported operations */
  supportedOperations: ImageOperation[];
}

export type ImageOperation = 'resize' | 'crop' | 'rotate' | 'flip' | 'blur' | 'sharpen' | 'brightness' | 'contrast' | 'saturation';

// ============================================================================
// STORAGE LIMITS AND QUOTAS
// ============================================================================

export interface StorageLimits {
  /** Maximum file size (bytes) */
  maxFileSize: number;
  
  /** Maximum total storage (bytes) */
  maxTotalStorage?: number;
  
  /** Maximum files per user */
  maxFilesPerUser?: number;
  
  /** Maximum upload rate (bytes/second) */
  maxUploadRate?: number;
  
  /** Maximum concurrent uploads */
  maxConcurrentUploads: number;
  
  /** Allowed file types */
  allowedFileTypes: string[];
  
  /** Blocked file types */
  blockedFileTypes?: string[];
  
  /** File name restrictions */
  fileNameRestrictions?: FileNameRestrictions;
}

export interface FileNameRestrictions {
  /** Maximum filename length */
  maxLength: number;
  
  /** Allowed characters pattern */
  allowedPattern?: string;
  
  /** Reserved names */
  reservedNames?: string[];
  
  /** Case sensitive */
  caseSensitive: boolean;
}

export interface RetentionPolicy {
  /** Default retention period (days) */
  defaultRetention: number;
  
  /** Retention by access level */
  retentionByAccess: Record<AccessLevel, number>;
  
  /** Retention by file type */
  retentionByType?: Record<string, number>;
  
  /** Auto-cleanup enabled */
  autoCleanup: boolean;
  
  /** Cleanup schedule */
  cleanupSchedule?: string;
  
  /** Notification before deletion */
  notifyBeforeDeletion: boolean;
  
  /** Notification period (days) */
  notificationPeriod: number;
}

// ============================================================================
// UPLOAD AND DOWNLOAD INTERFACES
// ============================================================================

export interface UploadOptions {
  /** Storage path */
  path?: string;
  
  /** Storage class */
  storageClass?: StorageClass;
  
  /** Access level */
  accessLevel?: AccessLevel;
  
  /** Content type override */
  contentType?: string;
  
  /** Custom metadata */
  metadata?: Record<string, string>;
  
  /** Upload encryption */
  encryption?: EncryptionOptions;
  
  /** Progress callback */
  onProgress?: (progress: UploadProgress) => void;
  
  /** Chunk size for multipart upload */
  chunkSize?: number;
  
  /** Enable resumable upload */
  resumable?: boolean;
  
  /** Upload timeout (ms) */
  timeout?: number;
  
  /** Retry configuration */
  retry?: RetryConfig;
  
  /** Generate CDN URL */
  generateCDNUrl?: boolean;
  
  /** Cache settings */
  cache?: FileCacheSettings;
}

export interface EncryptionOptions {
  /** Encryption enabled */
  enabled: boolean;
  
  /** Encryption algorithm */
  algorithm: EncryptionAlgorithm;
  
  /** Encryption key management */
  keyManagement: KeyManagement;
  
  /** Custom encryption key */
  customKey?: string;
}

export type EncryptionAlgorithm = 'AES-256-GCM' | 'AES-256-CBC' | 'ChaCha20-Poly1305';
export type KeyManagement = 'provider-managed' | 'customer-managed' | 'bring-your-own-key';

export interface FileCacheSettings {
  /** Cache TTL (seconds) */
  ttl?: number;
  
  /** Browser cache max age */
  browserCacheMaxAge?: number;
  
  /** Cache-Control header */
  cacheControl?: string;
  
  /** ETag generation */
  generateETag?: boolean;
}

export interface DownloadOptions {
  /** Include metadata */
  includeMetadata?: boolean;
  
  /** Response type */
  responseType?: 'blob' | 'buffer' | 'stream' | 'json';
  
  /** Range download */
  range?: DownloadRange;
  
  /** Download timeout (ms) */
  timeout?: number;
  
  /** Progress callback */
  onProgress?: (progress: DownloadProgress) => void;
}

export interface DownloadRange {
  /** Start byte */
  start: number;
  
  /** End byte */
  end?: number;
}

export interface DownloadProgress {
  /** Bytes downloaded */
  bytesDownloaded: number;
  
  /** Total bytes */
  totalBytes: number;
  
  /** Download percentage */
  percentage: number;
  
  /** Download speed (bytes/second) */
  downloadSpeed: number;
  
  /** Estimated time remaining (ms) */
  estimatedTimeRemaining: number;
}

// ============================================================================
// FILE INFORMATION AND METADATA
// ============================================================================

export interface FileInfo {
  /** File path */
  path: string;
  
  /** File name */
  name: string;
  
  /** File size */
  size: number;
  
  /** Content type */
  contentType: string;
  
  /** ETag */
  etag: string;
  
  /** Last modified */
  lastModified: Date;
  
  /** Creation date */
  createdAt: Date;
  
  /** Storage class */
  storageClass: StorageClass;
  
  /** Access level */
  accessLevel: AccessLevel;
  
  /** Custom metadata */
  metadata: Record<string, string>;
  
  /** Encryption information */
  encryption?: FileEncryptionInfo;
  
  /** Storage provider */
  provider: StorageProvider;
  
  /** Storage location/region */
  location: string;
  
  /** Public URL */
  publicUrl?: string;
  
  /** CDN URL */
  cdnUrl?: string;
  
  /** Signed URL expiration */
  signedUrlExpiration?: Date;
}

export interface FileEncryptionInfo {
  /** Is encrypted */
  encrypted: boolean;
  
  /** Encryption algorithm */
  algorithm: EncryptionAlgorithm;
  
  /** Key management type */
  keyManagement: KeyManagement;
  
  /** Encryption key ID */
  keyId?: string;
}

// ============================================================================
// STORAGE OPERATIONS
// ============================================================================

export interface StorageService {
  /** Upload file */
  upload(file: MediaFile, options?: UploadOptions): Promise<UploadResult>;
  
  /** Download file */
  download(path: string, options?: DownloadOptions): Promise<MediaFile>;
  
  /** Get file information */
  getFileInfo(path: string): Promise<FileInfo>;
  
  /** Delete file */
  delete(path: string): Promise<void>;
  
  /** List files */
  list(prefix?: string, options?: ListOptions): Promise<FileInfo[]>;
  
  /** Copy file */
  copy(sourcePath: string, destinationPath: string): Promise<void>;
  
  /** Move file */
  move(sourcePath: string, destinationPath: string): Promise<void>;
  
  /** Generate signed URL */
  generateSignedUrl(path: string, options?: SignedUrlOptions): Promise<string>;
  
  /** Check if file exists */
  exists(path: string): Promise<boolean>;
  
  /** Get storage usage */
  getUsage(): Promise<StorageUsage>;
}

export interface ListOptions {
  /** Maximum results */
  maxResults?: number;
  
  /** Pagination token */
  pageToken?: string;
  
  /** Include metadata */
  includeMetadata?: boolean;
  
  /** Filter by file type */
  fileType?: string;
  
  /** Filter by date range */
  dateRange?: DateRange;
  
  /** Sort options */
  sort?: SortOptions;
}

export interface DateRange {
  /** Start date */
  start: Date;
  
  /** End date */
  end: Date;
}

export interface SortOptions {
  /** Sort field */
  field: 'name' | 'size' | 'modified' | 'created';
  
  /** Sort order */
  order: 'asc' | 'desc';
}

export interface SignedUrlOptions {
  /** URL expiration (seconds from now) */
  expiresIn: number;
  
  /** HTTP method allowed */
  method?: 'GET' | 'PUT' | 'POST' | 'DELETE';
  
  /** Content type restriction */
  contentType?: string;
  
  /** Additional query parameters */
  queryParameters?: Record<string, string>;
  
  /** Response headers */
  responseHeaders?: Record<string, string>;
}

export interface StorageUsage {
  /** Total storage used (bytes) */
  totalUsed: number;
  
  /** Storage limit (bytes) */
  totalLimit?: number;
  
  /** Usage percentage */
  usagePercentage: number;
  
  /** File count */
  fileCount: number;
  
  /** Usage by file type */
  usageByType: Record<string, number>;
  
  /** Usage by access level */
  usageByAccess: Record<AccessLevel, number>;
  
  /** Monthly usage trend */
  monthlyUsage?: MonthlyUsage[];
}

export interface MonthlyUsage {
  /** Month */
  month: string;
  
  /** Storage used */
  storageUsed: number;
  
  /** Transfer used */
  transferUsed: number;
  
  /** Number of requests */
  requests: number;
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

export interface BatchStorageOperation {
  /** Operation type */
  type: 'upload' | 'download' | 'delete' | 'copy' | 'move';
  
  /** Operation parameters */
  parameters: Record<string, unknown>;
  
  /** Operation priority */
  priority?: number;
}

export interface BatchStorageResult {
  /** Batch operation ID */
  batchId: string;
  
  /** Total operations */
  totalOperations: number;
  
  /** Successful operations */
  successfulOperations: number;
  
  /** Failed operations */
  failedOperations: number;
  
  /** Operation results */
  results: BatchOperationResult[];
  
  /** Overall status */
  status: 'completed' | 'partial' | 'failed';
  
  /** Batch processing time */
  processingTime: number;
}

export interface BatchOperationResult {
  /** Operation index */
  operationIndex: number;
  
  /** Operation status */
  status: 'success' | 'failed';
  
  /** Operation result */
  result?: unknown;
  
  /** Error details (if failed) */
  error?: ErrorDetails;
  
  /** Operation processing time */
  processingTime: number;
}

/**
 * Upload result interface
 */
export interface UploadResult {
  /** File URL */
  url: string;
  
  /** File key/path */
  key: string;
  
  /** File size in bytes */
  size: number;
  
  /** Content type */
  contentType: string;
  
  /** ETag */
  etag?: string;
  
  /** Upload completion timestamp */
  completedAt: Date;
}

/**
 * Upload progress interface
 */
export interface UploadProgress {
  /** Session ID */
  sessionId: string;
  
  /** File being uploaded */
  file: File;
  
  /** Upload status */
  status: 'pending' | 'uploading' | 'complete' | 'failed';
  
  /** Bytes uploaded */
  bytesUploaded: number;
  
  /** Total bytes */
  totalBytes: number;
  
  /** Progress percentage */
  percentage: number;
  
  /** Upload speed in bytes/sec */
  uploadSpeed?: number;
  
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining?: number;
}

/**
 * Media metadata interface
 */
export interface MediaMetadata {
  /** File name */
  fileName: string;
  
  /** File size */
  size: number;
  
  /** MIME type */
  mimeType: string;
  
  /** Upload timestamp */
  uploadedAt: Date;
  
  /** Download timestamp */
  downloadedAt?: Date;
  
  /** File dimensions (for images/videos) */
  width?: number;
  height?: number;
  
  /** Duration (for audio/video) */
  duration?: number;
  
  /** Additional metadata */
  [key: string]: unknown;
}