/**
 * Shared React Hooks for Olorin Microservices
 * Custom hooks used across all microservices
 */

import { useState, useEffect, useCallback, useRef } from 'react';
<<<<<<< HEAD
import { useEventBus } from '../events/eventBus';
=======
import { useEventBus } from '../events/UnifiedEventBus';
>>>>>>> 001-modify-analyzer-method
import { storage } from '../utils';

/**
 * Hook for managing local storage state
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    return storage.get(key, initialValue);
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      storage.set(key, valueToStore);
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}

/**
 * Hook for debounced values
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for previous value
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

/**
 * Hook for async operations
 */
export function useAsync<T, E = string>(
  asyncFunction: () => Promise<T>,
  immediate = true
): {
  execute: () => Promise<void>;
  status: 'idle' | 'pending' | 'success' | 'error';
  value: T | null;
  error: E | null;
} {
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [value, setValue] = useState<T | null>(null);
  const [error, setError] = useState<E | null>(null);

  const execute = useCallback(async () => {
    setStatus('pending');
    setValue(null);
    setError(null);

    try {
      const response = await asyncFunction();
      setValue(response);
      setStatus('success');
    } catch (error) {
      setError(error as E);
      setStatus('error');
    }
  }, [asyncFunction]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return { execute, status, value, error };
}

<<<<<<< HEAD
/**
 * Hook for event bus communication
 */
export function useEventBusSubscription<K extends keyof import('../events/eventBus').EventBusEvents>(
  event: K,
  handler: (data: import('../events/eventBus').EventBusEvents[K]) => void,
  deps: React.DependencyList = []
) {
  const { subscribe, cleanup } = useEventBus();

  useEffect(() => {
    const unsubscribe = subscribe(event, handler, 'useEventBusSubscription');
    return unsubscribe;
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => cleanup('useEventBusSubscription');
  }, [cleanup]);
}
=======
// Event bus hooks are now provided by UnifiedEventBus
// See: src/shared/events/UnifiedEventBus.tsx
>>>>>>> 001-modify-analyzer-method

/**
 * Hook for window size
 */
export function useWindowSize(): { width: number; height: number } {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
}

/**
 * Hook for media queries
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}

/**
 * Hook for intersection observer
 */
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
): IntersectionObserverEntry | null {
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      setEntry(entry);
    }, options);

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return entry;
}

/**
 * Hook for service health monitoring
 */
export function useServiceHealth(serviceName: string) {
  const [health, setHealth] = useState<{
    status: 'healthy' | 'degraded' | 'down' | 'unknown';
    lastCheck: Date | null;
    errorCount: number;
  }>({
    status: 'unknown',
    lastCheck: null,
    errorCount: 0,
  });

  useEventBusSubscription('service:health:check', (data) => {
    if (data.service === serviceName) {
      setHealth({
        status: data.status.status,
        lastCheck: data.status.lastCheck,
        errorCount: 0,
      });
    }
  });

  useEventBusSubscription('service:error', (data) => {
    if (data.service === serviceName) {
      setHealth(prev => ({
        ...prev,
        status: 'degraded',
        errorCount: prev.errorCount + 1,
      }));
    }
  });

  return health;
}

<<<<<<< HEAD
=======
// Investigation Wizard Hooks (Feature: 004-new-olorin-frontend)
export { useWizardNavigation } from './useWizardNavigation';
export type { WizardNavigationResult } from './useWizardNavigation';

export { useWizardValidation } from './useWizardValidation';
export type { ValidationResult, WizardValidationResult } from './useWizardValidation';

// Unified WebSocket Hook (Phase 4.1 - Frontend Refactoring)
export { useWebSocket } from './useWebSocket';
export type { UseWebSocketConfig, UseWebSocketReturn } from './useWebSocket';

// Event Bus Hooks (Foundation Layer) - from UnifiedEventBus
export {
  useEventBus,
  useEventListener as useEventBusSubscription,
  useEventEmitter
} from '../events/UnifiedEventBus';

// State Management Hooks (Foundation Layer)
export { useInvestigationState } from './useInvestigationState';
export { useNotifications } from './useNotifications';
export type { Notification } from '../types/core/notification.types';

>>>>>>> 001-modify-analyzer-method
export default {
  useLocalStorage,
  useDebounce,
  usePrevious,
  useAsync,
<<<<<<< HEAD
  useEventBusSubscription,
=======
>>>>>>> 001-modify-analyzer-method
  useWindowSize,
  useMediaQuery,
  useIntersectionObserver,
  useServiceHealth,
<<<<<<< HEAD
=======
  useInvestigationState,
  useNotifications,
>>>>>>> 001-modify-analyzer-method
};