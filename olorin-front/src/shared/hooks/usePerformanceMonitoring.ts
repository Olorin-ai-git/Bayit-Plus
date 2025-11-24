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
