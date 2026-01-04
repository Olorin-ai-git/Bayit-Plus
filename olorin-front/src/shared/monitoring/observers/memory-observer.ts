/**
 * Memory Usage Observer
 * Monitors JavaScript heap memory usage
 * Feature: Performance monitoring and optimization
 */

import type { MemoryMetric } from '../types/performance-types';
import { roundMetric } from '../utils/metric-helpers';

/**
 * Performance memory interface (Chrome-specific)
 */
interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

/**
 * Extended Performance interface with memory
 */
interface PerformanceWithMemory extends Performance {
  memory?: PerformanceMemory;
}

/**
 * Get current memory usage
 */
export function getMemoryUsage(): MemoryMetric | null {
  const performance = window.performance as PerformanceWithMemory;

  if (!performance.memory) {
    return null;
  }

  return {
    usedJSHeapSize: roundMetric(performance.memory.usedJSHeapSize),
    totalJSHeapSize: roundMetric(performance.memory.totalJSHeapSize),
    jsHeapSizeLimit: roundMetric(performance.memory.jsHeapSizeLimit),
    timestamp: Date.now(),
  };
}

/**
 * Observe memory usage at regular intervals
 */
export function observeMemoryUsage(
  callback: (metric: MemoryMetric) => void,
  intervalMs: number
): () => void {
  const interval = setInterval(() => {
    const memory = getMemoryUsage();
    if (memory) {
      callback(memory);
    }
  }, intervalMs);

  // Return cleanup function
  return () => {
    clearInterval(interval);
  };
}

/**
 * Calculate memory usage percentage
 */
export function getMemoryUsagePercentage(memory: MemoryMetric): number {
  if (memory.jsHeapSizeLimit === 0) return 0;
  return roundMetric((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100);
}

/**
 * Check if memory is high (above threshold)
 */
export function isMemoryHigh(memory: MemoryMetric, thresholdPercent: number): boolean {
  return getMemoryUsagePercentage(memory) > thresholdPercent;
}

/**
 * Check if memory monitoring is supported
 */
export function isMemoryMonitoringSupported(): boolean {
  const performance = window.performance as PerformanceWithMemory;
  return !!(performance && performance.memory);
}

/**
 * Get memory pressure level
 */
export function getMemoryPressure(memory: MemoryMetric): 'low' | 'medium' | 'high' | 'critical' {
  const percentage = getMemoryUsagePercentage(memory);

  if (percentage < 50) return 'low';
  if (percentage < 70) return 'medium';
  if (percentage < 90) return 'high';
  return 'critical';
}
