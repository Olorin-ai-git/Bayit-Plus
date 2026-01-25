/**
 * Feature Flags Service
 * Centralized feature flag management for frontend
 */

import { api } from './api';

/**
 * Feature flags interface
 */
export interface FeatureFlags {
  new_player: boolean;
  dark_mode: boolean;
  offline_mode: boolean;
  recommendations: boolean;
  social_features: boolean;
  live_chat: boolean;
  analytics_v2: boolean;
  scene_search: boolean;
  [key: string]: boolean;
}

/**
 * In-memory cache for feature flags
 */
let featureFlagsCache: FeatureFlags | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Default feature flags (fallback if API unavailable)
 */
const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  new_player: true,
  dark_mode: true,
  offline_mode: false,
  recommendations: true,
  social_features: false,
  live_chat: true,
  analytics_v2: false,
  scene_search: true,
};

/**
 * Get current feature flags from backend
 */
export async function getFeatureFlags(): Promise<FeatureFlags> {
  // Check cache first
  const now = Date.now();
  if (featureFlagsCache && now - cacheTimestamp < CACHE_TTL_MS) {
    return featureFlagsCache;
  }

  try {
    // Public endpoint (no auth required)
    const response = await api.get<FeatureFlags>('/api/v1/admin/settings/feature-flags/public');
    featureFlagsCache = response.data;
    cacheTimestamp = now;
    return response.data;
  } catch (error) {
    console.warn('Failed to fetch feature flags, using cache or defaults:', error);

    // Return cache if available
    if (featureFlagsCache) {
      return featureFlagsCache;
    }

    // Last resort: default flags
    return DEFAULT_FEATURE_FLAGS;
  }
}

/**
 * Check if a specific feature is enabled
 */
export async function isFeatureEnabled(featureName: string): Promise<boolean> {
  const flags = await getFeatureFlags();
  return flags[featureName] ?? false;
}

/**
 * Check multiple features
 */
export async function checkMultipleFeatures(
  featureNames: string[],
  requireAll: boolean = true
): Promise<boolean> {
  const flags = await getFeatureFlags();
  const statuses = featureNames.map((name) => flags[name] ?? false);

  if (requireAll) {
    return statuses.every((status) => status === true);
  } else {
    return statuses.some((status) => status === true);
  }
}

/**
 * Get list of all enabled features
 */
export async function getEnabledFeatures(): Promise<string[]> {
  const flags = await getFeatureFlags();
  return Object.entries(flags)
    .filter(([_, enabled]) => enabled)
    .map(([name]) => name);
}

/**
 * Clear the feature flags cache (force refresh on next call)
 */
export function clearCache(): void {
  featureFlagsCache = null;
  cacheTimestamp = 0;
}

/**
 * Subscribe to feature flag changes (polling)
 */
export function subscribeToFeatureFlags(
  callback: (flags: FeatureFlags) => void,
  intervalMs: number = 60000 // 1 minute
): () => void {
  let intervalId: NodeJS.Timeout | null = null;

  const poll = async () => {
    clearCache(); // Force refresh
    const flags = await getFeatureFlags();
    callback(flags);
  };

  // Initial fetch
  poll();

  // Set up polling
  intervalId = setInterval(poll, intervalMs);

  // Return cleanup function
  return () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

/**
 * Feature flag utility for conditional rendering
 */
export const featureFlags = {
  get: getFeatureFlags,
  isEnabled: isFeatureEnabled,
  checkMultiple: checkMultipleFeatures,
  getEnabled: getEnabledFeatures,
  clearCache,
  subscribe: subscribeToFeatureFlags,
};
