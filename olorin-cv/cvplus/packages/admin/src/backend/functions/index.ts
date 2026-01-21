/**
 * CVPlus Admin Backend Functions
 * 
 * Firebase Functions for admin operations including user management,
 * system monitoring, business metrics, and administrative operations.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

// ============================================================================
// ADMIN FUNCTIONS EXPORTS
// ============================================================================

// Core admin functions
export { getUserStats } from './getUserStats';
export { getSystemHealth } from './getSystemHealth';
export { manageUsers } from './manageUsers';
export { getBusinessMetrics } from './getBusinessMetrics';
export { getCacheStats, warmCaches, clearCaches } from './getCacheStats';
export { initializeAdmin } from './initializeAdmin';
export { llmVerificationStatus } from './llmVerificationStatus';

// Comprehensive dashboard functions
// Video analytics dashboard functions temporarily removed during cleanup
export { testConfiguration } from './testConfiguration';
export { monitorStuckJobs, triggerJobMonitoring, getJobDetails, getJobStats } from './monitorJobs';
export { cleanupTempFiles } from './cleanupTempFiles';
export { testCors, testCorsCall } from './corsTestFunction';

// Policy management functions
export { getUserPolicyViolations } from './getUserPolicyViolations';
export { getUserUsageStats } from './getUserUsageStats';

// ============================================================================
// FUNCTION METADATA
// ============================================================================

/**
 * Available admin functions and their permissions
  */
export const ADMIN_FUNCTIONS = {
  getUserStats: {
    name: 'getUserStats',
    description: 'Get comprehensive user statistics and management data',
    requiredPermissions: ['canManageUsers'],
    category: 'USER_MANAGEMENT',
    region: 'us-central1'
  },
  getSystemHealth: {
    name: 'getSystemHealth',
    description: 'Get system health monitoring and performance metrics',
    requiredPermissions: ['canMonitorSystem'],
    category: 'SYSTEM_MONITORING',
    region: 'us-central1'
  },
  manageUsers: {
    name: 'manageUsers',
    description: 'Perform user management operations (create, update, delete, suspend)',
    requiredPermissions: ['canManageUsers'],
    category: 'USER_MANAGEMENT',
    region: 'us-central1'
  },
  getBusinessMetrics: {
    name: 'getBusinessMetrics',
    description: 'Get business intelligence metrics and analytics data',
    requiredPermissions: ['canViewAnalytics'],
    category: 'BUSINESS_ANALYTICS',
    region: 'us-central1'
  },
  getCacheStats: {
    name: 'getCacheStats',
    description: 'Get system cache statistics and performance metrics',
    requiredPermissions: ['canMonitorSystem'],
    category: 'SYSTEM_MONITORING',
    region: 'us-central1'
  },
  initializeAdmin: {
    name: 'initializeAdmin',
    description: 'Initialize admin user account with proper permissions',
    requiredPermissions: ['canManageAdmins'],
    category: 'ADMIN_MANAGEMENT',
    region: 'us-central1'
  },
  // Migrated admin functions
  // videoAnalyticsDashboard temporarily removed during cleanup
  testConfiguration: {
    name: 'testConfiguration',
    description: 'Test system configuration and service availability',
    requiredPermissions: ['canMonitorSystem'],
    category: 'SYSTEM_MONITORING',
    region: 'us-central1'
  },
  monitorStuckJobs: {
    name: 'monitorStuckJobs',
    description: 'Scheduled monitoring and recovery of stuck CV generation jobs',
    requiredPermissions: ['canMonitorSystem'],
    category: 'SYSTEM_MONITORING',
    region: 'us-central1'
  },
  triggerJobMonitoring: {
    name: 'triggerJobMonitoring',
    description: 'Manual trigger for job monitoring and statistics',
    requiredPermissions: ['canMonitorSystem'],
    category: 'SYSTEM_MONITORING',
    region: 'us-central1'
  },
  getJobDetails: {
    name: 'getJobDetails',
    description: 'Get detailed information about specific jobs for debugging',
    requiredPermissions: ['canMonitorSystem'],
    category: 'SYSTEM_MONITORING',
    region: 'us-central1'
  },
  getJobStats: {
    name: 'getJobStats',
    description: 'Get comprehensive job processing statistics',
    requiredPermissions: ['canMonitorSystem'],
    category: 'SYSTEM_MONITORING',
    region: 'us-central1'
  },
  cleanupTempFiles: {
    name: 'cleanupTempFiles',
    description: 'Scheduled cleanup of temporary files and failed jobs',
    requiredPermissions: ['canManageSystem'],
    category: 'SYSTEM_MAINTENANCE',
    region: 'us-central1'
  },
  testCors: {
    name: 'testCors',
    description: 'Test CORS configuration for admin functions',
    requiredPermissions: ['canMonitorSystem'],
    category: 'SYSTEM_MONITORING',
    region: 'us-central1'
  },
  testCorsCall: {
    name: 'testCorsCall',
    description: 'Test CORS configuration for callable functions',
    requiredPermissions: ['canMonitorSystem'],
    category: 'SYSTEM_MONITORING',
    region: 'us-central1'
  },

  // Policy management functions
  getUserPolicyViolations: {
    name: 'getUserPolicyViolations',
    description: 'Get user policy violations and warnings for review',
    requiredPermissions: ['canManageUsers'],
    category: 'POLICY_MANAGEMENT',
    region: 'us-central1'
  },
  getUserUsageStats: {
    name: 'getUserUsageStats',
    description: 'Get user usage statistics and subscription limits',
    requiredPermissions: ['canManageUsers'],
    category: 'POLICY_MANAGEMENT',
    region: 'us-central1'
  },
  llmVerificationStatus: {
    name: 'llmVerificationStatus',
    description: 'Get LLM verification system status and health metrics',
    requiredPermissions: ['canMonitorSystem'],
    category: 'SYSTEM_MONITORING',
    region: 'us-central1'
  }
} as const;

/**
 * Function categories
  */
export const FUNCTION_CATEGORIES = {
  USER_MANAGEMENT: 'User Management',
  SYSTEM_MONITORING: 'System Monitoring',
  BUSINESS_ANALYTICS: 'Business Analytics',
  ADMIN_MANAGEMENT: 'Admin Management',
  CONTENT_MODERATION: 'Content Moderation',
  SECURITY_AUDIT: 'Security Audit',
  SYSTEM_MAINTENANCE: 'System Maintenance',
  POLICY_MANAGEMENT: 'Policy Management'
} as const;

/**
 * Required permissions for admin functions
  */
export const ADMIN_PERMISSIONS = {
  canManageUsers: 'Can manage user accounts and permissions',
  canMonitorSystem: 'Can monitor system health and performance',
  canViewAnalytics: 'Can view business metrics and analytics',
  canManageAdmins: 'Can create and manage admin accounts',
  canModerateContent: 'Can moderate and review content',
  canAuditSecurity: 'Can perform security audits and reviews',
  canManageSystem: 'Can perform system maintenance operations'
} as const;

/**
 * Function deployment configuration
  */
export const DEPLOYMENT_CONFIG = {
  runtime: 'nodejs18',
  region: 'us-central1',
  timeoutSeconds: 540,
  availableMemoryMb: 1024,
  cors: true,
  enforceAppCheck: false
} as const;