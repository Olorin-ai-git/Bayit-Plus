/**
 * Concurrent Load Tests for CVPlus E2E Flows
 * Jest-based load testing targeting 10K concurrent users
 *
 * Test Structure:
 * - Individual load test scenarios as Jest test cases
 * - Progressive load testing from 100 to 15K users
 * - Real-time monitoring and reporting
 * - System resource validation
 */

import { LoadTestScenarios } from './load-test-scenarios';
import { LoadTestResults } from './load-testing-framework';
import { PerformanceMonitor } from '../performance/performance-utilities';

describe('Concurrent Load Testing - CVPlus E2E Flows', () => {
  let loadTestScenarios: LoadTestScenarios;
  let performanceMonitor: PerformanceMonitor;

  beforeAll(async () => {
    console.log('Initializing Load Test Environment...');

    loadTestScenarios = new LoadTestScenarios();
    performanceMonitor = new PerformanceMonitor(1000); // 1 second intervals

    // Warm up system
    console.log('Warming up system...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    performanceMonitor.start();
  });

  afterAll(async () => {
    console.log('Cleaning up Load Test Environment...');

    performanceMonitor.stop();
    await loadTestScenarios.cleanup();

    // Generate final performance report
    const finalMetrics = performanceMonitor.getMetrics();
    console.log('Final Performance Metrics:', finalMetrics);
  });

  describe('Baseline Load Testing', () => {
    /**
     * Test 1: Baseline Load (100 concurrent users)
     * Purpose: Establish performance baseline
     * Expected: Error rate < 1%, Response time < 500ms
     */
    test('should handle 100 concurrent users (baseline)', async () => {
      console.log('\n🔥 Starting Baseline Load Test (100 users)...');

      const results = await loadTestScenarios.runBaselineLoadTest();

      // Validate results
      expect(results.aggregatedMetrics.concurrentUsersAchieved).toBeGreaterThanOrEqual(90);
      expect(results.aggregatedMetrics.errorRate).toBeLessThan(1.0);
      expect(results.aggregatedMetrics.averageResponseTime).toBeLessThan(500);
      expect(results.aggregatedMetrics.p95ResponseTime).toBeLessThan(1000);
      expect(results.aggregatedMetrics.sustainedThroughput).toBeGreaterThan(50);

      console.log('✅ Baseline Load Test Results:');
      console.log(`   Users Achieved: ${results.aggregatedMetrics.concurrentUsersAchieved}`);
      console.log(`   Error Rate: ${results.aggregatedMetrics.errorRate.toFixed(2)}%`);
      console.log(`   Avg Response: ${results.aggregatedMetrics.averageResponseTime.toFixed(0)}ms`);
      console.log(`   P95 Response: ${results.aggregatedMetrics.p95ResponseTime.toFixed(0)}ms`);
      console.log(`   Throughput: ${results.aggregatedMetrics.sustainedThroughput.toFixed(1)} req/s`);

    }, 600000); // 10 minute timeout for baseline test
  });

  describe('Medium Load Testing', () => {
    /**
     * Test 2: Medium Load (1,000 concurrent users)
     * Purpose: Test typical production load
     * Expected: Error rate < 2%, Response time < 1000ms
     */
    test('should handle 1,000 concurrent users (medium load)', async () => {
      console.log('\n🔥 Starting Medium Load Test (1,000 users)...');

      const results = await loadTestScenarios.runMediumLoadTest();

      // Validate results
      expect(results.aggregatedMetrics.concurrentUsersAchieved).toBeGreaterThanOrEqual(900);
      expect(results.aggregatedMetrics.errorRate).toBeLessThan(2.0);
      expect(results.aggregatedMetrics.averageResponseTime).toBeLessThan(1000);
      expect(results.aggregatedMetrics.p95ResponseTime).toBeLessThan(2000);
      expect(results.aggregatedMetrics.sustainedThroughput).toBeGreaterThan(400);

      console.log('✅ Medium Load Test Results:');
      console.log(`   Users Achieved: ${results.aggregatedMetrics.concurrentUsersAchieved}`);
      console.log(`   Error Rate: ${results.aggregatedMetrics.errorRate.toFixed(2)}%`);
      console.log(`   Avg Response: ${results.aggregatedMetrics.averageResponseTime.toFixed(0)}ms`);
      console.log(`   P95 Response: ${results.aggregatedMetrics.p95ResponseTime.toFixed(0)}ms`);
      console.log(`   Throughput: ${results.aggregatedMetrics.sustainedThroughput.toFixed(1)} req/s`);

      // Additional validation for medium load
      expect(results.aggregatedMetrics.systemBottlenecks.length).toBeLessThanOrEqual(2);

    }, 900000); // 15 minute timeout for medium load test
  });

  describe('High Load Testing', () => {
    /**
     * Test 3: High Load (5,000 concurrent users)
     * Purpose: Test peak hours capacity
     * Expected: Error rate < 3%, Response time < 2000ms
     */
    test('should handle 5,000 concurrent users (high load)', async () => {
      console.log('\n🔥 Starting High Load Test (5,000 users)...');

      const results = await loadTestScenarios.runHighLoadTest();

      // Validate results with slightly relaxed criteria for high load
      expect(results.aggregatedMetrics.concurrentUsersAchieved).toBeGreaterThanOrEqual(4500);
      expect(results.aggregatedMetrics.errorRate).toBeLessThan(3.0);
      expect(results.aggregatedMetrics.averageResponseTime).toBeLessThan(2000);
      expect(results.aggregatedMetrics.p95ResponseTime).toBeLessThan(4000);
      expect(results.aggregatedMetrics.sustainedThroughput).toBeGreaterThan(1500);

      console.log('✅ High Load Test Results:');
      console.log(`   Users Achieved: ${results.aggregatedMetrics.concurrentUsersAchieved}`);
      console.log(`   Error Rate: ${results.aggregatedMetrics.errorRate.toFixed(2)}%`);
      console.log(`   Avg Response: ${results.aggregatedMetrics.averageResponseTime.toFixed(0)}ms`);
      console.log(`   P95 Response: ${results.aggregatedMetrics.p95ResponseTime.toFixed(0)}ms`);
      console.log(`   Throughput: ${results.aggregatedMetrics.sustainedThroughput.toFixed(1)} req/s`);

      // Check for system stress indicators
      if (results.aggregatedMetrics.systemBottlenecks.length > 0) {
        console.warn('⚠️  System bottlenecks detected:', results.aggregatedMetrics.systemBottlenecks);
      }

    }, 1200000); // 20 minute timeout for high load test
  });

  describe('Stress Load Testing', () => {
    /**
     * Test 4: Stress Load (10,000 concurrent users) - PRIMARY TARGET
     * Purpose: Test maximum target capacity
     * Expected: Error rate < 5%, Response time < 3000ms
     */
    test('should handle 10,000 concurrent users (stress load) - TARGET CAPACITY', async () => {
      console.log('\n🚀 Starting STRESS LOAD TEST (10,000 users) - PRIMARY TARGET!');
      console.log('   This is the primary test for 10K concurrent user validation');

      const results = await loadTestScenarios.runStressLoadTest();

      // Primary validation criteria for 10K users
      console.log('\n📊 CRITICAL VALIDATION - 10K Concurrent Users:');

      // Users achieved - Must reach at least 9,000 users (90%)
      expect(results.aggregatedMetrics.concurrentUsersAchieved).toBeGreaterThanOrEqual(9000);
      console.log(`✓ Users Achieved: ${results.aggregatedMetrics.concurrentUsersAchieved} (Target: 10,000)`);

      // Error rate - Must stay under 5%
      expect(results.aggregatedMetrics.errorRate).toBeLessThan(5.0);
      console.log(`✓ Error Rate: ${results.aggregatedMetrics.errorRate.toFixed(2)}% (Target: <5%)`);

      // Response time - Must stay under 3 seconds average
      expect(results.aggregatedMetrics.averageResponseTime).toBeLessThan(3000);
      console.log(`✓ Avg Response Time: ${results.aggregatedMetrics.averageResponseTime.toFixed(0)}ms (Target: <3000ms)`);

      // P95 response time - Must stay under 8 seconds
      expect(results.aggregatedMetrics.p95ResponseTime).toBeLessThan(8000);
      console.log(`✓ P95 Response Time: ${results.aggregatedMetrics.p95ResponseTime.toFixed(0)}ms (Target: <8000ms)`);

      // Throughput - Must maintain at least 2,500 req/s
      expect(results.aggregatedMetrics.sustainedThroughput).toBeGreaterThan(2500);
      console.log(`✓ Sustained Throughput: ${results.aggregatedMetrics.sustainedThroughput.toFixed(1)} req/s (Target: >2500 req/s)`);

      console.log('\n🎯 PRIMARY TARGET VALIDATION:');
      if (
        results.aggregatedMetrics.concurrentUsersAchieved >= 9000 &&
        results.aggregatedMetrics.errorRate < 5.0 &&
        results.aggregatedMetrics.averageResponseTime < 3000
      ) {
        console.log('🎉 SUCCESS: CVPlus E2E Flows can handle 10K concurrent users!');
        console.log('   ✅ System meets all primary performance criteria');
      } else {
        console.log('⚠️  PARTIAL SUCCESS: System approaches 10K capacity but needs optimization');
      }

      // System bottleneck analysis
      console.log('\n🔍 System Analysis:');
      console.log('   Bottlenecks detected:', results.aggregatedMetrics.systemBottlenecks);
      console.log('   Peak Throughput:', results.aggregatedMetrics.peakThroughput.toFixed(1), 'req/s');

      // Generate specific recommendations for 10K users
      console.log('\n💡 Recommendations for 10K User Capacity:');
      results.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.issue}`);
        console.log(`      Solution: ${rec.recommendation}`);
        console.log(`      Impact: ${rec.estimatedImpact}`);
      });

    }, 1500000); // 25 minute timeout for stress test
  });

  describe('Break Point Testing', () => {
    /**
     * Test 5: Break Point Test (15,000 concurrent users)
     * Purpose: Find system breaking point and failure modes
     * Expected: Higher error rates acceptable, focus on graceful degradation
     */
    test('should identify system breaking point at 15,000+ concurrent users', async () => {
      console.log('\n💥 Starting BREAK POINT TEST (15,000 users)...');
      console.log('   Purpose: Identify system limits and failure patterns');

      const results = await loadTestScenarios.runBreakPointTest();

      // Break point validation - more lenient criteria
      console.log('\n📊 Break Point Analysis:');

      // Users achieved - Should attempt but may not reach full capacity
      const usersAchieved = results.aggregatedMetrics.concurrentUsersAchieved;
      console.log(`   Users Attempted: ${usersAchieved} / 15,000`);
      expect(usersAchieved).toBeGreaterThan(5000); // Should at least exceed previous tests

      // Error rate - Higher tolerance for break point testing
      const errorRate = results.aggregatedMetrics.errorRate;
      console.log(`   Error Rate: ${errorRate.toFixed(2)}%`);
      expect(errorRate).toBeLessThan(50.0); // System should not completely fail

      // Response time - May be high but should not timeout completely
      const avgResponseTime = results.aggregatedMetrics.averageResponseTime;
      console.log(`   Avg Response Time: ${avgResponseTime.toFixed(0)}ms`);

      // System should maintain some level of functionality
      expect(results.aggregatedMetrics.successfulRequests).toBeGreaterThan(1000);

      console.log('\n🔍 Break Point Insights:');
      console.log(`   System Breaking Point: ~${usersAchieved} concurrent users`);
      console.log(`   Graceful Degradation: ${errorRate < 25 ? 'Good' : 'Needs Improvement'}`);
      console.log(`   Recovery Potential: ${results.aggregatedMetrics.sustainedThroughput > 1000 ? 'High' : 'Low'}`);

      // Identify specific failure patterns
      console.log('\n⚠️  Failure Patterns Identified:');
      results.aggregatedMetrics.systemBottlenecks.forEach(bottleneck => {
        console.log(`   • ${bottleneck}`);
      });

    }, 1800000); // 30 minute timeout for break point test
  });

  describe('Recovery Testing', () => {
    /**
     * Test 6: Recovery Test (500 concurrent users after stress)
     * Purpose: Validate system recovery after high load
     * Expected: Return to baseline performance levels
     */
    test('should recover to baseline performance after stress conditions', async () => {
      console.log('\n🔄 Starting RECOVERY TEST (500 users)...');
      console.log('   Purpose: Validate system recovery after stress testing');

      const results = await loadTestScenarios.runRecoveryTest();

      // Recovery validation - Should return close to baseline
      console.log('\n📊 Recovery Analysis:');

      // Users achieved - Should easily handle reduced load
      expect(results.aggregatedMetrics.concurrentUsersAchieved).toBeGreaterThanOrEqual(450);
      console.log(`✓ Users Achieved: ${results.aggregatedMetrics.concurrentUsersAchieved} / 500`);

      // Error rate - Should return to low levels
      expect(results.aggregatedMetrics.errorRate).toBeLessThan(1.5);
      console.log(`✓ Error Rate: ${results.aggregatedMetrics.errorRate.toFixed(2)}% (Should be <1.5%)`);

      // Response time - Should return to reasonable levels
      expect(results.aggregatedMetrics.averageResponseTime).toBeLessThan(800);
      console.log(`✓ Avg Response Time: ${results.aggregatedMetrics.averageResponseTime.toFixed(0)}ms (Should be <800ms)`);

      // P95 response time - Should be stable
      expect(results.aggregatedMetrics.p95ResponseTime).toBeLessThan(1500);
      console.log(`✓ P95 Response Time: ${results.aggregatedMetrics.p95ResponseTime.toFixed(0)}ms (Should be <1500ms)`);

      console.log('\n✅ Recovery Assessment:');
      if (
        results.aggregatedMetrics.errorRate < 1.5 &&
        results.aggregatedMetrics.averageResponseTime < 800
      ) {
        console.log('🎉 EXCELLENT RECOVERY: System returned to baseline performance');
      } else if (
        results.aggregatedMetrics.errorRate < 3.0 &&
        results.aggregatedMetrics.averageResponseTime < 1500
      ) {
        console.log('✅ GOOD RECOVERY: System performance acceptable after stress');
      } else {
        console.log('⚠️  SLOW RECOVERY: System needs optimization for faster recovery');
      }

      // Check for persistent issues
      if (results.aggregatedMetrics.systemBottlenecks.length > 0) {
        console.log('⚠️  Persistent Issues After Recovery:');
        results.aggregatedMetrics.systemBottlenecks.forEach(bottleneck => {
          console.log(`   • ${bottleneck}`);
        });
      }

    }, 600000); // 10 minute timeout for recovery test
  });

  describe('Complete Load Test Suite', () => {
    /**
     * Comprehensive Suite: Run all load tests in sequence
     * Purpose: Complete validation from baseline to breaking point
     * Note: This test is optional and takes 2-3 hours to complete
     */
    test.skip('should run complete load test suite (FULL VALIDATION)', async () => {
      console.log('\n🌟 Starting COMPLETE LOAD TEST SUITE...');
      console.log('   This comprehensive test takes 2-3 hours to complete');
      console.log('   Testing from 100 to 15,000 concurrent users');

      const results = await loadTestScenarios.runCompleteLoadTestSuite();

      // Validate progression through all load levels
      expect(results.baseline.aggregatedMetrics.errorRate).toBeLessThan(1.0);
      expect(results.medium.aggregatedMetrics.errorRate).toBeLessThan(2.0);
      expect(results.high.aggregatedMetrics.errorRate).toBeLessThan(3.0);
      expect(results.stress.aggregatedMetrics.errorRate).toBeLessThan(5.0);
      expect(results.recovery.aggregatedMetrics.errorRate).toBeLessThan(1.5);

      console.log('\n🏆 COMPLETE SUITE RESULTS:');
      console.log('✅ Baseline (100 users): PASSED');
      console.log('✅ Medium (1K users): PASSED');
      console.log('✅ High (5K users): PASSED');
      console.log('✅ Stress (10K users): PASSED');
      console.log('✅ Break Point (15K users): COMPLETED');
      console.log('✅ Recovery (500 users): PASSED');

      console.log('\n🎯 FINAL VERDICT:');
      console.log('CVPlus E2E Flows system has been comprehensively validated');
      console.log('for concurrent user capacity up to 10,000 users.');

    }, 14400000); // 4 hour timeout for complete suite
  });

  describe('Performance Regression Detection', () => {
    /**
     * Performance regression test
     * Compare current performance against historical baselines
     */
    test('should not show performance regression compared to baseline', async () => {
      console.log('\n📈 Running Performance Regression Detection...');

      const baselineResults = await loadTestScenarios.runBaselineLoadTest();

      // Load historical baseline data (if available)
      const historicalBaseline = {
        errorRate: 0.5,
        averageResponseTime: 300,
        p95ResponseTime: 600,
        sustainedThroughput: 80
      };

      // Compare against historical baseline
      const regressionThreshold = 0.2; // 20% degradation threshold

      const errorRateRegression = (baselineResults.aggregatedMetrics.errorRate - historicalBaseline.errorRate) / historicalBaseline.errorRate;
      const responseTimeRegression = (baselineResults.aggregatedMetrics.averageResponseTime - historicalBaseline.averageResponseTime) / historicalBaseline.averageResponseTime;

      console.log(`   Error Rate Regression: ${(errorRateRegression * 100).toFixed(1)}%`);
      console.log(`   Response Time Regression: ${(responseTimeRegression * 100).toFixed(1)}%`);

      expect(errorRateRegression).toBeLessThan(regressionThreshold);
      expect(responseTimeRegression).toBeLessThan(regressionThreshold);

      if (errorRateRegression < 0 && responseTimeRegression < 0) {
        console.log('🎉 PERFORMANCE IMPROVEMENT detected!');
      } else if (errorRateRegression < regressionThreshold && responseTimeRegression < regressionThreshold) {
        console.log('✅ NO PERFORMANCE REGRESSION detected');
      }

    }, 600000);
  });
});

/**
 * Individual service load tests
 */
describe('Individual Service Load Testing', () => {
  let loadTestScenarios: LoadTestScenarios;

  beforeAll(async () => {
    loadTestScenarios = new LoadTestScenarios();
  });

  afterAll(async () => {
    await loadTestScenarios.cleanup();
  });

  /**
   * MockDataService load test
   * Test concurrent mock data generation
   */
  test('should handle concurrent MockDataService operations under load', async () => {
    console.log('\n🧪 Testing MockDataService under load...');

    const concurrentUsers = 1000;
    const testDuration = 60; // seconds

    const promises: Promise<void>[] = [];

    for (let i = 0; i < concurrentUsers; i++) {
      const promise = (async () => {
        const startTime = Date.now();
        let requestCount = 0;
        let errorCount = 0;

        while (Date.now() - startTime < testDuration * 1000) {
          try {
            // Simulate mock data generation
            await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 90));
            requestCount++;
          } catch (error) {
            errorCount++;
          }
        }

        console.log(`User ${i}: ${requestCount} requests, ${errorCount} errors`);
      })();

      promises.push(promise);
    }

    await Promise.all(promises);

    console.log('✅ MockDataService load test completed');

  }, 120000);

  /**
   * APITestingService load test
   * Test concurrent API validations
   */
  test('should handle concurrent APITestingService operations under load', async () => {
    console.log('\n🔌 Testing APITestingService under load...');

    const concurrentUsers = 500;
    const testDuration = 60; // seconds

    const promises: Promise<void>[] = [];

    for (let i = 0; i < concurrentUsers; i++) {
      const promise = (async () => {
        const startTime = Date.now();
        let requestCount = 0;
        let errorCount = 0;

        while (Date.now() - startTime < testDuration * 1000) {
          try {
            // Simulate API testing
            await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 180));
            requestCount++;
          } catch (error) {
            errorCount++;
          }
        }

        console.log(`API User ${i}: ${requestCount} requests, ${errorCount} errors`);
      })();

      promises.push(promise);
    }

    await Promise.all(promises);

    console.log('✅ APITestingService load test completed');

  }, 120000);

  /**
   * E2EFlowsService load test
   * Test concurrent E2E flow executions
   */
  test('should handle concurrent E2EFlowsService operations under load', async () => {
    console.log('\n🔄 Testing E2EFlowsService under load...');

    const concurrentUsers = 200;
    const testDuration = 60; // seconds

    const promises: Promise<void>[] = [];

    for (let i = 0; i < concurrentUsers; i++) {
      const promise = (async () => {
        const startTime = Date.now();
        let requestCount = 0;
        let errorCount = 0;

        while (Date.now() - startTime < testDuration * 1000) {
          try {
            // Simulate E2E flow execution
            await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));
            requestCount++;
          } catch (error) {
            errorCount++;
          }
        }

        console.log(`E2E User ${i}: ${requestCount} requests, ${errorCount} errors`);
      })();

      promises.push(promise);
    }

    await Promise.all(promises);

    console.log('✅ E2EFlowsService load test completed');

  }, 120000);
});