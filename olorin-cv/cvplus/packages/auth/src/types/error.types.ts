/**
 * Error Types
 * 
 * Authentication-specific error types and error handling utilities.
  */

// BaseError is defined locally to avoid external dependencies

export interface AuthError {
  code: AuthErrorCode;
  message: string;
  name: string;
  timestamp: number;
  context?: AuthErrorContext;
  userMessage?: string;
  retryable: boolean;
  retryAfter?: number;
}

export type AuthErrorCode =
  // Firebase Authentication Errors
  | 'auth/user-not-found'
  | 'auth/wrong-password'
  | 'auth/email-already-in-use'
  | 'auth/weak-password'
  | 'auth/invalid-email'
  | 'auth/user-disabled'
  | 'auth/too-many-requests'
  | 'auth/network-request-failed'
  | 'auth/popup-closed-by-user'
  | 'auth/cancelled-popup-request'
  | 'auth/popup-blocked'
  | 'auth/operation-not-allowed'
  | 'auth/invalid-credential'
  | 'auth/credential-already-in-use'
  | 'auth/timeout'
  | 'auth/expired-action-code'
  | 'auth/invalid-action-code'
  | 'auth/missing-android-pkg-name'
  | 'auth/missing-continue-uri'
  | 'auth/missing-ios-bundle-id'
  | 'auth/invalid-continue-uri'
  | 'auth/unauthorized-continue-uri'
  
  // Session Management Errors
  | 'session/expired'
  | 'session/invalid'
  | 'session/not-found'
  | 'session/concurrent-limit-exceeded'
  | 'session/refresh-failed'
  | 'session/sync-failed'
  | 'session-init-failed'
  | 'session-refresh-failed'
  | 'session-end-failed'
  | 'session-storage-failed'
  
  // Token Management Errors
  | 'token/expired'
  | 'token/invalid'
  | 'token/malformed'
  | 'token/signature-invalid'
  | 'token/audience-mismatch'
  | 'token/issuer-mismatch'
  | 'token/not-before'
  | 'token/refresh-failed'
  | 'token/revoked'
  
  // Permission Errors
  | 'permission/denied'
  | 'permission/insufficient'
  | 'permission/expired'
  | 'permission/not-found'
  | 'permission/invalid-scope'
  
  // Premium Feature Errors
  | 'premium/required'
  | 'premium/feature-disabled'
  | 'premium/quota-exceeded'
  | 'premium/subscription-expired'
  | 'premium/payment-required'
  | 'premium/upgrade-required'
  | 'premium/refresh-failed'
  | 'premium/invalid-tier'
  | 'premium/upgrade-failed'
  
  // Profile Management Errors
  | 'profile/incomplete'
  | 'profile/validation-failed'
  | 'profile/update-failed'
  | 'profile/not-found'
  
  // Security Errors
  | 'security/suspicious-activity'
  | 'security/ip-blocked'
  | 'security/rate-limited'
  | 'security/origin-not-allowed'
  | 'security/csrf-token-mismatch'
  | 'security/encryption-failed'
  | 'security/decryption-failed'
  
  // Configuration Errors
  | 'config/invalid'
  | 'config/missing-required'
  | 'config/provider-not-enabled'
  | 'config/firebase-not-initialized'
  
  // Network and Service Errors
  | 'network/offline'
  | 'network/timeout'
  | 'service/unavailable'
  | 'service/maintenance'
  | 'service/overloaded'
  
  // Generic Errors
  | 'auth/unknown'
  | 'auth/unknown-error'
  | 'auth/invalid-configuration'
  | 'auth/session-expired'
  | 'auth/token-storage-failed'
  | 'auth/revocation-failed'
  | 'auth/internal-error'
  | 'auth/initialization-failed';

export interface AuthErrorContext {
  // Request context
  operation?: string;
  provider?: string;
  userId?: string;
  sessionId?: string;
  
  // Client context
  userAgent?: string;
  platform?: string;
  browser?: string;
  viewport?: { width: number; height: number };
  
  // Network context
  ipAddress?: string;
  country?: string;
  connectionType?: string;
  
  // Application context
  version?: string;
  environment?: string;
  featureFlags?: Record<string, boolean>;
  
  // Error context
  error?: string;
  originalError?: any;
  additionalData?: Record<string, any>;
  
  // Error specific context
  retryCount?: number;
  lastAttempt?: number;
}

export interface ErrorRecoveryStrategy {
  errorCode: AuthErrorCode;
  strategy: RecoveryAction[];
  maxRetries?: number;
  backoffMultiplier?: number;
  timeout?: number;
}

export type RecoveryAction =
  | 'retry'
  | 'refresh-token'
  | 'clear-cache'
  | 'restart-session'
  | 'redirect-to-login'
  | 'show-error-dialog'
  | 'contact-support'
  | 'fallback-to-anonymous'
  | 'upgrade-prompt';

export interface ErrorHandlerConfig {
  // Global error handling
  enableGlobalHandler: boolean;
  logErrors: boolean;
  reportErrors: boolean;
  
  // User experience
  showUserFriendlyMessages: boolean;
  enableErrorRecovery: boolean;
  maxRetryAttempts: number;
  
  // Recovery strategies
  strategies: ErrorRecoveryStrategy[];
  
  // Fallback options
  fallbackToAnonymous: boolean;
  gracefulDegradation: boolean;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorRate: number;
  topErrors: Array<{
    code: AuthErrorCode;
    count: number;
    percentage: number;
  }>;
  recoverySuccess: number;
  userImpact: 'low' | 'medium' | 'high' | 'critical';
}

export interface ErrorReportingEvent {
  id: string;
  timestamp: number;
  error: AuthError;
  resolved: boolean;
  resolvedAt?: number;
  resolution?: string;
  userFeedback?: string;
}

// Error factory functions
export interface AuthErrorFactory {
  createAuthError: (
    code: AuthErrorCode, 
    message: string, 
    context?: AuthErrorContext
  ) => AuthError;
  
  createFromFirebaseError: (firebaseError: any) => AuthError;
  createNetworkError: (originalError: Error) => AuthError;
  createValidationError: (field: string, value: any) => AuthError;
  createPermissionError: (required: string, actual?: string) => AuthError;
  createPremiumError: (feature: string, tier?: string) => AuthError;
}

// Error handler interface
export interface AuthErrorHandler {
  handle: (error: AuthError) => Promise<ErrorHandlingResult>;
  canRecover: (error: AuthError) => boolean;
  recover: (error: AuthError) => Promise<boolean>;
  report: (error: AuthError) => Promise<void>;
}

export interface ErrorHandlingResult {
  handled: boolean;
  recovered: boolean;
  userMessage?: string;
  action?: RecoveryAction;
  retryAfter?: number;
}

// User-friendly error messages
export interface ErrorMessageMap {
  [code: string]: {
    title: string;
    message: string;
    action?: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
  };
}

export const DEFAULT_ERROR_MESSAGES: ErrorMessageMap = {
  'auth/user-not-found': {
    title: 'Account Not Found',
    message: 'No account found with this email address.',
    action: 'Please check your email or create a new account.',
    severity: 'warning'
  },
  'auth/wrong-password': {
    title: 'Incorrect Password',
    message: 'The password you entered is incorrect.',
    action: 'Please try again or reset your password.',
    severity: 'warning'
  },
  'auth/too-many-requests': {
    title: 'Too Many Attempts',
    message: 'Too many failed login attempts.',
    action: 'Please wait a few minutes before trying again.',
    severity: 'error'
  },
  'premium/required': {
    title: 'Premium Feature',
    message: 'This feature requires a premium subscription.',
    action: 'Upgrade to premium to access this feature.',
    severity: 'info'
  },
  'network/offline': {
    title: 'Connection Error',
    message: 'You appear to be offline.',
    action: 'Please check your internet connection.',
    severity: 'error'
  }
};