/**
 * Feature Flags Configuration for CVPlus
 *
 * Central definition of all feature flags used in the system.
 * Flags can be toggled in Firestore for gradual rollouts and A/B testing.
 *
 * @author CVPlus Team
 * @version 1.0.0
 * @created 2025-11-29
 */

/**
 * Feature flag definitions with default values
 * Defaults MUST be conservative for critical features (false/deny by default)
 */
export const FEATURE_FLAGS = {
  /**
   * NEW_FEATURE_ACCESS_LOGIC
   *
   * Controls the rollout of the new default-deny security posture for feature access.
   * When OFF (false): Old behavior (default-allow) for backward compatibility
   * When ON (true): New behavior (default-deny) for security
   *
   * This is a kill-switch flag for safe breaking change deployment.
   * Default: false (maintain backward compatibility during rollout)
   *
   * Timeline:
   * 1. Deploy with flag OFF - new logic available but old logic active
   * 2. Monitor for issues - validate new logic in shadow mode
   * 3. Flip flag ON - switch to new logic
   * 4. Monitor for 24-48 hours - verify no production issues
   * 5. Remove flag after successful validation period
   */
  NEW_FEATURE_ACCESS_LOGIC: {
    key: 'NEW_FEATURE_ACCESS_LOGIC',
    description: 'Enable default-deny security posture for feature access control',
    default: false,
    critical: true,
    rolloutStrategy: 'kill-switch' as const,
  },

  /**
   * ENABLE_VIDEO_GENERATION
   * Controls whether video generation service is available
   * Default: false (until full implementation verified)
   */
  ENABLE_VIDEO_GENERATION: {
    key: 'ENABLE_VIDEO_GENERATION',
    description: 'Enable video generation feature',
    default: false,
    critical: false,
    rolloutStrategy: 'gradual' as const,
  },

  /**
   * ENABLE_PODCAST_GENERATION
   * Controls whether podcast generation service is available
   * Default: false (until full implementation verified)
   */
  ENABLE_PODCAST_GENERATION: {
    key: 'ENABLE_PODCAST_GENERATION',
    description: 'Enable podcast generation feature',
    default: false,
    critical: false,
    rolloutStrategy: 'gradual' as const,
  },

  /**
   * ENABLE_ENHANCED_RATE_LIMITING
   * Controls enhanced rate limiting with circuit breakers
   * Default: false (until full implementation verified)
   */
  ENABLE_ENHANCED_RATE_LIMITING: {
    key: 'ENABLE_ENHANCED_RATE_LIMITING',
    description: 'Enable enhanced rate limiting with circuit breakers',
    default: false,
    critical: true,
    rolloutStrategy: 'gradual' as const,
  },

  /**
   * ENABLE_PAYMENT_PROVIDER_FILTERING
   * Controls regional payment provider selection
   * Default: false (until implementation complete)
   */
  ENABLE_PAYMENT_PROVIDER_FILTERING: {
    key: 'ENABLE_PAYMENT_PROVIDER_FILTERING',
    description: 'Enable regional payment provider filtering',
    default: false,
    critical: true,
    rolloutStrategy: 'kill-switch' as const,
  },
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

export interface FeatureFlagDefinition {
  key: string;
  description: string;
  default: boolean;
  critical: boolean;
  rolloutStrategy: 'kill-switch' | 'gradual' | 'canary';
}

/**
 * Get default value for a feature flag
 */
export function getFeatureFlagDefault(flagKey: FeatureFlagKey): boolean {
  const flag = FEATURE_FLAGS[flagKey];
  return flag ? flag.default : false;
}

/**
 * Get all feature flag definitions
 */
export function getAllFeatureFlags(): Record<string, FeatureFlagDefinition> {
  return Object.values(FEATURE_FLAGS).reduce(
    (acc, flag) => {
      acc[flag.key] = flag as FeatureFlagDefinition;
      return acc;
    },
    {} as Record<string, FeatureFlagDefinition>
  );
}

/**
 * Get all critical feature flags
 */
export function getCriticalFeatureFlags(): FeatureFlagDefinition[] {
  return Object.values(FEATURE_FLAGS)
    .filter((flag) => flag.critical)
    .map((flag) => flag as FeatureFlagDefinition);
}
