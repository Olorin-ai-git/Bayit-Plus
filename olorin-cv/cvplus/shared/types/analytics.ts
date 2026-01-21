/**
 * Analytics Data Types
 *
 * Shared TypeScript types for CVPlus analytics, tracking, and engagement metrics.
 * Based on data-model.md specification.
 *
 * @fileoverview Analytics types including AnalyticsEvent, AnalyticsAggregate, and engagement tracking
 */

import { Timestamp } from 'firebase-admin/firestore';

// ============================================================================
// Core Analytics Event Interface
// ============================================================================

/**
 * Individual analytics event with comprehensive context and metadata
 */
export interface AnalyticsEvent {
  // Identity
  /** UUID primary key */
  id: string;

  // Event Classification
  /** Type of event that occurred */
  eventType: EventType;
  /** Type of entity that was interacted with */
  entityType: EntityType;
  /** ID of the specific entity */
  entityId: string;

  // User Context
  /** User ID if authenticated (null for anonymous) */
  userId?: string;
  /** Browser session identifier */
  sessionId: string;
  /** Anonymized user fingerprint */
  fingerprint?: string;

  // Request Context
  /** IP address (anonymized after 30 days for GDPR) */
  ipAddress: string;
  /** User agent string for browser/device detection */
  userAgent: string;
  /** HTTP referrer URL */
  referrer?: string;
  /** ISO country code from GeoIP */
  country?: string;
  /** City from GeoIP */
  city?: string;

  // Event-Specific Data
  /** Event-specific payload and metadata */
  eventData: Record<string, any>;
  /** Custom properties for enhanced tracking */
  customProperties?: Record<string, any>;

  // Performance Metrics
  /** Event timestamp */
  timestamp: Timestamp;
  /** Duration for timed events (milliseconds) */
  duration?: number;
  /** Page load time if applicable */
  loadTime?: number;

  // Privacy Compliance
  /** Whether event data is anonymized */
  isAnonymized: boolean;
  /** Data retention expiration date */
  retentionExpiresAt?: Timestamp;
}

// ============================================================================
// Event Type Management
// ============================================================================

/**
 * Comprehensive event types for tracking user interactions
 */
export enum EventType {
  // Profile Interactions
  VIEW = 'view',
  PROFILE_SHARE = 'profile_share',
  SECTION_VIEW = 'section_view',
  SECTION_EXPAND = 'section_expand',

  // Content Interactions
  DOWNLOAD = 'download',
  MULTIMEDIA_PLAY = 'multimedia_play',
  MULTIMEDIA_PAUSE = 'multimedia_pause',
  MULTIMEDIA_COMPLETE = 'multimedia_complete',

  // Engagement Actions
  CONTACT_FORM_SUBMIT = 'contact_form_submit',
  CONTACT_FORM_VIEW = 'contact_form_view',
  CALENDAR_BOOKING = 'calendar_booking',
  EMAIL_CLICK = 'email_click',
  PHONE_CLICK = 'phone_click',

  // Feature Usage
  FEATURE_INTERACTION = 'feature_interaction',
  SEARCH_QUERY = 'search_query',
  FILTER_APPLY = 'filter_apply',

  // Conversion Events
  SUBSCRIPTION_START = 'subscription_start',
  UPGRADE_CONVERSION = 'upgrade_conversion',
  FEATURE_UNLOCK = 'feature_unlock',

  // Technical Events
  ERROR = 'error',
  PAGE_LOAD = 'page_load',
  API_CALL = 'api_call',

  // Social Actions
  SOCIAL_SHARE = 'social_share',
  RECOMMENDATION_CLICK = 'recommendation_click'
}

/**
 * Type guard for EventType
 */
export function isEventType(value: string): value is EventType {
  return Object.values(EventType).includes(value as EventType);
}

// ============================================================================
// Entity Type Management
// ============================================================================

/**
 * Entity types that can be tracked in analytics
 */
export enum EntityType {
  PUBLIC_PROFILE = 'public_profile',
  CV_JOB = 'cv_job',
  GENERATED_CONTENT = 'generated_content',
  USER_PROFILE = 'user_profile',
  CONTACT_FORM = 'contact_form',
  SEARCH_RESULT = 'search_result',
  FEATURE = 'feature',
  PAGE = 'page'
}

/**
 * Type guard for EntityType
 */
export function isEntityType(value: string): value is EntityType {
  return Object.values(EntityType).includes(value as EntityType);
}

// ============================================================================
// Analytics Aggregates
// ============================================================================

/**
 * Pre-computed analytics aggregates for performance and reporting
 */
export interface AnalyticsAggregate {
  // Aggregation Identity
  /** Composite primary key */
  id: string;
  /** Type of entity being aggregated */
  entityType: EntityType;
  /** Specific entity ID */
  entityId: string;
  /** Aggregation time period */
  period: AggregationPeriod;
  /** Period start timestamp */
  startTime: Timestamp;
  /** Period end timestamp */
  endTime: Timestamp;

  // Core Metrics
  /** Total number of views */
  viewCount: number;
  /** Unique visitor count */
  uniqueViewCount: number;
  /** Total downloads */
  downloadCount: number;
  /** Social shares count */
  shareCount: number;
  /** Contact form submissions */
  contactFormSubmissions: number;
  /** Calendar bookings */
  calendarBookings: number;

  // Engagement Metrics
  /** Average time spent (seconds) */
  averageEngagementTime: number;
  /** Bounce rate percentage */
  bounceRate: number;
  /** Page depth average */
  averagePageDepth: number;
  /** Return visitor percentage */
  returnVisitorRate: number;

  // Conversion Metrics
  /** Conversion events count */
  conversionCount: number;
  /** Conversion rate percentage */
  conversionRate: number;
  /** Revenue generated (if applicable) */
  revenue?: number;

  // Geographic Distribution
  /** Top viewing countries */
  topCountries: CountryStats[];
  /** Geographic diversity score */
  geographicDiversity: number;

  // Traffic Sources
  /** Top referrer sources */
  topReferrers: ReferrerStats[];
  /** Direct traffic percentage */
  directTrafficRate: number;

  // Device and Technology
  /** Device type breakdown */
  deviceBreakdown: DeviceBreakdown;
  /** Browser statistics */
  browserStats: BrowserStats[];

  // Content Performance
  /** Most viewed sections */
  topSections: SectionStats[];
  /** Feature usage statistics */
  featureUsage: FeatureUsageStats[];

  // Quality Metrics
  /** Data completeness percentage */
  dataCompleteness: number;
  /** Last aggregation update */
  lastUpdated: Timestamp;
}

// ============================================================================
// Aggregation Periods
// ============================================================================

/**
 * Time periods for analytics aggregation
 */
export enum AggregationPeriod {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year'
}

/**
 * Type guard for AggregationPeriod
 */
export function isAggregationPeriod(value: string): value is AggregationPeriod {
  return Object.values(AggregationPeriod).includes(value as AggregationPeriod);
}

// ============================================================================
// Statistical Breakdown Interfaces
// ============================================================================

/**
 * Country-based viewing statistics
 */
export interface CountryStats {
  /** ISO country code */
  countryCode: string;
  /** Country name */
  countryName: string;
  /** View count from country */
  viewCount: number;
  /** Percentage of total views */
  percentage: number;
  /** Unique visitors from country */
  uniqueVisitors: number;
}

/**
 * Referrer source statistics
 */
export interface ReferrerStats {
  /** Referrer domain or source */
  source: string;
  /** Referrer category (social, search, direct, etc.) */
  category: ReferrerCategory;
  /** View count from referrer */
  viewCount: number;
  /** Percentage of total traffic */
  percentage: number;
  /** Conversion rate from this source */
  conversionRate: number;
}

/**
 * Referrer categories for classification
 */
export enum ReferrerCategory {
  DIRECT = 'direct',
  SEARCH_ENGINE = 'search_engine',
  SOCIAL_MEDIA = 'social_media',
  EMAIL = 'email',
  REFERRAL = 'referral',
  PAID_ADVERTISING = 'paid_advertising',
  OTHER = 'other'
}

/**
 * Device type breakdown
 */
export interface DeviceBreakdown {
  /** Desktop visits */
  desktop: DeviceStats;
  /** Mobile visits */
  mobile: DeviceStats;
  /** Tablet visits */
  tablet: DeviceStats;
}

/**
 * Device-specific statistics
 */
export interface DeviceStats {
  /** Visit count */
  count: number;
  /** Percentage of total */
  percentage: number;
  /** Average session duration */
  avgSessionDuration: number;
  /** Bounce rate for device type */
  bounceRate: number;
}

/**
 * Browser usage statistics
 */
export interface BrowserStats {
  /** Browser name */
  browserName: string;
  /** Browser version */
  version?: string;
  /** Usage count */
  count: number;
  /** Percentage of total */
  percentage: number;
}

/**
 * Profile section viewing statistics
 */
export interface SectionStats {
  /** Section identifier */
  sectionId: string;
  /** Section display name */
  sectionName: string;
  /** View count */
  viewCount: number;
  /** Time spent in section */
  avgTimeSpent: number;
  /** Interaction rate */
  interactionRate: number;
}

/**
 * Feature usage statistics
 */
export interface FeatureUsageStats {
  /** Feature identifier */
  featureId: string;
  /** Feature name */
  featureName: string;
  /** Usage count */
  usageCount: number;
  /** Success rate */
  successRate: number;
  /** Average usage duration */
  avgUsageDuration: number;
}

// ============================================================================
// Real-time Analytics
// ============================================================================

/**
 * Real-time analytics snapshot for live monitoring
 */
export interface RealTimeAnalytics {
  /** Entity being monitored */
  entityId: string;
  entityType: EntityType;

  // Current Activity
  /** Active users right now */
  currentUsers: number;
  /** Events in last 5 minutes */
  recentEvents: number;
  /** Views in last hour */
  lastHourViews: number;

  // Trending Data
  /** Trending content */
  trendingContent: TrendingItem[];
  /** Traffic spike detection */
  trafficSpike: boolean;
  /** Anomaly detection */
  anomalies: AnalyticsAnomaly[];

  // Performance
  /** Average response time */
  avgResponseTime: number;
  /** Error rate */
  errorRate: number;

  /** Last update timestamp */
  lastUpdated: Timestamp;
}

/**
 * Trending content item
 */
export interface TrendingItem {
  /** Item identifier */
  itemId: string;
  /** Item type */
  itemType: string;
  /** Trend score */
  score: number;
  /** Growth rate percentage */
  growthRate: number;
}

/**
 * Analytics anomaly detection
 */
export interface AnalyticsAnomaly {
  /** Anomaly type */
  type: AnomalyType;
  /** Severity level */
  severity: 'low' | 'medium' | 'high';
  /** Anomaly description */
  description: string;
  /** Detection timestamp */
  detectedAt: Timestamp;
}

/**
 * Types of analytics anomalies
 */
export enum AnomalyType {
  TRAFFIC_SPIKE = 'traffic_spike',
  TRAFFIC_DROP = 'traffic_drop',
  HIGH_ERROR_RATE = 'high_error_rate',
  UNUSUAL_GEOGRAPHIC = 'unusual_geographic',
  BOT_TRAFFIC = 'bot_traffic',
  PERFORMANCE_DEGRADATION = 'performance_degradation'
}

// ============================================================================
// Validation and Utilities
// ============================================================================

/**
 * Validate AnalyticsEvent before database operations
 */
export function validateAnalyticsEvent(event: Partial<AnalyticsEvent>): string[] {
  const errors: string[] = [];

  // Required fields
  if (!event.eventType) errors.push('Event type is required');
  if (!event.entityType) errors.push('Entity type is required');
  if (!event.entityId) errors.push('Entity ID is required');
  if (!event.sessionId) errors.push('Session ID is required');
  if (!event.ipAddress) errors.push('IP address is required');

  // Type validation
  if (event.eventType && !isEventType(event.eventType)) {
    errors.push('Invalid event type');
  }

  if (event.entityType && !isEntityType(event.entityType)) {
    errors.push('Invalid entity type');
  }

  // Duration validation
  if (event.duration !== undefined && event.duration < 0) {
    errors.push('Duration cannot be negative');
  }

  return errors;
}

/**
 * Type guard for AnalyticsEvent
 */
export function isAnalyticsEvent(obj: any): obj is AnalyticsEvent {
  return (
    obj &&
    typeof obj.id === 'string' &&
    isEventType(obj.eventType) &&
    isEntityType(obj.entityType) &&
    typeof obj.entityId === 'string' &&
    typeof obj.sessionId === 'string' &&
    obj.timestamp instanceof Timestamp
  );
}

/**
 * Generate composite ID for analytics aggregate
 */
export function generateAggregateId(
  entityType: EntityType,
  entityId: string,
  period: AggregationPeriod,
  startTime: Timestamp
): string {
  const timestamp = startTime.toMillis();
  return `${entityType}:${entityId}:${period}:${timestamp}`;
}

/**
 * Calculate bounce rate from events
 */
export function calculateBounceRate(totalSessions: number, bouncedSessions: number): number {
  if (totalSessions === 0) return 0;
  return Math.round((bouncedSessions / totalSessions) * 100 * 10) / 10;
}

/**
 * Calculate conversion rate
 */
export function calculateConversionRate(totalVisitors: number, conversions: number): number {
  if (totalVisitors === 0) return 0;
  return Math.round((conversions / totalVisitors) * 100 * 10) / 10;
}

/**
 * Anonymize IP address for privacy compliance
 */
export function anonymizeIpAddress(ipAddress: string): string {
  const parts = ipAddress.split('.');
  if (parts.length === 4) {
    // IPv4: zero out last octet
    return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  }

  // IPv6: zero out last 64 bits
  const colonIndex = ipAddress.indexOf('::');
  if (colonIndex !== -1) {
    return ipAddress.substring(0, colonIndex + 2);
  }

  const ipv6Parts = ipAddress.split(':');
  if (ipv6Parts.length >= 4) {
    return ipv6Parts.slice(0, 4).join(':') + '::';
  }

  return ipAddress; // Return original if format not recognized
}

/**
 * Detect bot traffic from user agent
 */
export function isBotTraffic(userAgent: string): boolean {
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /googlebot/i,
    /bingbot/i,
    /facebookexternalhit/i,
    /twitterbot/i,
    /linkedinbot/i,
    /whatsapp/i,
    /telegram/i
  ];

  return botPatterns.some(pattern => pattern.test(userAgent));
}

/**
 * Get time period boundaries
 */
export function getPeriodBoundaries(
  period: AggregationPeriod,
  timestamp: Timestamp
): { start: Timestamp; end: Timestamp } {
  const date = timestamp.toDate();

  switch (period) {
    case AggregationPeriod.HOUR:
      const hourStart = new Date(date);
      hourStart.setMinutes(0, 0, 0);
      const hourEnd = new Date(hourStart);
      hourEnd.setHours(hourEnd.getHours() + 1);
      return {
        start: Timestamp.fromDate(hourStart),
        end: Timestamp.fromDate(hourEnd)
      };

    case AggregationPeriod.DAY:
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      return {
        start: Timestamp.fromDate(dayStart),
        end: Timestamp.fromDate(dayEnd)
      };

    case AggregationPeriod.WEEK:
      const weekStart = new Date(date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      return {
        start: Timestamp.fromDate(weekStart),
        end: Timestamp.fromDate(weekEnd)
      };

    case AggregationPeriod.MONTH:
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      return {
        start: Timestamp.fromDate(monthStart),
        end: Timestamp.fromDate(monthEnd)
      };

    default:
      throw new Error(`Unsupported period: ${period}`);
  }
}

/**
 * Calculate geographic diversity score
 */
export function calculateGeographicDiversity(countryStats: CountryStats[]): number {
  if (countryStats.length <= 1) return 0;

  // Shannon diversity index
  let diversity = 0;
  const total = countryStats.reduce((sum, stat) => sum + stat.viewCount, 0);

  countryStats.forEach(stat => {
    const proportion = stat.viewCount / total;
    if (proportion > 0) {
      diversity -= proportion * Math.log2(proportion);
    }
  });

  // Normalize to 0-100 scale
  const maxDiversity = Math.log2(countryStats.length);
  return Math.round((diversity / maxDiversity) * 100);
}

/**
 * Format analytics number for display
 */
export function formatAnalyticsNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * Calculate growth rate between two values
 */
export function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}