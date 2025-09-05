#!/usr/bin/env node

/**
 * WebSocket Performance Test Script
 * 
 * This script tests the WebSocket integration performance by simulating
 * various real-world scenarios with the AutonomousInvestigationClient.
 * 
 * Usage: npm run test:websocket-performance
 */

import { AutonomousInvestigationClient, InvestigationEventHandler } from '../../../../js/services/AutonomousInvestigationClient';
import { LogLevel } from '../../../../js/types/RiskAssessment';

interface PerformanceMetrics {
  connectionTime: number;
  firstEventTime: number;
  averageEventProcessingTime: number;
  totalEvents: number;
  errorCount: number;
  memoryUsage: NodeJS.MemoryUsage;
}

interface TestScenario {
  name: string;
  description: string;
  duration: number; // milliseconds
  expectedEvents: number;
  eventFrequency: number; // events per second
}

class WebSocketPerformanceTester {
  private client: AutonomousInvestigationClient;
  private metrics: PerformanceMetrics;
  private startTime: number = 0;
  private eventTimes: number[] = [];
  private isRunning: boolean = false;

  constructor() {
    this.client = new AutonomousInvestigationClient({
      apiBaseUrl: 'http://localhost:8090/api',
      wsBaseUrl: 'ws://localhost:8090',
      parallel: true,
      retryAttempts: 3,
      retryDelay: 1000
    });

    this.metrics = {
      connectionTime: 0,
      firstEventTime: 0,
      averageEventProcessingTime: 0,
      totalEvents: 0,
      errorCount: 0,
      memoryUsage: process.memoryUsage()
    };
  }

  /**
   * Run a specific test scenario
   */
  async runScenario(scenario: TestScenario): Promise<PerformanceMetrics> {
    console.log(`\n🚀 Starting scenario: ${scenario.name}`);
    console.log(`📝 ${scenario.description}`);
    console.log(`⏱️  Duration: ${scenario.duration}ms`);
    console.log(`📊 Expected events: ${scenario.expectedEvents}`);
    
    this.resetMetrics();
    this.startTime = Date.now();
    this.isRunning = true;

    const eventHandlers = this.createEventHandlers();

    try {
      const connectionStart = Date.now();
      const investigationId = await this.client.startInvestigation(
        'test-user-' + Date.now(),
        'user_id',
        eventHandlers
      );
      
      this.metrics.connectionTime = Date.now() - connectionStart;
      console.log(`🔗 Connected in ${this.metrics.connectionTime}ms (ID: ${investigationId})`);

      // Wait for the scenario duration
      await new Promise(resolve => setTimeout(resolve, scenario.duration));
      
      this.isRunning = false;
      
      // Calculate final metrics
      this.calculateFinalMetrics();
      
      console.log(`✅ Scenario completed`);
      this.printMetrics(scenario);
      
    } catch (error) {
      console.error(`❌ Scenario failed:`, error);
      this.metrics.errorCount++;
    } finally {
      this.client.stopInvestigation();
    }

    return this.metrics;
  }

  /**
   * Run all test scenarios
   */
  async runAllScenarios(): Promise<Record<string, PerformanceMetrics>> {
    const scenarios: TestScenario[] = [
      {
        name: 'Light Load Test',
        description: 'Tests basic WebSocket performance with occasional updates',
        duration: 5000,
        expectedEvents: 20,
        eventFrequency: 4
      },
      {
        name: 'Moderate Load Test',
        description: 'Tests performance with regular investigation updates',
        duration: 10000,
        expectedEvents: 100,
        eventFrequency: 10
      },
      {
        name: 'Heavy Load Test',
        description: 'Tests performance under high-frequency updates',
        duration: 8000,
        expectedEvents: 200,
        eventFrequency: 25
      },
      {
        name: 'Burst Load Test',
        description: 'Tests performance with sudden bursts of events',
        duration: 6000,
        expectedEvents: 150,
        eventFrequency: 25
      },
      {
        name: 'Long Duration Test',
        description: 'Tests memory stability over extended periods',
        duration: 30000,
        expectedEvents: 300,
        eventFrequency: 10
      }
    ];

    const results: Record<string, PerformanceMetrics> = {};

    for (const scenario of scenarios) {
      try {
        results[scenario.name] = await this.runScenario(scenario);
        
        // Brief pause between scenarios
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`Failed to run scenario ${scenario.name}:`, error);
        results[scenario.name] = {
          ...this.metrics,
          errorCount: 1
        };
      }
    }

    this.printSummaryReport(results);
    return results;
  }

  /**
   * Create event handlers with performance tracking
   */
  private createEventHandlers(): InvestigationEventHandler {
    return {
      onPhaseUpdate: (data: any) => {
        this.recordEvent('phase_update');
        console.log(`📈 Phase: ${data.phase} (${(data.progress * 100).toFixed(1)}%)`);
      },

      onStatusUpdate: (data: any) => {
        this.recordEvent('status_update');
        console.log(`🔄 Status: ${data.status}`);
      },

      onError: (data: any) => {
        this.recordEvent('error');
        this.metrics.errorCount++;
        console.log(`⚠️  Error: ${data.message} (${data.error_code})`);
      },

      onComplete: (results: any) => {
        this.recordEvent('complete');
        console.log(`🎉 Investigation completed with ${Object.keys(results).length} results`);
      },

      onCancelled: () => {
        this.recordEvent('cancelled');
        console.log(`🛑 Investigation cancelled`);
      },

      onLog: (message: any, level: any) => {
        this.recordEvent('log');
        if (level === LogLevel.ERROR) {
          this.metrics.errorCount++;
        }
      },

      onRAGEvent: (data: any) => {
        this.recordEvent('rag_event');
        console.log(`🧠 RAG Event: ${data.type} for ${data.agent_type}`);
      },

      onRAGPerformanceUpdate: (data: any) => {
        this.recordEvent('rag_performance');
        console.log(`📊 RAG Performance: ${data.metrics.total_queries} queries, ${data.metrics.avg_retrieval_time.toFixed(0)}ms avg`);
      }
    };
  }

  /**
   * Record event timing for performance analysis
   */
  private recordEvent(eventType: string): void {
    if (!this.isRunning) return;

    const eventTime = Date.now();
    this.eventTimes.push(eventTime);
    this.metrics.totalEvents++;

    if (this.metrics.firstEventTime === 0) {
      this.metrics.firstEventTime = eventTime - this.startTime;
    }
  }

  /**
   * Calculate final performance metrics
   */
  private calculateFinalMetrics(): void {
    if (this.eventTimes.length > 1) {
      const processingTimes = this.eventTimes.slice(1).map((time, index) => 
        time - this.eventTimes[index]
      );
      
      this.metrics.averageEventProcessingTime = 
        processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
    }

    this.metrics.memoryUsage = process.memoryUsage();
  }

  /**
   * Reset metrics for a new test
   */
  private resetMetrics(): void {
    this.metrics = {
      connectionTime: 0,
      firstEventTime: 0,
      averageEventProcessingTime: 0,
      totalEvents: 0,
      errorCount: 0,
      memoryUsage: process.memoryUsage()
    };
    this.eventTimes = [];
  }

  /**
   * Print metrics for a single scenario
   */
  private printMetrics(scenario: TestScenario): void {
    const { metrics } = this;
    
    console.log('\n📊 Performance Metrics:');
    console.log(`┌─────────────────────────────────────────┐`);
    console.log(`│ Connection Time:     ${metrics.connectionTime.toString().padStart(10)}ms │`);
    console.log(`│ First Event Time:    ${metrics.firstEventTime.toString().padStart(10)}ms │`);
    console.log(`│ Avg Processing Time: ${metrics.averageEventProcessingTime.toFixed(2).padStart(10)}ms │`);
    console.log(`│ Total Events:        ${metrics.totalEvents.toString().padStart(10)}   │`);
    console.log(`│ Error Count:         ${metrics.errorCount.toString().padStart(10)}   │`);
    console.log(`│ Memory Usage:        ${(metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2).padStart(7)}MB │`);
    console.log(`└─────────────────────────────────────────┘`);

    // Performance assessment
    const eventsPerSecond = metrics.totalEvents / (scenario.duration / 1000);
    const expectedEPS = scenario.eventFrequency;
    const eventEfficiency = (eventsPerSecond / expectedEPS) * 100;
    
    console.log(`\n📈 Performance Assessment:`);
    console.log(`   Events/second: ${eventsPerSecond.toFixed(2)} (expected: ${expectedEPS})`);
    console.log(`   Event efficiency: ${eventEfficiency.toFixed(1)}%`);
    console.log(`   Error rate: ${((metrics.errorCount / Math.max(metrics.totalEvents, 1)) * 100).toFixed(2)}%`);
    
    if (metrics.connectionTime > 5000) {
      console.log(`   ⚠️  Connection time is high (${metrics.connectionTime}ms)`);
    }
    
    if (metrics.errorCount > metrics.totalEvents * 0.05) {
      console.log(`   ⚠️  High error rate: ${metrics.errorCount} errors`);
    }
    
    if (eventEfficiency < 80) {
      console.log(`   ⚠️  Low event efficiency: ${eventEfficiency.toFixed(1)}%`);
    } else if (eventEfficiency > 95) {
      console.log(`   ✅ Excellent event efficiency: ${eventEfficiency.toFixed(1)}%`);
    }
  }

  /**
   * Print summary report for all scenarios
   */
  private printSummaryReport(results: Record<string, PerformanceMetrics>): void {
    console.log('\n' + '='.repeat(80));
    console.log('📋 WEBSOCKET PERFORMANCE TEST SUMMARY');
    console.log('='.repeat(80));
    
    const scenarios = Object.keys(results);
    const totalEvents = scenarios.reduce((sum, name) => sum + results[name].totalEvents, 0);
    const totalErrors = scenarios.reduce((sum, name) => sum + results[name].errorCount, 0);
    const avgConnectionTime = scenarios.reduce((sum, name) => sum + results[name].connectionTime, 0) / scenarios.length;
    
    console.log(`\n📊 Overall Statistics:`);
    console.log(`   Scenarios run: ${scenarios.length}`);
    console.log(`   Total events processed: ${totalEvents}`);
    console.log(`   Total errors: ${totalErrors}`);
    console.log(`   Average connection time: ${avgConnectionTime.toFixed(2)}ms`);
    console.log(`   Overall error rate: ${((totalErrors / Math.max(totalEvents, 1)) * 100).toFixed(2)}%`);
    
    console.log(`\n🎯 Performance Benchmarks:`);
    console.log(`   ✅ Connection time < 3s: ${scenarios.filter(name => results[name].connectionTime < 3000).length}/${scenarios.length}`);
    console.log(`   ✅ Error rate < 5%: ${scenarios.filter(name => (results[name].errorCount / Math.max(results[name].totalEvents, 1)) < 0.05).length}/${scenarios.length}`);
    console.log(`   ✅ Memory usage < 100MB: ${scenarios.filter(name => (results[name].memoryUsage.heapUsed / 1024 / 1024) < 100).length}/${scenarios.length}`);
    
    // Performance grade
    const passedBenchmarks = scenarios.reduce((count, name) => {
      const metrics = results[name];
      let passed = 0;
      if (metrics.connectionTime < 3000) passed++;
      if ((metrics.errorCount / Math.max(metrics.totalEvents, 1)) < 0.05) passed++;
      if ((metrics.memoryUsage.heapUsed / 1024 / 1024) < 100) passed++;
      return count + passed;
    }, 0);
    
    const totalBenchmarks = scenarios.length * 3;
    const performanceScore = (passedBenchmarks / totalBenchmarks) * 100;
    
    console.log(`\n🏆 Performance Score: ${performanceScore.toFixed(1)}%`);
    
    if (performanceScore >= 90) {
      console.log('   Grade: A+ - Excellent WebSocket performance!');
    } else if (performanceScore >= 80) {
      console.log('   Grade: A - Good WebSocket performance');
    } else if (performanceScore >= 70) {
      console.log('   Grade: B - Acceptable WebSocket performance');
    } else if (performanceScore >= 60) {
      console.log('   Grade: C - WebSocket performance needs improvement');
    } else {
      console.log('   Grade: F - WebSocket performance is poor and needs attention');
    }
    
    console.log('\n' + '='.repeat(80));
  }
}

/**
 * Main execution function
 */
async function runPerformanceTests(): Promise<void> {
  console.log('🧪 WebSocket Performance Test Suite');
  console.log('=====================================\n');
  
  const tester = new WebSocketPerformanceTester();
  
  try {
    await tester.runAllScenarios();
    console.log('\n🎉 All performance tests completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Performance tests failed:', error);
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  runPerformanceTests();
}

export { WebSocketPerformanceTester, runPerformanceTests };
