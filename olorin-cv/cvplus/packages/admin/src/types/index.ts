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

// NOTE: Job and Portal types have been migrated to their respective modules
// Job types moved to: @cvplus/processing/src/types/job
// Portal types moved to: @cvplus/public-profiles/src/types/portal

// Core module types - only export what exists
export type { UserManagementAction } from './user-management.types';