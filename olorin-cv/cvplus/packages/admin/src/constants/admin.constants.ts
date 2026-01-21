/**
 * Admin Constants
 * 
 * Core constants and configuration values for the admin module.
  */

import { 
  AdminRole, 
  AdminLevel, 
  AdminSpecialization
} from '../types/admin.types';
import type {
  AdminConfig,
  AdminFeature 
} from '../types/admin.types';

// ============================================================================
// MODULE INFORMATION
// ============================================================================

export const ADMIN_MODULE_NAME = '@cvplus/admin';
export const ADMIN_MODULE_VERSION = '1.0.0';

export const MODULE_INFO = {
  name: ADMIN_MODULE_NAME,
  version: ADMIN_MODULE_VERSION,
  description: 'Comprehensive admin dashboard module for CVPlus platform management',
  author: 'Gil Klainert',
  license: 'MIT'
} as const;

// ============================================================================
// ADMIN ROLES & PERMISSIONS
// ============================================================================

/**
 * Admin role hierarchy (highest to lowest privilege)
  */
export const ADMIN_ROLE_HIERARCHY = [
  AdminRole.SYSTEM_ADMIN,
  AdminRole.SUPER_ADMIN,
  AdminRole.ADMIN,
  AdminRole.MODERATOR,
  AdminRole.SUPPORT
] as const;

/**
 * Admin level mappings
  */
export const ADMIN_LEVEL_MAPPINGS = {
  [AdminRole.SUPPORT]: AdminLevel.L1_SUPPORT,
  [AdminRole.MODERATOR]: AdminLevel.L2_MODERATOR,
  [AdminRole.ADMIN]: AdminLevel.L3_ADMIN,
  [AdminRole.SUPER_ADMIN]: AdminLevel.L4_SUPER_ADMIN,
  [AdminRole.SYSTEM_ADMIN]: AdminLevel.L5_SYSTEM_ADMIN
} as const;

/**
 * Default specializations by role
  */
export const DEFAULT_SPECIALIZATIONS = {
  [AdminRole.SUPPORT]: [
    AdminSpecialization.USER_SUPPORT,
    AdminSpecialization.BILLING_SUPPORT
  ],
  [AdminRole.MODERATOR]: [
    AdminSpecialization.CONTENT_MODERATION,
    AdminSpecialization.USER_SUPPORT
  ],
  [AdminRole.ADMIN]: [
    AdminSpecialization.DATA_ANALYSIS,
    AdminSpecialization.TECHNICAL_SUPPORT
  ],
  [AdminRole.SUPER_ADMIN]: [
    AdminSpecialization.SYSTEM_ADMINISTRATION,
    AdminSpecialization.SECURITY_ANALYSIS,
    AdminSpecialization.COMPLIANCE
  ],
  [AdminRole.SYSTEM_ADMIN]: [
    AdminSpecialization.SYSTEM_ADMINISTRATION,
    AdminSpecialization.SECURITY_ANALYSIS,
    AdminSpecialization.COMPLIANCE
  ]
} as const;

/**
 * Permission matrices by role
  */
export const ROLE_PERMISSIONS = {
  [AdminRole.SUPPORT]: {
    canAccessDashboard: true,
    canManageUsers: false,
    canModerateContent: false,
    canMonitorSystem: false,
    canViewAnalytics: false,
    canAuditSecurity: false,
    canManageSupport: true,
    canManageBilling: false,
    canConfigureSystem: false,
    canManageAdmins: false,
    canExportData: false,
    canManageFeatureFlags: false,
    
    userManagement: {
      canViewUsers: true,
      canEditUsers: false,
      canSuspendUsers: false,
      canDeleteUsers: false,
      canImpersonateUsers: false,
      canManageSubscriptions: false,
      canProcessRefunds: false,
      canMergeAccounts: false,
      canExportUserData: false,
      canViewUserAnalytics: false
    }
  },
  
  [AdminRole.MODERATOR]: {
    canAccessDashboard: true,
    canManageUsers: true,
    canModerateContent: true,
    canMonitorSystem: false,
    canViewAnalytics: true,
    canAuditSecurity: false,
    canManageSupport: true,
    canManageBilling: false,
    canConfigureSystem: false,
    canManageAdmins: false,
    canExportData: true,
    canManageFeatureFlags: false,
    
    userManagement: {
      canViewUsers: true,
      canEditUsers: true,
      canSuspendUsers: true,
      canDeleteUsers: false,
      canImpersonateUsers: false,
      canManageSubscriptions: false,
      canProcessRefunds: false,
      canMergeAccounts: false,
      canExportUserData: true,
      canViewUserAnalytics: true
    }
  },
  
  [AdminRole.ADMIN]: {
    canAccessDashboard: true,
    canManageUsers: true,
    canModerateContent: true,
    canMonitorSystem: true,
    canViewAnalytics: true,
    canAuditSecurity: true,
    canManageSupport: true,
    canManageBilling: true,
    canConfigureSystem: false,
    canManageAdmins: false,
    canExportData: true,
    canManageFeatureFlags: true,
    
    userManagement: {
      canViewUsers: true,
      canEditUsers: true,
      canSuspendUsers: true,
      canDeleteUsers: true,
      canImpersonateUsers: true,
      canManageSubscriptions: true,
      canProcessRefunds: true,
      canMergeAccounts: true,
      canExportUserData: true,
      canViewUserAnalytics: true
    }
  },
  
  [AdminRole.SUPER_ADMIN]: {
    canAccessDashboard: true,
    canManageUsers: true,
    canModerateContent: true,
    canMonitorSystem: true,
    canViewAnalytics: true,
    canAuditSecurity: true,
    canManageSupport: true,
    canManageBilling: true,
    canConfigureSystem: true,
    canManageAdmins: true,
    canExportData: true,
    canManageFeatureFlags: true,
    
    userManagement: {
      canViewUsers: true,
      canEditUsers: true,
      canSuspendUsers: true,
      canDeleteUsers: true,
      canImpersonateUsers: true,
      canManageSubscriptions: true,
      canProcessRefunds: true,
      canMergeAccounts: true,
      canExportUserData: true,
      canViewUserAnalytics: true
    }
  },
  
  [AdminRole.SYSTEM_ADMIN]: {
    canAccessDashboard: true,
    canManageUsers: true,
    canModerateContent: true,
    canMonitorSystem: true,
    canViewAnalytics: true,
    canAuditSecurity: true,
    canManageSupport: true,
    canManageBilling: true,
    canConfigureSystem: true,
    canManageAdmins: true,
    canExportData: true,
    canManageFeatureFlags: true,
    
    userManagement: {
      canViewUsers: true,
      canEditUsers: true,
      canSuspendUsers: true,
      canDeleteUsers: true,
      canImpersonateUsers: true,
      canManageSubscriptions: true,
      canProcessRefunds: true,
      canMergeAccounts: true,
      canExportUserData: true,
      canViewUserAnalytics: true
    }
  }
} as const;

// ============================================================================
// ADMIN CONFIGURATION
// ============================================================================

/**
 * Default admin configuration
  */
export const DEFAULT_ADMIN_CONFIG: AdminConfig = {
  maxConcurrentSessions: 3,
  sessionTimeout: 3600000, // 1 hour in milliseconds
  mfaRequired: true,
  ipWhitelistEnabled: false,
  auditRetentionDays: 2555, // 7 years
  notificationChannels: ['email', 'in_app']
};

/**
 * Admin features configuration
  */
export const ADMIN_FEATURES: AdminFeature[] = [
  {
    id: 'dashboard',
    name: 'Admin Dashboard',
    description: 'Main administrative dashboard with overview and quick actions',
    enabled: true,
    requiredLevel: AdminLevel.L1_SUPPORT,
    requiredSpecializations: []
  },
  {
    id: 'user_management',
    name: 'User Management',
    description: 'Comprehensive user account management and support tools',
    enabled: true,
    requiredLevel: AdminLevel.L2_MODERATOR,
    requiredSpecializations: [AdminSpecialization.USER_SUPPORT]
  },
  {
    id: 'content_moderation',
    name: 'Content Moderation',
    description: 'Content review, approval, and quality control system',
    enabled: true,
    requiredLevel: AdminLevel.L2_MODERATOR,
    requiredSpecializations: [AdminSpecialization.CONTENT_MODERATION]
  },
  {
    id: 'system_monitoring',
    name: 'System Monitoring',
    description: 'Real-time system health and performance monitoring',
    enabled: true,
    requiredLevel: AdminLevel.L3_ADMIN,
    requiredSpecializations: [AdminSpecialization.TECHNICAL_SUPPORT]
  },
  {
    id: 'analytics',
    name: 'Business Analytics',
    description: 'Business intelligence and advanced analytics dashboard',
    enabled: true,
    requiredLevel: AdminLevel.L3_ADMIN,
    requiredSpecializations: [AdminSpecialization.DATA_ANALYSIS]
  },
  {
    id: 'security_audit',
    name: 'Security Audit',
    description: 'Security monitoring, compliance, and audit tools',
    enabled: true,
    requiredLevel: AdminLevel.L4_SUPER_ADMIN,
    requiredSpecializations: [AdminSpecialization.SECURITY_ANALYSIS]
  },
  {
    id: 'billing_management',
    name: 'Billing Management',
    description: 'Payment processing, subscription management, and financial tools',
    enabled: true,
    requiredLevel: AdminLevel.L3_ADMIN,
    requiredSpecializations: [AdminSpecialization.BILLING_SUPPORT]
  },
  {
    id: 'feature_flags',
    name: 'Feature Flag Management',
    description: 'Dynamic feature control and A/B testing management',
    enabled: true,
    requiredLevel: AdminLevel.L3_ADMIN,
    requiredSpecializations: [AdminSpecialization.TECHNICAL_SUPPORT]
  },
  {
    id: 'admin_management',
    name: 'Admin User Management',
    description: 'Management of admin users, roles, and permissions',
    enabled: true,
    requiredLevel: AdminLevel.L4_SUPER_ADMIN,
    requiredSpecializations: [AdminSpecialization.SYSTEM_ADMINISTRATION]
  },
  {
    id: 'system_configuration',
    name: 'System Configuration',
    description: 'Core system settings and configuration management',
    enabled: true,
    requiredLevel: AdminLevel.L5_SYSTEM_ADMIN,
    requiredSpecializations: [AdminSpecialization.SYSTEM_ADMINISTRATION]
  }
];

// ============================================================================
// UI CONSTANTS
// ============================================================================

/**
 * Dashboard layout constants
  */
export const DASHBOARD_LAYOUTS = {
  GRID: {
    columns: 12,
    rowHeight: 60,
    margin: [16, 16],
    compactType: 'vertical'
  },
  MASONRY: {
    columnWidth: 300,
    gutter: 16,
    fitWidth: true
  },
  FLUID: {
    minItemWidth: 280,
    maxItemWidth: 400,
    itemHeight: 'auto'
  }
} as const;

/**
 * Widget size presets
  */
export const WIDGET_SIZES = {
  SMALL: { w: 3, h: 2 },
  MEDIUM: { w: 6, h: 3 },
  LARGE: { w: 9, h: 4 },
  EXTRA_LARGE: { w: 12, h: 6 }
} as const;

/**
 * Color schemes for admin UI
  */
export const COLOR_SCHEMES = {
  LIGHT: {
    primary: '#2563eb',
    secondary: '#7c3aed',
    success: '#059669',
    warning: '#d97706',
    error: '#dc2626',
    info: '#0891b2'
  },
  DARK: {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#06b6d4'
  }
} as const;

// ============================================================================
// API CONSTANTS
// ============================================================================

/**
 * API endpoints for admin operations
  */
export const ADMIN_API_ENDPOINTS = {
  // Dashboard
  DASHBOARD: '/api/admin/dashboard',
  HEALTH_CHECK: '/api/admin/health',
  
  // User Management
  USERS: '/api/admin/users',
  USER_DETAILS: (id: string) => `/api/admin/users/${id}`,
  USER_ACTIONS: (id: string) => `/api/admin/users/${id}/actions`,
  USER_STATS: '/api/admin/users/stats',
  BULK_OPERATIONS: '/api/admin/users/bulk',
  
  // Content Moderation
  MODERATION_QUEUE: '/api/admin/moderation/queue',
  MODERATION_ITEM: (id: string) => `/api/admin/moderation/items/${id}`,
  MODERATION_ACTIONS: '/api/admin/moderation/actions',
  MODERATION_STATS: '/api/admin/moderation/statistics',
  CONTENT_STATS: '/api/admin/moderation/content/stats',
  
  // System Monitoring
  SYSTEM_HEALTH: '/api/admin/system/health',
  SYSTEM_METRICS: '/api/admin/system/metrics',
  SYSTEM_ALERTS: '/api/admin/system/alerts',
  SYSTEM_LOGS: '/api/admin/system/logs',
  
  // Analytics
  ANALYTICS: '/api/admin/analytics',
  BUSINESS_METRICS: '/api/admin/analytics/business',
  USER_ANALYTICS: '/api/admin/analytics/users',
  REVENUE_ANALYTICS: '/api/admin/analytics/revenue',
  CONTENT_ANALYTICS: '/api/admin/analytics/content',
  
  // Security
  SECURITY_OVERVIEW: '/api/admin/security/overview',
  SECURITY_AUDIT: '/api/admin/security/audit',
  AUDIT_LOGS: '/api/admin/security/audit',
  COMPLIANCE: '/api/admin/security/compliance',
  THREATS: '/api/admin/security/threats',
  
  // Support
  SUPPORT_TICKETS: '/api/admin/support/tickets',
  SUPPORT_STATS: '/api/admin/support/statistics',
  SUPPORT_ACTIONS: '/api/admin/support/actions',
  
  // Configuration
  FEATURE_FLAGS: '/api/admin/config/features',
  SYSTEM_CONFIG: '/api/admin/config/system',
  ADMIN_SETTINGS: '/api/admin/config/settings',

  // Data Export
  DATA_EXPORT: '/api/admin/export'
} as const;

/**
 * HTTP status codes for admin operations
  */
export const ADMIN_HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

/**
 * Request timeout configurations
  */
export const REQUEST_TIMEOUTS = {
  QUICK_OPERATION: 5000,    // 5 seconds
  STANDARD_OPERATION: 30000, // 30 seconds
  BULK_OPERATION: 120000,    // 2 minutes
  REPORT_GENERATION: 300000, // 5 minutes
  DATA_EXPORT: 600000       // 10 minutes
} as const;

// ============================================================================
// PAGINATION & LIMITS
// ============================================================================

/**
 * Default pagination settings
  */
export const PAGINATION_DEFAULTS = {
  PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100,
  MAX_ITEMS_BULK_OPERATION: 1000
} as const;

/**
 * Rate limiting configuration
  */
export const RATE_LIMITS = {
  STANDARD_ADMIN: {
    requests: 1000,
    window: 3600000 // 1 hour
  },
  BULK_OPERATIONS: {
    requests: 100,
    window: 3600000 // 1 hour
  },
  DATA_EXPORT: {
    requests: 10,
    window: 3600000 // 1 hour
  },
  SYSTEM_CONFIGURATION: {
    requests: 50,
    window: 3600000 // 1 hour
  }
} as const;

// ============================================================================
// VALIDATION RULES
// ============================================================================

/**
 * Field validation rules
  */
export const VALIDATION_RULES = {
  ADMIN_EMAIL: {
    required: true,
    email: true,
    maxLength: 255
  },
  ADMIN_NAME: {
    required: true,
    minLength: 2,
    maxLength: 100,
    pattern: /^[a-zA-Z\s\-'\.]+$/
  },
  PASSWORD: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAge: 90 // days
  },
  BULK_OPERATION_REASON: {
    required: true,
    minLength: 10,
    maxLength: 500
  },
  FEATURE_FLAG_NAME: {
    required: true,
    pattern: /^[a-z][a-z0-9_]*[a-z0-9]$/,
    minLength: 3,
    maxLength: 50
  }
} as const;

// ============================================================================
// ERROR CODES
// ============================================================================

/**
 * Admin-specific error codes
  */
export const ADMIN_ERROR_CODES = {
  // Authentication & Authorization
  INVALID_ADMIN_CREDENTIALS: 'ADMIN_001',
  INSUFFICIENT_PRIVILEGES: 'ADMIN_002',
  SESSION_EXPIRED: 'ADMIN_003',
  MFA_REQUIRED: 'ADMIN_004',
  IP_NOT_WHITELISTED: 'ADMIN_005',
  
  // User Management
  USER_NOT_FOUND: 'ADMIN_101',
  USER_ALREADY_SUSPENDED: 'ADMIN_102',
  USER_CANNOT_BE_DELETED: 'ADMIN_103',
  BULK_OPERATION_LIMIT_EXCEEDED: 'ADMIN_104',
  
  // Content Moderation
  CONTENT_NOT_FOUND: 'ADMIN_201',
  MODERATION_QUEUE_FULL: 'ADMIN_202',
  INVALID_MODERATION_ACTION: 'ADMIN_203',
  
  // System Operations
  SYSTEM_MAINTENANCE_MODE: 'ADMIN_301',
  SYSTEM_OVERLOADED: 'ADMIN_302',
  BACKUP_IN_PROGRESS: 'ADMIN_303',
  
  // Data Operations
  EXPORT_SIZE_LIMIT_EXCEEDED: 'ADMIN_401',
  IMPORT_FORMAT_INVALID: 'ADMIN_402',
  DATA_INTEGRITY_ERROR: 'ADMIN_403',
  
  // Configuration
  FEATURE_FLAG_CONFLICT: 'ADMIN_501',
  INVALID_CONFIGURATION: 'ADMIN_502',
  CONFIGURATION_LOCKED: 'ADMIN_503'
} as const;

/**
 * Error messages for admin operations
  */
export const ADMIN_ERROR_MESSAGES = {
  [ADMIN_ERROR_CODES.INVALID_ADMIN_CREDENTIALS]: 'Invalid admin credentials provided',
  [ADMIN_ERROR_CODES.INSUFFICIENT_PRIVILEGES]: 'Insufficient privileges for this operation',
  [ADMIN_ERROR_CODES.SESSION_EXPIRED]: 'Admin session has expired',
  [ADMIN_ERROR_CODES.MFA_REQUIRED]: 'Multi-factor authentication is required',
  [ADMIN_ERROR_CODES.IP_NOT_WHITELISTED]: 'Access denied: IP address not whitelisted',
  
  [ADMIN_ERROR_CODES.USER_NOT_FOUND]: 'User account not found',
  [ADMIN_ERROR_CODES.USER_ALREADY_SUSPENDED]: 'User account is already suspended',
  [ADMIN_ERROR_CODES.USER_CANNOT_BE_DELETED]: 'User account cannot be deleted due to business rules',
  [ADMIN_ERROR_CODES.BULK_OPERATION_LIMIT_EXCEEDED]: 'Bulk operation exceeds maximum allowed items',
  
  [ADMIN_ERROR_CODES.CONTENT_NOT_FOUND]: 'Content item not found',
  [ADMIN_ERROR_CODES.MODERATION_QUEUE_FULL]: 'Moderation queue is at capacity',
  [ADMIN_ERROR_CODES.INVALID_MODERATION_ACTION]: 'Invalid moderation action specified',
  
  [ADMIN_ERROR_CODES.SYSTEM_MAINTENANCE_MODE]: 'System is currently in maintenance mode',
  [ADMIN_ERROR_CODES.SYSTEM_OVERLOADED]: 'System is currently overloaded, please try again later',
  [ADMIN_ERROR_CODES.BACKUP_IN_PROGRESS]: 'System backup in progress, some operations unavailable',
  
  [ADMIN_ERROR_CODES.EXPORT_SIZE_LIMIT_EXCEEDED]: 'Data export size exceeds maximum limit',
  [ADMIN_ERROR_CODES.IMPORT_FORMAT_INVALID]: 'Import file format is invalid or corrupted',
  [ADMIN_ERROR_CODES.DATA_INTEGRITY_ERROR]: 'Data integrity constraint violation',
  
  [ADMIN_ERROR_CODES.FEATURE_FLAG_CONFLICT]: 'Feature flag configuration conflict detected',
  [ADMIN_ERROR_CODES.INVALID_CONFIGURATION]: 'System configuration is invalid',
  [ADMIN_ERROR_CODES.CONFIGURATION_LOCKED]: 'Configuration is locked and cannot be modified'
} as const;

// ============================================================================
// NOTIFICATION TEMPLATES
// ============================================================================

/**
 * Default notification templates
  */
export const NOTIFICATION_TEMPLATES = {
  SYSTEM_ALERT: {
    email: {
      subject: 'System Alert: {{alertType}}',
      template: `
        <h2>System Alert</h2>
        <p><strong>Alert Type:</strong> {{alertType}}</p>
        <p><strong>Severity:</strong> {{severity}}</p>
        <p><strong>Description:</strong> {{description}}</p>
        <p><strong>Time:</strong> {{timestamp}}</p>
        <p><strong>Action Required:</strong> {{actionRequired}}</p>
      `
    },
    slack: {
      template: `
        🚨 *System Alert*
        *Type:* {{alertType}}
        *Severity:* {{severity}}
        *Description:* {{description}}
        *Time:* {{timestamp}}
      `
    }
  },
  USER_ACTION_REQUIRED: {
    email: {
      subject: 'Admin Action Required: {{actionType}}',
      template: `
        <h2>Admin Action Required</h2>
        <p><strong>Action Type:</strong> {{actionType}}</p>
        <p><strong>User:</strong> {{userEmail}}</p>
        <p><strong>Description:</strong> {{description}}</p>
        <p><strong>Priority:</strong> {{priority}}</p>
        <p><strong>Due Date:</strong> {{dueDate}}</p>
        <p><a href="{{actionUrl}}">Take Action</a></p>
      `
    }
  }
} as const;

// ============================================================================
// AUDIT CONSTANTS
// ============================================================================

/**
 * Audit event types
  */
export const AUDIT_EVENT_TYPES = {
  // Admin Authentication
  ADMIN_LOGIN: 'admin.login',
  ADMIN_LOGOUT: 'admin.logout',
  ADMIN_MFA_ENABLED: 'admin.mfa.enabled',
  ADMIN_MFA_DISABLED: 'admin.mfa.disabled',
  
  // User Management
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_SUSPENDED: 'user.suspended',
  USER_DELETED: 'user.deleted',
  USER_IMPERSONATED: 'user.impersonated',
  
  // Content Moderation
  CONTENT_APPROVED: 'content.approved',
  CONTENT_REJECTED: 'content.rejected',
  CONTENT_FLAGGED: 'content.flagged',
  
  // System Configuration
  CONFIG_UPDATED: 'config.updated',
  FEATURE_FLAG_CHANGED: 'feature_flag.changed',
  SYSTEM_MAINTENANCE_STARTED: 'system.maintenance.started',
  
  // Data Operations
  DATA_EXPORTED: 'data.exported',
  DATA_IMPORTED: 'data.imported',
  BULK_OPERATION: 'bulk_operation.executed'
} as const;

/**
 * Audit retention policies
  */
export const AUDIT_RETENTION_POLICIES = {
  AUTHENTICATION_EVENTS: 1095, // 3 years
  USER_MANAGEMENT_EVENTS: 2555, // 7 years
  FINANCIAL_EVENTS: 2555, // 7 years
  SYSTEM_EVENTS: 365, // 1 year
  CONTENT_EVENTS: 730 // 2 years
} as const;