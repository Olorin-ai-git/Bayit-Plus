/**
 * Comprehensive Load Test Scenarios for CVPlus E2E Flows
 * Targeting 10K concurrent users with progressive load testing
 *
 * Test Scenarios:
 * 1. Baseline Load (100 users) - Performance baseline
 * 2. Medium Load (1K users) - Typical load
 * 3. High Load (5K users) - Peak hours
 * 4. Stress Load (10K users) - Maximum target
 * 5. Break Point (15K+ users) - System limits
 * 6. Recovery Test - Post-stress recovery
 */

import { LoadTestFramework, LoadTestConfig, LoadTestResults } from './load-testing-framework';
import { MockDataService } from '../../src/services/MockDataService';
import { APITestingService } from '../../src/services/APITestingService';
import { E2EFlowsService } from '../../src/services/E2EFlowsService';
import { PerformanceCollector } from '../../src/metrics/PerformanceCollector';
import { faker } from '@faker-js/faker';
import axios from 'axios';

export interface LoadTestScenario {
  name: string;
  description: string;
  config: LoadTestConfig;
  testFunction: (userConfig: any) => Promise<void>;
  expectedOutcome: string;
  successCriteria: {
    maxErrorRate: number;
    maxAverageResponseTime: number;
    maxP95ResponseTime: number;
    minThroughput: number;
  };
}

/**
 * Load Test Scenarios Registry
 */
export class LoadTestScenarios {
  private framework: LoadTestFramework;
  private mockDataService: MockDataService;
  private apiTestingService: APITestingService;
  private e2eFlowsService: E2EFlowsService;
  private performanceCollector: PerformanceCollector;

  constructor() {
    this.framework = new LoadTestFramework(15000); // Support up to 15K users for break point testing
    this.mockDataService = new MockDataService();
    this.apiTestingService = new APITestingService();
    this.e2eFlowsService = new E2EFlowsService();
    this.performanceCollector = new PerformanceCollector();

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for real-time monitoring
   */
  private setupEventListeners(): void {
    this.framework.on('userCompleted', (metrics) => {
      console.log(`User ${metrics.userId} completed: ${metrics.requestCount} requests, ${metrics.errorCount} errors`);
    });

    this.framework.on('systemStress', (metrics) => {
      console.warn(`System under stress! Memory: ${metrics.memoryUsage.usedPercent.toFixed(1)}%, Load: ${metrics.loadAverage.oneMinute.toFixed(2)}`);
    });

    this.framework.on('testCompleted', (results) => {
      console.log(`Load test completed: ${results.aggregatedMetrics.concurrentUsersAchieved} users achieved`);
    });
  }

  /**
   * Scenario 1: Baseline Load Test (100 concurrent users)
   * Purpose: Establish performance baseline for comparison
   */
  async runBaselineLoadTest(): Promise<LoadTestResults> {
    const scenario: LoadTestScenario = {
      name: 'Baseline Load Test',
      description: 'Establish performance baseline with 100 concurrent users',
      config: {
        name: 'baseline-load',
        description: 'Performance baseline test',
        targetUsers: 100,
        rampUpDuration: 30,
        sustainDuration: 300, // 5 minutes
        rampDownDuration: 30,
        thinkTime: 1000, // 1 second between requests
        timeout: 10000, // 10 second timeout
        maxRetries: 3,
        healthCheckInterval: 5000
      },
      testFunction: this.createAPITestFunction('baseline'),
      expectedOutcome: 'Smooth operation with minimal resource usage',
      successCriteria: {
        maxErrorRate: 1.0,
        maxAverageResponseTime: 500,
        maxP95ResponseTime: 1000,
        minThroughput: 50
      }
    };

    console.log('Starting Baseline Load Test...');
    return this.framework.executeLoadTest(scenario.config, scenario.testFunction);
  }

  /**
   * Scenario 2: Medium Load Test (1,000 concurrent users)
   * Purpose: Test typical production load
   */
  async runMediumLoadTest(): Promise<LoadTestResults> {
    const scenario: LoadTestScenario = {
      name: 'Medium Load Test',
      description: 'Test typical production load with 1K concurrent users',
      config: {
        name: 'medium-load',
        description: 'Typical production load test',
        targetUsers: 1000,
        rampUpDuration: 60,
        sustainDuration: 600, // 10 minutes
        rampDownDuration: 60,
        thinkTime: 500, // 0.5 seconds between requests
        timeout: 15000, // 15 second timeout
        maxRetries: 3,
        healthCheckInterval: 3000
      },
      testFunction: this.createAPITestFunction('medium'),
      expectedOutcome: 'Good performance with acceptable resource utilization',
      successCriteria: {
        maxErrorRate: 2.0,
        maxAverageResponseTime: 1000,
        maxP95ResponseTime: 2000,
        minThroughput: 400
      }
    };

    console.log('Starting Medium Load Test...');
    return this.framework.executeLoadTest(scenario.config, scenario.testFunction);
  }

  /**
   * Scenario 3: High Load Test (5,000 concurrent users)
   * Purpose: Test peak hours load
   */
  async runHighLoadTest(): Promise<LoadTestResults> {
    const scenario: LoadTestScenario = {
      name: 'High Load Test',
      description: 'Test peak hours load with 5K concurrent users',
      config: {
        name: 'high-load',
        description: 'Peak hours load test',
        targetUsers: 5000,
        rampUpDuration: 120,
        sustainDuration: 600, // 10 minutes
        rampDownDuration: 120,
        thinkTime: 250, // 0.25 seconds between requests
        timeout: 20000, // 20 second timeout
        maxRetries: 3,
        healthCheckInterval: 2000
      },
      testFunction: this.createAPITestFunction('high'),
      expectedOutcome: 'Acceptable performance with increased resource usage',
      successCriteria: {
        maxErrorRate: 3.0,
        maxAverageResponseTime: 2000,
        maxP95ResponseTime: 4000,
        minThroughput: 1500
      }
    };

    console.log('Starting High Load Test...');
    return this.framework.executeLoadTest(scenario.config, scenario.testFunction);
  }

  /**
   * Scenario 4: Stress Load Test (10,000 concurrent users)
   * Purpose: Test maximum target capacity
   */
  async runStressLoadTest(): Promise<LoadTestResults> {
    const scenario: LoadTestScenario = {
      name: 'Stress Load Test',
      description: 'Test maximum target capacity with 10K concurrent users',
      config: {
        name: 'stress-load',
        description: 'Maximum capacity stress test',
        targetUsers: 10000,
        rampUpDuration: 180,
        sustainDuration: 600, // 10 minutes
        rampDownDuration: 180,
        thinkTime: 100, // 0.1 seconds between requests
        timeout: 30000, // 30 second timeout
        maxRetries: 5,
        healthCheckInterval: 1000
      },
      testFunction: this.createAPITestFunction('stress'),
      expectedOutcome: 'System under stress but maintaining functionality',
      successCriteria: {
        maxErrorRate: 5.0,
        maxAverageResponseTime: 3000,
        maxP95ResponseTime: 8000,
        minThroughput: 2500
      }
    };

    console.log('Starting Stress Load Test...');
    return this.framework.executeLoadTest(scenario.config, scenario.testFunction);
  }

  /**
   * Scenario 5: Break Point Test (15,000+ concurrent users)
   * Purpose: Find system breaking point
   */
  async runBreakPointTest(): Promise<LoadTestResults> {
    const scenario: LoadTestScenario = {
      name: 'Break Point Test',
      description: 'Find system breaking point with 15K+ concurrent users',
      config: {
        name: 'break-point',
        description: 'System breaking point test',
        targetUsers: 15000,
        rampUpDuration: 300,
        sustainDuration: 300, // 5 minutes - shorter for break point
        rampDownDuration: 300,
        thinkTime: 50, // 0.05 seconds between requests
        timeout: 45000, // 45 second timeout
        maxRetries: 5,
        healthCheckInterval: 500
      },
      testFunction: this.createAPITestFunction('breakpoint'),
      expectedOutcome: 'System reaches capacity limits, high error rates expected',
      successCriteria: {
        maxErrorRate: 15.0, // Higher tolerance for break point testing
        maxAverageResponseTime: 10000,
        maxP95ResponseTime: 20000,
        minThroughput: 1000 // Lower expectation at break point
      }
    };

    console.log('Starting Break Point Test...');
    return this.framework.executeLoadTest(scenario.config, scenario.testFunction);
  }

  /**
   * Scenario 6: Recovery Test
   * Purpose: Test system recovery after high load
   */
  async runRecoveryTest(): Promise<LoadTestResults> {
    const scenario: LoadTestScenario = {
      name: 'Recovery Test',
      description: 'Test system recovery after stress conditions',
      config: {
        name: 'recovery-test',
        description: 'Post-stress recovery test',
        targetUsers: 500, // Lower load for recovery
        rampUpDuration: 60,
        sustainDuration: 300, // 5 minutes
        rampDownDuration: 60,
        thinkTime: 2000, // 2 seconds between requests - slower pace
        timeout: 15000,
        maxRetries: 3,
        healthCheckInterval: 5000
      },
      testFunction: this.createAPITestFunction('recovery'),
      expectedOutcome: 'System should return to normal performance levels',
      successCriteria: {
        maxErrorRate: 1.5,
        maxAverageResponseTime: 800,
        maxP95ResponseTime: 1500,
        minThroughput: 100
      }
    };

    console.log('Starting Recovery Test...');
    // Wait a bit before starting recovery test to allow system to stabilize
    await new Promise(resolve => setTimeout(resolve, 30000)); // 30 second delay

    return this.framework.executeLoadTest(scenario.config, scenario.testFunction);
  }

  /**
   * Create API test function for different load scenarios
   */
  private createAPITestFunction(scenario: string): (userConfig: any) => Promise<void> {
    return async (userConfig: any) => {
      const testOperations = [
        () => this.testMockDataGeneration(userConfig),
        () => this.testAPIEndpointValidation(userConfig),
        () => this.testE2EFlowExecution(userConfig),
        () => this.testCVProcessingWorkflow(userConfig),
        () => this.testMultimediaGeneration(userConfig)
      ];

      // Randomly select operations to simulate realistic user behavior
      const operationsToRun = this.selectRandomOperations(testOperations, scenario);

      for (const operation of operationsToRun) {
        await operation();

        // Random think time variation
        const thinkTime = userConfig.thinkTime * (0.5 + Math.random());
        await new Promise(resolve => setTimeout(resolve, thinkTime));
      }
    };
  }

  /**
   * Select random operations based on scenario
   */
  private selectRandomOperations(operations: Function[], scenario: string): Function[] {
    let operationCount: number;

    switch (scenario) {
      case 'baseline':
        operationCount = 1 + Math.floor(Math.random() * 2); // 1-2 operations
        break;
      case 'medium':
        operationCount = 2 + Math.floor(Math.random() * 2); // 2-3 operations
        break;
      case 'high':
        operationCount = 2 + Math.floor(Math.random() * 3); // 2-4 operations
        break;
      case 'stress':
        operationCount = 3 + Math.floor(Math.random() * 2); // 3-4 operations
        break;
      case 'breakpoint':
        operationCount = 4 + Math.floor(Math.random() * 2); // 4-5 operations
        break;
      case 'recovery':
        operationCount = 1; // Single operation for recovery
        break;
      default:
        operationCount = 2;
    }

    // Shuffle and select operations
    const shuffled = [...operations].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, operationCount);
  }

  /**
   * Test mock data generation under load
   */
  private async testMockDataGeneration(userConfig: any): Promise<void> {
    const startTime = Date.now();

    try {
      // Generate different types of mock data
      const dataTypes = ['user', 'cv', 'profile', 'analytics'];
      const dataType = dataTypes[Math.floor(Math.random() * dataTypes.length)];

      await this.mockDataService.generateMockData(dataType, {
        count: 1 + Math.floor(Math.random() * 5), // 1-5 items
        complexity: 'medium'
      });

      const responseTime = Date.now() - startTime;

      if (responseTime > userConfig.timeout) {
        throw new Error(`Mock data generation timeout: ${responseTime}ms`);
      }

    } catch (error) {
      console.error(`Mock data generation failed for user ${userConfig.userId}:`, error.message);
      throw error;
    }
  }

  /**
   * Test API endpoint validation under load
   */
  private async testAPIEndpointValidation(userConfig: any): Promise<void> {
    const startTime = Date.now();

    try {
      // Simulate different API endpoints
      const endpoints = [
        '/api/cv/upload',
        '/api/cv/status',
        '/api/profile/public',
        '/api/analytics/track',
        '/api/multimedia/generate'
      ];

      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];

      // Simulate API call with realistic data
      const mockRequest = {
        url: `https://cvplus-api.example.com${endpoint}`,
        method: 'POST',
        data: this.generateMockRequestData(endpoint),
        timeout: userConfig.timeout
      };

      // Use APITestingService to validate endpoint
      await this.apiTestingService.validateAPIEndpoint(mockRequest);

      const responseTime = Date.now() - startTime;

      if (responseTime > userConfig.timeout) {
        throw new Error(`API validation timeout: ${responseTime}ms`);
      }

    } catch (error) {
      console.error(`API validation failed for user ${userConfig.userId}:`, error.message);
      throw error;
    }
  }

  /**
   * Test E2E flow execution under load
   */
  private async testE2EFlowExecution(userConfig: any): Promise<void> {
    const startTime = Date.now();

    try {
      // Create mock E2E flow
      const flowDefinition = {
        id: `load-test-flow-${userConfig.userId}`,
        name: 'Load Test Flow',
        steps: [
          { action: 'upload_cv', data: { fileSize: 'medium' } },
          { action: 'process_cv', data: { features: ['ats', 'insights'] } },
          { action: 'generate_profile', data: { privacy: 'public' } }
        ],
        timeout: userConfig.timeout
      };

      await this.e2eFlowsService.executeFlow(flowDefinition);

      const responseTime = Date.now() - startTime;

      if (responseTime > userConfig.timeout) {
        throw new Error(`E2E flow execution timeout: ${responseTime}ms`);
      }

    } catch (error) {
      console.error(`E2E flow execution failed for user ${userConfig.userId}:`, error.message);
      throw error;
    }
  }

  /**
   * Test CV processing workflow under load
   */
  private async testCVProcessingWorkflow(userConfig: any): Promise<void> {
    const startTime = Date.now();

    try {
      // Simulate CV processing steps
      const processingSteps = [
        'text_extraction',
        'content_analysis',
        'ats_optimization',
        'personality_insights',
        'recommendations_generation'
      ];

      for (const step of processingSteps) {
        // Simulate processing time for each step
        await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 200));

        // Check for timeout
        if (Date.now() - startTime > userConfig.timeout) {
          throw new Error(`CV processing timeout at step: ${step}`);
        }
      }

    } catch (error) {
      console.error(`CV processing workflow failed for user ${userConfig.userId}:`, error.message);
      throw error;
    }
  }

  /**
   * Test multimedia generation under load
   */
  private async testMultimediaGeneration(userConfig: any): Promise<void> {
    const startTime = Date.now();

    try {
      // Simulate multimedia generation
      const mediaTypes = ['podcast', 'video', 'infographic'];
      const mediaType = mediaTypes[Math.floor(Math.random() * mediaTypes.length)];

      // Simulate generation time based on media type
      let generationTime: number;
      switch (mediaType) {
        case 'podcast':
          generationTime = 1000 + Math.random() * 2000; // 1-3 seconds
          break;
        case 'video':
          generationTime = 2000 + Math.random() * 3000; // 2-5 seconds
          break;
        case 'infographic':
          generationTime = 500 + Math.random() * 1000; // 0.5-1.5 seconds
          break;
        default:
          generationTime = 1000;
      }

      await new Promise(resolve => setTimeout(resolve, generationTime));

      const responseTime = Date.now() - startTime;

      if (responseTime > userConfig.timeout) {
        throw new Error(`Multimedia generation timeout: ${responseTime}ms`);
      }

    } catch (error) {
      console.error(`Multimedia generation failed for user ${userConfig.userId}:`, error.message);
      throw error;
    }
  }

  /**
   * Generate mock request data for different endpoints
   */
  private generateMockRequestData(endpoint: string): any {
    switch (endpoint) {
      case '/api/cv/upload':
        return {
          filename: faker.system.fileName(),
          fileSize: Math.floor(Math.random() * 1000000), // Random file size
          contentType: 'application/pdf'
        };

      case '/api/cv/status':
        return {
          jobId: faker.string.uuid()
        };

      case '/api/profile/public':
        return {
          userId: faker.string.uuid(),
          profileData: {
            name: faker.person.fullName(),
            title: faker.person.jobTitle(),
            skills: Array.from({ length: 5 }, () => faker.person.jobArea())
          }
        };

      case '/api/analytics/track':
        return {
          event: 'page_view',
          properties: {
            page: '/profile',
            userId: faker.string.uuid(),
            timestamp: new Date().toISOString()
          }
        };

      case '/api/multimedia/generate':
        return {
          type: 'podcast',
          content: faker.lorem.paragraphs(3),
          voice: 'professional'
        };

      default:
        return {
          data: faker.lorem.sentence()
        };
    }
  }

  /**
   * Run complete load test suite
   */
  async runCompleteLoadTestSuite(): Promise<{
    baseline: LoadTestResults,
    medium: LoadTestResults,
    high: LoadTestResults,
    stress: LoadTestResults,
    breakPoint: LoadTestResults,
    recovery: LoadTestResults
  }> {
    console.log('Starting Complete Load Test Suite...');
    console.log('This will take approximately 2-3 hours to complete');

    const results = {
      baseline: await this.runBaselineLoadTest(),
      medium: await this.runMediumLoadTest(),
      high: await this.runHighLoadTest(),
      stress: await this.runStressLoadTest(),
      breakPoint: await this.runBreakPointTest(),
      recovery: await this.runRecoveryTest()
    };

    console.log('Complete Load Test Suite Finished!');
    console.log('Generating comprehensive report...');

    // Generate comprehensive report
    this.generateComprehensiveReport(results);

    return results;
  }

  /**
   * Generate comprehensive load test report
   */
  private generateComprehensiveReport(results: any): void {
    const report = `
# Complete Load Test Suite Report - CVPlus E2E Flows

## Executive Summary
This report covers comprehensive load testing from 100 to 15,000 concurrent users.

## Test Results Summary

### Baseline Test (100 users)
- **Error Rate**: ${results.baseline.aggregatedMetrics.errorRate.toFixed(2)}%
- **Avg Response Time**: ${results.baseline.aggregatedMetrics.averageResponseTime.toFixed(0)}ms
- **P95 Response Time**: ${results.baseline.aggregatedMetrics.p95ResponseTime.toFixed(0)}ms
- **Throughput**: ${results.baseline.aggregatedMetrics.sustainedThroughput.toFixed(1)} req/s

### Medium Load Test (1,000 users)
- **Error Rate**: ${results.medium.aggregatedMetrics.errorRate.toFixed(2)}%
- **Avg Response Time**: ${results.medium.aggregatedMetrics.averageResponseTime.toFixed(0)}ms
- **P95 Response Time**: ${results.medium.aggregatedMetrics.p95ResponseTime.toFixed(0)}ms
- **Throughput**: ${results.medium.aggregatedMetrics.sustainedThroughput.toFixed(1)} req/s

### High Load Test (5,000 users)
- **Error Rate**: ${results.high.aggregatedMetrics.errorRate.toFixed(2)}%
- **Avg Response Time**: ${results.high.aggregatedMetrics.averageResponseTime.toFixed(0)}ms
- **P95 Response Time**: ${results.high.aggregatedMetrics.p95ResponseTime.toFixed(0)}ms
- **Throughput**: ${results.high.aggregatedMetrics.sustainedThroughput.toFixed(1)} req/s

### Stress Load Test (10,000 users)
- **Error Rate**: ${results.stress.aggregatedMetrics.errorRate.toFixed(2)}%
- **Avg Response Time**: ${results.stress.aggregatedMetrics.averageResponseTime.toFixed(0)}ms
- **P95 Response Time**: ${results.stress.aggregatedMetrics.p95ResponseTime.toFixed(0)}ms
- **Throughput**: ${results.stress.aggregatedMetrics.sustainedThroughput.toFixed(1)} req/s

### Break Point Test (15,000 users)
- **Error Rate**: ${results.breakPoint.aggregatedMetrics.errorRate.toFixed(2)}%
- **Avg Response Time**: ${results.breakPoint.aggregatedMetrics.averageResponseTime.toFixed(0)}ms
- **P95 Response Time**: ${results.breakPoint.aggregatedMetrics.p95ResponseTime.toFixed(0)}ms
- **Throughput**: ${results.breakPoint.aggregatedMetrics.sustainedThroughput.toFixed(1)} req/s

### Recovery Test (500 users)
- **Error Rate**: ${results.recovery.aggregatedMetrics.errorRate.toFixed(2)}%
- **Avg Response Time**: ${results.recovery.aggregatedMetrics.averageResponseTime.toFixed(0)}ms
- **P95 Response Time**: ${results.recovery.aggregatedMetrics.p95ResponseTime.toFixed(0)}ms
- **Throughput**: ${results.recovery.aggregatedMetrics.sustainedThroughput.toFixed(1)} req/s

## Scalability Analysis
### Performance Degradation Points
- **1K users**: ${this.analyzePerformanceDegradation(results.baseline, results.medium)}
- **5K users**: ${this.analyzePerformanceDegradation(results.medium, results.high)}
- **10K users**: ${this.analyzePerformanceDegradation(results.high, results.stress)}
- **15K users**: ${this.analyzePerformanceDegradation(results.stress, results.breakPoint)}

### System Capacity Recommendations
${this.generateCapacityRecommendations(results)}

## Conclusion
${this.generateConclusion(results)}
`;

    console.log(report);

    // Save report to file
    require('fs').writeFileSync(
      `/Users/gklainert/Documents/cvplus/packages/e2e-flows/tests/load/comprehensive-load-test-report-${Date.now()}.md`,
      report
    );
  }

  private analyzePerformanceDegradation(baseline: LoadTestResults, comparison: LoadTestResults): string {
    const responseTimeIncrease = ((comparison.aggregatedMetrics.averageResponseTime - baseline.aggregatedMetrics.averageResponseTime) / baseline.aggregatedMetrics.averageResponseTime) * 100;
    const errorRateIncrease = comparison.aggregatedMetrics.errorRate - baseline.aggregatedMetrics.errorRate;

    if (responseTimeIncrease > 100 || errorRateIncrease > 5) {
      return 'Significant degradation detected';
    } else if (responseTimeIncrease > 50 || errorRateIncrease > 2) {
      return 'Moderate degradation';
    } else {
      return 'Acceptable performance';
    }
  }

  private generateCapacityRecommendations(results: any): string {
    const stressResults = results.stress.aggregatedMetrics;

    if (stressResults.errorRate > 5 || stressResults.averageResponseTime > 3000) {
      return `
- **CRITICAL**: Current system cannot handle 10K users effectively
- **Recommendation**: Implement horizontal scaling before production
- **Infrastructure**: Consider increasing server capacity by 50-100%
- **Architecture**: Implement load balancing and microservices separation`;
    } else if (stressResults.errorRate > 2 || stressResults.averageResponseTime > 1500) {
      return `
- **WARNING**: System approaches limits at 10K users
- **Recommendation**: Optimize critical paths and implement caching
- **Infrastructure**: Monitor and prepare for horizontal scaling
- **Performance**: Focus on database and API optimization`;
    } else {
      return `
- **SUCCESS**: System handles 10K users within acceptable limits
- **Recommendation**: Monitor production closely and prepare for growth
- **Infrastructure**: Current setup appears adequate
- **Optimization**: Continue performance monitoring and optimization`;
    }
  }

  private generateConclusion(results: any): string {
    const stressErrorRate = results.stress.aggregatedMetrics.errorRate;
    const stressResponseTime = results.stress.aggregatedMetrics.averageResponseTime;

    if (stressErrorRate <= 5 && stressResponseTime <= 3000) {
      return 'The CVPlus E2E Flows system successfully meets the 10K concurrent user target with acceptable performance characteristics.';
    } else {
      return 'The system requires optimization before handling 10K concurrent users in production. Focus on the identified bottlenecks and scaling recommendations.';
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.framework.stop();
  }
}