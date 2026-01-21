/**
 * CVPlus Core Utilities
 * 
 * Shared utility functions used across the CVPlus platform.
 * Provides common functionality for data manipulation, validation, and processing.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export * from './validation';
export * from './formatting';
export * from './date';
export * from './string';
export * from './object';
export * from './array';
export * from './type-guards';
export * from './async';
export * from './crypto';
export * from './error-helpers';
export * from './error-handling';
export * from './classnames';

// ============================================================================
// FIREBASE FUNCTIONS UTILITIES
// ============================================================================

export * from './firebase-error-handler';
export * from './firebase-response-formatter';
export * from './firebase-auth-validator';
export * from './firebase-logger';

// ============================================================================
// AUTHENTICATION UTILITIES
// ============================================================================
// Auth utilities are available in @cvplus/auth/utils
// Consumers should import directly from @cvplus/auth for authentication functions
// export * from './auth'; // Moved to @cvplus/auth module

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

export { 
  EnhancedErrorHandler,
  handleFunctionError,
  withErrorHandling
} from './enhanced-error-handler';

// ============================================================================
// FIRESTORE UTILITIES
// ============================================================================

export * from './firestore-sanitizer';
export * from './firestore-validation.service';
export * from './safe-firestore.service';

// ============================================================================
// PRIVACY & SECURITY UTILITIES
// ============================================================================

export * from './privacy';

// ============================================================================
// STRING & URL UTILITIES
// ============================================================================

export * from './slug';