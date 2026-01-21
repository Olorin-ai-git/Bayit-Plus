/**
 * CVPlus Admin Services
 * 
 * Centralized exports for all admin-related services including
 * dashboard services, user management, system monitoring, and administrative operations.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

// ============================================================================
// SERVICE EXPORTS
// ============================================================================

export { AdminAccessService } from './admin-access.service';
export { AdminDashboardService } from './admin-dashboard.service';

// ============================================================================
// SERVICE METADATA
// ============================================================================

/**
 * Available admin services and their capabilities
  */
export const ADMIN_SERVICES = {
  AdminAccessService: {
    name: 'AdminAccessService',
    description: 'Centralized admin authentication, authorization, and permission management',
    category: 'AUTHENTICATION',
    capabilities: [
      'Admin access verification',
      'Permission-based authorization',
      'Role-based access control',
      'Custom claims management',
      'Admin action audit logging'
    ]
  },
  AdminDashboardService: {
    name: 'AdminDashboardService',
    description: 'Comprehensive admin dashboard data aggregation and management',
    category: 'DASHBOARD',
    capabilities: [
      'User statistics aggregation',
      'System health monitoring',
      'Business metrics calculation',
      'Real-time dashboard updates',
      'Performance analytics'
    ]
  }
} as const;

/**
 * Service categories
  */
export const SERVICE_CATEGORIES = {
  AUTHENTICATION: 'Authentication & Authorization',
  DASHBOARD: 'Dashboard Services',
  USER_MANAGEMENT: 'User Management',
  SYSTEM_MONITORING: 'System Monitoring',
  ANALYTICS: 'Analytics & Reporting',
  CONTENT_MODERATION: 'Content Moderation'
} as const;