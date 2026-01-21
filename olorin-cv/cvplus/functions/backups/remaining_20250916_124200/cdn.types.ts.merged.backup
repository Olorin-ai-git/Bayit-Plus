// @ts-ignore - Export conflicts/**
 * CDN and content delivery types for CVPlus multimedia module
 */

import { MediaFile } from './media.types';

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

export interface CompressionSettings {
  /** Compression enabled */
  enabled: boolean;
  
  /** Compression algorithm */
  algorithm: CompressionAlgorithm;
  
  /** Compression level (1-9) */
  level: number;
  
  /** File type patterns to compress */
  fileTypes: string[];
  
  /** Minimum file size to compress */
  minSize: number;
  
  /** Maximum file size to compress */
  maxSize: number;
}

export interface CDNSecuritySettings {
  /** HTTPS enforcement */
  httpsOnly: boolean;
  
  /** Security headers */
  securityHeaders: Record<string, string>;
  
  /** Access restrictions */
  accessRestrictions: string[];
  
  /** Rate limiting */
  rateLimiting: boolean;
  
  /** DDoS protection */
  ddosProtection: boolean;
}

export interface PerformanceSettings {
  /** Cache TTL settings */
  cacheTtl: Record<string, number>;
  
  /** Preloading rules */
  preloadRules: string[];
  
  /** Optimization level */
  optimizationLevel: 'basic' | 'standard' | 'aggressive';
  
  /** Bandwidth throttling */
  bandwidthThrottling: boolean;
}

export interface GeographicSettings {
  /** Geographic restrictions */
  restrictions: string[];
  
  /** Preferred regions */
  preferredRegions: string[];
  
  /** Regional caching rules */
  regionalCaching: Record<string, number>;
}

export interface AnalyticsConfiguration {
  /** Analytics enabled */
  enabled: boolean;
  
  /** Analytics provider */
  provider: string;
  
  /** Tracking configuration */
  tracking: Record<string, unknown>;
  
  /** Reporting frequency */
  reportingFrequency: string;
}

export interface ErrorHandlingConfig {
  /** Error page configuration */
  errorPages: Record<number, string>;
  
  /** Retry configuration */
  retryConfig: {
    maxRetries: number;
    backoffStrategy: string;
  };
  
  /** Fallback configuration */
  fallback: {
    enabled: boolean;
    fallbackUrl?: string;
  };
}

export interface CacheRule {
  /** Rule pattern */
  pattern: string;
  
  /** Cache TTL */
  ttl: number;
  
  /** Cache headers */
  headers: Record<string, string>;
  
  /** Cache key configuration */
  cacheKey: string[];
}

// ============================================================================
// CDN PROVIDER TYPES
// ============================================================================

export type CDNProvider = 'cloudfront' | 'cloudflare' | 'fastly' | 'azure-cdn' | 'google-cdn' | 'bunny-cdn' | 'custom';
export type CacheStatus = 'hit' | 'miss' | 'stale' | 'updating' | 'bypass' | 'expired';
export type EdgeLocation = 'us-east-1' | 'us-west-1' | 'eu-west-1' | 'ap-southeast-1' | 'global';

// ============================================================================
// CDN CONFIGURATION
// ============================================================================

export interface CDNConfiguration {
  /** CDN provider */
  provider: CDNProvider;
  
  /** Distribution settings */
  distribution: DistributionSettings;
  
  /** Origin configuration */
  origins: OriginConfiguration[];
  
  /** Cache behavior */
  cacheBehaviors: CacheBehavior[];
  
  /** Compression settings */
  compression: CompressionSettings;
  
  /** Security settings */
  security: CDNSecuritySettings;
  
  /** Performance optimization */
  performance: PerformanceSettings;
  
  /** Geographic settings */
  geographic: GeographicSettings;
  
  /** Analytics configuration */
  analytics: AnalyticsConfiguration;
  
  /** Error handling */
  errorHandling: ErrorHandlingConfig;
}

export interface DistributionSettings {
  /** Distribution domain */
  domain: string;
  
  /** Alternative domains (CNAMEs) */
  alternativeDomains?: string[];
  
  /** Distribution enabled */
  enabled: boolean;
  
  /** Distribution status */
  status: DistributionStatus;
  
  /** Price class */
  priceClass: PriceClass;
  
  /** HTTP version */
  httpVersion: HTTPVersion;
  
  /** IPv6 enabled */
  ipv6Enabled: boolean;
  
  /** Default root object */
  defaultRootObject?: string;
  
  /** Logging configuration */
  logging?: LoggingConfig;
  
  /** Comment */
  comment?: string;
}

export type DistributionStatus = 'pending' | 'deployed' | 'disabled' | 'error';
export type PriceClass = 'all' | 'us-eu' | 'us-eu-asia' | 'custom';
export type HTTPVersion = '1.1' | '2.0' | '3.0';

export interface LoggingConfig {
  /** Logging enabled */
  enabled: boolean;
  
  /** Log bucket */
  bucket: string;
  
  /** Log prefix */
  prefix: string;
  
  /** Include cookies */
  includeCookies: boolean;
  
  /** Log format */
  format: LogFormat;
}

export type LogFormat = 'w3c' | 'json' | 'csv' | 'custom';

// ============================================================================
// ORIGIN CONFIGURATION
// ============================================================================

export interface OriginConfiguration {
  /** Origin ID */
  id: string;
  
  /** Origin type */
  type: OriginType;
  
  /** Origin settings */
  settings: OriginSettings;
  
  /** Health checks */
  healthCheck?: OriginHealthCheck;
  
  /** Failover configuration */
  failover?: OriginFailover;
  
  /** Load balancing */
  loadBalancing?: LoadBalancingConfig;
}

export type OriginType = 'http' | 'https' | 's3' | 'mediastore' | 'custom';

export interface OriginSettings {
  /** Domain name */
  domainName: string;
  
  /** Origin path */
  originPath?: string;
  
  /** Custom headers */
  customHeaders?: CustomHeader[];
  
  /** Connection settings */
  connection: ConnectionSettings;
  
  /** SSL/TLS settings */
  ssl?: SSLSettings;
}

export interface CustomHeader {
  /** Header name */
  name: string;
  
  /** Header value */
  value: string;
  
  /** Header description */
  description?: string;
}

export interface ConnectionSettings {
  /** HTTP port */
  httpPort: number;
  
  /** HTTPS port */
  httpsPort: number;
  
  /** Protocol policy */
  protocolPolicy: ProtocolPolicy;
  
  /** Connection timeout (seconds) */
  connectionTimeout: number;
  
  /** Response timeout (seconds) */
  responseTimeout: number;
  
  /** Keep-alive timeout (seconds) */
  keepAliveTimeout?: number;
  
  /** Max connections */
  maxConnections?: number;
}

export type ProtocolPolicy = 'http-only' | 'https-only' | 'match-viewer' | 'redirect-to-https';

export interface SSLSettings {
  /** SSL protocols */
  protocols: SSLProtocol[];
  
  /** Cipher suite */
  cipherSuite: CipherSuite;
  
  /** Certificate configuration */
  certificate?: CertificateConfig;
  
  /** HSTS configuration */
  hsts?: HSTSConfiguration;
}

export type SSLProtocol = 'TLSv1' | 'TLSv1.1' | 'TLSv1.2' | 'TLSv1.3';
export type CipherSuite = 'default' | 'high' | 'medium' | 'custom';

export interface CertificateConfig {
  /** Certificate type */
  type: CertificateType;
  
  /** Certificate ARN */
  arn?: string;
  
  /** Custom certificate */
  customCertificate?: CustomCertificateConfig;
}

export type CertificateType = 'cloudfront-default' | 'acm' | 'iam' | 'custom';

export interface CustomCertificateConfig {
  /** Certificate body */
  certificateBody: string;
  
  /** Private key */
  privateKey: string;
  
  /** Certificate chain */
  certificateChain?: string;
  
  /** Certificate source */
  source: string;
}

export interface HSTSConfiguration {
  /** HSTS enabled */
  enabled: boolean;
  
  /** Max age (seconds) */
  maxAge: number;
  
  /** Include subdomains */
  includeSubdomains: boolean;
  
  /** Preload */
  preload: boolean;
}

export interface OriginHealthCheck {
  /** Health check enabled */
  enabled: boolean;
  
  /** Check interval (seconds) */
  interval: number;
  
  /** Timeout (seconds) */
  timeout: number;
  
  /** Healthy threshold */
  healthyThreshold: number;
  
  /** Unhealthy threshold */
  unhealthyThreshold: number;
  
  /** Health check path */
  path: string;
  
  /** Expected response codes */
  expectedResponseCodes: number[];
  
  /** Health check protocol */
  protocol: 'http' | 'https';
  
  /** Custom headers */
  headers?: CustomHeader[];
}

export interface OriginFailover {
  /** Failover enabled */
  enabled: boolean;
  
  /** Primary origin */
  primaryOrigin: string;
  
  /** Secondary origins */
  secondaryOrigins: string[];
  
  /** Failover criteria */
  criteria: FailoverCriteria[];
  
  /** Failback settings */
  failback?: FailbackSettings;
}

export interface FailoverCriteria {
  /** Criteria type */
  type: FailoverCriteriaType;
  
  /** Threshold value */
  threshold: number;
  
  /** Time window (seconds) */
  timeWindow: number;
  
  /** Criteria enabled */
  enabled: boolean;
}

export type FailoverCriteriaType = 'response-time' | 'error-rate' | 'status-code' | 'health-check' | 'custom';

export interface FailbackSettings {
  /** Failback enabled */
  enabled: boolean;
  
  /** Failback delay (seconds) */
  delay: number;
  
  /** Success threshold for failback */
  successThreshold: number;
  
  /** Monitoring period (seconds) */
  monitoringPeriod: number;
}

export interface LoadBalancingConfig {
  /** Load balancing method */
  method: LoadBalancingMethod;
  
  /** Weight configuration */
  weights?: OriginWeight[];
  
  /** Session persistence */
  sessionPersistence?: SessionPersistence;
  
  /** Health-based routing */
  healthBasedRouting: boolean;
}

export type LoadBalancingMethod = 'round-robin' | 'weighted' | 'least-connections' | 'ip-hash' | 'geographic';

export interface OriginWeight {
  /** Origin ID */
  originId: string;
  
  /** Weight value */
  weight: number;
}

export interface SessionPersistence {
  /** Persistence enabled */
  enabled: boolean;
  
  /** Persistence method */
  method: PersistenceMethod;
  
  /** Session timeout (seconds) */
  timeout: number;
  
  /** Cookie configuration */
  cookie?: CookieConfig;
}

export type PersistenceMethod = 'cookie' | 'ip-hash' | 'header' | 'custom';

export interface CookieConfig {
  /** Cookie name */
  name: string;
  
  /** Cookie domain */
  domain?: string;
  
  /** Cookie path */
  path?: string;
  
  /** Cookie secure flag */
  secure: boolean;
  
  /** Cookie HTTP-only flag */
  httpOnly: boolean;
  
  /** Cookie SameSite attribute */
  sameSite?: SameSiteAttribute;
}

export type SameSiteAttribute = 'strict' | 'lax' | 'none';

// ============================================================================
// CACHE BEHAVIOR
// ============================================================================

export interface CacheBehavior {
  /** Path pattern */
  pathPattern: string;
  
  /** Target origin */
  targetOrigin: string;
  
  /** Viewer protocol policy */
  viewerProtocolPolicy: ViewerProtocolPolicy;
  
  /** Cache policy */
  cachePolicy: CachePolicy;
  
  /** Request policy */
  requestPolicy?: RequestPolicy;
  
  /** Response headers policy */
  responseHeadersPolicy?: ResponseHeadersPolicy;
  
  /** Trusted signers */
  trustedSigners?: string[];
  
  /** Lambda function associations */
  lambdaFunctions?: LambdaFunctionAssociation[];
  
  /** CloudFront functions */
  cloudfrontFunctions?: CloudFrontFunctionAssociation[];
  
  /** Realtime logs */
  realtimeLogs?: RealtimeLogsConfig;
}

export type ViewerProtocolPolicy = 'allow-all' | 'https-only' | 'redirect-to-https';

export interface CachePolicy {
  /** Cache policy ID */
  id: string;
  
  /** Cache policy name */
  name: string;
  
  /** Default TTL (seconds) */
  defaultTTL: number;
  
  /** Maximum TTL (seconds) */
  maxTTL: number;
  
  /** Minimum TTL (seconds) */
  minTTL: number;
  
  /** Cache key parameters */
  cacheKeyParameters: CacheKeyParameters;
  
  /** Compression enabled */
  compressionEnabled: boolean;
}

export interface CacheKeyParameters {
  /** Include headers */
  headers: CacheKeyHeaders;
  
  /** Include query strings */
  queryStrings: CacheKeyQueryStrings;
  
  /** Include cookies */
  cookies: CacheKeyCookies;
  
  /** Enable accepted-encoding header */
  enableAcceptEncodingGzip: boolean;
  
  /** Enable accept-encoding brotli */
  enableAcceptEncodingBrotli: boolean;
}

export interface CacheKeyHeaders {
  /** Header behavior */
  behavior: HeaderBehavior;
  
  /** Header names (if allowlist/denylist) */
  headers?: string[];
}

export type HeaderBehavior = 'none' | 'whitelist' | 'blacklist' | 'all';

export interface CacheKeyQueryStrings {
  /** Query string behavior */
  behavior: QueryStringBehavior;
  
  /** Query string names (if allowlist/denylist) */
  queryStrings?: string[];
}

export type QueryStringBehavior = 'none' | 'whitelist' | 'blacklist' | 'all';

export interface CacheKeyCookies {
  /** Cookie behavior */
  behavior: CookieBehavior;
  
  /** Cookie names (if allowlist/denylist) */
  cookies?: string[];
}

export type CookieBehavior = 'none' | 'whitelist' | 'blacklist' | 'all';

export interface RequestPolicy {
  /** Request policy ID */
  id: string;
  
  /** Request policy name */
  name: string;
  
  /** Headers to include */
  headers: RequestHeaders;
  
  /** Query strings to include */
  queryStrings: RequestQueryStrings;
  
  /** Cookies to include */
  cookies: RequestCookies;
}

export interface RequestHeaders {
  /** Header behavior */
  behavior: HeaderBehavior;
  
  /** Header names */
  headers?: string[];
}

export interface RequestQueryStrings {
  /** Query string behavior */
  behavior: QueryStringBehavior;
  
  /** Query string names */
  queryStrings?: string[];
}

export interface RequestCookies {
  /** Cookie behavior */
  behavior: CookieBehavior;
  
  /** Cookie names */
  cookies?: string[];
}

export interface ResponseHeadersPolicy {
  /** Policy ID */
  id: string;
  
  /** Policy name */
  name: string;
  
  /** Custom headers */
  customHeaders: ResponseCustomHeader[];
  
  /** Security headers */
  securityHeaders?: SecurityHeaders;
  
  /** CORS headers */
  corsHeaders?: CORSHeaders;
  
  /** Server timing header */
  serverTimingHeader?: boolean;
}

export interface ResponseCustomHeader {
  /** Header name */
  name: string;
  
  /** Header value */
  value: string;
  
  /** Override existing header */
  override: boolean;
}

export interface SecurityHeaders {
  /** Content type options */
  contentTypeOptions?: boolean;
  
  /** Frame options */
  frameOptions?: FrameOptionsConfig;
  
  /** Referrer policy */
  referrerPolicy?: ReferrerPolicyConfig;
  
  /** Content security policy */
  contentSecurityPolicy?: CSPConfig;
  
  /** Strict transport security */
  strictTransportSecurity?: STSConfig;
}

export interface FrameOptionsConfig {
  /** Frame options enabled */
  enabled: boolean;
  
  /** Frame options value */
  value: FrameOptionsValue;
}

export type FrameOptionsValue = 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM';

export interface ReferrerPolicyConfig {
  /** Referrer policy enabled */
  enabled: boolean;
  
  /** Referrer policy value */
  value: ReferrerPolicyValue;
}

export type ReferrerPolicyValue = 
  | 'no-referrer'
  | 'no-referrer-when-downgrade' 
  | 'origin'
  | 'origin-when-cross-origin'
  | 'same-origin'
  | 'strict-origin'
  | 'strict-origin-when-cross-origin'
  | 'unsafe-url';

export interface CSPConfig {
  /** CSP enabled */
  enabled: boolean;
  
  /** CSP policy */
  policy: string;
  
  /** Report-only mode */
  reportOnly?: boolean;
}

export interface STSConfig {
  /** STS enabled */
  enabled: boolean;
  
  /** Max age (seconds) */
  maxAge: number;
  
  /** Include subdomains */
  includeSubdomains: boolean;
  
  /** Preload */
  preload: boolean;
}

export interface CORSHeaders {
  /** Access-Control-Allow-Origin */
  allowOrigin: CORSOriginConfig;
  
  /** Access-Control-Allow-Methods */
  allowMethods?: CORSMethodsConfig;
  
  /** Access-Control-Allow-Headers */
  allowHeaders?: CORSHeadersConfig;
  
  /** Access-Control-Expose-Headers */
  exposeHeaders?: string[];
  
  /** Access-Control-Max-Age */
  maxAge?: number;
  
  /** Access-Control-Allow-Credentials */
  allowCredentials?: boolean;
}

export interface CORSOriginConfig {
  /** Origin behavior */
  behavior: 'all' | 'whitelist' | 'none';
  
  /** Allowed origins */
  origins?: string[];
}

export interface CORSMethodsConfig {
  /** Methods behavior */
  behavior: 'all' | 'whitelist';
  
  /** Allowed methods */
  methods?: HTTPMethod[];
}

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'PATCH';

export interface CORSHeadersConfig {
  /** Headers behavior */
  behavior: 'all' | 'whitelist' | 'none';
  
  /** Allowed headers */
  headers?: string[];
}

export interface LambdaFunctionAssociation {
  /** Lambda function ARN */
  lambdaFunctionARN: string;
  
  /** Event type */
  eventType: LambdaEventType;
  
  /** Include body */
  includeBody?: boolean;
}

export type LambdaEventType = 'viewer-request' | 'origin-request' | 'viewer-response' | 'origin-response';

export interface CloudFrontFunctionAssociation {
  /** Function ARN */
  functionARN: string;
  
  /** Event type */
  eventType: CloudFrontEventType;
}

export type CloudFrontEventType = 'viewer-request' | 'viewer-response';

export interface RealtimeLogsConfig {
  /** Realtime logs enabled */
  enabled: boolean;
  
  /** Kinesis stream ARN */
  streamARN: string;
  
  /** Sample rate (0-100) */
  sampleRate: number;
  
  /** Log fields */
  fields: string[];
}

// ============================================================================
// CDN OPERATIONS
// ============================================================================

export interface CDNService {
  /** Deploy content to CDN */
  deploy(content: MediaFile, options: DeploymentOptions): Promise<DeploymentResult>;
  
  /** Invalidate CDN cache */
  invalidate(paths: string[], options?: InvalidationOptions): Promise<InvalidationResult>;
  
  /** Purge CDN cache */
  purge(paths: string[], options?: PurgeOptions): Promise<PurgeResult>;
  
  /** Get CDN statistics */
  getStatistics(options?: StatisticsOptions): Promise<CDNStatistics>;
  
  /** Configure cache rules */
  configureCacheRules(rules: CacheRule[]): Promise<void>;
  
  /** Get cache status */
  getCacheStatus(url: string): Promise<CacheStatusInfo>;
  
  /** Generate signed URLs */
  generateSignedURL(path: string, options: SignedURLOptions): Promise<string>;
  
  /** Update security policies */
  updateSecurityPolicies(policies: SecurityPolicyUpdate[]): Promise<void>;
}

export interface DeploymentOptions {
  /** Target regions */
  regions?: EdgeLocation[];
  
  /** Cache settings */
  cacheSettings?: CacheSettings;
  
  /** Compression settings */
  compression?: CompressionConfig;
  
  /** Security settings */
  security?: SecurityConfig;
  
  /** Metadata */
  metadata?: Record<string, string>;
  
  /** Tags */
  tags?: Record<string, string>;
}

export interface CacheSettings {
  /** Cache TTL (seconds) */
  ttl: number;
  
  /** Cache key strategy */
  keyStrategy: CacheKeyStrategy;
  
  /** Vary headers */
  varyHeaders?: string[];
  
  /** Browser cache settings */
  browserCache?: BrowserCacheSettings;
}

export type CacheKeyStrategy = 'url-only' | 'url-query' | 'url-headers' | 'custom';

export interface BrowserCacheSettings {
  /** Max age (seconds) */
  maxAge: number;
  
  /** No-cache directive */
  noCache?: boolean;
  
  /** Must-revalidate directive */
  mustRevalidate?: boolean;
  
  /** Public/private directive */
  visibility: 'public' | 'private';
}

export interface CompressionConfig {
  /** Compression enabled */
  enabled: boolean;
  
  /** Compression algorithms */
  algorithms: CompressionAlgorithm[];
  
  /** Minimum file size */
  minSize: number;
  
  /** File types to compress */
  fileTypes: string[];
}

export type CompressionAlgorithm = 'gzip' | 'brotli' | 'deflate';

export interface SecurityConfig {
  /** DDoS protection */
  ddosProtection?: boolean;
  
  /** Web Application Firewall */
  waf?: WAFConfig;
  
  /** Access control */
  accessControl?: AccessControlConfig;
  
  /** Rate limiting */
  rateLimiting?: RateLimitConfig;
}

export interface WAFConfig {
  /** WAF enabled */
  enabled: boolean;
  
  /** WAF rules */
  rules: WAFRule[];
  
  /** Default action */
  defaultAction: WAFAction;
}

export interface WAFRule {
  /** Rule name */
  name: string;
  
  /** Rule condition */
  condition: WAFCondition;
  
  /** Rule action */
  action: WAFAction;
  
  /** Rule priority */
  priority: number;
}

export interface WAFCondition {
  /** Condition type */
  type: WAFConditionType;
  
  /** Condition parameters */
  parameters: Record<string, unknown>;
}

export type WAFConditionType = 'ip-match' | 'geo-match' | 'size-match' | 'sql-injection' | 'xss' | 'rate-limit' | 'custom';
export type WAFAction = 'allow' | 'block' | 'count' | 'challenge';

export interface AccessControlConfig {
  /** Allowed IPs */
  allowedIPs?: string[];
  
  /** Blocked IPs */
  blockedIPs?: string[];
  
  /** Allowed countries */
  allowedCountries?: string[];
  
  /** Blocked countries */
  blockedCountries?: string[];
  
  /** Referrer restrictions */
  referrerRestrictions?: ReferrerRestriction[];
}

export interface ReferrerRestriction {
  /** Referrer pattern */
  pattern: string;
  
  /** Action */
  action: 'allow' | 'block';
  
  /** Case sensitive */
  caseSensitive: boolean;
}

export interface RateLimitConfig {
  /** Requests per second */
  requestsPerSecond: number;
  
  /** Burst size */
  burstSize: number;
  
  /** Rate limit by IP */
  byIP: boolean;
  
  /** Rate limit by user */
  byUser?: boolean;
  
  /** Rate limit by path */
  byPath?: PathRateLimit[];
}

export interface PathRateLimit {
  /** Path pattern */
  pattern: string;
  
  /** Requests per second */
  requestsPerSecond: number;
  
  /** Burst size */
  burstSize: number;
}

export interface DeploymentResult {
  /** Deployment ID */
  deploymentId: string;
  
  /** CDN URLs */
  urls: CDNURLInfo[];
  
  /** Deployment status */
  status: DeploymentStatus;
  
  /** Deployment time */
  deploymentTime: Date;
  
  /** Propagation time estimate */
  estimatedPropagationTime: number;
  
  /** Cache invalidation info */
  cacheInvalidation?: InvalidationInfo;
}

export interface CDNURLInfo {
  /** URL */
  url: string;
  
  /** URL type */
  type: CDNURLType;
  
  /** Region */
  region: EdgeLocation;
  
  /** Cache status */
  cacheStatus?: CacheStatus;
}

export type CDNURLType = 'primary' | 'alternative' | 'regional' | 'mobile' | 'debug';
export type DeploymentStatus = 'pending' | 'deploying' | 'deployed' | 'failed' | 'rollback';

export interface InvalidationInfo {
  /** Invalidation ID */
  invalidationId: string;
  
  /** Invalidated paths */
  paths: string[];
  
  /** Invalidation status */
  status: InvalidationStatus;
}

export type InvalidationStatus = 'pending' | 'in-progress' | 'completed' | 'failed';

export interface InvalidationOptions {
  /** Invalidation type */
  type: InvalidationType;
  
  /** Batch invalidation */
  batch?: boolean;
  
  /** Priority */
  priority?: InvalidationPriority;
  
  /** Callback URL */
  callbackURL?: string;
}

export type InvalidationType = 'exact' | 'wildcard' | 'recursive' | 'tag-based';
export type InvalidationPriority = 'normal' | 'high' | 'urgent';

export interface InvalidationResult {
  /** Invalidation ID */
  invalidationId: string;
  
  /** Status */
  status: InvalidationStatus;
  
  /** Affected paths */
  affectedPaths: string[];
  
  /** Estimated completion time */
  estimatedCompletionTime: Date;
  
  /** Cost estimate */
  costEstimate?: number;
}

export interface PurgeOptions {
  /** Purge type */
  type: PurgeType;
  
  /** Purge tags */
  tags?: string[];
  
  /** Recursive purge */
  recursive?: boolean;
}

export type PurgeType = 'url' | 'tag' | 'hostname' | 'everything';

export interface PurgeResult {
  /** Purge ID */
  purgeId: string;
  
  /** Status */
  status: PurgeStatus;
  
  /** Purged items count */
  purgedItems: number;
  
  /** Completion time */
  completionTime: Date;
}

export type PurgeStatus = 'pending' | 'completed' | 'failed' | 'partial';

export interface StatisticsOptions {
  /** Time range */
  timeRange: TimeRange;
  
  /** Metrics to include */
  metrics?: CDNMetric[];
  
  /** Granularity */
  granularity?: TimeGranularity;
  
  /** Group by dimensions */
  groupBy?: string[];
}

export interface TimeRange {
  /** Start time */
  start: Date;
  
  /** End time */
  end: Date;
}

export type CDNMetric = 
  | 'requests'
  | 'bandwidth'
  | 'cache-hit-rate'
  | 'response-time'
  | 'error-rate'
  | 'origin-requests'
  | 'data-transfer'
  | 'unique-visitors';

export type TimeGranularity = 'minute' | 'hour' | 'day' | 'week' | 'month';

export interface CDNStatistics {
  /** Time period */
  period: TimeRange;
  
  /** Request statistics */
  requests: RequestStatistics;
  
  /** Bandwidth statistics */
  bandwidth: BandwidthStatistics;
  
  /** Cache statistics */
  cache: CacheStatistics;
  
  /** Performance statistics */
  performance: PerformanceStatistics;
  
  /** Error statistics */
  errors: ErrorStatistics;
  
  /** Geographic statistics */
  geographic: GeographicStatistics;
  
  /** Top content */
  topContent: ContentStatistics[];
}

export interface RequestStatistics {
  /** Total requests */
  total: number;
  
  /** Requests by time period */
  timeline: TimelineDataPoint[];
  
  /** Requests by HTTP method */
  byMethod: Record<HTTPMethod, number>;
  
  /** Requests by status code */
  byStatusCode: Record<number, number>;
  
  /** Peak requests per second */
  peakRequestsPerSecond: number;
}

export interface TimelineDataPoint {
  /** Timestamp */
  timestamp: Date;
  
  /** Value */
  value: number;
}

export interface BandwidthStatistics {
  /** Total bandwidth (bytes) */
  total: number;
  
  /** Bandwidth timeline */
  timeline: TimelineDataPoint[];
  
  /** Bandwidth by content type */
  byContentType: Record<string, number>;
  
  /** Peak bandwidth */
  peakBandwidth: number;
  
  /** Average bandwidth */
  averageBandwidth: number;
}

export interface CacheStatistics {
  /** Cache hit rate */
  hitRate: number;
  
  /** Cache miss rate */
  missRate: number;
  
  /** Cache hit timeline */
  hitRateTimeline: TimelineDataPoint[];
  
  /** Cache hits by content type */
  hitsByContentType: Record<string, number>;
  
  /** Most cached content */
  topCachedContent: string[];
}

export interface PerformanceStatistics {
  /** Average response time (ms) */
  averageResponseTime: number;
  
  /** Response time percentiles */
  responseTimePercentiles: Record<string, number>;
  
  /** Response time timeline */
  responseTimeTimeline: TimelineDataPoint[];
  
  /** Time to first byte */
  timeToFirstByte: number;
  
  /** Performance by region */
  byRegion: Record<string, PerformanceMetrics>;
}

export interface PerformanceMetrics {
  /** Average response time */
  avgResponseTime: number;
  
  /** 95th percentile response time */
  p95ResponseTime: number;
  
  /** 99th percentile response time */
  p99ResponseTime: number;
  
  /** Throughput */
  throughput: number;
}

export interface ErrorStatistics {
  /** Total errors */
  total: number;
  
  /** Error rate */
  rate: number;
  
  /** Errors by status code */
  byStatusCode: Record<number, number>;
  
  /** Error timeline */
  timeline: TimelineDataPoint[];
  
  /** Top error URLs */
  topErrorURLs: string[];
}

export interface GeographicStatistics {
  /** Requests by country */
  byCountry: Record<string, number>;
  
  /** Bandwidth by country */
  bandwidthByCountry: Record<string, number>;
  
  /** Performance by region */
  performanceByRegion: Record<string, PerformanceMetrics>;
  
  /** Top countries */
  topCountries: CountryStatistics[];
}

export interface CountryStatistics {
  /** Country code */
  countryCode: string;
  
  /** Country name */
  countryName: string;
  
  /** Requests */
  requests: number;
  
  /** Bandwidth */
  bandwidth: number;
  
  /** Performance metrics */
  performance: PerformanceMetrics;
}

export interface ContentStatistics {
  /** Content URL */
  url: string;
  
  /** Requests */
  requests: number;
  
  /** Bandwidth */
  bandwidth: number;
  
  /** Cache hit rate */
  cacheHitRate: number;
  
  /** Average response time */
  avgResponseTime: number;
}

export interface CacheStatusInfo {
  /** URL */
  url: string;
  
  /** Cache status */
  status: CacheStatus;
  
  /** TTL remaining (seconds) */
  ttlRemaining?: number;
  
  /** Last cached */
  lastCached?: Date;
  
  /** Cache region */
  cacheRegion: EdgeLocation;
  
  /** Cache size */
  cacheSize?: number;
  
  /** Cache tags */
  cacheTags?: string[];
}

export interface SignedURLOptions {
  /** Expiration time */
  expiresAt: Date;
  
  /** IP restrictions */
  ipRestrictions?: string[];
  
  /** Custom policy */
  customPolicy?: string;
  
  /** Key pair ID */
  keyPairId?: string;
  
  /** Private key */
  privateKey?: string;
}

export interface SecurityPolicyUpdate {
  /** Policy type */
  type: SecurityPolicyType;
  
  /** Policy configuration */
  configuration: Record<string, unknown>;
  
  /** Update action */
  action: 'create' | 'update' | 'delete';
}

export type SecurityPolicyType = 'waf' | 'access-control' | 'rate-limiting' | 'ssl-tls' | 'cors';