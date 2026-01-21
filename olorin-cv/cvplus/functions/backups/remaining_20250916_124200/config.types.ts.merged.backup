// @ts-ignore - Export conflicts/**
 * Configuration types for CVPlus multimedia module
 */

import { QualityLevel } from './media.types';
import { StorageProvider, CDNProvider } from './storage.types';
import { ProcessingMode } from './processing.types';
import { CompressionAlgorithm } from './audio.types';
import { 
  ImageProcessingOptions,
  VideoProcessingOptions,
  AudioProcessingOptions 
} from './index';

// ============================================================================
// ENVIRONMENT AND SERVICE TYPES
// ============================================================================

export type MultimediaEnvironment = 'development' | 'staging' | 'production';

export interface ServiceConfig {
  timeout: number;
  retries: number;
  circuitBreaker: {
    threshold: number;
    timeout: number;
  };
  rateLimit?: {
    requests: number;
    window: number;
  };
}

// ============================================================================
// MAIN CONFIGURATION INTERFACE
// ============================================================================

export interface MultimediaModuleConfig {
  /** General configuration */
  general: GeneralConfig;
  
  /** Storage configuration */
  storage: StorageModuleConfig;
  
  /** CDN configuration */
  cdn?: CDNModuleConfig;
  
  /** Processing configuration */
  processing: ProcessingModuleConfig;
  
  /** Security configuration */
  security: SecurityModuleConfig;
  
  /** Performance configuration */
  performance: PerformanceModuleConfig;
  
  /** Monitoring configuration */
  monitoring: MonitoringModuleConfig;
  
  /** Feature flags */
  features: FeatureFlags;
  
  /** Environment-specific settings */
  environment: EnvironmentConfig;
  
  /** Integration settings */
  integrations: IntegrationConfig;
}

// ============================================================================
// GENERAL CONFIGURATION
// ============================================================================

export interface GeneralConfig {
  /** Module version */
  version: string;
  
  /** Module name */
  name: string;
  
  /** Debug mode */
  debug: boolean;
  
  /** Logging configuration */
  logging: LoggingConfig;
  
  /** Default locale */
  defaultLocale: string;
  
  /** Supported locales */
  supportedLocales: string[];
  
  /** Timezone */
  timezone: string;
  
  /** API rate limits */
  rateLimits: RateLimitsConfig;
  
  /** Request timeout */
  requestTimeoutMs: number;
  
  /** Retry configuration */
  retryConfig: RetryConfig;
}

export interface LoggingConfig {
  /** Log level */
  level: LogLevel;
  
  /** Log format */
  format: LogFormat;
  
  /** Log destinations */
  destinations: LogDestination[];
  
  /** Include stack traces */
  includeStackTrace: boolean;
  
  /** Include request details */
  includeRequestDetails: boolean;
  
  /** Log retention days */
  retentionDays: number;
  
  /** Structured logging */
  structured: boolean;
  
  /** Log sampling rate */
  samplingRate?: number;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export type LogFormat = 'json' | 'text' | 'structured' | 'custom';
export type LogDestination = 'console' | 'file' | 'database' | 'external' | 'syslog';

export interface RateLimitsConfig {
  /** Requests per minute */
  requestsPerMinute: number;
  
  /** Uploads per hour */
  uploadsPerHour: number;
  
  /** Processing jobs per hour */
  processingJobsPerHour: number;
  
  /** API calls per minute */
  apiCallsPerMinute: number;
  
  /** Burst allowance */
  burstAllowance: number;
  
  /** Rate limit by user */
  byUser: boolean;
  
  /** Rate limit by IP */
  byIP: boolean;
}

export interface RetryConfig {
  /** Maximum attempts */
  maxAttempts: number;
  
  /** Base delay (ms) */
  baseDelayMs: number;
  
  /** Max delay (ms) */
  maxDelayMs: number;
  
  /** Backoff multiplier */
  backoffMultiplier: number;
  
  /** Jitter enabled */
  jitter: boolean;
  
  /** Retryable error codes */
  retryableErrorCodes: string[];
}

// ============================================================================
// STORAGE CONFIGURATION
// ============================================================================

export interface StorageModuleConfig {
  /** Primary storage provider */
  primaryProvider: StorageProvider;
  
  /** Provider configurations */
  providers: Record<StorageProvider, StorageProviderConfig>;
  
  /** Backup configuration */
  backup: BackupConfig;
  
  /** File organization */
  fileOrganization: FileOrganizationConfig;
  
  /** Access control */
  accessControl: AccessControlConfig;
  
  /** Cleanup policies */
  cleanup: CleanupConfig;
  
  /** Encryption settings */
  encryption: EncryptionConfig;
  
  /** Quota management */
  quotaManagement: QuotaManagementConfig;
}

export interface StorageProviderConfig {
  /** Provider enabled */
  enabled: boolean;
  
  /** Provider-specific settings */
  settings: Record<string, unknown>;
  
  /** Authentication */
  authentication: AuthenticationConfig;
  
  /** Default bucket/container */
  defaultBucket: string;
  
  /** Region */
  region?: string;
  
  /** Endpoint URL */
  endpointUrl?: string;
  
  /** Connection timeout */
  connectionTimeoutMs: number;
  
  /** Request timeout */
  requestTimeoutMs: number;
  
  /** Max concurrent connections */
  maxConcurrentConnections: number;
  
  /** Retry settings */
  retrySettings: ProviderRetrySettings;
}

export interface AuthenticationConfig {
  /** Authentication type */
  type: AuthenticationType;
  
  /** Credentials */
  credentials: Record<string, string>;
  
  /** Token refresh settings */
  tokenRefresh?: TokenRefreshConfig;
  
  /** Security settings */
  security?: AuthSecurityConfig;
}

export type AuthenticationType = 'api-key' | 'oauth' | 'service-account' | 'iam' | 'basic' | 'custom';

export interface TokenRefreshConfig {
  /** Auto refresh */
  autoRefresh: boolean;
  
  /** Refresh threshold (seconds) */
  refreshThresholdSeconds: number;
  
  /** Max refresh attempts */
  maxRefreshAttempts: number;
  
  /** Refresh endpoint */
  refreshEndpoint?: string;
}

export interface AuthSecurityConfig {
  /** Use secure connections only */
  secureOnly: boolean;
  
  /** Certificate validation */
  validateCertificates: boolean;
  
  /** Custom CA certificates */
  customCACerts?: string[];
  
  /** Client certificates */
  clientCerts?: ClientCertificateConfig;
}

export interface ClientCertificateConfig {
  /** Certificate file path */
  certFile: string;
  
  /** Private key file path */
  keyFile: string;
  
  /** Passphrase */
  passphrase?: string;
}

export interface ProviderRetrySettings {
  /** Max retry attempts */
  maxAttempts: number;
  
  /** Retry delay (ms) */
  retryDelayMs: number;
  
  /** Exponential backoff */
  exponentialBackoff: boolean;
  
  /** Retryable status codes */
  retryableStatusCodes: number[];
}

export interface BackupConfig {
  /** Backup enabled */
  enabled: boolean;
  
  /** Backup provider */
  provider: StorageProvider;
  
  /** Backup frequency */
  frequency: BackupFrequency;
  
  /** Backup retention */
  retention: BackupRetentionConfig;
  
  /** Incremental backups */
  incremental: boolean;
  
  /** Backup encryption */
  encryption: boolean;
  
  /** Backup verification */
  verification: boolean;
  
  /** Backup scheduling */
  scheduling?: BackupSchedulingConfig;
}

export type BackupFrequency = 'continuous' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';

export interface BackupRetentionConfig {
  /** Daily backups to keep */
  dailyBackups: number;
  
  /** Weekly backups to keep */
  weeklyBackups: number;
  
  /** Monthly backups to keep */
  monthlyBackups: number;
  
  /** Yearly backups to keep */
  yearlyBackups: number;
  
  /** Custom retention rules */
  customRules?: RetentionRule[];
}

export interface RetentionRule {
  /** Rule name */
  name: string;
  
  /** Rule condition */
  condition: string;
  
  /** Retention period (days) */
  retentionDays: number;
  
  /** Rule priority */
  priority: number;
}

export interface BackupSchedulingConfig {
  /** Backup time */
  time: string;
  
  /** Timezone */
  timezone: string;
  
  /** Backup window */
  window: BackupWindow;
  
  /** Exclude patterns */
  excludePatterns?: string[];
  
  /** Include patterns */
  includePatterns?: string[];
}

export interface BackupWindow {
  /** Start time */
  startTime: string;
  
  /** End time */
  endTime: string;
  
  /** Days of week */
  daysOfWeek: string[];
}

export interface FileOrganizationConfig {
  /** Directory structure */
  directoryStructure: DirectoryStructure;
  
  /** File naming */
  fileNaming: FileNamingConfig;
  
  /** File categorization */
  categorization: FileCategorization;
  
  /** Metadata storage */
  metadataStorage: MetadataStorageConfig;
}

export interface DirectoryStructure {
  /** Structure type */
  type: DirectoryStructureType;
  
  /** Custom pattern */
  pattern?: string;
  
  /** Date format */
  dateFormat?: string;
  
  /** Include user ID */
  includeUserId: boolean;
  
  /** Include file type */
  includeFileType: boolean;
  
  /** Max depth */
  maxDepth: number;
}

export type DirectoryStructureType = 'flat' | 'date-based' | 'user-based' | 'type-based' | 'custom';

export interface FileNamingConfig {
  /** Naming strategy */
  strategy: FileNamingStrategy;
  
  /** Include timestamp */
  includeTimestamp: boolean;
  
  /** Include hash */
  includeHash: boolean;
  
  /** Include version */
  includeVersion: boolean;
  
  /** Custom prefix */
  customPrefix?: string;
  
  /** Custom suffix */
  customSuffix?: string;
  
  /** Case handling */
  caseHandling: CaseHandling;
  
  /** Special character handling */
  specialCharacterHandling: SpecialCharacterHandling;
}

export type FileNamingStrategy = 'original' | 'uuid' | 'sequential' | 'hash-based' | 'custom';
export type CaseHandling = 'preserve' | 'lowercase' | 'uppercase' | 'title-case';
export type SpecialCharacterHandling = 'preserve' | 'replace' | 'remove' | 'encode';

export interface FileCategorization {
  /** Auto-categorization */
  autoCategorization: boolean;
  
  /** Categories */
  categories: FileCategory[];
  
  /** Default category */
  defaultCategory: string;
  
  /** Custom rules */
  customRules: CategorizationRule[];
}

export interface FileCategory {
  /** Category name */
  name: string;
  
  /** Category description */
  description: string;
  
  /** File patterns */
  patterns: string[];
  
  /** Storage settings */
  storageSettings?: CategoryStorageSettings;
  
  /** Processing settings */
  processingSettings?: CategoryProcessingSettings;
}

export interface CategoryStorageSettings {
  /** Storage class */
  storageClass?: string;
  
  /** Retention period */
  retentionDays?: number;
  
  /** Compression */
  compression?: boolean;
  
  /** Encryption */
  encryption?: boolean;
}

export interface CategoryProcessingSettings {
  /** Auto-processing */
  autoProcessing?: boolean;
  
  /** Processing options */
  processingOptions?: Record<string, unknown>;
  
  /** Quality settings */
  qualitySettings?: QualitySettings;
}

export interface QualitySettings {
  /** Default quality */
  defaultQuality: QualityLevel;
  
  /** Quality levels */
  availableQualities: QualityLevel[];
  
  /** Auto-optimize */
  autoOptimize: boolean;
  
  /** Quality targets */
  qualityTargets?: QualityTarget[];
}

export interface QualityTarget {
  /** Target name */
  name: string;
  
  /** Quality level */
  quality: QualityLevel;
  
  /** File size target */
  fileSizeTarget?: number;
  
  /** Performance target */
  performanceTarget?: number;
}

export interface CategorizationRule {
  /** Rule name */
  name: string;
  
  /** Rule condition */
  condition: string;
  
  /** Target category */
  targetCategory: string;
  
  /** Rule priority */
  priority: number;
  
  /** Rule enabled */
  enabled: boolean;
}

export interface MetadataStorageConfig {
  /** Store metadata separately */
  separateStorage: boolean;
  
  /** Metadata format */
  format: MetadataFormat;
  
  /** Include system metadata */
  includeSystemMetadata: boolean;
  
  /** Include custom metadata */
  includeCustomMetadata: boolean;
  
  /** Metadata indexing */
  indexing: MetadataIndexingConfig;
}

export type MetadataFormat = 'json' | 'xml' | 'yaml' | 'binary' | 'custom';

export interface MetadataIndexingConfig {
  /** Indexing enabled */
  enabled: boolean;
  
  /** Searchable fields */
  searchableFields: string[];
  
  /** Full-text search */
  fullTextSearch: boolean;
  
  /** Index refresh interval */
  refreshIntervalMinutes: number;
}

export interface AccessControlConfig {
  /** Default access level */
  defaultAccessLevel: AccessLevel;
  
  /** Access control rules */
  rules: AccessControlRule[];
  
  /** Authentication required */
  authenticationRequired: boolean;
  
  /** Authorization provider */
  authorizationProvider?: string;
  
  /** Session management */
  sessionManagement: SessionManagementConfig;
}

export type AccessLevel = 'public' | 'authenticated' | 'private' | 'restricted';

export interface AccessControlRule {
  /** Rule name */
  name: string;
  
  /** Resource pattern */
  resourcePattern: string;
  
  /** Required permissions */
  requiredPermissions: string[];
  
  /** Allowed users */
  allowedUsers?: string[];
  
  /** Allowed roles */
  allowedRoles?: string[];
  
  /** IP restrictions */
  ipRestrictions?: string[];
  
  /** Time restrictions */
  timeRestrictions?: TimeRestriction[];
}

export interface TimeRestriction {
  /** Days of week */
  daysOfWeek: string[];
  
  /** Start time */
  startTime: string;
  
  /** End time */
  endTime: string;
  
  /** Timezone */
  timezone: string;
}

export interface SessionManagementConfig {
  /** Session timeout */
  timeoutMinutes: number;
  
  /** Session renewal */
  renewalEnabled: boolean;
  
  /** Concurrent sessions */
  maxConcurrentSessions: number;
  
  /** Session storage */
  sessionStorage: SessionStorageConfig;
}

export interface SessionStorageConfig {
  /** Storage type */
  type: 'memory' | 'database' | 'redis' | 'custom';
  
  /** Storage settings */
  settings: Record<string, unknown>;
  
  /** Encryption */
  encryption: boolean;
}

export interface CleanupConfig {
  /** Auto-cleanup enabled */
  enabled: boolean;
  
  /** Cleanup schedule */
  schedule: CleanupSchedule;
  
  /** Cleanup rules */
  rules: CleanupRule[];
  
  /** Dry run mode */
  dryRun: boolean;
  
  /** Notification settings */
  notifications?: CleanupNotifications;
}

export interface CleanupSchedule {
  /** Cleanup frequency */
  frequency: CleanupFrequency;
  
  /** Cleanup time */
  time?: string;
  
  /** Cleanup days */
  days?: string[];
  
  /** Custom cron expression */
  cronExpression?: string;
}

export type CleanupFrequency = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';

export interface CleanupRule {
  /** Rule name */
  name: string;
  
  /** Rule condition */
  condition: CleanupCondition;
  
  /** Cleanup action */
  action: CleanupAction;
  
  /** Rule priority */
  priority: number;
  
  /** Rule enabled */
  enabled: boolean;
}

export interface CleanupCondition {
  /** File age (days) */
  fileAgeDays?: number;
  
  /** File size */
  fileSize?: FileSizeCondition;
  
  /** File type */
  fileType?: string[];
  
  /** Access pattern */
  accessPattern?: AccessPatternCondition;
  
  /** Custom condition */
  customCondition?: string;
}

export interface FileSizeCondition {
  /** Operator */
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  
  /** Size value */
  value: number;
  
  /** Size unit */
  unit: 'bytes' | 'kb' | 'mb' | 'gb' | 'tb';
}

export interface AccessPatternCondition {
  /** Last accessed days ago */
  lastAccessedDays?: number;
  
  /** Access count threshold */
  accessCountThreshold?: number;
  
  /** Time period for access count */
  accessCountPeriodDays?: number;
}

export interface CleanupAction {
  /** Action type */
  type: CleanupActionType;
  
  /** Action parameters */
  parameters?: Record<string, unknown>;
  
  /** Confirmation required */
  confirmationRequired?: boolean;
  
  /** Backup before cleanup */
  backupBeforeCleanup?: boolean;
}

export type CleanupActionType = 'delete' | 'archive' | 'move' | 'compress' | 'custom';

export interface CleanupNotifications {
  /** Notification enabled */
  enabled: boolean;
  
  /** Notification channels */
  channels: string[];
  
  /** Summary frequency */
  summaryFrequency: 'daily' | 'weekly' | 'monthly';
  
  /** Include statistics */
  includeStatistics: boolean;
}

export interface EncryptionConfig {
  /** Encryption enabled */
  enabled: boolean;
  
  /** Encryption at rest */
  atRest: EncryptionAtRestConfig;
  
  /** Encryption in transit */
  inTransit: EncryptionInTransitConfig;
  
  /** Key management */
  keyManagement: KeyManagementConfig;
}

export interface EncryptionAtRestConfig {
  /** Algorithm */
  algorithm: EncryptionAlgorithm;
  
  /** Key size */
  keySize: number;
  
  /** Provider managed */
  providerManaged: boolean;
  
  /** Custom key */
  customKey?: string;
}

export type EncryptionAlgorithm = 'AES-256-GCM' | 'AES-256-CBC' | 'ChaCha20-Poly1305';

export interface EncryptionInTransitConfig {
  /** TLS version */
  tlsVersion: string;
  
  /** Cipher suites */
  cipherSuites?: string[];
  
  /** Certificate validation */
  validateCertificates: boolean;
  
  /** Custom certificates */
  customCertificates?: string[];
}

export interface KeyManagementConfig {
  /** Key management service */
  service: KeyManagementService;
  
  /** Key rotation */
  keyRotation: KeyRotationConfig;
  
  /** Key backup */
  keyBackup: boolean;
  
  /** Access control */
  accessControl: KeyAccessControlConfig;
}

export type KeyManagementService = 'aws-kms' | 'azure-keyvault' | 'gcp-kms' | 'hashicorp-vault' | 'custom';

export interface KeyRotationConfig {
  /** Auto-rotation */
  autoRotation: boolean;
  
  /** Rotation frequency (days) */
  rotationFrequencyDays: number;
  
  /** Grace period (days) */
  gracePeriodDays: number;
  
  /** Notification before rotation */
  notificationBeforeRotation: boolean;
}

export interface KeyAccessControlConfig {
  /** Allowed users */
  allowedUsers: string[];
  
  /** Allowed roles */
  allowedRoles: string[];
  
  /** IP restrictions */
  ipRestrictions?: string[];
  
  /** Time restrictions */
  timeRestrictions?: TimeRestriction[];
}

export interface QuotaManagementConfig {
  /** Quota enforcement */
  enforcement: QuotaEnforcementConfig;
  
  /** Quota types */
  quotaTypes: QuotaTypeConfig[];
  
  /** Usage monitoring */
  usageMonitoring: UsageMonitoringConfig;
  
  /** Quota notifications */
  notifications: QuotaNotificationConfig;
}

export interface QuotaEnforcementConfig {
  /** Enforcement enabled */
  enabled: boolean;
  
  /** Soft limits */
  softLimits: boolean;
  
  /** Grace period */
  gracePeriodHours: number;
  
  /** Overage handling */
  overageHandling: OverageHandlingConfig;
}

export interface OverageHandlingConfig {
  /** Allow overage */
  allowOverage: boolean;
  
  /** Overage limit */
  overageLimit?: number;
  
  /** Overage cost */
  overageCost?: number;
  
  /** Auto-upgrade */
  autoUpgrade?: boolean;
}

export interface QuotaTypeConfig {
  /** Quota type */
  type: QuotaType;
  
  /** Default limit */
  defaultLimit: number;
  
  /** Unit */
  unit: string;
  
  /** Reset period */
  resetPeriod: QuotaResetPeriod;
  
  /** Per-user quotas */
  perUserQuotas?: Record<string, number>;
}

export type QuotaType = 'storage' | 'bandwidth' | 'requests' | 'processing' | 'uploads' | 'downloads';
export type QuotaResetPeriod = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';

export interface UsageMonitoringConfig {
  /** Real-time monitoring */
  realTimeMonitoring: boolean;
  
  /** Monitoring interval */
  monitoringIntervalMinutes: number;
  
  /** Usage aggregation */
  usageAggregation: UsageAggregationConfig;
  
  /** Usage reporting */
  usageReporting: UsageReportingConfig;
}

export interface UsageAggregationConfig {
  /** Aggregation levels */
  levels: AggregationLevel[];
  
  /** Retention period */
  retentionDays: number;
  
  /** Compression */
  compression: boolean;
}

export type AggregationLevel = 'minute' | 'hour' | 'day' | 'week' | 'month';

export interface UsageReportingConfig {
  /** Reporting enabled */
  enabled: boolean;
  
  /** Report frequency */
  frequency: ReportFrequency;
  
  /** Report formats */
  formats: ReportFormat[];
  
  /** Report recipients */
  recipients: string[];
  
  /** Include trends */
  includeTrends: boolean;
}

export type ReportFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';
export type ReportFormat = 'email' | 'pdf' | 'csv' | 'json' | 'dashboard';

export interface QuotaNotificationConfig {
  /** Notifications enabled */
  enabled: boolean;
  
  /** Warning thresholds */
  warningThresholds: number[];
  
  /** Critical thresholds */
  criticalThresholds: number[];
  
  /** Notification channels */
  channels: NotificationChannel[];
  
  /** Escalation rules */
  escalationRules?: EscalationRule[];
}

export interface NotificationChannel {
  /** Channel type */
  type: NotificationChannelType;
  
  /** Channel configuration */
  configuration: Record<string, unknown>;
  
  /** Channel priority */
  priority: number;
}

export type NotificationChannelType = 'email' | 'sms' | 'webhook' | 'slack' | 'teams';

export interface EscalationRule {
  /** Threshold level */
  thresholdLevel: number;
  
  /** Escalation delay */
  escalationDelayMinutes: number;
  
  /** Escalation targets */
  escalationTargets: string[];
}

// ============================================================================
// CDN CONFIGURATION
// ============================================================================

export interface CDNModuleConfig {
  /** CDN enabled */
  enabled: boolean;
  
  /** Primary CDN provider */
  primaryProvider: CDNProvider;
  
  /** Provider configurations */
  providers: Record<CDNProvider, CDNProviderConfig>;
  
  /** Cache configuration */
  cache: CDNCacheConfig;
  
  /** Distribution settings */
  distribution: CDNDistributionConfig;
  
  /** Security settings */
  security: CDNSecurityConfig;
  
  /** Performance optimization */
  performance: CDNPerformanceConfig;
}

export interface CDNProviderConfig {
  /** Provider enabled */
  enabled: boolean;
  
  /** API credentials */
  credentials: Record<string, string>;
  
  /** Default distribution */
  defaultDistribution: string;
  
  /** Regions */
  regions: string[];
  
  /** Custom domains */
  customDomains: string[];
  
  /** SSL certificate */
  sslCertificate?: SSLCertificateConfig;
}

export interface SSLCertificateConfig {
  /** Certificate type */
  type: 'provider-managed' | 'custom' | 'lets-encrypt';
  
  /** Certificate details */
  details?: Record<string, string>;
  
  /** Auto-renewal */
  autoRenewal?: boolean;
}

export interface CDNCacheConfig {
  /** Default TTL */
  defaultTTLSeconds: number;
  
  /** Cache rules */
  rules: CDNCacheRule[];
  
  /** Invalidation settings */
  invalidation: CDNInvalidationConfig;
  
  /** Compression */
  compression: CDNCompressionConfig;
}

export interface CDNCacheRule {
  /** Path pattern */
  pathPattern: string;
  
  /** TTL */
  ttlSeconds: number;
  
  /** Cache headers */
  cacheHeaders?: string[];
  
  /** Query string handling */
  queryStringHandling: 'ignore' | 'include' | 'whitelist';
  
  /** Whitelist parameters */
  whitelistParameters?: string[];
}

export interface CDNInvalidationConfig {
  /** Auto-invalidation */
  autoInvalidation: boolean;
  
  /** Batch size */
  batchSize: number;
  
  /** Batch delay */
  batchDelaySeconds: number;
  
  /** Wildcard support */
  wildcardSupport: boolean;
}

export interface CDNCompressionConfig {
  /** Compression enabled */
  enabled: boolean;
  
  /** Compression algorithms */
  algorithms: CompressionAlgorithm[];
  
  /** Minimum file size */
  minFileSizeBytes: number;
  
  /** File types */
  fileTypes: string[];
}

export interface CDNDistributionConfig {
  /** Price class */
  priceClass: 'all' | 'us-europe' | 'us-europe-asia';
  
  /** HTTP version */
  httpVersion: '1.1' | '2.0' | '3.0';
  
  /** IPv6 enabled */
  ipv6Enabled: boolean;
  
  /** Logging */
  logging?: CDNLoggingConfig;
}

export interface CDNLoggingConfig {
  /** Logging enabled */
  enabled: boolean;
  
  /** Log bucket */
  bucket: string;
  
  /** Log prefix */
  prefix: string;
  
  /** Include cookies */
  includeCookies: boolean;
}

export interface CDNSecurityConfig {
  /** WAF enabled */
  wafEnabled: boolean;
  
  /** HTTPS redirect */
  httpsRedirect: boolean;
  
  /** Security headers */
  securityHeaders: SecurityHeadersConfig;
  
  /** Access restrictions */
  accessRestrictions?: AccessRestrictionsConfig;
}

export interface SecurityHeadersConfig {
  /** HSTS */
  hsts: boolean;
  
  /** Content security policy */
  csp?: string;
  
  /** X-Frame-Options */
  frameOptions?: 'DENY' | 'SAMEORIGIN';
  
  /** Referrer policy */
  referrerPolicy?: string;
}

export interface AccessRestrictionsConfig {
  /** Allowed countries */
  allowedCountries?: string[];
  
  /** Blocked countries */
  blockedCountries?: string[];
  
  /** IP whitelist */
  ipWhitelist?: string[];
  
  /** IP blacklist */
  ipBlacklist?: string[];
}

export interface CDNPerformanceConfig {
  /** Origin timeout */
  originTimeoutSeconds: number;
  
  /** Origin retries */
  originRetries: number;
  
  /** Keep-alive timeout */
  keepAliveTimeoutSeconds: number;
  
  /** Connection pooling */
  connectionPooling: boolean;
}

// ============================================================================
// PROCESSING CONFIGURATION
// ============================================================================

export interface ProcessingModuleConfig {
  /** Processing mode */
  mode: ProcessingMode;
  
  /** Default processing options */
  defaults: DefaultProcessingOptions;
  
  /** Quality settings */
  quality: ProcessingQualityConfig;
  
  /** Performance settings */
  performance: ProcessingPerformanceConfig;
  
  /** Resource limits */
  resourceLimits: ProcessingResourceLimits;
  
  /** Pipeline configuration */
  pipelines: PipelineConfig;
  
  /** Worker configuration */
  workers: WorkerConfig;
}

export interface DefaultProcessingOptions {
  /** Image processing defaults */
  image: ImageProcessingOptions;
  
  /** Video processing defaults */
  video: VideoProcessingOptions;
  
  /** Audio processing defaults */
  audio: AudioProcessingOptions;
}

export interface ProcessingQualityConfig {
  /** Quality assessment enabled */
  assessmentEnabled: boolean;
  
  /** Minimum quality threshold */
  minQualityThreshold: number;
  
  /** Quality metrics */
  qualityMetrics: QualityMetric[];
  
  /** Auto-quality adjustment */
  autoQualityAdjustment: boolean;
}

export interface QualityMetric {
  /** Metric name */
  name: string;
  
  /** Metric weight */
  weight: number;
  
  /** Target value */
  targetValue?: number;
  
  /** Minimum value */
  minValue?: number;
}

export interface ProcessingPerformanceConfig {
  /** Parallel processing */
  parallelProcessing: boolean;
  
  /** Max concurrent jobs */
  maxConcurrentJobs: number;
  
  /** Processing timeout */
  processingTimeoutSeconds: number;
  
  /** Memory optimization */
  memoryOptimization: boolean;
  
  /** GPU acceleration */
  gpuAcceleration: boolean;
}

export interface ProcessingResourceLimits {
  /** Max file size */
  maxFileSizeBytes: number;
  
  /** Max memory usage */
  maxMemoryUsageBytes: number;
  
  /** Max CPU usage */
  maxCpuUsagePercent: number;
  
  /** Max processing time */
  maxProcessingTimeSeconds: number;
  
  /** Max output files */
  maxOutputFiles: number;
}

export interface PipelineConfig {
  /** Custom pipelines */
  customPipelines: CustomPipelineConfig[];
  
  /** Pipeline selection */
  pipelineSelection: PipelineSelectionConfig;
  
  /** Pipeline caching */
  pipelineCaching: boolean;
  
  /** Pipeline validation */
  pipelineValidation: boolean;
}

export interface CustomPipelineConfig {
  /** Pipeline name */
  name: string;
  
  /** Pipeline stages */
  stages: PipelineStageConfig[];
  
  /** Pipeline conditions */
  conditions?: PipelineConditionConfig;
  
  /** Pipeline metadata */
  metadata?: Record<string, unknown>;
}

export interface PipelineStageConfig {
  /** Stage name */
  name: string;
  
  /** Stage processor */
  processor: string;
  
  /** Stage options */
  options: Record<string, unknown>;
  
  /** Stage conditions */
  conditions?: Record<string, unknown>;
}

export interface PipelineConditionConfig {
  /** File type conditions */
  fileTypes?: string[];
  
  /** File size conditions */
  fileSizeRange?: [number, number];
  
  /** Quality conditions */
  qualityRange?: [number, number];
  
  /** Custom conditions */
  customConditions?: string[];
}

export interface PipelineSelectionConfig {
  /** Selection strategy */
  strategy: 'auto' | 'manual' | 'rule-based';
  
  /** Selection rules */
  selectionRules?: PipelineSelectionRule[];
  
  /** Fallback pipeline */
  fallbackPipeline: string;
}

export interface PipelineSelectionRule {
  /** Rule condition */
  condition: string;
  
  /** Target pipeline */
  targetPipeline: string;
  
  /** Rule priority */
  priority: number;
}

export interface WorkerConfig {
  /** Worker pools */
  pools: WorkerPoolConfig[];
  
  /** Scaling configuration */
  scaling: WorkerScalingConfig;
  
  /** Health monitoring */
  healthMonitoring: WorkerHealthConfig;
}

export interface WorkerPoolConfig {
  /** Pool name */
  name: string;
  
  /** Worker type */
  workerType: string;
  
  /** Pool size */
  size: number;
  
  /** Worker resources */
  resources: WorkerResourceConfig;
  
  /** Specialized tasks */
  specializedTasks?: string[];
}

export interface WorkerResourceConfig {
  /** CPU allocation */
  cpuCores: number;
  
  /** Memory allocation */
  memoryMB: number;
  
  /** GPU allocation */
  gpuMemoryMB?: number;
  
  /** Disk space */
  diskSpaceMB: number;
}

export interface WorkerScalingConfig {
  /** Auto-scaling enabled */
  autoScaling: boolean;
  
  /** Min workers */
  minWorkers: number;
  
  /** Max workers */
  maxWorkers: number;
  
  /** Scaling triggers */
  scalingTriggers: ScalingTriggerConfig[];
}

export interface ScalingTriggerConfig {
  /** Trigger metric */
  metric: string;
  
  /** Threshold */
  threshold: number;
  
  /** Scaling action */
  action: 'scale-up' | 'scale-down';
  
  /** Cooldown period */
  cooldownSeconds: number;
}

export interface WorkerHealthConfig {
  /** Health checks enabled */
  healthChecks: boolean;
  
  /** Check interval */
  checkIntervalSeconds: number;
  
  /** Unhealthy threshold */
  unhealthyThreshold: number;
  
  /** Recovery actions */
  recoveryActions: WorkerRecoveryAction[];
}

export interface WorkerRecoveryAction {
  /** Action type */
  type: 'restart' | 'replace' | 'scale' | 'alert';
  
  /** Action configuration */
  configuration: Record<string, unknown>;
  
  /** Action timeout */
  timeoutSeconds: number;
}

// ============================================================================
// ADDITIONAL CONFIGURATION INTERFACES
// ============================================================================

export interface SecurityModuleConfig {
  /** Authentication */
  authentication: SecurityAuthConfig;
  
  /** Authorization */
  authorization: SecurityAuthzConfig;
  
  /** Input validation */
  inputValidation: InputValidationConfig;
  
  /** Output sanitization */
  outputSanitization: OutputSanitizationConfig;
  
  /** Security headers */
  securityHeaders: SecurityHeadersModuleConfig;
  
  /** Audit logging */
  auditLogging: AuditLoggingConfig;
}

export interface SecurityAuthConfig {
  /** Authentication providers */
  providers: AuthProviderConfig[];
  
  /** Token configuration */
  token: TokenConfig;
  
  /** Session security */
  sessionSecurity: SessionSecurityConfig;
  
  /** Multi-factor authentication */
  mfa?: MFAConfig;
}

export interface AuthProviderConfig {
  /** Provider name */
  name: string;
  
  /** Provider type */
  type: string;
  
  /** Provider configuration */
  configuration: Record<string, unknown>;
  
  /** Provider priority */
  priority: number;
  
  /** Provider enabled */
  enabled: boolean;
}

export interface TokenConfig {
  /** Token algorithm */
  algorithm: string;
  
  /** Token expiration */
  expirationSeconds: number;
  
  /** Refresh token expiration */
  refreshExpirationSeconds: number;
  
  /** Token issuer */
  issuer: string;
  
  /** Token audience */
  audience: string[];
}

export interface SessionSecurityConfig {
  /** Secure cookies */
  secureCookies: boolean;
  
  /** HTTP-only cookies */
  httpOnlyCookies: boolean;
  
  /** SameSite attribute */
  sameSite: 'strict' | 'lax' | 'none';
  
  /** Session fixation protection */
  fixationProtection: boolean;
}

export interface MFAConfig {
  /** MFA enabled */
  enabled: boolean;
  
  /** MFA methods */
  methods: MFAMethod[];
  
  /** MFA requirement */
  requirement: 'optional' | 'required' | 'conditional';
  
  /** Backup codes */
  backupCodes: boolean;
}

export interface MFAMethod {
  /** Method type */
  type: 'totp' | 'sms' | 'email' | 'push' | 'hardware';
  
  /** Method configuration */
  configuration: Record<string, unknown>;
  
  /** Method priority */
  priority: number;
  
  /** Method enabled */
  enabled: boolean;
}

export interface SecurityAuthzConfig {
  /** Authorization model */
  model: 'rbac' | 'abac' | 'acl' | 'custom';
  
  /** Default permissions */
  defaultPermissions: string[];
  
  /** Permission inheritance */
  permissionInheritance: boolean;
  
  /** Dynamic permissions */
  dynamicPermissions: boolean;
}

export interface InputValidationConfig {
  /** Strict validation */
  strictValidation: boolean;
  
  /** File type validation */
  fileTypeValidation: FileTypeValidationConfig;
  
  /** Content validation */
  contentValidation: ContentValidationConfig;
  
  /** Size validation */
  sizeValidation: SizeValidationConfig;
}

export interface FileTypeValidationConfig {
  /** Allowed file types */
  allowedTypes: string[];
  
  /** Blocked file types */
  blockedTypes: string[];
  
  /** Magic number validation */
  magicNumberValidation: boolean;
  
  /** Content type validation */
  contentTypeValidation: boolean;
}

export interface ContentValidationConfig {
  /** Malware scanning */
  malwareScanning: boolean;
  
  /** Content filtering */
  contentFiltering: ContentFilteringConfig;
  
  /** Metadata validation */
  metadataValidation: boolean;
  
  /** Custom validation rules */
  customRules: ValidationRuleConfig[];
}

export interface ContentFilteringConfig {
  /** Adult content detection */
  adultContent: boolean;
  
  /** Violence detection */
  violenceDetection: boolean;
  
  /** Spam detection */
  spamDetection: boolean;
  
  /** Profanity filtering */
  profanityFiltering: boolean;
}

export interface ValidationRuleConfig {
  /** Rule name */
  name: string;
  
  /** Rule expression */
  expression: string;
  
  /** Rule severity */
  severity: 'warning' | 'error' | 'critical';
  
  /** Rule enabled */
  enabled: boolean;
}

export interface SizeValidationConfig {
  /** Maximum file size */
  maxFileSize: number;
  
  /** Maximum dimension */
  maxDimension?: number;
  
  /** Minimum dimension */
  minDimension?: number;
  
  /** Aspect ratio limits */
  aspectRatioLimits?: [number, number];
}

export interface OutputSanitizationConfig {
  /** Metadata stripping */
  metadataStripping: boolean;
  
  /** Content sanitization */
  contentSanitization: boolean;
  
  /** URL sanitization */
  urlSanitization: boolean;
  
  /** Header sanitization */
  headerSanitization: boolean;
}

export interface SecurityHeadersModuleConfig {
  /** CORS headers */
  cors: CORSHeadersConfig;
  
  /** CSP headers */
  csp?: CSPHeadersConfig;
  
  /** Security headers */
  security: SecurityHeadersSetConfig;
}

export interface CORSHeadersConfig {
  /** Allowed origins */
  allowedOrigins: string[];
  
  /** Allowed methods */
  allowedMethods: string[];
  
  /** Allowed headers */
  allowedHeaders: string[];
  
  /** Exposed headers */
  exposedHeaders?: string[];
  
  /** Allow credentials */
  allowCredentials: boolean;
  
  /** Max age */
  maxAge: number;
}

export interface CSPHeadersConfig {
  /** CSP directives */
  directives: Record<string, string[]>;
  
  /** Report URI */
  reportUri?: string;
  
  /** Report only mode */
  reportOnly: boolean;
}

export interface SecurityHeadersSetConfig {
  /** X-Content-Type-Options */
  contentTypeOptions: boolean;
  
  /** X-Frame-Options */
  frameOptions: string;
  
  /** X-XSS-Protection */
  xssProtection: boolean;
  
  /** Referrer-Policy */
  referrerPolicy: string;
  
  /** Permissions-Policy */
  permissionsPolicy?: string;
}

export interface AuditLoggingConfig {
  /** Audit logging enabled */
  enabled: boolean;
  
  /** Audit events */
  auditEvents: AuditEventConfig[];
  
  /** Audit storage */
  storage: AuditStorageConfig;
  
  /** Audit retention */
  retentionDays: number;
}

export interface AuditEventConfig {
  /** Event type */
  type: string;
  
  /** Event level */
  level: 'info' | 'warning' | 'error';
  
  /** Include details */
  includeDetails: boolean;
  
  /** Event enabled */
  enabled: boolean;
}

export interface AuditStorageConfig {
  /** Storage type */
  type: 'database' | 'file' | 'external';
  
  /** Storage configuration */
  configuration: Record<string, unknown>;
  
  /** Encryption */
  encryption: boolean;
  
  /** Integrity protection */
  integrityProtection: boolean;
}

export interface PerformanceModuleConfig {
  /** Caching */
  caching: CachingConfig;
  
  /** Optimization */
  optimization: OptimizationConfig;
  
  /** Monitoring */
  monitoring: PerformanceMonitoringConfig;
  
  /** Resource management */
  resourceManagement: ResourceManagementConfig;
}

export interface CachingConfig {
  /** Cache layers */
  layers: CacheLayerConfig[];
  
  /** Cache strategies */
  strategies: CacheStrategyConfig;
  
  /** Cache invalidation */
  invalidation: CacheInvalidationConfig;
}

export interface CacheLayerConfig {
  /** Layer name */
  name: string;
  
  /** Layer type */
  type: 'memory' | 'disk' | 'distributed' | 'cdn';
  
  /** Layer configuration */
  configuration: Record<string, unknown>;
  
  /** Layer priority */
  priority: number;
  
  /** Layer enabled */
  enabled: boolean;
}

export interface CacheStrategyConfig {
  /** Default strategy */
  defaultStrategy: 'lru' | 'lfu' | 'ttl' | 'custom';
  
  /** Strategy parameters */
  strategyParameters: Record<string, unknown>;
  
  /** Per-resource strategies */
  perResourceStrategies?: Record<string, string>;
}

export interface CacheInvalidationConfig {
  /** Invalidation strategy */
  strategy: 'manual' | 'automatic' | 'event-driven';
  
  /** Invalidation triggers */
  triggers: CacheInvalidationTrigger[];
  
  /** Batch invalidation */
  batchInvalidation: boolean;
}

export interface CacheInvalidationTrigger {
  /** Trigger event */
  event: string;
  
  /** Cache keys pattern */
  keysPattern: string;
  
  /** Invalidation delay */
  delaySeconds?: number;
}

export interface OptimizationConfig {
  /** Image optimization */
  image: ImageOptimizationConfig;
  
  /** Video optimization */
  video: VideoOptimizationConfig;
  
  /** Audio optimization */
  audio: AudioOptimizationConfig;
  
  /** Delivery optimization */
  delivery: DeliveryOptimizationConfig;
}

export interface ImageOptimizationConfig {
  /** Auto-optimization */
  autoOptimization: boolean;
  
  /** Optimization level */
  optimizationLevel: 'basic' | 'standard' | 'aggressive';
  
  /** Format selection */
  formatSelection: 'auto' | 'manual';
  
  /** Quality adaptation */
  qualityAdaptation: boolean;
}

export interface VideoOptimizationConfig {
  /** Adaptive bitrate */
  adaptiveBitrate: boolean;
  
  /** Transcoding profiles */
  transcodingProfiles: string[];
  
  /** Thumbnail optimization */
  thumbnailOptimization: boolean;
  
  /** Streaming optimization */
  streamingOptimization: boolean;
}

export interface AudioOptimizationConfig {
  /** Bitrate optimization */
  bitrateOptimization: boolean;
  
  /** Format optimization */
  formatOptimization: boolean;
  
  /** Normalization */
  normalization: boolean;
  
  /** Compression */
  compression: boolean;
}

export interface DeliveryOptimizationConfig {
  /** Geographic optimization */
  geographicOptimization: boolean;
  
  /** Device optimization */
  deviceOptimization: boolean;
  
  /** Connection optimization */
  connectionOptimization: boolean;
  
  /** Time-based optimization */
  timeBasedOptimization: boolean;
}

export interface PerformanceMonitoringConfig {
  /** Real-time monitoring */
  realTimeMonitoring: boolean;
  
  /** Metrics collection */
  metricsCollection: MetricsCollectionConfig;
  
  /** Performance alerts */
  performanceAlerts: PerformanceAlertConfig[];
  
  /** Benchmarking */
  benchmarking: BenchmarkingConfig;
}

export interface MetricsCollectionConfig {
  /** Collection interval */
  intervalSeconds: number;
  
  /** Metrics to collect */
  metrics: string[];
  
  /** Aggregation levels */
  aggregationLevels: string[];
  
  /** Retention period */
  retentionDays: number;
}

export interface PerformanceAlertConfig {
  /** Alert name */
  name: string;
  
  /** Alert condition */
  condition: string;
  
  /** Alert threshold */
  threshold: number;
  
  /** Alert channels */
  channels: string[];
  
  /** Alert enabled */
  enabled: boolean;
}

export interface BenchmarkingConfig {
  /** Benchmarking enabled */
  enabled: boolean;
  
  /** Benchmark suites */
  suites: BenchmarkSuiteConfig[];
  
  /** Benchmark frequency */
  frequency: string;
  
  /** Baseline comparison */
  baselineComparison: boolean;
}

export interface BenchmarkSuiteConfig {
  /** Suite name */
  name: string;
  
  /** Test cases */
  testCases: string[];
  
  /** Performance targets */
  targets: Record<string, number>;
  
  /** Suite enabled */
  enabled: boolean;
}

export interface ResourceManagementConfig {
  /** Resource pooling */
  resourcePooling: ResourcePoolingConfig;
  
  /** Load balancing */
  loadBalancing: LoadBalancingConfig;
  
  /** Resource limits */
  resourceLimits: ResourceLimitsConfig;
  
  /** Resource monitoring */
  resourceMonitoring: ResourceMonitoringConfig;
}

export interface ResourcePoolingConfig {
  /** Connection pooling */
  connectionPooling: boolean;
  
  /** Thread pooling */
  threadPooling: ThreadPoolingConfig;
  
  /** Memory pooling */
  memoryPooling: boolean;
  
  /** Pool sizing strategy */
  poolSizingStrategy: 'fixed' | 'dynamic' | 'adaptive';
}

export interface ThreadPoolingConfig {
  /** Core pool size */
  corePoolSize: number;
  
  /** Maximum pool size */
  maxPoolSize: number;
  
  /** Keep alive time */
  keepAliveTimeSeconds: number;
  
  /** Queue capacity */
  queueCapacity: number;
}

export interface LoadBalancingConfig {
  /** Load balancing algorithm */
  algorithm: 'round-robin' | 'weighted' | 'least-connections' | 'least-response-time';
  
  /** Health checks */
  healthChecks: boolean;
  
  /** Failover configuration */
  failover: boolean;
  
  /** Session persistence */
  sessionPersistence: boolean;
}

export interface ResourceLimitsConfig {
  /** CPU limits */
  cpuLimits: ResourceLimit;
  
  /** Memory limits */
  memoryLimits: ResourceLimit;
  
  /** Disk I/O limits */
  diskIOLimits: ResourceLimit;
  
  /** Network I/O limits */
  networkIOLimits: ResourceLimit;
}

export interface ResourceLimit {
  /** Soft limit */
  softLimit: number;
  
  /** Hard limit */
  hardLimit: number;
  
  /** Warning threshold */
  warningThreshold: number;
  
  /** Critical threshold */
  criticalThreshold: number;
}

export interface ResourceMonitoringConfig {
  /** Monitoring enabled */
  enabled: boolean;
  
  /** Monitoring interval */
  intervalSeconds: number;
  
  /** Resource alerts */
  resourceAlerts: ResourceAlert[];
  
  /** Historical tracking */
  historicalTracking: boolean;
}

export interface ResourceAlert {
  /** Resource type */
  resourceType: string;
  
  /** Alert threshold */
  threshold: number;
  
  /** Alert duration */
  durationSeconds: number;
  
  /** Alert channels */
  channels: string[];
}

export interface MonitoringModuleConfig {
  /** Health checks */
  healthChecks: HealthCheckConfig[];
  
  /** Metrics */
  metrics: MetricsConfig;
  
  /** Alerting */
  alerting: AlertingModuleConfig;
  
  /** Tracing */
  tracing: TracingConfig;
  
  /** Dashboards */
  dashboards: DashboardModuleConfig;
}

export interface HealthCheckConfig {
  /** Check name */
  name: string;
  
  /** Check endpoint */
  endpoint: string;
  
  /** Check interval */
  intervalSeconds: number;
  
  /** Check timeout */
  timeoutSeconds: number;
  
  /** Check enabled */
  enabled: boolean;
}

export interface MetricsConfig {
  /** Metrics provider */
  provider: 'prometheus' | 'datadog' | 'newrelic' | 'custom';
  
  /** Metrics configuration */
  configuration: Record<string, unknown>;
  
  /** Custom metrics */
  customMetrics: CustomMetricConfig[];
}

export interface CustomMetricConfig {
  /** Metric name */
  name: string;
  
  /** Metric type */
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  
  /** Metric labels */
  labels: string[];
  
  /** Metric description */
  description: string;
}

export interface AlertingModuleConfig {
  /** Alert manager */
  alertManager: AlertManagerConfig;
  
  /** Notification channels */
  notificationChannels: NotificationChannelModuleConfig[];
  
  /** Alert rules */
  alertRules: AlertRuleConfig[];
}

export interface AlertManagerConfig {
  /** Alert manager type */
  type: 'prometheus' | 'grafana' | 'custom';
  
  /** Alert manager configuration */
  configuration: Record<string, unknown>;
  
  /** Routing rules */
  routingRules: AlertRoutingRule[];
}

export interface AlertRoutingRule {
  /** Rule matcher */
  matcher: string;
  
  /** Target channel */
  targetChannel: string;
  
  /** Rule priority */
  priority: number;
}

export interface NotificationChannelModuleConfig {
  /** Channel name */
  name: string;
  
  /** Channel type */
  type: 'email' | 'slack' | 'webhook' | 'sms';
  
  /** Channel configuration */
  configuration: Record<string, unknown>;
  
  /** Channel enabled */
  enabled: boolean;
}

export interface AlertRuleConfig {
  /** Rule name */
  name: string;
  
  /** Rule query */
  query: string;
  
  /** Rule threshold */
  threshold: number;
  
  /** Rule duration */
  durationSeconds: number;
  
  /** Rule labels */
  labels: Record<string, string>;
  
  /** Rule enabled */
  enabled: boolean;
}

export interface TracingConfig {
  /** Tracing enabled */
  enabled: boolean;
  
  /** Tracing provider */
  provider: 'jaeger' | 'zipkin' | 'datadog' | 'custom';
  
  /** Sampling configuration */
  sampling: TracingSamplingConfig;
  
  /** Trace retention */
  retentionDays: number;
}

export interface TracingSamplingConfig {
  /** Sampling rate */
  rate: number;
  
  /** Sampling strategy */
  strategy: 'probabilistic' | 'rate-limiting' | 'adaptive';
  
  /** Per-operation sampling */
  perOperationSampling?: Record<string, number>;
}

export interface DashboardModuleConfig {
  /** Dashboard provider */
  provider: 'grafana' | 'kibana' | 'custom';
  
  /** Dashboard configuration */
  configuration: Record<string, unknown>;
  
  /** Default dashboards */
  defaultDashboards: string[];
  
  /** Custom dashboards */
  customDashboards: CustomDashboardConfig[];
}

export interface CustomDashboardConfig {
  /** Dashboard name */
  name: string;
  
  /** Dashboard definition */
  definition: Record<string, unknown>;
  
  /** Dashboard enabled */
  enabled: boolean;
}

export interface FeatureFlags {
  /** Enable experimental features */
  experimentalFeatures: boolean;
  
  /** Advanced processing */
  advancedProcessing: boolean;
  
  /** ML-based optimization */
  mlOptimization: boolean;
  
  /** Real-time processing */
  realTimeProcessing: boolean;
  
  /** Beta features */
  betaFeatures: Record<string, boolean>;
}

export interface EnvironmentConfig {
  /** Environment name */
  name: 'development' | 'staging' | 'production';
  
  /** Debug mode */
  debug: boolean;
  
  /** Mock services */
  mockServices: boolean;
  
  /** External service URLs */
  externalServices: Record<string, string>;
  
  /** Environment variables */
  environmentVariables: Record<string, string>;
  
  /** Secrets management */
  secretsManagement: SecretsManagementConfig;
}

export interface SecretsManagementConfig {
  /** Secrets provider */
  provider: 'aws-secrets' | 'azure-keyvault' | 'gcp-secret' | 'hashicorp-vault' | 'kubernetes';
  
  /** Provider configuration */
  configuration: Record<string, unknown>;
  
  /** Secret rotation */
  secretRotation: boolean;
  
  /** Secret caching */
  secretCaching: SecretCachingConfig;
}

export interface SecretCachingConfig {
  /** Caching enabled */
  enabled: boolean;
  
  /** Cache TTL */
  ttlSeconds: number;
  
  /** Cache encryption */
  encryption: boolean;
  
  /** Cache invalidation */
  invalidation: string[];
}

export interface IntegrationConfig {
  /** CVPlus core integration */
  cvplusCore: CVPlusCoreIntegration;
  
  /** Authentication integration */
  authentication: AuthenticationIntegration;
  
  /** External APIs */
  externalAPIs: ExternalAPIIntegration[];
  
  /** Webhook integrations */
  webhooks: WebhookIntegration[];
}

export interface CVPlusCoreIntegration {
  /** Integration enabled */
  enabled: boolean;
  
  /** Core service URL */
  serviceUrl: string;
  
  /** API version */
  apiVersion: string;
  
  /** Authentication method */
  authenticationMethod: 'api-key' | 'oauth' | 'jwt';
  
  /** Retry configuration */
  retryConfiguration: RetryConfig;
}

export interface AuthenticationIntegration {
  /** Auth provider */
  provider: string;
  
  /** Integration configuration */
  configuration: Record<string, unknown>;
  
  /** Token validation */
  tokenValidation: TokenValidationConfig;
  
  /** User mapping */
  userMapping: UserMappingConfig;
}

export interface TokenValidationConfig {
  /** Validation method */
  method: 'local' | 'remote' | 'introspection';
  
  /** Validation endpoint */
  endpoint?: string;
  
  /** Cache validation results */
  cacheResults: boolean;
  
  /** Cache TTL */
  cacheTTLSeconds: number;
}

export interface UserMappingConfig {
  /** User ID field */
  userIdField: string;
  
  /** User role field */
  userRoleField?: string;
  
  /** Custom field mappings */
  customFieldMappings: Record<string, string>;
  
  /** Default user role */
  defaultRole: string;
}

export interface ExternalAPIIntegration {
  /** API name */
  name: string;
  
  /** API base URL */
  baseUrl: string;
  
  /** Authentication */
  authentication: APIAuthenticationConfig;
  
  /** Rate limiting */
  rateLimiting: APIRateLimitingConfig;
  
  /** Retry policy */
  retryPolicy: APIRetryPolicy;
  
  /** Circuit breaker */
  circuitBreaker?: APICircuitBreakerConfig;
}

export interface APIAuthenticationConfig {
  /** Authentication type */
  type: 'none' | 'api-key' | 'basic' | 'oauth' | 'jwt';
  
  /** Authentication parameters */
  parameters: Record<string, string>;
  
  /** Authentication headers */
  headers?: Record<string, string>;
}

export interface APIRateLimitingConfig {
  /** Requests per second */
  requestsPerSecond: number;
  
  /** Burst size */
  burstSize: number;
  
  /** Rate limit strategy */
  strategy: 'token-bucket' | 'sliding-window';
}

export interface APIRetryPolicy {
  /** Max attempts */
  maxAttempts: number;
  
  /** Retry delay */
  retryDelayMs: number;
  
  /** Exponential backoff */
  exponentialBackoff: boolean;
  
  /** Retryable status codes */
  retryableStatusCodes: number[];
}

export interface APICircuitBreakerConfig {
  /** Failure threshold */
  failureThreshold: number;
  
  /** Success threshold */
  successThreshold: number;
  
  /** Timeout */
  timeoutMs: number;
  
  /** Reset timeout */
  resetTimeoutMs: number;
}

export interface WebhookIntegration {
  /** Webhook name */
  name: string;
  
  /** Webhook URL */
  url: string;
  
  /** Webhook events */
  events: string[];
  
  /** Webhook security */
  security: WebhookSecurityConfig;
  
  /** Webhook retry */
  retry: WebhookRetryConfig;
}

export interface WebhookSecurityConfig {
  /** Signature validation */
  signatureValidation: boolean;
  
  /** Secret key */
  secretKey?: string;
  
  /** IP whitelist */
  ipWhitelist?: string[];
  
  /** HTTPS required */
  httpsRequired: boolean;
}

export interface WebhookRetryConfig {
  /** Max attempts */
  maxAttempts: number;
  
  /** Retry intervals */
  retryIntervals: number[];
  
  /** Exponential backoff */
  exponentialBackoff: boolean;
}