/**
 * Admin Constants - Main Export File
 * 
 * Exports all admin constants and configuration values.
  */

// ============================================================================
// CORE CONSTANTS
// ============================================================================
export * from './admin.constants';

// ============================================================================
// MODULE METADATA
// ============================================================================
export const CONSTANTS_VERSION = '1.0.0';
export const LAST_UPDATED = new Date('2025-08-28');

// ============================================================================
// FEATURE FLAGS
// ============================================================================
export const FEATURE_FLAGS = {
  ADVANCED_ANALYTICS: 'advanced_analytics',
  REAL_TIME_MONITORING: 'real_time_monitoring',
  AUTOMATED_MODERATION: 'automated_moderation',
  PREDICTIVE_INSIGHTS: 'predictive_insights',
  MULTI_TENANT_SUPPORT: 'multi_tenant_support',
  ADVANCED_SECURITY_AUDIT: 'advanced_security_audit',
  CUSTOM_DASHBOARDS: 'custom_dashboards',
  WORKFLOW_AUTOMATION: 'workflow_automation'
} as const;

// ============================================================================
// ENVIRONMENT CONFIGURATIONS
// ============================================================================
export const ENVIRONMENT_CONFIGS = {
  DEVELOPMENT: {
    debug: true,
    logLevel: 'debug',
    cacheEnabled: false,
    rateLimitEnabled: false,
    auditEnabled: true
  },
  STAGING: {
    debug: false,
    logLevel: 'info',
    cacheEnabled: true,
    rateLimitEnabled: true,
    auditEnabled: true
  },
  PRODUCTION: {
    debug: false,
    logLevel: 'warn',
    cacheEnabled: true,
    rateLimitEnabled: true,
    auditEnabled: true
  }
} as const;

// ============================================================================
// INTEGRATION ENDPOINTS
// ============================================================================
export const INTEGRATION_ENDPOINTS = {
  FIREBASE: {
    FUNCTIONS_BASE: 'https://us-central1-cvplus.cloudfunctions.net',
    FIRESTORE_PROJECT: 'cvplus',
    STORAGE_BUCKET: 'cvplus.appspot.com'
  },
  EXTERNAL_APIS: {
    STRIPE_API: 'https://api.stripe.com/v1',
    GOOGLE_APIS: 'https://www.googleapis.com',
    SENDGRID_API: 'https://api.sendgrid.com/v3'
  }
} as const;