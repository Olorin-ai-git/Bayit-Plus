/**
 * CVPlus Core Configuration
 * 
 * Centralized configuration exports for the CVPlus platform.
 * Includes environment, Firebase, CORS, and pricing configurations.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

export {
  environment as environmentConfig,
  environment as config,
  default as environment
} from './environment';

// ============================================================================
// FIREBASE CONFIGURATION
// ============================================================================

export * from './firebase';
export { db } from './firebase';

// ============================================================================
// CORS CONFIGURATION
// ============================================================================

export * from './cors';
export { corsConfig } from './cors';

// ============================================================================
// PRICING CONFIGURATION
// ============================================================================

export type {
  PricingConfig
} from './pricing';

export {
  BACKEND_PRICING_CONFIG,
  getTierConfig,
  validatePricingConfig
} from './pricing';

// ============================================================================
// FEATURE FLAGS CONFIGURATION
// ============================================================================

export type {
  FeatureFlagKey
} from './feature-flags';

export {
  FEATURE_FLAGS,
  getFeatureFlagDefault,
  getAllFeatureFlags,
  getCriticalFeatureFlags
} from './feature-flags';