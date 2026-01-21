/**
 * CVPlus Admin Module - Type Definitions
 * 
 * Comprehensive type system for the CVPlus admin dashboard module.
 * Provides type safety and consistency across all admin functionality.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

// ============================================================================
// CORE ADMIN TYPES
// ============================================================================

// Admin types (primary definitions)
export * from './admin.types';

// Dashboard types (avoid conflicts with admin types)
export type { 
  AdminDashboardState,
  AdminDashboardConfig, 
  AdminDashboardData,
  QuickAction,
  RealtimeConfig,
  SystemOverviewData,
  TrendData,
  WidgetDimensions
} from './dashboard.types';

// Export specific enums to avoid conflicts
export { AdminQuickActionType, QuickActionCategory, RealtimeConnectionStatus } from './dashboard.types';

// Export main analytics types
export type { BusinessAnalytics, RevenueAnalytics } from './analytics.types';

// Job and Portal types for validation services
export * from './job';
export * from './portal';

// TODO: Fix type issues in other modules and re-enable these exports
// export type { ModerationQueue } from './moderation.types';
// export type { SystemHealthStatus } from './monitoring.types';
// export type { SecurityAuditRecord } from './security.types';
// export type { UserManagementAction } from './user-management.types';