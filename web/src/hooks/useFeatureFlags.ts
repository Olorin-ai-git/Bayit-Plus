/**
 * useFeatureFlags Hook
 * React hook for accessing feature flags
 */

import { useState, useEffect, useCallback } from 'react';
import {
  FeatureFlags,
  getFeatureFlags,
  isFeatureEnabled,
  clearCache,
} from '../services/featureFlags';

/**
 * Hook for accessing all feature flags
 */
export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlags | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFlags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedFlags = await getFeatureFlags();
      setFlags(fetchedFlags);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch feature flags'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const refresh = useCallback(async () => {
    clearCache();
    await fetchFlags();
  }, [fetchFlags]);

  return {
    flags,
    loading,
    error,
    refresh,
  };
}

/**
 * Hook for checking if a specific feature is enabled
 */
export function useFeatureFlag(featureName: string) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const checkFlag = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const isEnabled = await isFeatureEnabled(featureName);
      setEnabled(isEnabled);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to check feature flag'));
      setEnabled(false);
    } finally {
      setLoading(false);
    }
  }, [featureName]);

  useEffect(() => {
    checkFlag();
  }, [checkFlag]);

  const refresh = useCallback(async () => {
    clearCache();
    await checkFlag();
  }, [checkFlag]);

  return {
    enabled,
    loading,
    error,
    refresh,
  };
}

/**
 * Hook for checking multiple features at once
 */
export function useMultipleFeatureFlags(featureNames: string[], requireAll: boolean = true) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const checkFlags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const flags = await getFeatureFlags();
      const statuses = featureNames.map((name) => flags[name] ?? false);

      const result = requireAll
        ? statuses.every((status) => status === true)
        : statuses.some((status) => status === true);

      setEnabled(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to check feature flags'));
      setEnabled(false);
    } finally {
      setLoading(false);
    }
  }, [featureNames, requireAll]);

  useEffect(() => {
    checkFlags();
  }, [checkFlags]);

  const refresh = useCallback(async () => {
    clearCache();
    await checkFlags();
  }, [checkFlags]);

  return {
    enabled,
    loading,
    error,
    refresh,
  };
}

/**
 * Hook for feature flag with automatic polling
 */
export function useFeatureFlagWithPolling(featureName: string, intervalMs: number = 60000) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkFlag = async () => {
      try {
        clearCache(); // Force refresh
        const isEnabled = await isFeatureEnabled(featureName);
        if (mounted) {
          setEnabled(isEnabled);
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setEnabled(false);
          setLoading(false);
        }
      }
    };

    // Initial check
    checkFlag();

    // Set up polling
    const intervalId = setInterval(checkFlag, intervalMs);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [featureName, intervalMs]);

  return {
    enabled,
    loading,
  };
}

/**
 * Feature flag gate component (render children only if feature enabled)
 */
export function useFeatureGate(featureName: string) {
  const { enabled, loading } = useFeatureFlag(featureName);

  return {
    canRender: enabled === true,
    loading,
    enabled,
  };
}
