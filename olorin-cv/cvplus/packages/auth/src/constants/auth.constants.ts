/**
 * Authentication Constants
 * 
 * Core constants and default configuration for the authentication module.
  */

import type { AuthModuleConfig, AuthProvider } from '../types';

// ============================================================================
// AUTHENTICATION PROVIDERS
// ============================================================================
export const AUTH_PROVIDERS: Record<AuthProvider, string> = {
  google: 'google.com',
  email: 'password',
  anonymous: 'anonymous'
} as const;

// ============================================================================
// GOOGLE OAUTH SCOPES
// ============================================================================
export const GOOGLE_AUTH_SCOPES = [
  'openid',
  'email',
  'profile'
] as const;

export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly'
] as const;

// ============================================================================
// SESSION CONFIGURATION
// ============================================================================
export const SESSION_DEFAULTS = {
  TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
  REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes before expiry
  GRACE_PERIOD: 2 * 60 * 1000, // 2 minutes after expiry
  SYNC_INTERVAL: 30 * 1000, // 30 seconds
  MAX_CONCURRENT: 5,
  IDLE_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  RECENT_AUTH_REQUIRED: 10 * 60 * 1000 // 10 minutes for sensitive operations
} as const;

// ============================================================================
// TOKEN CONFIGURATION
// ============================================================================
export const TOKEN_DEFAULTS = {
  CACHE_BUFFER: 5 * 60 * 1000, // 5 minutes buffer before expiry
  ROTATION_INTERVAL: 7 * 24 * 60 * 60 * 1000, // 7 days
  MAX_AGE: 60 * 60 * 1000, // 1 hour for regular operations
  SENSITIVE_MAX_AGE: 10 * 60 * 1000 // 10 minutes for sensitive operations
} as const;

// ============================================================================
// SECURITY CONFIGURATION
// ============================================================================
export const SECURITY_DEFAULTS = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  PASSWORD_MIN_LENGTH: 8,
  RATE_LIMIT_WINDOW: 60 * 1000, // 1 minute
  RATE_LIMIT_MAX: 10, // requests per window
  MFA_TIMEOUT: 5 * 60 * 1000 // 5 minutes to complete MFA
} as const;

// ============================================================================
// STORAGE KEYS
// ============================================================================
export const STORAGE_KEYS = {
  SESSION: 'cvplus_auth_session',
  TOKENS: 'cvplus_auth_tokens',
  PREMIUM: 'cvplus_premium_status',
  PREFERENCES: 'cvplus_user_preferences',
  PROFILE: 'cvplus_user_profile',
  CALENDAR_TOKENS: 'cvplus_calendar_tokens',
  SESSION_PREFIX: 'cvplus_session_',
  CURRENT_SESSION: 'cvplus_current_session'
} as const;

// ============================================================================
// EVENT NAMES
// ============================================================================
export const AUTH_EVENTS = {
  SIGN_IN: 'auth:sign-in',
  SIGN_OUT: 'auth:sign-out',
  STATE_CHANGED: 'auth:state-changed',
  SESSION_EXPIRED: 'auth:session-expired',
  SESSION_REFRESHED: 'auth:session-refreshed',
  TOKEN_REFRESHED: 'auth:token-refreshed',
  PREMIUM_CHANGED: 'auth:premium-changed',
  PROFILE_UPDATED: 'auth:profile-updated',
  ERROR: 'auth:error'
} as const;

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================
export const defaultAuthConfig: AuthModuleConfig = {
  firebase: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    useEmulator: false
  },
  
  providers: {
    google: {
      enabled: true,
      scopes: [...GOOGLE_AUTH_SCOPES],
      calendarScopes: [...GOOGLE_CALENDAR_SCOPES],
      requestCalendarOnSignIn: false
    },
    email: {
      enabled: true,
      requireEmailVerification: true,
      allowSignUp: true,
      passwordPolicy: {
        minLength: SECURITY_DEFAULTS.PASSWORD_MIN_LENGTH,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: false,
        forbidCommonPasswords: true
      }
    },
    anonymous: {
      enabled: false,
      allowInProduction: false,
      autoUpgrade: true
    }
  },
  
  session: {
    timeout: SESSION_DEFAULTS.TIMEOUT,
    refreshThreshold: SESSION_DEFAULTS.REFRESH_THRESHOLD,
    gracePeriod: SESSION_DEFAULTS.GRACE_PERIOD,
    enableCrossTabSync: true,
    syncInterval: SESSION_DEFAULTS.SYNC_INTERVAL,
    persistSession: true,
    storageType: 'localStorage',
    encryptStorage: true,
    maxConcurrentSessions: SESSION_DEFAULTS.MAX_CONCURRENT,
    enforceSessionLimit: false,
    trackActivity: true,
    idleTimeout: SESSION_DEFAULTS.IDLE_TIMEOUT,
    requireRecentAuth: SESSION_DEFAULTS.RECENT_AUTH_REQUIRED
  },
  
  security: {
    requireEmailVerification: true,
    enforcePasswordPolicy: true,
    enableMFA: false,
    enableRateLimit: true,
    maxLoginAttempts: SECURITY_DEFAULTS.MAX_LOGIN_ATTEMPTS,
    lockoutDuration: SECURITY_DEFAULTS.LOCKOUT_DURATION,
    enableCSRFProtection: true,
    validateOrigin: true,
    allowedOrigins: [],
    tokenEncryption: true,
    tokenRotation: true,
    jwtSecretRotation: TOKEN_DEFAULTS.ROTATION_INTERVAL,
    logSecurityEvents: true,
    alertOnSuspiciousActivity: true
  },
  
  features: {
    enableGoogleAuth: true,
    enableEmailAuth: true,
    enableAnonymousAuth: false,
    enablePremiumFeatures: true,
    premiumFeatureGates: [],
    enableCalendarIntegration: true,
    calendarProvider: 'google',
    enableProfileManagement: true,
    requiredProfileFields: ['email'],
    enableUserDirectory: false,
    enableTeamFeatures: false,
    enableAPIAccess: false,
    defaultAPIQuota: 1000
  },
  
  ui: {
    showRememberMe: true,
    showForgotPassword: true,
    showSignUp: true,
    showGoogleSignIn: true,
    customBranding: {
      companyName: 'CVPlus',
      primaryColor: '#3B82F6',
      secondaryColor: '#1E40AF',
      backgroundColor: '#FFFFFF',
      textColor: '#1F2937',
      linkColor: '#3B82F6'
    },
    theme: 'light',
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'es', 'fr'],
    showDetailedErrors: false
  },
  
  storage: {
    enableLocalStorage: true,
    localStoragePrefix: 'cvplus_',
    enableSessionStorage: true,
    sessionStoragePrefix: 'cvplus_session_',
    enableIndexedDB: false,
    indexedDBName: 'cvplus_auth',
    indexedDBVersion: 1,
    encryptSensitiveData: true,
    autoCleanup: true,
    cleanupInterval: 60 * 60 * 1000, // 1 hour
    dataRetentionPeriod: 30 * 24 * 60 * 60 * 1000 // 30 days
  },
  
  monitoring: {
    enableAnalytics: false,
    logLevel: 'warn',
    enableConsoleLogging: true,
    enableRemoteLogging: false,
    enablePerformanceMonitoring: false,
    trackUserJourney: false,
    enableErrorReporting: false,
    collectMetrics: false,
    batchSize: 100,
    flushInterval: 30 * 1000 // 30 seconds
  }
};

// ============================================================================
// VALIDATION PATTERNS
// ============================================================================
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s\-\(\)]+$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  JWT: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/
} as const;

// ============================================================================
// HTTP STATUS CODES
// ============================================================================
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

// ============================================================================
// ENVIRONMENT DETECTION
// ============================================================================
export const isClient = () => typeof window !== 'undefined';
export const isServer = () => typeof window === 'undefined';
export const isDevelopment = () => process.env.NODE_ENV === 'development';
export const isProduction = () => process.env.NODE_ENV === 'production';
export const isTest = () => process.env.NODE_ENV === 'test';