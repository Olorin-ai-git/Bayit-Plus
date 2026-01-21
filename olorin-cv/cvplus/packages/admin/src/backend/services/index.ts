/**
 * CVPlus Admin Backend Services
 * 
 * Service layer for admin operations, data aggregation, and business logic.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

// ============================================================================
// SERVICE EXPORTS
// ============================================================================

// Main admin services
export { AdminDashboardService } from '../../services/admin-dashboard.service';

// Performance and monitoring services
export { PerformanceMonitorService, type SystemPerformanceMetrics, type ProviderMetrics } from './performance-monitor.service';
// export { AnalyticsEngineService, type BusinessMetrics, type QualityInsights, type UserBehaviorInsights } from '@cvplus/analytics/admin/services/analytics-engine.service'; // MIGRATED
export { AlertManagerService } from './alert-manager.service';
export { type SystemAlert, type AlertDashboard, type PerformanceAlert } from './performance-monitor.service';

// Job and system management services
export { JobMonitoringService, type JobProcessingStats, type JobDetails } from './job-monitoring.service';

// Configuration and testing services
export { ConfigurationTestService, type SystemConfiguration } from './configuration-test.service';
export { WebSearchService } from './web-search.service'; // Real Serper API integration for admin monitoring

// Policy enforcement services (migrated from cv-processing)
export { ComprehensivePolicyEnforcementService } from './comprehensive-policy-enforcement.service';
export type {
  PolicyCheckRequest,
  PolicyCheckResult,
  PolicyViolation,
  PolicyWarning,
  PolicyAction,
  UsageStats
} from './comprehensive-policy-enforcement.service';

// Multimedia admin testing services - MIGRATED TO @cvplus/multimedia
// NOTE: PodcastGenerationService and VideoGenerationService have been moved to @cvplus/multimedia module
// Import from: '@cvplus/multimedia/src/services/audio/podcast-generation.service'
// Import from: '@cvplus/multimedia/src/services/video/video-generation.service'

// Security and Validation Services - MIGRATED
// NOTE: ValidationService has been moved to @cvplus/core module
// Import from: '@cvplus/core/src/validation/validation-service'
// NOTE: PIIDetector has been moved to @cvplus/processing module
// Import from: '@cvplus/processing/src/security/piiDetector'
export * from './security';
// ============================================================================
// SERVICE REGISTRY
// ============================================================================

/**
 * Available admin services
  */
export const ADMIN_SERVICES = {
  dashboard: 'AdminDashboardService',
  userManagement: 'UserManagementService',
  contentModeration: 'ContentModerationService', 
  systemMonitoring: 'SystemMonitoringService',
  businessAnalytics: 'BusinessAnalyticsService',
  securityAudit: 'SecurityAuditService',
  performanceMonitor: 'PerformanceMonitorService',
  analyticsEngine: 'AnalyticsEngineService',
  alertManager: 'AlertManagerService',
  jobMonitoring: 'JobMonitoringService',
  configurationTest: 'ConfigurationTestService',
  webSearch: 'WebSearchService'
  // NOTE: podcastGeneration and videoGeneration services moved to @cvplus/multimedia
} as const;

/**
 * Service categories
  */
export const SERVICE_CATEGORIES = {
  MONITORING: ['PerformanceMonitorService', 'AlertManagerService', 'JobMonitoringService'],
  ANALYTICS: ['AnalyticsEngineService', 'AdminDashboardService'],
  CONFIGURATION: ['ConfigurationTestService'],
  EXTERNAL: ['WebSearchService']
  // NOTE: PodcastGenerationService and VideoGenerationService moved to @cvplus/multimedia
} as const;

/**
 * Service dependencies
  */
export const SERVICE_DEPENDENCIES = {
  firebase: ['firebase-admin', 'firebase'],
  core: ['@cvplus/core'],
  auth: ['@cvplus/auth'],
  analytics: ['@cvplus/analytics']
} as const;