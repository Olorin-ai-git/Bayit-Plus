/**
 * Performance Monitor Tests
 *
 * Tests CPU profiling, latency measurement, and memory tracking
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PerformanceMonitor } from '@/lib/performance-monitor';

// Mock performance.memory
Object.defineProperty(performance, 'memory', {
  writable: true,
  value: {
    usedJSHeapSize: 10000000, // 10MB
    totalJSHeapSize: 20000000, // 20MB
    jsHeapSizeLimit: 100000000, // 100MB
  },
});

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
  });

  describe('Latency Measurement', () => {
    it('should measure latency between mark and end', async () => {
      monitor.markStart('test');

      // Wait 50ms
      await new Promise((resolve) => setTimeout(resolve, 50));

      const duration = monitor.markEnd('test');

      expect(duration).toBeGreaterThanOrEqual(50);
      expect(duration).toBeLessThan(100);
    });

    it('should return 0 for missing mark', () => {
      const duration = monitor.markEnd('nonexistent');
      expect(duration).toBe(0);
    });

    it('should record complete latency metrics', () => {
      const metrics = {
        captureToEncode: 10.5,
        encodeToSend: 15.2,
        receiveToPlay: 20.8,
        endToEnd: 46.5,
      };

      monitor.recordLatency(metrics);

      const average = monitor.getAverageLatency();
      expect(average).toEqual(metrics);
    });

    it('should calculate average latency', () => {
      monitor.recordLatency({
        captureToEncode: 10,
        encodeToSend: 15,
        receiveToPlay: 20,
        endToEnd: 45,
      });

      monitor.recordLatency({
        captureToEncode: 20,
        encodeToSend: 25,
        receiveToPlay: 30,
        endToEnd: 75,
      });

      const average = monitor.getAverageLatency();
      expect(average?.captureToEncode).toBe(15);
      expect(average?.encodeToSend).toBe(20);
      expect(average?.receiveToPlay).toBe(25);
      expect(average?.endToEnd).toBe(60);
    });

    it('should calculate P95 latency', () => {
      // Add 100 samples with increasing latency
      for (let i = 1; i <= 100; i++) {
        monitor.recordLatency({
          captureToEncode: i,
          encodeToSend: i,
          receiveToPlay: i,
          endToEnd: i,
        });
      }

      const p95 = monitor.getP95Latency();
      expect(p95?.endToEnd).toBe(95); // 95th percentile
    });

    it('should trim history to max size', () => {
      // Add 150 samples (max is 100)
      for (let i = 0; i < 150; i++) {
        monitor.recordLatency({
          captureToEncode: i,
          encodeToSend: i,
          receiveToPlay: i,
          endToEnd: i,
        });
      }

      const report = monitor.getReport();
      expect(report.latency.samples).toBe(100);
    });
  });

  describe('Memory Tracking', () => {
    it('should measure memory usage', () => {
      const memory = monitor.measureMemory();

      expect(memory).not.toBeNull();
      expect(memory?.usedJSHeapSize).toBe(10000000);
      expect(memory?.totalJSHeapSize).toBe(20000000);
      expect(memory?.jsHeapSizeLimit).toBe(100000000);
      expect(memory?.percentUsed).toBe(10);
    });

    it('should calculate average memory usage', () => {
      // Mock changing memory values
      Object.defineProperty(performance, 'memory', {
        writable: true,
        value: {
          usedJSHeapSize: 10000000,
          totalJSHeapSize: 20000000,
          jsHeapSizeLimit: 100000000,
        },
      });

      monitor.measureMemory();

      // Change memory
      Object.defineProperty(performance, 'memory', {
        writable: true,
        value: {
          usedJSHeapSize: 20000000,
          totalJSHeapSize: 40000000,
          jsHeapSizeLimit: 100000000,
        },
      });

      monitor.measureMemory();

      const average = monitor.getAverageMemory();
      expect(average?.usedJSHeapSize).toBe(15000000); // Average of 10MB and 20MB
      expect(average?.percentUsed).toBe(15); // Average of 10% and 20%
    });
  });

  describe('CPU Profiling', () => {
    it('should track AudioWorklet calls', () => {
      monitor.trackAudioWorkletCall();
      monitor.trackAudioWorkletCall();
      monitor.trackAudioWorkletCall();

      const cpu = monitor.measureCPU();
      expect(cpu.audioWorkletCpu).toBeGreaterThan(0);
      expect(cpu.totalCpu).toBeGreaterThan(0);
    });

    it('should track main thread calls', () => {
      monitor.trackMainThreadCall();
      monitor.trackMainThreadCall();

      const cpu = monitor.measureCPU();
      expect(cpu.mainThreadCpu).toBeGreaterThan(0);
      expect(cpu.totalCpu).toBeGreaterThan(0);
    });

    it('should reset call counts after measurement', () => {
      monitor.trackAudioWorkletCall();
      monitor.trackMainThreadCall();

      const cpu1 = monitor.measureCPU();
      expect(cpu1.totalCpu).toBeGreaterThan(0);

      // Measure again without new calls
      const cpu2 = monitor.measureCPU();
      expect(cpu2.totalCpu).toBe(0);
    });

    it('should calculate average CPU usage', () => {
      monitor.trackAudioWorkletCall();
      monitor.measureCPU();

      monitor.trackAudioWorkletCall();
      monitor.measureCPU();

      const average = monitor.getAverageCPU();
      expect(average).not.toBeNull();
      expect(average?.totalCpu).toBeGreaterThan(0);
    });
  });

  describe('Performance Report', () => {
    it('should generate comprehensive report', () => {
      // Add latency data
      monitor.recordLatency({
        captureToEncode: 10,
        encodeToSend: 15,
        receiveToPlay: 20,
        endToEnd: 45,
      });

      // Add memory data
      monitor.measureMemory();

      // Add CPU data
      monitor.trackAudioWorkletCall();
      monitor.measureCPU();

      const report = monitor.getReport();

      expect(report.latency.average).not.toBeNull();
      expect(report.latency.samples).toBe(1);
      expect(report.memory.average).not.toBeNull();
      expect(report.memory.samples).toBe(1);
      expect(report.cpu.average).not.toBeNull();
      expect(report.cpu.samples).toBe(1);
    });

    it('should log summary without errors', () => {
      monitor.recordLatency({
        captureToEncode: 10,
        encodeToSend: 15,
        receiveToPlay: 20,
        endToEnd: 45,
      });

      monitor.measureMemory();
      monitor.trackAudioWorkletCall();
      monitor.measureCPU();

      expect(() => monitor.logSummary()).not.toThrow();
    });
  });

  describe('Reset', () => {
    it('should reset all metrics', () => {
      // Add some data
      monitor.recordLatency({
        captureToEncode: 10,
        encodeToSend: 15,
        receiveToPlay: 20,
        endToEnd: 45,
      });

      monitor.measureMemory();
      monitor.trackAudioWorkletCall();
      monitor.measureCPU();

      // Reset
      monitor.reset();

      const report = monitor.getReport();
      expect(report.latency.samples).toBe(0);
      expect(report.memory.samples).toBe(0);
      expect(report.cpu.samples).toBe(0);
      expect(monitor.getAverageLatency()).toBeNull();
      expect(monitor.getAverageMemory()).toBeNull();
      expect(monitor.getAverageCPU()).toBeNull();
    });
  });
});
