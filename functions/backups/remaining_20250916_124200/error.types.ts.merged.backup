// @ts-ignore - Export conflicts/**
 * Error handling types for CVPlus multimedia module
 */

// Removed core dependency for minimal build

// Minimal ErrorDetails interface for local use
interface ErrorDetails {
  message: string;
  code?: string;
  context?: Record<string, unknown>;
}

// ============================================================================
// MULTIMEDIA ERROR TYPES
// ============================================================================

export interface MultimediaError extends ErrorDetails {
  /** Error category */
  category: MultimediaErrorCategory;
  
  /** Error severity level */
  severity: ErrorSeverity;
  
  /** Error context */
  context: ErrorContext;
  
  /** Recovery suggestions */
  recoverySuggestions: RecoverySuggestion[];
  
  /** Technical details */
  technicalDetails: TechnicalErrorDetails;
  
  /** User-friendly message */
  userMessage: string;
  
  /** Is error recoverable */
  recoverable: boolean;
  
  /** Retry configuration */
  retryConfig?: ErrorRetryConfig;
  
  /** Related errors */
  relatedErrors?: MultimediaError[];
  
  /** Error metrics */
  metrics?: ErrorMetrics;
}

export type MultimediaErrorCategory = 
  | 'processing'
  | 'upload'
  | 'download'
  | 'storage'
  | 'cdn'
  | 'validation'
  | 'format'
  | 'quality'
  | 'resource'
  | 'network'
  | 'authentication'
  | 'authorization'
  | 'quota'
  | 'system';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorContext extends Record<string, unknown> {
  /** Operation being performed */
  operation: string;
  
  /** File information */
  file?: FileErrorContext;
  
  /** Processing stage */
  processingStage?: string;
  
  /** User context */
  user?: UserErrorContext;
  
  /** Request context */
  request?: RequestErrorContext;
  
  /** System context */
  system?: SystemErrorContext;
  
  /** Session context */
  session?: SessionErrorContext;
  
  /** Environment context */
  environment?: EnvironmentContext;
}

export interface FileErrorContext {
  /** File name */
  fileName: string;
  
  /** File size */
  fileSize: number;
  
  /** File type */
  fileType: string;
  
  /** File format */
  format: string;
  
  /** File path */
  path?: string;
  
  /** File metadata */
  metadata?: Record<string, unknown>;
  
  /** Processing options */
  processingOptions?: Record<string, unknown>;
}

export interface UserErrorContext {
  /** User ID */
  userId: string;
  
  /** User plan */
  userPlan: string;
  
  /** User quotas */
  quotas?: QuotaErrorContext;
  
  /** User preferences */
  preferences?: Record<string, unknown>;
  
  /** User session info */
  sessionInfo?: Record<string, unknown>;
}

export interface QuotaErrorContext {
  /** Current usage */
  currentUsage: number;
  
  /** Quota limit */
  quotaLimit: number;
  
  /** Quota type */
  quotaType: string;
  
  /** Reset time */
  resetTime?: Date;
  
  /** Overage amount */
  overageAmount?: number;
}

export interface RequestErrorContext {
  /** Request ID */
  requestId: string;
  
  /** Request method */
  method: string;
  
  /** Request URL */
  url: string;
  
  /** Request headers */
  headers?: Record<string, string>;
  
  /** Request parameters */
  parameters?: Record<string, unknown>;
  
  /** Request body size */
  bodySize?: number;
  
  /** Request timestamp */
  timestamp: Date;
  
  /** Request duration */
  duration?: number;
}

export interface SystemErrorContext {
  /** Server information */
  server: ServerErrorContext;
  
  /** Resource usage */
  resourceUsage?: ResourceErrorContext;
  
  /** Dependencies */
  dependencies?: DependencyErrorContext[];
  
  /** System version */
  version?: string;
  
  /** Configuration */
  configuration?: Record<string, unknown>;
}

export interface ServerErrorContext {
  /** Server ID */
  serverId: string;
  
  /** Server region */
  region: string;
  
  /** Available resources */
  availableResources: ResourceAvailability;
  
  /** Load metrics */
  load?: LoadMetrics;
  
  /** Health status */
  healthStatus: HealthStatus;
}

export interface ResourceAvailability {
  /** CPU availability */
  cpu: ResourceStatus;
  
  /** Memory availability */
  memory: ResourceStatus;
  
  /** Disk availability */
  disk: ResourceStatus;
  
  /** Network availability */
  network?: ResourceStatus;
  
  /** GPU availability */
  gpu?: ResourceStatus;
}

export interface ResourceStatus {
  /** Available amount */
  available: number;
  
  /** Total amount */
  total: number;
  
  /** Usage percentage */
  usagePercentage: number;
  
  /** Status */
  status: 'ok' | 'warning' | 'critical';
}

export interface LoadMetrics {
  /** CPU load */
  cpuLoad: number;
  
  /** Memory usage */
  memoryUsage: number;
  
  /** Active connections */
  activeConnections: number;
  
  /** Requests per second */
  requestsPerSecond: number;
  
  /** Queue size */
  queueSize: number;
}

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface ResourceErrorContext {
  /** Resource type */
  type: 'cpu' | 'memory' | 'disk' | 'network' | 'gpu';
  
  /** Current usage */
  currentUsage: number;
  
  /** Maximum usage */
  maxUsage: number;
  
  /** Usage percentage */
  usagePercentage: number;
  
  /** Threshold exceeded */
  thresholdExceeded: boolean;
  
  /** Resource limits */
  limits: ResourceLimits;
}

export interface ResourceLimits {
  /** Soft limit */
  softLimit: number;
  
  /** Hard limit */
  hardLimit: number;
  
  /** Warning threshold */
  warningThreshold: number;
  
  /** Critical threshold */
  criticalThreshold: number;
}

export interface DependencyErrorContext {
  /** Dependency name */
  name: string;
  
  /** Dependency type */
  type: 'service' | 'database' | 'api' | 'library' | 'external';
  
  /** Status */
  status: DependencyStatus;
  
  /** Response time */
  responseTime?: number;
  
  /** Error details */
  errorDetails?: string;
  
  /** Last successful interaction */
  lastSuccessful?: Date;
}

export type DependencyStatus = 'available' | 'degraded' | 'unavailable' | 'timeout' | 'unknown';

export interface SessionErrorContext {
  /** Session ID */
  sessionId: string;
  
  /** Session state */
  state: SessionState;
  
  /** Session data */
  data?: Record<string, unknown>;
  
  /** Session duration */
  duration: number;
  
  /** Previous operations */
  previousOperations?: string[];
  
  /** Session errors */
  sessionErrors?: string[];
}

export type SessionState = 'active' | 'expired' | 'invalid' | 'terminated';

export interface EnvironmentContext {
  /** Environment name */
  environment: 'development' | 'staging' | 'production' | 'testing';
  
  /** Service version */
  version: string;
  
  /** Deployment information */
  deployment?: DeploymentContext;
  
  /** Feature flags */
  featureFlags?: Record<string, boolean>;
  
  /** Configuration */
  configuration?: Record<string, unknown>;
}

export interface DeploymentContext {
  /** Deployment ID */
  deploymentId: string;
  
  /** Deployment time */
  deploymentTime: Date;
  
  /** Git commit */
  gitCommit?: string;
  
  /** Build information */
  buildInfo?: Record<string, unknown>;
}

// ============================================================================
// RECOVERY SUGGESTIONS
// ============================================================================

export interface RecoverySuggestion {
  /** Suggestion type */
  type: RecoverySuggestionType;
  
  /** Suggestion description */
  description: string;
  
  /** Action to take */
  action: RecoveryAction;
  
  /** Priority */
  priority: RecoveryPriority;
  
  /** Automatic recovery */
  automatic: boolean;
  
  /** Success probability */
  successProbability: number;
  
  /** Time estimate */
  timeEstimate?: number;
  
  /** Prerequisites */
  prerequisites?: string[];
  
  /** Side effects */
  sideEffects?: string[];
}

export type RecoverySuggestionType = 
  | 'retry'
  | 'fallback'
  | 'alternative-method'
  | 'reduce-quality'
  | 'split-operation'
  | 'increase-resources'
  | 'contact-support'
  | 'wait'
  | 'manual-intervention';

export interface RecoveryAction {
  /** Action type */
  type: 'automatic' | 'manual' | 'user-choice';
  
  /** Action description */
  description: string;
  
  /** Action parameters */
  parameters?: Record<string, unknown>;
  
  /** Action timeout */
  timeout?: number;
  
  /** Confirmation required */
  confirmationRequired: boolean;
  
  /** Reversible */
  reversible: boolean;
}

export type RecoveryPriority = 'low' | 'medium' | 'high' | 'critical';

// ============================================================================
// TECHNICAL ERROR DETAILS
// ============================================================================

export interface TechnicalErrorDetails {
  /** Stack trace */
  stackTrace?: string;
  
  /** Error code */
  errorCode: string;
  
  /** Internal error ID */
  internalErrorId?: string;
  
  /** Component that failed */
  failingComponent: string;
  
  /** Function/method that failed */
  failingFunction?: string;
  
  /** Line number */
  lineNumber?: number;
  
  /** File name */
  fileName?: string;
  
  /** Exception type */
  exceptionType?: string;
  
  /** Inner exceptions */
  innerExceptions?: TechnicalErrorDetails[];
  
  /** Debug information */
  debugInfo?: Record<string, unknown>;
  
  /** Performance metrics */
  performanceMetrics?: PerformanceErrorMetrics;
  
  /** Memory information */
  memoryInfo?: MemoryErrorInfo;
  
  /** Thread information */
  threadInfo?: ThreadErrorInfo;
}

export interface PerformanceErrorMetrics {
  /** Execution time */
  executionTime: number;
  
  /** CPU usage */
  cpuUsage: number;
  
  /** Memory usage */
  memoryUsage: number;
  
  /** I/O operations */
  ioOperations?: IOOperationMetrics;
  
  /** Network operations */
  networkOperations?: NetworkOperationMetrics;
}

export interface IOOperationMetrics {
  /** Read operations */
  reads: number;
  
  /** Write operations */
  writes: number;
  
  /** Bytes read */
  bytesRead: number;
  
  /** Bytes written */
  bytesWritten: number;
  
  /** I/O time */
  ioTime: number;
}

export interface NetworkOperationMetrics {
  /** Requests made */
  requests: number;
  
  /** Bytes sent */
  bytesSent: number;
  
  /** Bytes received */
  bytesReceived: number;
  
  /** Network time */
  networkTime: number;
  
  /** Connection errors */
  connectionErrors: number;
}

export interface MemoryErrorInfo {
  /** Current memory usage */
  currentUsage: number;
  
  /** Peak memory usage */
  peakUsage: number;
  
  /** Available memory */
  availableMemory: number;
  
  /** Garbage collection info */
  gcInfo?: GCInfo;
  
  /** Memory leaks detected */
  memoryLeaks?: MemoryLeak[];
}

export interface GCInfo {
  /** GC runs */
  gcRuns: number;
  
  /** GC time */
  gcTime: number;
  
  /** Objects collected */
  objectsCollected: number;
  
  /** Memory freed */
  memoryFreed: number;
}

export interface MemoryLeak {
  /** Object type */
  objectType: string;
  
  /** Instance count */
  instanceCount: number;
  
  /** Memory consumed */
  memoryConsumed: number;
  
  /** Growth rate */
  growthRate: number;
}

export interface ThreadErrorInfo {
  /** Thread ID */
  threadId: string;
  
  /** Thread name */
  threadName: string;
  
  /** Thread state */
  threadState: string;
  
  /** Is main thread */
  isMainThread: boolean;
  
  /** Thread priority */
  priority?: number;
  
  /** CPU time */
  cpuTime?: number;
}

// ============================================================================
// ERROR RETRY CONFIGURATION
// ============================================================================

export interface ErrorRetryConfig {
  /** Maximum retry attempts */
  maxAttempts: number;
  
  /** Retry strategy */
  strategy: RetryStrategy;
  
  /** Base delay (ms) */
  baseDelay: number;
  
  /** Maximum delay (ms) */
  maxDelay: number;
  
  /** Backoff multiplier */
  backoffMultiplier: number;
  
  /** Jitter enabled */
  jitter: boolean;
  
  /** Retry conditions */
  retryConditions: RetryCondition[];
  
  /** Stop conditions */
  stopConditions: StopCondition[];
  
  /** Timeout per attempt */
  attemptTimeout?: number;
  
  /** Total timeout */
  totalTimeout?: number;
}

export type RetryStrategy = 'fixed' | 'exponential' | 'linear' | 'custom';

export interface RetryCondition {
  /** Condition type */
  type: RetryConditionType;
  
  /** Condition parameters */
  parameters: Record<string, unknown>;
  
  /** Should retry */
  shouldRetry: boolean;
}

export type RetryConditionType = 
  | 'error-code'
  | 'error-category'
  | 'http-status'
  | 'timeout'
  | 'network-error'
  | 'resource-unavailable'
  | 'temporary-failure'
  | 'custom';

export interface StopCondition {
  /** Condition type */
  type: StopConditionType;
  
  /** Condition parameters */
  parameters: Record<string, unknown>;
  
  /** Should stop retrying */
  shouldStop: boolean;
}

export type StopConditionType = 
  | 'fatal-error'
  | 'authentication-failure'
  | 'authorization-failure'
  | 'validation-error'
  | 'quota-exceeded'
  | 'permanent-failure'
  | 'custom';

// ============================================================================
// ERROR METRICS
// ============================================================================

export interface ErrorMetrics {
  /** Occurrence count */
  occurrenceCount: number;
  
  /** First occurrence */
  firstOccurrence: Date;
  
  /** Last occurrence */
  lastOccurrence: Date;
  
  /** Frequency */
  frequency: ErrorFrequency;
  
  /** Resolution time */
  resolutionTime?: number;
  
  /** Impact assessment */
  impact: ErrorImpact;
  
  /** Related metrics */
  relatedMetrics?: Record<string, number>;
  
  /** Cost impact */
  costImpact?: CostImpact;
  
  /** User impact */
  userImpact?: UserImpact;
}

export interface ErrorFrequency {
  /** Occurrences per hour */
  perHour: number;
  
  /** Occurrences per day */
  perDay: number;
  
  /** Trend */
  trend: 'increasing' | 'decreasing' | 'stable' | 'unknown';
  
  /** Peak times */
  peakTimes?: Date[];
}

export interface ErrorImpact {
  /** Business impact level */
  businessImpact: ImpactLevel;
  
  /** Technical impact level */
  technicalImpact: ImpactLevel;
  
  /** User experience impact */
  userExperienceImpact: ImpactLevel;
  
  /** Affected systems */
  affectedSystems: string[];
  
  /** Affected users count */
  affectedUsersCount?: number;
  
  /** Service availability impact */
  availabilityImpact?: number;
  
  /** Performance impact */
  performanceImpact?: PerformanceImpact;
}

export type ImpactLevel = 'minimal' | 'low' | 'medium' | 'high' | 'critical';

export interface PerformanceImpact {
  /** Response time increase */
  responseTimeIncrease: number;
  
  /** Throughput decrease */
  throughputDecrease: number;
  
  /** Resource usage increase */
  resourceUsageIncrease: number;
  
  /** Error rate increase */
  errorRateIncrease: number;
}

export interface CostImpact {
  /** Direct cost */
  directCost: number;
  
  /** Indirect cost */
  indirectCost?: number;
  
  /** Resource waste cost */
  resourceWasteCost?: number;
  
  /** SLA penalty cost */
  slaPenaltyCost?: number;
  
  /** Recovery cost */
  recoveryCost?: number;
  
  /** Currency */
  currency: string;
}

export interface UserImpact {
  /** Affected user count */
  affectedUsers: number;
  
  /** User sessions impacted */
  sessionsImpacted: number;
  
  /** Operations failed */
  operationsFailed: number;
  
  /** User satisfaction impact */
  satisfactionImpact?: number;
  
  /** Support tickets created */
  supportTickets?: number;
  
  /** User churn potential */
  churnPotential?: ChurnPotential;
}

export interface ChurnPotential {
  /** Churn risk level */
  riskLevel: 'low' | 'medium' | 'high';
  
  /** Estimated churn count */
  estimatedChurnCount: number;
  
  /** Revenue at risk */
  revenueAtRisk: number;
  
  /** Mitigation actions */
  mitigationActions: string[];
}

// ============================================================================
// SPECIALIZED ERROR TYPES
// ============================================================================

export interface ProcessingError extends MultimediaError {
  category: 'processing';
  processingStage: ProcessingStage;
  processingOptions: Record<string, unknown>;
  inputFileInfo: FileErrorContext;
  resourceUsage?: ResourceErrorContext;
}

export type ProcessingStage = 
  | 'validation'
  | 'preprocessing'
  | 'processing'
  | 'postprocessing'
  | 'optimization'
  | 'output-generation';

export interface UploadError extends MultimediaError {
  category: 'upload';
  uploadStage: UploadStage;
  bytesUploaded: number;
  totalBytes: number;
  uploadSpeed?: number;
  connectionInfo?: ConnectionInfo;
}

export type UploadStage = 'initiation' | 'transfer' | 'verification' | 'completion';

export interface ConnectionInfo {
  /** Connection type */
  type: string;
  
  /** Bandwidth */
  bandwidth: number;
  
  /** Latency */
  latency: number;
  
  /** Packet loss */
  packetLoss: number;
  
  /** Connection stability */
  stability: 'stable' | 'unstable' | 'intermittent';
}

export interface StorageError extends MultimediaError {
  category: 'storage';
  storageProvider: string;
  operationType: StorageOperationType;
  storageQuota?: QuotaErrorContext;
  storageLocation?: string;
}

export type StorageOperationType = 'read' | 'write' | 'delete' | 'list' | 'copy' | 'move';

export interface CDNError extends MultimediaError {
  category: 'cdn';
  cdnProvider: string;
  edgeLocation?: string;
  cacheStatus?: string;
  originResponse?: OriginResponseInfo;
}

export interface OriginResponseInfo {
  /** Origin status code */
  statusCode: number;
  
  /** Origin response time */
  responseTime: number;
  
  /** Origin headers */
  headers?: Record<string, string>;
  
  /** Origin error */
  error?: string;
}

export interface ValidationError extends MultimediaError {
  category: 'validation';
  validationType: ValidationType;
  validationRules: ValidationRule[];
  failedRules: FailedValidationRule[];
}

export type ValidationType = 'file' | 'format' | 'size' | 'quality' | 'metadata' | 'content';

export interface ValidationRule {
  /** Rule name */
  name: string;
  
  /** Rule description */
  description: string;
  
  /** Rule parameters */
  parameters: Record<string, unknown>;
  
  /** Rule severity */
  severity: ErrorSeverity;
}

export interface FailedValidationRule extends ValidationRule {
  /** Actual value */
  actualValue: unknown;
  
  /** Expected value */
  expectedValue: unknown;
  
  /** Failure reason */
  failureReason: string;
}

export interface QuotaError extends MultimediaError {
  category: 'quota';
  quotaType: QuotaType;
  quotaInfo: QuotaErrorContext;
  upgradeOptions?: UpgradeOption[];
}

export type QuotaType = 'storage' | 'bandwidth' | 'processing' | 'requests' | 'features';

export interface UpgradeOption {
  /** Plan name */
  planName: string;
  
  /** Plan description */
  description: string;
  
  /** Additional quota */
  additionalQuota: number;
  
  /** Cost */
  cost: number;
  
  /** Currency */
  currency: string;
  
  /** Upgrade URL */
  upgradeUrl?: string;
}