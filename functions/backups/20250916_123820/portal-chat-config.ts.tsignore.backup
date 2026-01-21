// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Portal Chat Configuration Types
 *
 * Chat service configuration for RAG-powered conversations in portals.
 *
 * @author Gil Klainert
 * @version 1.0.0
 */

/**
 * Chat service configuration
 */
export interface ChatServiceConfig {
  /** LLM provider */
  provider: ChatProvider;

  /** Model configuration */
  model: ChatModelConfig;

  /** Response configuration */
  response: ChatResponseConfig;

  /** Context management */
  context: ChatContextConfig;

  /** Safety and moderation settings */
  safety: ChatSafetyConfig;

  /** Performance settings */
  performance: ChatPerformanceConfig;
}

/**
 * Supported chat providers
 */
export enum ChatProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
  HUGGINGFACE = 'huggingface',
  AZURE_OPENAI = 'azure-openai',
  COHERE = 'cohere',
  CUSTOM = 'custom'
}

/**
 * Chat model configuration
 */
export interface ChatModelConfig {
  /** Model name */
  name: string;

  /** Maximum tokens for response */
  maxTokens: number;

  /** Temperature for response generation (0.0 to 1.0) */
  temperature: number;

  /** Top-p for nucleus sampling (0.0 to 1.0) */
  topP: number;

  /** Top-k for top-k sampling */
  topK?: number;

  /** Frequency penalty (-2.0 to 2.0) */
  frequencyPenalty?: number;

  /** Presence penalty (-2.0 to 2.0) */
  presencePenalty?: number;

  /** Stop sequences */
  stopSequences?: string[];

  /** Model-specific parameters */
  parameters?: Record<string, any>;

  /** Custom model configuration */
  custom?: CustomChatModelConfig;
}

/**
 * Custom chat model configuration
 */
export interface CustomChatModelConfig {
  /** Model endpoint URL */
  endpoint: string;

  /** Authentication configuration */
  authentication: AuthenticationConfig;

  /** Request format */
  requestFormat: ChatRequestFormat;

  /** Response format */
  responseFormat: ChatResponseFormat;

  /** Model capabilities */
  capabilities: ModelCapabilities;
}

/**
 * Authentication configuration
 */
export interface AuthenticationConfig {
  /** Authentication type */
  type: 'api_key' | 'bearer_token' | 'oauth' | 'custom';

  /** API key or token */
  token?: string;

  /** Custom headers */
  headers?: Record<string, string>;

  /** OAuth configuration */
  oauth?: OAuthConfig;
}

/**
 * OAuth configuration
 */
export interface OAuthConfig {
  /** Client ID */
  clientId: string;

  /** Client secret */
  clientSecret: string;

  /** Token endpoint */
  tokenEndpoint: string;

  /** Scope */
  scope?: string;
}

/**
 * Chat request format
 */
export interface ChatRequestFormat {
  /** Messages field name */
  messagesField: string;

  /** System message field name */
  systemField?: string;

  /** Parameters field name */
  parametersField?: string;

  /** Custom field mappings */
  fieldMappings?: Record<string, string>;
}

/**
 * Chat response format
 */
export interface ChatResponseFormat {
  /** Response content path */
  contentPath: string;

  /** Token usage path */
  usagePath?: string;

  /** Metadata path */
  metadataPath?: string;

  /** Error path */
  errorPath?: string;
}

/**
 * Model capabilities
 */
export interface ModelCapabilities {
  /** Supports streaming */
  streaming: boolean;

  /** Supports function calling */
  functionCalling: boolean;

  /** Supports image input */
  imageInput: boolean;

  /** Supports file upload */
  fileUpload: boolean;

  /** Maximum context length */
  maxContextLength: number;
}

/**
 * Chat response configuration
 */
export interface ChatResponseConfig {
  /** Maximum response length */
  maxLength: number;

  /** Response format */
  format: ResponseFormat;

  /** Include citations */
  includeCitations: boolean;

  /** Include confidence scores */
  includeConfidenceScores: boolean;

  /** Include source references */
  includeSourceReferences: boolean;

  /** Response streaming */
  streaming: boolean;

  /** Response validation */
  validation: ResponseValidationConfig;
}

/**
 * Response format options
 */
export enum ResponseFormat {
  TEXT = 'text',
  MARKDOWN = 'markdown',
  HTML = 'html',
  JSON = 'json',
  STRUCTURED = 'structured'
}

/**
 * Response validation configuration
 */
export interface ResponseValidationConfig {
  /** Enable response validation */
  enabled: boolean;

  /** Minimum response length */
  minLength: number;

  /** Maximum response length */
  maxLength: number;

  /** Check for harmful content */
  checkHarmfulContent: boolean;

  /** Check for factual accuracy */
  checkFactualAccuracy: boolean;

  /** Custom validation rules */
  customRules?: ValidationRule[];
}

/**
 * Custom validation rule
 */
export interface ValidationRule {
  /** Rule name */
  name: string;

  /** Rule type */
  type: 'regex' | 'function' | 'ai_check';

  /** Rule configuration */
  config: Record<string, any>;

  /** Action on violation */
  action: 'reject' | 'warn' | 'modify';
}

/**
 * Chat context management
 */
export interface ChatContextConfig {
  /** Maximum context length */
  maxContextLength: number;

  /** Context retention strategy */
  retentionStrategy: ContextRetentionStrategy;

  /** Number of previous messages to retain */
  maxPreviousMessages: number;

  /** Context compression */
  compression: ContextCompressionConfig;

  /** Memory management */
  memory: MemoryManagementConfig;
}

/**
 * Context retention strategies
 */
export enum ContextRetentionStrategy {
  SLIDING_WINDOW = 'sliding_window',
  SUMMARIZATION = 'summarization',
  TRUNCATION = 'truncation',
  IMPORTANCE_BASED = 'importance_based',
  HYBRID = 'hybrid'
}

/**
 * Context compression configuration
 */
export interface ContextCompressionConfig {
  /** Enable compression */
  enabled: boolean;

  /** Compression ratio target */
  targetRatio: number;

  /** Compression method */
  method: 'summarization' | 'extraction' | 'semantic';

  /** Preserve important messages */
  preserveImportant: boolean;
}

/**
 * Memory management configuration
 */
export interface MemoryManagementConfig {
  /** Enable long-term memory */
  longTermMemory: boolean;

  /** Memory storage type */
  storageType: 'local' | 'database' | 'vector_store';

  /** Memory consolidation interval */
  consolidationInterval: number;

  /** Memory retention period */
  retentionPeriod: number;
}

/**
 * Chat safety configuration
 */
export interface ChatSafetyConfig {
  /** Enable content filtering */
  contentFiltering: boolean;

  /** Profanity filtering */
  profanityFilter: boolean;

  /** Personal information protection */
  piiProtection: boolean;

  /** Harmful content detection */
  harmfulContentDetection: boolean;

  /** Custom safety rules */
  customRules: SafetyRule[];

  /** Moderation settings */
  moderation: ModerationConfig;
}

/**
 * Safety rule configuration
 */
export interface SafetyRule {
  /** Rule identifier */
  id: string;

  /** Rule description */
  description: string;

  /** Rule pattern or condition */
  condition: string | Record<string, any>;

  /** Action when rule is triggered */
  action: 'block' | 'warn' | 'moderate' | 'log';

  /** Rule severity */
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Moderation configuration
 */
export interface ModerationConfig {
  /** Enable human moderation */
  humanModeration: boolean;

  /** Auto-moderation rules */
  autoModeration: AutoModerationConfig;

  /** Escalation rules */
  escalation: EscalationConfig[];
}

/**
 * Auto-moderation configuration
 */
export interface AutoModerationConfig {
  /** Enable auto-moderation */
  enabled: boolean;

  /** Confidence threshold for auto-action */
  confidenceThreshold: number;

  /** Auto-moderation actions */
  actions: AutoModerationAction[];
}

/**
 * Auto-moderation action
 */
export interface AutoModerationAction {
  /** Trigger condition */
  condition: string;

  /** Action to take */
  action: 'block' | 'flag' | 'sanitize' | 'replace';

  /** Action parameters */
  parameters?: Record<string, any>;
}

/**
 * Escalation configuration
 */
export interface EscalationConfig {
  /** Escalation trigger */
  trigger: string;

  /** Escalation target */
  target: 'human' | 'admin' | 'system';

  /** Escalation delay */
  delay: number;

  /** Escalation message */
  message?: string;
}

/**
 * Chat performance configuration
 */
export interface ChatPerformanceConfig {
  /** Response timeout (ms) */
  timeout: number;

  /** Request rate limiting */
  rateLimiting: RateLimitingConfig;

  /** Caching configuration */
  caching: CachingConfig;

  /** Load balancing */
  loadBalancing: LoadBalancingConfig;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitingConfig {
  /** Enable rate limiting */
  enabled: boolean;

  /** Requests per minute */
  requestsPerMinute: number;

  /** Tokens per minute */
  tokensPerMinute: number;

  /** Burst allowance */
  burstAllowance: number;
}

/**
 * Caching configuration
 */
export interface CachingConfig {
  /** Enable response caching */
  enabled: boolean;

  /** Cache TTL in seconds */
  ttl: number;

  /** Cache key strategy */
  keyStrategy: 'full' | 'semantic' | 'hash';

  /** Cache size limit */
  sizeLimit: number;
}

/**
 * Load balancing configuration
 */
export interface LoadBalancingConfig {
  /** Enable load balancing */
  enabled: boolean;

  /** Load balancing strategy */
  strategy: 'round_robin' | 'least_connections' | 'weighted' | 'random';

  /** Health check configuration */
  healthCheck: HealthCheckConfig;
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  /** Health check interval (ms) */
  interval: number;

  /** Health check timeout (ms) */
  timeout: number;

  /** Failure threshold */
  failureThreshold: number;

  /** Recovery threshold */
  recoveryThreshold: number;
}