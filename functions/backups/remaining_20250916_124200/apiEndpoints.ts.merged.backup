// @ts-ignore - Export conflicts/**
 * API endpoint constants for the CVPlus Workflow module
 */

// Base API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_BASE_URL || 'https://api.cvplus.com',
  VERSION: 'v1',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000 // 1 second
} as const;

// Job Management Endpoints
export const JOB_ENDPOINTS = {
  CREATE_JOB: '/jobs',
  GET_JOB: '/jobs/:id',
  UPDATE_JOB: '/jobs/:id',
  DELETE_JOB: '/jobs/:id',
  LIST_JOBS: '/jobs',
  MONITOR_JOB: '/jobs/:id/monitor',
  GET_JOB_PROGRESS: '/jobs/:id/progress',
  CANCEL_JOB: '/jobs/:id/cancel',
  PAUSE_JOB: '/jobs/:id/pause',
  RESUME_JOB: '/jobs/:id/resume'
} as const;

// Feature Management Endpoints
export const FEATURE_ENDPOINTS = {
  GET_JOB_FEATURES: '/jobs/:jobId/features',
  UPDATE_JOB_FEATURES: '/jobs/:jobId/features',
  GET_FEATURE: '/jobs/:jobId/features/:featureId',
  COMPLETE_FEATURE: '/jobs/:jobId/features/:featureId/complete',
  SKIP_FEATURE: '/jobs/:jobId/features/:featureId/skip',
  UPDATE_FEATURE_STATUS: '/jobs/:jobId/features/:featureId/status',
  UPDATE_FEATURE_PROGRESS: '/jobs/:jobId/features/:featureId/progress',
  GET_FEATURE_DEPENDENCIES: '/jobs/:jobId/features/:featureId/dependencies',
  INJECT_COMPLETED_FEATURES: '/jobs/:jobId/features/inject'
} as const;

// Template Management Endpoints
export const TEMPLATE_ENDPOINTS = {
  GET_TEMPLATES: '/templates',
  GET_TEMPLATE: '/templates/:id',
  GET_FEATURED_TEMPLATES: '/templates/featured',
  GET_TEMPLATES_BY_CATEGORY: '/templates/category/:category',
  SEARCH_TEMPLATES: '/templates/search',
  GET_TEMPLATE_PREVIEW: '/templates/:id/preview',
  CHECK_TEMPLATE_ACCESS: '/templates/:id/access',
  GET_RECOMMENDED_TEMPLATES: '/templates/recommended',
  TRACK_TEMPLATE_USAGE: '/templates/:id/track'
} as const;

// Placeholder Management Endpoints
export const PLACEHOLDER_ENDPOINTS = {
  UPDATE_PLACEHOLDER_VALUE: '/jobs/:jobId/placeholders/:key',
  GET_PLACEHOLDER_VALUES: '/jobs/:jobId/placeholders',
  GET_PLACEHOLDER_VALUE: '/jobs/:jobId/placeholders/:key',
  BATCH_UPDATE_PLACEHOLDERS: '/jobs/:jobId/placeholders/batch',
  RESOLVE_PLACEHOLDERS: '/jobs/:jobId/placeholders/resolve',
  GET_AVAILABLE_PLACEHOLDERS: '/templates/:templateId/placeholders',
  VALIDATE_PLACEHOLDERS: '/jobs/:jobId/placeholders/validate',
  GET_PLACEHOLDER_COMPLETION: '/jobs/:jobId/placeholders/completion'
} as const;

// Certification Badge Endpoints
export const CERTIFICATION_ENDPOINTS = {
  GET_USER_BADGES: '/users/:userId/badges',
  GET_BADGE: '/badges/:id',
  ISSUE_BADGE: '/badges/issue',
  VERIFY_BADGE: '/badges/:id/verify',
  REVOKE_BADGE: '/badges/:id/revoke',
  GET_AVAILABLE_BADGE_TYPES: '/badges/types',
  CHECK_BADGE_ELIGIBILITY: '/users/:userId/badges/:badgeType/eligibility',
  GET_BADGE_PROGRESS: '/users/:userId/badges/progress',
  GET_CERTIFICATION_LEADERBOARD: '/badges/leaderboard',
  EXPORT_USER_BADGES: '/users/:userId/badges/export'
} as const;

// Role Profile Endpoints
export const ROLE_PROFILE_ENDPOINTS = {
  CREATE_ROLE_PROFILE: '/users/:userId/role-profiles',
  UPDATE_ROLE_PROFILE: '/role-profiles/:id',
  GET_ROLE_PROFILE: '/role-profiles/:id',
  GET_USER_ROLE_PROFILES: '/users/:userId/role-profiles',
  DELETE_ROLE_PROFILE: '/role-profiles/:id',
  GET_ROLE_TEMPLATE_RECOMMENDATIONS: '/role-profiles/recommendations/templates/:roleType',
  GET_ROLE_FEATURE_RECOMMENDATIONS: '/role-profiles/recommendations/features/:roleType',
  CUSTOMIZE_PROFILE_FOR_ROLE: '/role-profiles/:id/customize',
  GET_ROLE_PROFILE_ANALYTICS: '/role-profiles/:id/analytics',
  COMPARE_WITH_ROLE_REQUIREMENTS: '/role-profiles/:id/compare'
} as const;

// Workflow Orchestration Endpoints
export const WORKFLOW_ENDPOINTS = {
  INITIALIZE_WORKFLOW: '/workflows/initialize',
  GET_WORKFLOW_STATE: '/workflows/:jobId/state',
  UPDATE_WORKFLOW_STATE: '/workflows/:jobId/state',
  GET_WORKFLOW_PROGRESS: '/workflows/:jobId/progress',
  CHECK_WORKFLOW_COMPLETION: '/workflows/:jobId/completion',
  ORCHESTRATE_FEATURE_COMPLETION: '/workflows/:jobId/orchestrate/complete',
  ORCHESTRATE_FEATURE_SKIP: '/workflows/:jobId/orchestrate/skip'
} as const;

// Monitoring and Analytics Endpoints
export const MONITORING_ENDPOINTS = {
  GET_JOB_MONITORING_DATA: '/monitoring/jobs/:jobId',
  GET_DASHBOARD_DATA: '/monitoring/dashboard/:userId',
  GET_REALTIME_UPDATES: '/monitoring/realtime/:jobId',
  GET_JOB_STATISTICS: '/monitoring/statistics/jobs',
  GET_FEATURE_STATISTICS: '/monitoring/statistics/features',
  GET_TEMPLATE_STATISTICS: '/monitoring/statistics/templates',
  GET_BADGE_STATISTICS: '/monitoring/statistics/badges'
} as const;

// WebSocket Event Types
export const WEBSOCKET_EVENTS = {
  JOB_STATUS_CHANGED: 'job:status:changed',
  FEATURE_COMPLETED: 'feature:completed',
  FEATURE_SKIPPED: 'feature:skipped',
  FEATURE_FAILED: 'feature:failed',
  WORKFLOW_PROGRESS: 'workflow:progress',
  BADGE_EARNED: 'badge:earned',
  TEMPLATE_SELECTED: 'template:selected',
  PLACEHOLDER_UPDATED: 'placeholder:updated',
  ERROR_OCCURRED: 'error:occurred'
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
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