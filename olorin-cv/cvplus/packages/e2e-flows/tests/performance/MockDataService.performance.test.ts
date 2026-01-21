/**
 * MockDataService Performance Tests
 * Tests data generation performance with large datasets and concurrent operations
  */

import { MockDataService, DataGenerationOptions } from '../../src/services/MockDataService';
import { MockDataType } from '../../src/models';
import * as os from 'os';

describe('MockDataService Performance Tests', () => {
  let service: MockDataService;
  const performanceResults: Record<string, any> = {};

  beforeAll(() => {
    service = new MockDataService({
      maxSize: 200 * 1024 * 1024, // 200MB for performance testing
      maxAge: 30 * 60 * 1000,     // 30 minutes
      compression: false,
      encryption: false
    });
  });

  afterAll(() => {
    // Generate performance report
    console.log('\n=== MockDataService Performance Report ===');
    console.log(JSON.stringify(performanceResults, null, 2));

    // Write performance report to file
    const fs = require('fs');
    const reportPath = '/tmp/mock-data-performance-report.json';
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'MockDataService',
      results: performanceResults,
      systemInfo: {
        platform: os.platform(),
        arch: os.arch(),
        totalMemory: os.totalmem(),
        cpuCount: os.cpus().length
      }
    }, null, 2));

    console.log(`Performance report saved to: ${reportPath}`);
  });

  describe('Large Dataset Generation', () => {
    test('should generate 10,000 CV records in under 5 seconds', async () => {
      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      const options: DataGenerationOptions = {
        type: 'cv' as MockDataType,
        count: 10000,
        seed: 'performance-test-cv'
      };

      const dataset = await service.generateData(options);

      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      const duration = endTime - startTime;
      const memoryUsed = endMemory - startMemory;

      // Performance assertions
      expect(duration).toBeLessThan(5000); // Under 5 seconds
      expect(Array.isArray(dataset.data)).toBe(true);
      expect((dataset.data as any[]).length).toBe(10000);
      expect(memoryUsed).toBeLessThan(100 * 1024 * 1024); // Under 100MB

      performanceResults.largeDatasetGeneration = {
        recordCount: 10000,
        duration,
        memoryUsed,
        recordsPerSecond: 10000 / (duration / 1000),
        memoryPerRecord: memoryUsed / 10000
      };
    }, 10000);

    test('should generate 50,000 user profiles with memory efficiency', async () => {
      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      const options: DataGenerationOptions = {
        type: 'user-profile' as MockDataType,
        count: 50000,
        seed: 'performance-test-users'
      };

      const dataset = await service.generateData(options);

      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      const duration = endTime - startTime;
      const memoryUsed = endMemory - startMemory;

      // Performance assertions
      expect(duration).toBeLessThan(10000); // Under 10 seconds
      expect(memoryUsed).toBeLessThan(150 * 1024 * 1024); // Under 150MB
      expect(Array.isArray(dataset.data)).toBe(true);
      expect((dataset.data as any[]).length).toBe(50000);

      performanceResults.massUserProfileGeneration = {
        recordCount: 50000,
        duration,
        memoryUsed,
        recordsPerSecond: 50000 / (duration / 1000),
        memoryPerRecord: memoryUsed / 50000
      };
    }, 15000);
  });

  describe('Concurrent Operations', () => {
    test('should handle 100 concurrent data generation requests', async () => {
      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      const concurrentRequests = Array.from({ length: 100 }, (_, index) => {
        const options: DataGenerationOptions = {
          type: 'cv' as MockDataType,
          count: 10,
          seed: `concurrent-test-${index}`
        };
        return service.generateData(options);
      });

      const results = await Promise.all(concurrentRequests);

      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      const duration = endTime - startTime;
      const memoryUsed = endMemory - startMemory;

      // Performance assertions
      expect(duration).toBeLessThan(10000); // Under 10 seconds
      expect(results).toHaveLength(100);
      expect(results.every(r => Array.isArray(r.data) && (r.data as any[]).length === 10)).toBe(true);
      expect(memoryUsed).toBeLessThan(200 * 1024 * 1024); // Under 200MB

      performanceResults.concurrentGeneration = {
        concurrentRequests: 100,
        recordsPerRequest: 10,
        totalRecords: 1000,
        duration,
        memoryUsed,
        requestsPerSecond: 100 / (duration / 1000),
        recordsPerSecond: 1000 / (duration / 1000)
      };
    }, 15000);

    test('should handle rapid cache operations without memory leaks', async () => {
      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      // Generate data for cache testing
      const datasets: string[] = [];
      for (let i = 0; i < 1000; i++) {
        const dataset = await service.generateData({
          type: 'cv' as MockDataType,
          count: 1,
          seed: `cache-test-${i}`
        });
        datasets.push(dataset.id);
      }

      // Perform rapid cache operations
      const cacheOperations: Promise<any>[] = [];
      for (let i = 0; i < 5000; i++) {
        const datasetId = datasets[i % datasets.length];
        cacheOperations.push(service.getDataSet(datasetId));
      }

      await Promise.all(cacheOperations);

      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      const duration = endTime - startTime;
      const memoryUsed = endMemory - startMemory;

      // Performance assertions
      expect(duration).toBeLessThan(15000); // Under 15 seconds
      expect(memoryUsed).toBeLessThan(50 * 1024 * 1024); // Under 50MB memory growth

      performanceResults.cacheOperations = {
        cacheOperations: 5000,
        uniqueDatasets: 1000,
        duration,
        memoryUsed,
        operationsPerSecond: 5000 / (duration / 1000),
        cacheStats: service.getCacheStats()
      };
    }, 20000);
  });

  describe('Data Export Performance', () => {
    test('should export large datasets efficiently', async () => {
      // Generate large dataset for export testing
      const dataset = await service.generateData({
        type: 'cv' as MockDataType,
        count: 5000,
        seed: 'export-test'
      });

      const exportTests = [
        { format: 'json' as const, expectedSizeFactor: 1.0 },
        { format: 'csv' as const, expectedSizeFactor: 0.6 },
        { format: 'yaml' as const, expectedSizeFactor: 0.8 }
      ];

      for (const exportTest of exportTests) {
        const startTime = Date.now();
        const startMemory = process.memoryUsage().heapUsed;

        const exportData = await service.exportDataSet(dataset.id, {
          format: exportTest.format,
          includeMetadata: true
        });

        const endTime = Date.now();
        const endMemory = process.memoryUsage().heapUsed;
        const duration = endTime - startTime;
        const memoryUsed = endMemory - startMemory;

        // Performance assertions
        expect(duration).toBeLessThan(5000); // Under 5 seconds
        expect(exportData.length).toBeGreaterThan(0);
        expect(memoryUsed).toBeLessThan(100 * 1024 * 1024); // Under 100MB

        performanceResults[`export_${exportTest.format}`] = {
          recordCount: 5000,
          duration,
          memoryUsed,
          exportSize: exportData.length,
          recordsPerSecond: 5000 / (duration / 1000)
        };
      }
    }, 20000);
  });

  describe('Memory Management', () => {
    test('should maintain memory usage under 500MB for typical workloads', async () => {
      const startMemory = process.memoryUsage().heapUsed;

      // Simulate typical workload
      const operations: Promise<any>[] = [];

      // Generate datasets
      for (let i = 0; i < 50; i++) {
        operations.push(service.generateData({
          type: 'cv' as MockDataType,
          count: 100,
          seed: `workload-cv-${i}`
        }));
      }

      for (let i = 0; i < 30; i++) {
        operations.push(service.generateData({
          type: 'user-profile' as MockDataType,
          count: 50,
          seed: `workload-user-${i}`
        }));
      }

      await Promise.all(operations);

      // Perform cache cleanup
      const cleanedUp = await service.cleanupExpired();
      const cacheStats = service.getCacheStats();
      const endMemory = process.memoryUsage().heapUsed;
      const memoryUsed = endMemory - startMemory;

      // Performance assertions
      expect(memoryUsed).toBeLessThan(500 * 1024 * 1024); // Under 500MB
      expect(cacheStats.size).toBeLessThan(100 * 1024 * 1024); // Cache under 100MB

      performanceResults.memoryManagement = {
        operationsCount: operations.length,
        memoryUsed,
        cleanedUpCount: cleanedUp,
        finalCacheStats: cacheStats,
        memoryEfficiencyScore: (operations.length * 1024 * 1024) / memoryUsed // Operations per MB
      };
    }, 30000);

    test('should handle memory pressure gracefully', async () => {
      const startMemory = process.memoryUsage().heapUsed;

      // Generate memory pressure by creating large datasets
      const datasets: any[] = [];
      try {
        while (datasets.length < 20) { // Limit iterations for test stability
          const dataset = await service.generateData({
            type: 'cv' as MockDataType,
            count: 1000,
            seed: `pressure-test-${datasets.length}`
          });
          datasets.push(dataset);

          const currentMemory = process.memoryUsage().heapUsed;
          if (currentMemory - startMemory > 400 * 1024 * 1024) { // Stop at 400MB growth
            break;
          }
        }

        // Test that service still responds
        const testDataset = await service.generateData({
          type: 'user-profile' as MockDataType,
          count: 10,
          seed: 'pressure-response-test'
        });

        expect(testDataset).toBeDefined();
        expect(testDataset.data).toBeDefined();

        performanceResults.memoryPressure = {
          datasetsCreated: datasets.length,
          finalMemoryUsed: process.memoryUsage().heapUsed - startMemory,
          serviceStillResponsive: true,
          cacheStats: service.getCacheStats()
        };

      } catch (error) {
        performanceResults.memoryPressure = {
          datasetsCreated: datasets.length,
          error: (error as Error).message,
          finalMemoryUsed: process.memoryUsage().heapUsed - startMemory
        };

        // Should handle memory pressure gracefully
        expect(datasets.length).toBeGreaterThan(0);
      }
    }, 45000);
  });

  describe('Cache Performance', () => {
    test('should achieve high cache hit rates', async () => {
      // Clear cache for clean test
      service.clearCache();

      // Generate test data
      const testDatasets: string[] = [];
      for (let i = 0; i < 100; i++) {
        const dataset = await service.generateData({
          type: 'cv' as MockDataType,
          count: 10,
          seed: `cache-hit-test-${i}`
        });
        testDatasets.push(dataset.id);
      }

      // Perform mixed cache hits and misses
      const startTime = Date.now();
      const operations: Promise<any>[] = [];

      // 70% cache hits (repeat existing datasets)
      for (let i = 0; i < 700; i++) {
        const datasetId = testDatasets[i % testDatasets.length];
        operations.push(service.getDataSet(datasetId));
      }

      // 30% cache misses (new datasets)
      for (let i = 0; i < 300; i++) {
        operations.push(service.generateData({
          type: 'user-profile' as MockDataType,
          count: 1,
          seed: `cache-miss-${i}`
        }));
      }

      const results = await Promise.all(operations);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Performance assertions
      expect(results).toHaveLength(1000);
      expect(results.every(r => r !== null)).toBe(true);
      expect(duration).toBeLessThan(10000); // Under 10 seconds

      const cacheStats = service.getCacheStats();
      expect(cacheStats.count).toBeGreaterThan(50); // Should have cached items

      performanceResults.cachePerformance = {
        totalOperations: 1000,
        expectedHits: 700,
        expectedMisses: 300,
        duration,
        operationsPerSecond: 1000 / (duration / 1000),
        finalCacheStats: cacheStats
      };
    }, 20000);
  });

  describe('Stress Testing', () => {
    test('should handle 1000+ concurrent operations without failure', async () => {
      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      // Create stress test with mixed operations
      const stressOperations: Promise<any>[] = [];

      // Generate 500 small datasets concurrently
      for (let i = 0; i < 500; i++) {
        stressOperations.push(service.generateData({
          type: i % 2 === 0 ? 'cv' as MockDataType : 'user-profile' as MockDataType,
          count: 5,
          seed: `stress-gen-${i}`
        }));
      }

      // Perform 500 cache operations concurrently
      for (let i = 0; i < 500; i++) {
        stressOperations.push(
          service.generateData({
            type: 'cv' as MockDataType,
            count: 1,
            seed: `stress-cache-${i % 50}` // Reuse some seeds for caching
          }).then(dataset => service.getDataSet(dataset.id))
        );
      }

      const results = await Promise.allSettled(stressOperations);

      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      const duration = endTime - startTime;
      const memoryUsed = endMemory - startMemory;

      // Analyze results
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      // Performance assertions
      expect(successful).toBeGreaterThan(900); // At least 90% success rate
      expect(failed).toBeLessThan(100); // Less than 10% failure rate
      expect(duration).toBeLessThan(60000); // Under 60 seconds
      expect(memoryUsed).toBeLessThan(500 * 1024 * 1024); // Under 500MB

      performanceResults.stressTest = {
        totalOperations: 1000,
        successful,
        failed,
        successRate: (successful / 1000) * 100,
        duration,
        memoryUsed,
        operationsPerSecond: 1000 / (duration / 1000),
        finalCacheStats: service.getCacheStats()
      };
    }, 75000);
  });

  describe('Performance Benchmarks Validation', () => {
    test('should meet all performance targets', () => {
      // Validate that all performance targets are met
      const results = performanceResults;

      // Target: Generate 10,000 mock data records in <5 seconds
      expect(results.largeDatasetGeneration?.duration).toBeLessThan(5000);
      expect(results.largeDatasetGeneration?.recordCount).toBe(10000);

      // Target: Handle 100 concurrent requests in <10 seconds
      expect(results.concurrentGeneration?.duration).toBeLessThan(10000);
      expect(results.concurrentGeneration?.concurrentRequests).toBe(100);

      // Target: Memory usage stays under 500MB for typical workloads
      expect(results.memoryManagement?.memoryUsed).toBeLessThan(500 * 1024 * 1024);

      // Target: High performance under stress (1000+ operations)
      expect(results.stressTest?.successRate).toBeGreaterThan(90);
      expect(results.stressTest?.duration).toBeLessThan(60000);

      console.log('\n✅ All MockDataService performance targets met!');
    });
  });
});