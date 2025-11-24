<<<<<<< HEAD
import { useEffect, useRef, useCallback, useMemo } from 'react';
import { ServicePerformanceTracker } from '../monitoring/ServicePerformanceTracker';
import { PerformanceMonitor } from '../monitoring/PerformanceMonitor';

interface UsePerformanceMonitoringOptions {
  serviceName: string;
  trackComponents?: boolean;
  trackUserInteractions?: boolean;
  trackNetworkRequests?: boolean;
  enableWebVitals?: boolean;
  detailedLogging?: boolean;
  autoStart?: boolean;
}

interface PerformanceHookReturn {
  tracker: ServicePerformanceTracker | null;
  monitor: PerformanceMonitor | null;
  trackUserAction: (action: string, responseTime?: number) => void;
  trackComponentRender: (componentName: string, renderTime: number) => void;
  trackError: (error: Error, severity?: 'low' | 'medium' | 'high' | 'critical') => void;
  getMetrics: () => any;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  isMonitoring: boolean;
}

export const usePerformanceMonitoring = (
  options: UsePerformanceMonitoringOptions
): PerformanceHookReturn => {
  const trackerRef = useRef<ServicePerformanceTracker | null>(null);
  const monitorRef = useRef<PerformanceMonitor | null>(null);
  const isMonitoringRef = useRef<boolean>(false);
  const startTimeRef = useRef<number>(0);

  const {
    serviceName,
    trackComponents = true,
    trackUserInteractions = true,
    trackNetworkRequests = true,
    enableWebVitals = true,
    detailedLogging = false,
    autoStart = true
  } = options;

  // Initialize monitoring
  const initializeMonitoring = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      // Create performance monitor
      monitorRef.current = new PerformanceMonitor(serviceName, {
        enableWebVitals,
        batchSize: 50,
        flushInterval: 30000,
        maxMetrics: 1000
      });

      // Create service performance tracker
      trackerRef.current = new ServicePerformanceTracker(serviceName, {
        enableDetailedLogging: detailedLogging,
        healthCheckInterval: 30000,
        componentTracking: trackComponents
      });

      isMonitoringRef.current = true;
      startTimeRef.current = performance.now();

      if (detailedLogging) {
        console.log(`[usePerformanceMonitoring] Initialized monitoring for ${serviceName}`);
      }
    } catch (error) {
      console.error('[usePerformanceMonitoring] Failed to initialize:', error);
    }
  }, [serviceName, enableWebVitals, detailedLogging, trackComponents]);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (!isMonitoringRef.current) {
      initializeMonitoring();
    }
  }, [initializeMonitoring]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (trackerRef.current) {
      trackerRef.current.destroy();
      trackerRef.current = null;
    }

    if (monitorRef.current) {
      monitorRef.current.destroy();
      monitorRef.current = null;
    }

    isMonitoringRef.current = false;

    if (options.detailedLogging) {
      console.log(`[usePerformanceMonitoring] Stopped monitoring for ${serviceName}`);
    }
  }, [serviceName, options.detailedLogging]);

  // Track user actions
  const trackUserAction = useCallback((action: string, responseTime?: number) => {
    if (!trackerRef.current || !isMonitoringRef.current) return;

    const actionResponseTime = responseTime || (performance.now() - startTimeRef.current);

    trackerRef.current.trackUserInteraction({
      action,
      service: serviceName,
      responseTime: actionResponseTime,
      success: true,
      timestamp: Date.now()
    });

    // Reset start time for next action
    startTimeRef.current = performance.now();
  }, [serviceName]);

  // Track component render times
  const trackComponentRender = useCallback((componentName: string, renderTime: number) => {
    if (!trackerRef.current || !isMonitoringRef.current) return;

    trackerRef.current.recordComponentMetric({
      componentName,
      service: serviceName,
      mountTime: performance.now() - renderTime,
      renderTime,
      updateCount: 0,
      memoryLeak: false,
      timestamp: Date.now()
    });
  }, [serviceName]);

  // Track errors
  const trackError = useCallback((error: Error, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium') => {
    if (!trackerRef.current || !isMonitoringRef.current) return;

    trackerRef.current.trackError({
      service: serviceName,
      error: error.message,
      stack: error.stack,
      severity,
      timestamp: Date.now()
    });
  }, [serviceName]);

  // Get current metrics
  const getMetrics = useCallback(() => {
    if (!trackerRef.current || !monitorRef.current) return null;

    return {
      service: trackerRef.current.getPerformanceSummary(),
      monitor: monitorRef.current.getSummary()
    };
  }, []);

  // Auto-start monitoring on mount
  useEffect(() => {
    if (autoStart) {
      startMonitoring();
    }

    // Cleanup on unmount
    return () => {
      stopMonitoring();
    };
  }, [autoStart, startMonitoring, stopMonitoring]);

  // Track component mount/unmount
  useEffect(() => {
    if (!trackComponents || !isMonitoringRef.current) return;

    const mountTime = performance.now();

    // Track component mount
    if (trackerRef.current) {
      trackerRef.current.recordComponentMetric({
        componentName: 'HookComponent',
        service: serviceName,
        mountTime,
        renderTime: 0,
        updateCount: 0,
        memoryLeak: false,
        timestamp: Date.now()
      });
    }

    return () => {
      // Track component unmount time
      const unmountTime = performance.now();
      const lifetime = unmountTime - mountTime;

      if (monitorRef.current) {
        monitorRef.current.recordMetric({
          name: 'component_lifetime',
          value: lifetime,
          unit: 'ms',
          service: serviceName,
          timestamp: Date.now(),
          tags: {
            component: 'HookComponent'
          }
        });
      }
    };
  }, [trackComponents, serviceName]);

  // Track user interactions automatically
  useEffect(() => {
    if (!trackUserInteractions || !isMonitoringRef.current) return;

    const handleUserInteraction = (event: Event) => {
      const actionType = event.type;
      const target = event.target as HTMLElement;
      const targetTag = target?.tagName?.toLowerCase() || 'unknown';

      startTimeRef.current = performance.now();

      // Track after a short delay to capture response time
      setTimeout(() => {
        trackUserAction(`${actionType}_${targetTag}`, performance.now() - startTimeRef.current);
      }, 100);
    };

    const events = ['click', 'keydown', 'submit', 'change'];
    events.forEach(eventType => {
      document.addEventListener(eventType, handleUserInteraction, { passive: true });
    });

    return () => {
      events.forEach(eventType => {
        document.removeEventListener(eventType, handleUserInteraction);
      });
    };
  }, [trackUserInteractions, trackUserAction]);

  // Track network requests automatically
  useEffect(() => {
    if (!trackNetworkRequests || !isMonitoringRef.current) return;

    const originalFetch = window.fetch;

    window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
      const startTime = performance.now();
      const url = typeof input === 'string' ? input : input.toString();

      try {
        const response = await originalFetch.call(this, input, init);
        const endTime = performance.now();
        const duration = endTime - startTime;

        if (monitorRef.current) {
          monitorRef.current.recordMetric({
            name: 'network_request_duration',
            value: duration,
            unit: 'ms',
            service: serviceName,
            timestamp: Date.now(),
            tags: {
              url: url.split('?')[0], // Remove query params
              method: init?.method || 'GET',
              status: response.status.toString()
            }
          });
        }

        return response;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;

        if (monitorRef.current) {
          monitorRef.current.recordMetric({
            name: 'network_request_error',
            value: duration,
            unit: 'ms',
            service: serviceName,
            timestamp: Date.now(),
            tags: {
              url: url.split('?')[0],
              method: init?.method || 'GET',
              error: 'true'
            }
          });
        }

        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [trackNetworkRequests, serviceName]);

  // Memoized return value
  const returnValue = useMemo<PerformanceHookReturn>(() => ({
    tracker: trackerRef.current,
    monitor: monitorRef.current,
    trackUserAction,
    trackComponentRender,
    trackError,
    getMetrics,
    startMonitoring,
    stopMonitoring,
    isMonitoring: isMonitoringRef.current
  }), [
    trackUserAction,
    trackComponentRender,
    trackError,
    getMetrics,
    startMonitoring,
    stopMonitoring
  ]);

  return returnValue;
};

// HOC for automatic performance tracking
export const withPerformanceMonitoring = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: UsePerformanceMonitoringOptions
) => {
  const EnhancedComponent = (props: P) => {
    const { trackComponentRender } = usePerformanceMonitoring(options);

    useEffect(() => {
      const startTime = performance.now();

      return () => {
        const renderTime = performance.now() - startTime;
        trackComponentRender(WrappedComponent.displayName || WrappedComponent.name, renderTime);
      };
    }, [trackComponentRender]);

    return <WrappedComponent {...props} />;
  };

  EnhancedComponent.displayName = `withPerformanceMonitoring(${WrappedComponent.displayName || WrappedComponent.name})`;

  return EnhancedComponent;
};

export default usePerformanceMonitoring;
=======
import { useState, useEffect, useCallback, useRef } from 'react';

export interface PerformanceMetrics {
  snapshotFetchMs: number;
  eventsFetchMs: number;
  rehydrationMs: number;
  renderMs: number;
  pollingIntervalMs: number;
  eventProcessingMs: number;
  updateConflictCount: number;
  rateLimitHitCount: number;
  etagHitCount: number;
}

interface PerformanceThresholds {
  snapshotFetchMs: number;
  eventsFetchMs: number;
  rehydrationMs: number;
  renderMs: number;
}

function getThresholdsFromEnv(): PerformanceThresholds {
  return {
    snapshotFetchMs: Number(process.env.REACT_APP_PERF_SNAPSHOT_FETCH_THRESHOLD_MS) || 100,
    eventsFetchMs: Number(process.env.REACT_APP_PERF_EVENTS_FETCH_THRESHOLD_MS) || 100,
    rehydrationMs: Number(process.env.REACT_APP_PERF_REHYDRATION_THRESHOLD_MS) || 200,
    renderMs: Number(process.env.REACT_APP_PERF_RENDER_THRESHOLD_MS) || 50
  };
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = getThresholdsFromEnv();

export function usePerformanceMonitoring(investigationId: string | undefined) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    snapshotFetchMs: 0,
    eventsFetchMs: 0,
    rehydrationMs: 0,
    renderMs: 0,
    pollingIntervalMs: 0,
    eventProcessingMs: 0,
    updateConflictCount: 0,
    rateLimitHitCount: 0,
    etagHitCount: 0
  });

  const thresholds = useRef<PerformanceThresholds>(DEFAULT_THRESHOLDS);
  const metricsRef = useRef(metrics);

  useEffect(() => {
    metricsRef.current = metrics;
  }, [metrics]);

  const recordMetric = useCallback((key: keyof PerformanceMetrics, value: number) => {
    setMetrics(prev => ({ ...prev, [key]: value }));

    if (key in thresholds.current && value > thresholds.current[key as keyof PerformanceThresholds]) {
      console.warn(`[Performance] ${key} exceeded threshold: ${value}ms > ${thresholds.current[key as keyof PerformanceThresholds]}ms`);
    }

    if (window.__metrics) {
      window.__metrics.push({ investigationId, metric: key, value, timestamp: Date.now() });
    }
  }, [investigationId]);

  const incrementCounter = useCallback((key: 'updateConflictCount' | 'rateLimitHitCount' | 'etagHitCount') => {
    setMetrics(prev => ({ ...prev, [key]: prev[key] + 1 }));
  }, []);

  const reportMetrics = useCallback(() => {
    const current = metricsRef.current;
    console.log('[Performance Metrics]', {
      investigationId,
      metrics: current,
      timestamp: new Date().toISOString()
    });

    if (window.olorin?.monitoring) {
      window.olorin.monitoring.captureMetrics('investigation_performance', current);
    }
  }, [investigationId]);

  return {
    metrics,
    recordMetric,
    incrementCounter,
    reportMetrics
  };
}
>>>>>>> 001-modify-analyzer-method
