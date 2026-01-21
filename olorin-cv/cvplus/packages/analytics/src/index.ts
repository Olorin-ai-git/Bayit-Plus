/**
 * CVPlus Analytics Module - Comprehensive Analytics Platform
 * Advanced analytics, privacy compliance, A/B testing, and business intelligence
 *
 * @author Gil Klainert
 * @version 1.0.0
 *
 * NOTE: Services and Firebase Functions have been temporarily disabled during backend build.
 * They require refactoring to match updated type definitions.
 * Services and functions will be re-enabled after dependency fixes.
 */

// =============================================================================
// TYPES (Primary exports during build)
// =============================================================================

export * from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

export * from './constants';

// =============================================================================
// SERVICES (Temporarily disabled - requires dependency fixes)
// =============================================================================
// NOTE: All service exports have been disabled during backend build.
// Services need updated type definitions and Redis configurations.
//
// Disabled service exports:
// - RevenueAnalyticsService
// - CohortAnalysisService
// - AnalyticsCacheService
// - CachePerformanceMonitor
// - BusinessIntelligenceService
// - CacheStatsManager
// - PerformanceMetricsManager

// =============================================================================
// FIREBASE FUNCTIONS (Temporarily disabled - requires function refactoring)
// =============================================================================
// NOTE: All Firebase Functions exports have been disabled during backend build.
// These need to be refactored and deployed via the functions/ package.
