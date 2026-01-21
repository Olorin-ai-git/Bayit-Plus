/**
 * Loading State Management Hooks
 * Provides coordinated loading states across components
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUIActions } from '../stores';

// Loading state types
export interface LoadingState {
  isLoading: boolean;
  progress?: number;
  message?: string;
  startTime?: number;
  estimatedDuration?: number;
}

export interface LoadingConfig {
  key: string;
  message?: string;
  estimatedDuration?: number;
  showProgress?: boolean;
  minimumDisplayTime?: number;
}

// Global loading registry
const loadingRegistry = new Map<string, LoadingState>();
const loadingListeners = new Set<() => void>();

/**
 * Hook for managing individual loading states
 */
export function useLoadingState(initialLoading = false) {
  const [state, setState] = useState<LoadingState>({
    isLoading: initialLoading,
  });

  const startLoading = useCallback((config: Partial<LoadingConfig> = {}) => {
    setState({
      isLoading: true,
      progress: config.showProgress ? 0 : undefined,
      message: config.message,
      startTime: Date.now(),
      estimatedDuration: config.estimatedDuration,
    });
  }, []);

  const updateProgress = useCallback((progress: number, message?: string) => {
    setState(prev => ({
      ...prev,
      progress: Math.max(0, Math.min(100, progress)),
      message: message || prev.message,
    }));
  }, []);

  const stopLoading = useCallback((minimumDisplayTime = 300) => {
    setState(prev => {
      const elapsed = Date.now() - (prev.startTime || 0);
      const remaining = Math.max(0, minimumDisplayTime - elapsed);

      if (remaining > 0) {
        setTimeout(() => {
          setState(current => ({ ...current, isLoading: false }));
        }, remaining);
      } else {
        return { ...prev, isLoading: false };
      }

      return prev;
    });
  }, []);

  const reset = useCallback(() => {
    setState({ isLoading: false });
  }, []);

  return {
    ...state,
    startLoading,
    updateProgress,
    stopLoading,
    reset,
  };
}

/**
 * Hook for managing global loading states across the application
 */
export function useGlobalLoading() {
  const [globalStates, setGlobalStates] = useState(() => new Map(loadingRegistry));
  const { setLoading } = useUIActions();

  useEffect(() => {
    const updateGlobalStates = () => {
      setGlobalStates(new Map(loadingRegistry));

      // Update UI store with overall loading state
      const hasAnyLoading = Array.from(loadingRegistry.values()).some(state => state.isLoading);
      setLoading('global', hasAnyLoading);
    };

    loadingListeners.add(updateGlobalStates);

    return () => {
      loadingListeners.delete(updateGlobalStates);
    };
  }, [setLoading]);

  const startGlobalLoading = useCallback((config: LoadingConfig) => {
    const state: LoadingState = {
      isLoading: true,
      message: config.message,
      startTime: Date.now(),
      estimatedDuration: config.estimatedDuration,
      progress: config.showProgress ? 0 : undefined,
    };

    loadingRegistry.set(config.key, state);
    loadingListeners.forEach(listener => listener());
  }, []);

  const updateGlobalProgress = useCallback((key: string, progress: number, message?: string) => {
    const existingState = loadingRegistry.get(key);
    if (existingState) {
      loadingRegistry.set(key, {
        ...existingState,
        progress: Math.max(0, Math.min(100, progress)),
        message: message || existingState.message,
      });
      loadingListeners.forEach(listener => listener());
    }
  }, []);

  const stopGlobalLoading = useCallback((key: string, minimumDisplayTime = 300) => {
    const existingState = loadingRegistry.get(key);
    if (existingState) {
      const elapsed = Date.now() - (existingState.startTime || 0);
      const remaining = Math.max(0, minimumDisplayTime - elapsed);

      if (remaining > 0) {
        setTimeout(() => {
          loadingRegistry.delete(key);
          loadingListeners.forEach(listener => listener());
        }, remaining);
      } else {
        loadingRegistry.delete(key);
        loadingListeners.forEach(listener => listener());
      }
    }
  }, []);

  const isGlobalLoading = (key?: string) => {
    if (key) {
      return loadingRegistry.get(key)?.isLoading || false;
    }
    return Array.from(loadingRegistry.values()).some(state => state.isLoading);
  };

  const getGlobalLoadingState = (key: string) => {
    return loadingRegistry.get(key) || { isLoading: false };
  };

  const getAllLoadingStates = () => {
    return new Map(loadingRegistry);
  };

  return {
    globalStates,
    startGlobalLoading,
    updateGlobalProgress,
    stopGlobalLoading,
    isGlobalLoading,
    getGlobalLoadingState,
    getAllLoadingStates,
  };
}

/**
 * Hook for coordinated loading states with automatic UI store integration
 */
export function useCoordinatedLoading(category: string) {
  const { setLoading } = useUIActions();
  const loadingStates = useRef<Map<string, boolean>>(new Map());

  const updateCategory = useCallback(() => {
    const hasAnyLoading = Array.from(loadingStates.current.values()).some(Boolean);
    setLoading(category as any, hasAnyLoading);
  }, [category, setLoading]);

  const startLoading = useCallback((key: string) => {
    loadingStates.current.set(key, true);
    updateCategory();
  }, [updateCategory]);

  const stopLoading = useCallback((key: string) => {
    loadingStates.current.set(key, false);
    updateCategory();
  }, [updateCategory]);

  const isLoading = useCallback((key?: string) => {
    if (key) {
      return loadingStates.current.get(key) || false;
    }
    return Array.from(loadingStates.current.values()).some(Boolean);
  }, []);

  const reset = useCallback(() => {
    loadingStates.current.clear();
    updateCategory();
  }, [updateCategory]);

  return {
    startLoading,
    stopLoading,
    isLoading,
    reset,
  };
}

/**
 * Hook for investigation-specific loading states
 */
export function useInvestigationLoading() {
  return useCoordinatedLoading('investigation');
}

/**
 * Hook for graph-specific loading states
 */
export function useGraphLoading() {
  return useCoordinatedLoading('graph');
}

/**
 * Hook for evidence-specific loading states
 */
export function useEvidenceLoading() {
  return useCoordinatedLoading('evidence');
}

/**
 * Hook for domain-specific loading states
 */
export function useDomainLoading() {
  return useCoordinatedLoading('domains');
}

/**
 * Hook for async operation loading with automatic error handling
 */
export function useAsyncLoading<T>() {
  const [state, setState] = useState<{
    isLoading: boolean;
    data: T | null;
    error: Error | null;
    progress?: number;
  }>({
    isLoading: false,
    data: null,
    error: null,
  });

  const execute = useCallback(async (
    operation: () => Promise<T>,
    options: {
      onProgress?: (progress: number) => void;
      minimumLoadingTime?: number;
    } = {}
  ) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    const startTime = Date.now();

    try {
      // Set up progress tracking if provided
      if (options.onProgress) {
        const progressInterval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const estimatedProgress = Math.min(90, (elapsed / 10000) * 100); // Estimate up to 90%
          options.onProgress!(estimatedProgress);
          setState(prev => ({ ...prev, progress: estimatedProgress }));
        }, 100);

        const result = await operation();

        clearInterval(progressInterval);
        options.onProgress(100);
        setState(prev => ({ ...prev, progress: 100 }));

        // Ensure minimum loading time for UX
        const elapsed = Date.now() - startTime;
        const minimumTime = options.minimumLoadingTime || 300;
        const remainingTime = Math.max(0, minimumTime - elapsed);

        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime));
        }

        setState({
          isLoading: false,
          data: result,
          error: null,
          progress: undefined,
        });

        return result;
      } else {
        const result = await operation();

        // Ensure minimum loading time for UX
        const elapsed = Date.now() - startTime;
        const minimumTime = options.minimumLoadingTime || 300;
        const remainingTime = Math.max(0, minimumTime - elapsed);

        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime));
        }

        setState({
          isLoading: false,
          data: result,
          error: null,
        });

        return result;
      }
    } catch (error) {
      setState({
        isLoading: false,
        data: null,
        error: error as Error,
      });
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      data: null,
      error: null,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

/**
 * Hook for managing loading states of multiple parallel operations
 */
export function useParallelLoading<T extends Record<string, any>>() {
  const [states, setStates] = useState<Record<keyof T, LoadingState>>({} as Record<keyof T, LoadingState>);

  const startLoading = useCallback((key: keyof T, config: Partial<LoadingConfig> = {}) => {
    setStates(prev => ({
      ...prev,
      [key]: {
        isLoading: true,
        progress: config.showProgress ? 0 : undefined,
        message: config.message,
        startTime: Date.now(),
        estimatedDuration: config.estimatedDuration,
      },
    }));
  }, []);

  const updateProgress = useCallback((key: keyof T, progress: number, message?: string) => {
    setStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        progress: Math.max(0, Math.min(100, progress)),
        message: message || prev[key]?.message,
      },
    }));
  }, []);

  const stopLoading = useCallback((key: keyof T, minimumDisplayTime = 300) => {
    setStates(prev => {
      const currentState = prev[key];
      if (!currentState) return prev;

      const elapsed = Date.now() - (currentState.startTime || 0);
      const remaining = Math.max(0, minimumDisplayTime - elapsed);

      if (remaining > 0) {
        setTimeout(() => {
          setStates(current => ({
            ...current,
            [key]: { ...current[key], isLoading: false },
          }));
        }, remaining);
        return prev;
      } else {
        return {
          ...prev,
          [key]: { ...currentState, isLoading: false },
        };
      }
    });
  }, []);

  const isAnyLoading = useCallback(() => {
    return Object.values(states).some((state: LoadingState) => state.isLoading);
  }, [states]);

  const getLoadingCount = useCallback(() => {
    return Object.values(states).filter((state: LoadingState) => state.isLoading).length;
  }, [states]);

  const reset = useCallback(() => {
    setStates({} as Record<keyof T, LoadingState>);
  }, []);

  return {
    states,
    startLoading,
    updateProgress,
    stopLoading,
    isAnyLoading,
    getLoadingCount,
    reset,
  };
}

/**
 * Utility function to create loading keys
 */
export function createLoadingKey(prefix: string, id?: string): string {
  return id ? `${prefix}:${id}` : prefix;
}

/**
 * Loading state constants
 */
export const LOADING_KEYS = {
  INVESTIGATION: {
    LIST: 'investigation:list',
    DETAILS: (id: string) => `investigation:details:${id}`,
    CREATE: 'investigation:create',
    UPDATE: (id: string) => `investigation:update:${id}`,
    DELETE: (id: string) => `investigation:delete:${id}`,
  },
  EVIDENCE: {
    LIST: (id: string) => `evidence:list:${id}`,
    DETAILS: (id: string) => `evidence:details:${id}`,
    UPLOAD: 'evidence:upload',
  },
  DOMAINS: {
    LIST: (id: string) => `domains:list:${id}`,
    ANALYSIS: (id: string, domain: string) => `domains:analysis:${id}:${domain}`,
  },
  GRAPH: {
    DATA: (id: string) => `graph:data:${id}`,
    LAYOUT: (id: string) => `graph:layout:${id}`,
    RENDER: 'graph:render',
  },
  EXPORT: {
    PDF: (id: string) => `export:pdf:${id}`,
    CSV: (id: string) => `export:csv:${id}`,
    JSON: (id: string) => `export:json:${id}`,
  },
} as const;