/**
 * Performance E2E Tests
 * Comprehensive performance testing across all microservices
 * Tests Core Web Vitals, loading performance, and resource optimization
 */

import { test, expect, Page } from '@playwright/test';
import { PerformanceTestEngine, PerformanceTestResult } from './performance-test-engine';
import { E2ETestEnvironment, serviceEndpoints } from '../e2e/e2e-setup';

test.describe('Performance Testing', () => {
  let testEnv: E2ETestEnvironment;
  let performanceEngine: PerformanceTestEngine;
  let page: Page;
  let allResults: PerformanceTestResult[] = [];

  test.beforeAll(async ({ browser }) => {
    testEnv = new E2ETestEnvironment();
    await testEnv.initialize();
    page = await testEnv.getPage();

    performanceEngine = new PerformanceTestEngine();
    await performanceEngine.initialize(browser);
  });

  test.afterAll(async () => {
    // Generate comprehensive performance report
    if (allResults.length > 0) {
      const reportHtml = performanceEngine.generatePerformanceReport(allResults);
      const fs = require('fs');
      const path = require('path');

      const reportDir = path.join(process.cwd(), 'test-results', 'performance');
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }

      fs.writeFileSync(
        path.join(reportDir, 'performance-report.html'),
        reportHtml
      );

      console.log(`📊 Performance report generated: ${path.join(reportDir, 'performance-report.html')}`);
    }

    await performanceEngine.cleanup();
    await testEnv.cleanup();
  });

  test('should meet Core Web Vitals thresholds for all critical services', async () => {
    const criticalServices = [
      { name: 'core-ui', url: 'http://localhost:3000/' },
      { name: 'autonomous-investigation', url: 'http://localhost:3001/autonomous-investigation' },
      { name: 'manual-investigation', url: 'http://localhost:3002/manual-investigation' }
    ];

    for (const service of criticalServices) {
      await test.step(`Test Core Web Vitals for ${service.name}`, async () => {
        const result = await performanceEngine.testServicePerformance(
          service.name,
          service.url,
          { networkCondition: 'fast', deviceType: 'desktop', includeBundle: false }
        );

        allResults.push(result);

        // Core Web Vitals assertions
        expect(result.metrics.firstContentfulPaint,
          `FCP should be under 1.8s for ${service.name}`
        ).toBeLessThan(1800);

        expect(result.metrics.largestContentfulPaint,
          `LCP should be under 2.5s for ${service.name}`
        ).toBeLessThan(2500);

        expect(result.metrics.firstInputDelay,
          `FID should be under 100ms for ${service.name}`
        ).toBeLessThan(100);

        expect(result.metrics.cumulativeLayoutShift,
          `CLS should be under 0.1 for ${service.name}`
        ).toBeLessThan(0.1);

        // Overall performance score should be good
        expect(result.overallScore,
          `Overall performance score should be at least 80 for ${service.name}`
        ).toBeGreaterThanOrEqual(80);
      });
    }
  });

  test('should perform well on mobile devices', async () => {
    const mobileServices = [
      { name: 'core-ui', url: 'http://localhost:3000/' },
      { name: 'autonomous-investigation', url: 'http://localhost:3001/autonomous-investigation' }
    ];

    for (const service of mobileServices) {
      await test.step(`Test mobile performance for ${service.name}`, async () => {
        const result = await performanceEngine.testServicePerformance(
          service.name,
          service.url,
          { networkCondition: 'slow', deviceType: 'mobile', includeBundle: false }
        );

        allResults.push(result);

        // Mobile-specific thresholds (more lenient)
        expect(result.metrics.firstContentfulPaint,
          `Mobile FCP should be under 2.5s for ${service.name}`
        ).toBeLessThan(2500);

        expect(result.metrics.largestContentfulPaint,
          `Mobile LCP should be under 4s for ${service.name}`
        ).toBeLessThan(4000);

        expect(result.metrics.firstInputDelay,
          `Mobile FID should be under 300ms for ${service.name}`
        ).toBeLessThan(300);

        // Should handle mobile viewports
        expect(result.viewport.width).toBe(375);
        expect(result.viewport.height).toBe(667);
      });
    }
  });

  test('should handle slow network conditions gracefully', async () => {
    const networkTestServices = [
      { name: 'core-ui', url: 'http://localhost:3000/' },
      { name: 'autonomous-investigation', url: 'http://localhost:3001/autonomous-investigation' }
    ];

    for (const service of networkTestServices) {
      await test.step(`Test slow network performance for ${service.name}`, async () => {
        const result = await performanceEngine.testServicePerformance(
          service.name,
          service.url,
          { networkCondition: 'slow', deviceType: 'desktop', includeBundle: false }
        );

        allResults.push(result);

        // Slow network thresholds
        expect(result.metrics.firstContentfulPaint,
          `Slow network FCP should be under 3s for ${service.name}`
        ).toBeLessThan(3000);

        expect(result.metrics.largestContentfulPaint,
          `Slow network LCP should be under 5s for ${service.name}`
        ).toBeLessThan(5000);

        // Resource loading should be efficient
        expect(result.metrics.requestCount,
          `Request count should be reasonable for ${service.name}`
        ).toBeLessThan(50);

        expect(result.metrics.failedRequestCount,
          `Failed requests should be minimal for ${service.name}`
        ).toBeLessThan(2);
      });
    }
  });

  test('should optimize bundle sizes and resource loading', async () => {
    const bundleTestServices = [
      { name: 'core-ui', url: 'http://localhost:3000/' },
      { name: 'autonomous-investigation', url: 'http://localhost:3001/autonomous-investigation' },
      { name: 'manual-investigation', url: 'http://localhost:3002/manual-investigation' }
    ];

    for (const service of bundleTestServices) {
      await test.step(`Test bundle optimization for ${service.name}`, async () => {
        const result = await performanceEngine.testServicePerformance(
          service.name,
          service.url,
          { networkCondition: 'fast', deviceType: 'desktop', includeBundle: true }
        );

        allResults.push(result);

        if (result.bundleAnalysis) {
          // Bundle size thresholds
          expect(result.bundleAnalysis.totalSize,
            `Total bundle size should be under 2MB for ${service.name}`
          ).toBeLessThan(2000000);

          expect(result.bundleAnalysis.mainChunkSize,
            `Main chunk should be under 1MB for ${service.name}`
          ).toBeLessThan(1000000);

          // Module efficiency
          expect(result.bundleAnalysis.chunkCount,
            `Should have reasonable chunk count for ${service.name}`
          ).toBeGreaterThan(1); // Code splitting should be in place

          // Check for optimization opportunities
          if (result.bundleAnalysis.optimizationOpportunities.length > 0) {
            console.warn(`Performance opportunities for ${service.name}:`,
              result.bundleAnalysis.optimizationOpportunities.map(op => op.description)
            );
          }
        }

        // Resource loading efficiency
        expect(result.metrics.totalResourceSize,
          `Total resource size should be under 5MB for ${service.name}`
        ).toBeLessThan(5000000);

        expect(result.metrics.javascriptSize,
          `JavaScript size should be under 1.5MB for ${service.name}`
        ).toBeLessThan(1500000);
      });
    }
  });

  test('should maintain good memory usage', async () => {
    const memoryTestServices = [
      { name: 'agent-analytics', url: 'http://localhost:3003/agent-analytics' },
      { name: 'visualization', url: 'http://localhost:3005/visualization' }
    ];

    for (const service of memoryTestServices) {
      await test.step(`Test memory usage for ${service.name}`, async () => {
        const result = await performanceEngine.testServicePerformance(
          service.name,
          service.url,
          { networkCondition: 'fast', deviceType: 'desktop', includeBundle: false }
        );

        allResults.push(result);

        // Memory usage thresholds
        if (result.metrics.usedHeapSize > 0) {
          expect(result.metrics.usedHeapSize,
            `Used heap size should be under 100MB for ${service.name}`
          ).toBeLessThan(100000000);

          // Memory efficiency
          const memoryEfficiency = result.metrics.usedHeapSize / result.metrics.totalHeapSize;
          expect(memoryEfficiency,
            `Memory efficiency should be reasonable for ${service.name}`
          ).toBeLessThan(0.8);
        }
      });
    }
  });

  test('should handle concurrent user loads', async () => {
    await test.step('Test concurrent access to core services', async () => {
      const concurrentServices = [
        { name: 'core-ui', url: 'http://localhost:3000/' },
        { name: 'autonomous-investigation', url: 'http://localhost:3001/autonomous-investigation' },
        { name: 'manual-investigation', url: 'http://localhost:3002/manual-investigation' }
      ];

      // Test multiple services concurrently
      const concurrentResults = await performanceEngine.testMultipleServices(
        concurrentServices,
        {
          networkConditions: ['fast'],
          deviceTypes: ['desktop'],
          includeBundle: false,
          includeLighthouse: false
        }
      );

      allResults.push(...concurrentResults);

      // All services should maintain good performance under concurrent load
      concurrentResults.forEach(result => {
        expect(result.overallScore,
          `${result.serviceName} should maintain good performance under concurrent load`
        ).toBeGreaterThanOrEqual(75);

        expect(result.metrics.firstContentfulPaint,
          `${result.serviceName} FCP should remain reasonable under load`
        ).toBeLessThan(2500);
      });
    });
  });

  test('should validate performance budgets', async () => {
    const budgetTestServices = [
      { name: 'core-ui', url: 'http://localhost:3000/' },
      { name: 'autonomous-investigation', url: 'http://localhost:3001/autonomous-investigation' }
    ];

    // Define performance budgets
    const performanceBudgets = {
      'core-ui': {
        fcp: 1500,    // 1.5s
        lcp: 2000,    // 2s
        fid: 80,      // 80ms
        cls: 0.08,    // 0.08
        totalSize: 1800000  // 1.8MB
      },
      'autonomous-investigation': {
        fcp: 1800,    // 1.8s
        lcp: 2500,    // 2.5s
        fid: 100,     // 100ms
        cls: 0.1,     // 0.1
        totalSize: 2000000  // 2MB
      }
    };

    for (const service of budgetTestServices) {
      await test.step(`Validate performance budget for ${service.name}`, async () => {
        const result = await performanceEngine.testServicePerformance(
          service.name,
          service.url,
          { networkCondition: 'fast', deviceType: 'desktop', includeBundle: true }
        );

        allResults.push(result);

        const budget = performanceBudgets[service.name as keyof typeof performanceBudgets];

        // Check Core Web Vitals against budget
        expect(result.metrics.firstContentfulPaint).toBeLessThanOrEqual(budget.fcp);
        expect(result.metrics.largestContentfulPaint).toBeLessThanOrEqual(budget.lcp);
        expect(result.metrics.firstInputDelay).toBeLessThanOrEqual(budget.fid);
        expect(result.metrics.cumulativeLayoutShift).toBeLessThanOrEqual(budget.cls);

        // Check resource size against budget
        expect(result.metrics.totalResourceSize).toBeLessThanOrEqual(budget.totalSize);

        // Generate budget compliance report
        const budgetViolations = [];
        if (result.metrics.firstContentfulPaint > budget.fcp) {
          budgetViolations.push(`FCP: ${result.metrics.firstContentfulPaint}ms > ${budget.fcp}ms`);
        }
        if (result.metrics.largestContentfulPaint > budget.lcp) {
          budgetViolations.push(`LCP: ${result.metrics.largestContentfulPaint}ms > ${budget.lcp}ms`);
        }
        if (result.metrics.firstInputDelay > budget.fid) {
          budgetViolations.push(`FID: ${result.metrics.firstInputDelay}ms > ${budget.fid}ms`);
        }
        if (result.metrics.cumulativeLayoutShift > budget.cls) {
          budgetViolations.push(`CLS: ${result.metrics.cumulativeLayoutShift} > ${budget.cls}`);
        }
        if (result.metrics.totalResourceSize > budget.totalSize) {
          budgetViolations.push(`Size: ${Math.round(result.metrics.totalResourceSize/1024)}KB > ${Math.round(budget.totalSize/1024)}KB`);
        }

        if (budgetViolations.length > 0) {
          console.warn(`Performance budget violations for ${service.name}:`, budgetViolations);
        }

        expect(budgetViolations.length,
          `${service.name} should meet all performance budget requirements`
        ).toBe(0);
      });
    }
  });

  test('should track performance regression', async () => {
    await test.step('Compare performance against baseline', async () => {
      const baselineServices = [
        { name: 'core-ui', url: 'http://localhost:3000/' }
      ];

      // This would typically compare against stored baseline data
      // For this test, we'll ensure performance meets minimum standards
      for (const service of baselineServices) {
        const result = await performanceEngine.testServicePerformance(
          service.name,
          service.url,
          { networkCondition: 'fast', deviceType: 'desktop', includeBundle: true }
        );

        allResults.push(result);

        // Regression detection thresholds
        const regressionThresholds = {
          fcp: 2000,    // Max acceptable FCP
          lcp: 3000,    // Max acceptable LCP
          fid: 150,     // Max acceptable FID
          cls: 0.15,    // Max acceptable CLS
          overallScore: 70  // Min acceptable overall score
        };

        expect(result.metrics.firstContentfulPaint).toBeLessThan(regressionThresholds.fcp);
        expect(result.metrics.largestContentfulPaint).toBeLessThan(regressionThresholds.lcp);
        expect(result.metrics.firstInputDelay).toBeLessThan(regressionThresholds.fid);
        expect(result.metrics.cumulativeLayoutShift).toBeLessThan(regressionThresholds.cls);
        expect(result.overallScore).toBeGreaterThanOrEqual(regressionThresholds.overallScore);

        // Log performance summary
        console.log(`Performance Summary for ${service.name}:`, {
          score: result.overallScore,
          fcp: Math.round(result.metrics.firstContentfulPaint),
          lcp: Math.round(result.metrics.largestContentfulPaint),
          fid: Math.round(result.metrics.firstInputDelay),
          cls: result.metrics.cumulativeLayoutShift.toFixed(3),
          recommendations: result.recommendations.length
        });
      }
    });
  });
});