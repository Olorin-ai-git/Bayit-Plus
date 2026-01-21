/**
 * CVPlus Admin Backend Module
 * 
 * Backend services and functions for administrative operations.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

// ============================================================================
// FUNCTIONS EXPORTS
// ============================================================================
export * from './functions';

// ============================================================================
// SERVICES EXPORTS
// ============================================================================
export * from './services';

// ============================================================================
// BACKEND MODULE INFORMATION
// ============================================================================
export const ADMIN_BACKEND_MODULE = {
  name: '@cvplus/admin/backend',
  version: '1.0.0',
  description: 'Backend services and Firebase Functions for CVPlus admin operations',
  author: 'Gil Klainert'
} as const;

/**
 * Backend module capabilities
  */
export const BACKEND_CAPABILITIES = {
  userManagement: 'Complete user lifecycle management',
  systemMonitoring: 'Real-time system health monitoring',
  businessAnalytics: 'Comprehensive business intelligence',
  cacheManagement: 'System cache monitoring and optimization',
  adminManagement: 'Admin user creation and permission management',
  auditLogging: 'Comprehensive audit trail logging'
} as const;