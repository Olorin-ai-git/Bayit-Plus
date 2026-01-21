/**
 * Remote Service Hook
 * Feature: 002-visualization-microservice
 *
 * React hook for loading remote microservices with graceful degradation.
 *
 * @module shared/hooks/useRemoteService
 */

import { useState, useEffect, useCallback } from 'react';
import { loadRemoteModule, checkServiceHealth } from '../utils/remoteLoader';

interface UseRemoteServiceOptions {
  name: string;
  url: string;
  scope: string;
  module: string;
  enableHealthCheck?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

interface UseRemoteServiceReturn<T = any> {
  module: T | null;
  loading: boolean;
  error: Error | null;
  healthy: boolean;
  retry: () => void;
}

export function useRemoteService<T = any>(
  options: UseRemoteServiceOptions
): UseRemoteServiceReturn<T> {
  const {
    name,
    url,
    scope,
    module,
    enableHealthCheck = true,
    retryAttempts = 3,
    retryDelay = 1000
  } = options;

  const [remoteModule, setRemoteModule] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [healthy, setHealthy] = useState<boolean>(false);
  const [attemptCount, setAttemptCount] = useState<number>(0);

  const loadModule = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (enableHealthCheck) {
        const isHealthy = await checkServiceHealth(url);
        setHealthy(isHealthy);

        if (!isHealthy) {
          throw new Error('Service failed health check');
        }
      }

      const result = await loadRemoteModule<T>({ name, url, scope, module });

      if (result.success && result.module) {
        setRemoteModule(result.module);
        setError(null);
      } else {
        throw result.error || new Error('Failed to load module');
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);

      if (attemptCount < retryAttempts) {
        setTimeout(() => {
          setAttemptCount(prev => prev + 1);
        }, retryDelay * (attemptCount + 1));
      }
    } finally {
      setLoading(false);
    }
  }, [name, url, scope, module, enableHealthCheck, attemptCount, retryAttempts, retryDelay]);

  const retry = useCallback(() => {
    setAttemptCount(0);
    loadModule();
  }, [loadModule]);

  useEffect(() => {
    loadModule();
  }, [attemptCount]);

  return { module: remoteModule, loading, error, healthy, retry };
}
