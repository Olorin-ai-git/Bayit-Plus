/**
 * CVPlus Core Constants
 * 
 * Shared constants used across the CVPlus platform.
 * Provides centralized configuration and standardized values.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

// ============================================================================
// APPLICATION CONSTANTS
// ============================================================================

export * from './app';
export * from './validation';
// ARCHITECTURAL VIOLATION FIXED: Core cannot import from Layer 2 modules
// Templates and processing constants moved to @cvplus/processing
// Consumers should import directly from @cvplus/processing/constants
// export * from './templates';  // Moved to @cvplus/processing
// export * from './processing'; // Moved to @cvplus/processing
export * from './features';
export * from './api';
export * from './errors';

// ============================================================================
// FIREBASE FUNCTIONS CONSTANTS
// ============================================================================

export * from './firebase-functions';