/**
 * E2EFlowsService - Test orchestration and execution management
 * Handles end-to-end test scenario execution, coordination, and result aggregation
 */

import { TestScenarioModel, FlowResultModel, TestEnvironmentModel } from '../models';
import { TestScenario, TestEnvironment, PerformanceMetrics, StepResult, TestError } from '../models';

export interface ExecutionOptions {
  environment: string;
  timeout?: number;
  parallel?: boolean;
  maxConcurrency?: number;
  retryFailures?: boolean;
  collectMetrics?: boolean;
  saveArtifacts?: boolean;
}

export interface ExecutionSummary {
  totalScenarios: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  environment: string;
  startTime: Date;
  endTime: Date;
  averageResponseTime: number;
  errorRate: number;
}

export interface ScenarioFilter {
  type?: string[];
  tags?: string[];
  environment?: string;
  status?: string[];
  searchTerm?: string;
}

export class E2EFlowsService {
  private scenarios: Map<string, TestScenarioModel> = new Map();
  private environments: Map<string, TestEnvironmentModel> = new Map();
  private executionHistory: Map<string, FlowResultModel> = new Map();
  private activeExecutions: Map<string, Promise<FlowResultModel>> = new Map();

  constructor() {
    this.initializeDefaultEnvironments();
  }

  // Scenario Management
  public async createScenario(scenarioData: Omit<TestScenario, 'createdAt' | 'updatedAt' | 'status'>): Promise<TestScenarioModel> {
    const scenario = new TestScenarioModel(scenarioData);
    this.scenarios.set(scenario.id, scenario);
    return scenario;
  }

  public async getScenario(id: string): Promise<TestScenarioModel | null> {
    return this.scenarios.get(id) || null;
  }

  public async listScenarios(filter?: ScenarioFilter): Promise<TestScenarioModel[]> {
    let scenarios = Array.from(this.scenarios.values());

    if (filter) {
      scenarios = scenarios.filter(scenario => {
        // Filter by type
        if (filter.type && !filter.type.includes(scenario.type)) {
          return false;
        }

        // Filter by tags
        if (filter.tags && !filter.tags.some(tag => scenario.tags.includes(tag))) {
          return false;
        }

        // Filter by environment
        if (filter.environment && scenario.environment !== filter.environment) {
          return false;
        }

        // Filter by status
        if (filter.status && !filter.status.includes(scenario.status)) {
          return false;
        }

        // Filter by search term
        if (filter.searchTerm) {
          const searchTerm = filter.searchTerm.toLowerCase();
          const searchableText = `${scenario.name} ${scenario.description}`.toLowerCase();
          if (!searchableText.includes(searchTerm)) {
            return false;
          }
        }

        return true;
      });
    }

    return scenarios;
  }

  public async updateScenario(id: string, updates: Partial<TestScenario>): Promise<TestScenarioModel | null> {
    const scenario = this.scenarios.get(id);
    if (!scenario) {
      return null;
    }

    // Apply updates
    Object.assign(scenario, updates);
    scenario.updatedAt = new Date();
    scenario.validate();

    return scenario;
  }

  public async deleteScenario(id: string): Promise<boolean> {
    return this.scenarios.delete(id);
  }

  // Environment Management
  public async createEnvironment(environmentData: Omit<TestEnvironment, 'createdAt' | 'updatedAt'>): Promise<TestEnvironmentModel> {
    const environment = new TestEnvironmentModel(environmentData);
    this.environments.set(environment.id, environment);
    return environment;
  }

  public async getEnvironment(id: string): Promise<TestEnvironmentModel | null> {
    return this.environments.get(id) || null;
  }

  public async listEnvironments(): Promise<TestEnvironmentModel[]> {
    return Array.from(this.environments.values());
  }

  // Test Execution
  public async executeScenario(scenarioId: string, options: ExecutionOptions = { environment: 'default' }): Promise<FlowResultModel> {
    const scenario = await this.getScenario(scenarioId);
    if (!scenario) {
      throw new Error(`Scenario ${scenarioId} not found`);
    }

    const environment = await this.getEnvironment(options.environment || scenario.environment);
    if (!environment) {
      throw new Error(`Environment ${options.environment || scenario.environment} not found`);
    }

    // Check if already executing
    if (this.activeExecutions.has(scenarioId)) {
      throw new Error(`Scenario ${scenarioId} is already executing`);
    }

    // Create execution promise
    const executionPromise = this.performExecution(scenario, environment, options);
    this.activeExecutions.set(scenarioId, executionPromise);

    try {
      const result = await executionPromise;
      this.executionHistory.set(result.id, result);
      return result;
    } finally {
      this.activeExecutions.delete(scenarioId);
    }
  }

  public async executeMultipleScenarios(scenarioIds: string[], options: ExecutionOptions = { environment: 'default' }): Promise<ExecutionSummary> {
    const startTime = new Date();
    const results: FlowResultModel[] = [];

    if (options.parallel && options.maxConcurrency) {
      // Execute in parallel with concurrency limit
      const chunks = this.chunkArray(scenarioIds, options.maxConcurrency);

      for (const chunk of chunks) {
        const promises = chunk.map(id => this.executeScenario(id, options).catch(error => {
          console.error(`Failed to execute scenario ${id}:`, error);
          return null;
        }));

        const chunkResults = await Promise.all(promises);
        results.push(...chunkResults.filter(result => result !== null) as FlowResultModel[]);
      }
    } else if (options.parallel) {
      // Execute all in parallel
      const promises = scenarioIds.map(id => this.executeScenario(id, options).catch(error => {
        console.error(`Failed to execute scenario ${id}:`, error);
        return null;
      }));

      const parallelResults = await Promise.all(promises);
      results.push(...parallelResults.filter(result => result !== null) as FlowResultModel[]);
    } else {
      // Execute sequentially
      for (const scenarioId of scenarioIds) {
        try {
          const result = await this.executeScenario(scenarioId, options);
          results.push(result);
        } catch (error) {
          console.error(`Failed to execute scenario ${scenarioId}:`, error);
        }
      }
    }

    const endTime = new Date();
    return this.generateExecutionSummary(results, startTime, endTime, options.environment || 'default');
  }

  public async getExecutionResult(resultId: string): Promise<FlowResultModel | null> {
    return this.executionHistory.get(resultId) || null;
  }

  public async listExecutionResults(limit = 100): Promise<FlowResultModel[]> {
    const results = Array.from(this.executionHistory.values());
    return results
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);
  }

  public async cancelExecution(scenarioId: string): Promise<boolean> {
    const activeExecution = this.activeExecutions.get(scenarioId);
    if (!activeExecution) {
      return false;
    }

    // In a real implementation, this would send a cancellation signal
    // For now, we'll just remove it from active executions
    this.activeExecutions.delete(scenarioId);
    return true;
  }

  // Health Check
  public async healthCheck(): Promise<{ status: string; scenarios: number; environments: number; activeExecutions: number }> {
    return {
      status: 'healthy',
      scenarios: this.scenarios.size,
      environments: this.environments.size,
      activeExecutions: this.activeExecutions.size
    };
  }

  // Private Methods
  private async performExecution(
    scenario: TestScenarioModel,
    environment: TestEnvironmentModel,
    options: ExecutionOptions
  ): Promise<FlowResultModel> {
    const startTime = new Date();
    const runId = `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const resultId = `result-${scenario.id}-${Date.now()}`;

    // Update scenario status
    scenario.updateStatus('RUNNING');

    const stepResults: StepResult[] = [];
    const errors: TestError[] = [];
    let overallStatus: 'passed' | 'failed' | 'timeout' | 'error' = 'passed';

    try {
      // Execute each step
      for (const step of scenario.steps) {
        const stepStartTime = new Date();

        try {
          // Simulate step execution
          await this.executeStep(step, environment, options);

          const stepEndTime = new Date();
          const stepResult: StepResult = {
            stepOrder: step.order,
            stepName: step.name,
            status: 'passed',
            startTime: stepStartTime,
            endTime: stepEndTime,
            duration: stepEndTime.getTime() - stepStartTime.getTime(),
            actualResult: step.expectedResult,
            expectedResult: step.expectedResult
          };

          stepResults.push(stepResult);

        } catch (error) {
          const stepEndTime = new Date();
          const testError: TestError = {
            type: 'execution',
            message: error instanceof Error ? error.message : 'Unknown error',
            stackTrace: error instanceof Error ? (error.stack || '') : '',
            timestamp: new Date(),
            severity: 'high',
            context: { step: step.name, order: step.order }
          };

          errors.push(testError);

          const stepResult: StepResult = {
            stepOrder: step.order,
            stepName: step.name,
            status: 'failed',
            startTime: stepStartTime,
            endTime: stepEndTime,
            duration: stepEndTime.getTime() - stepStartTime.getTime(),
            actualResult: null,
            expectedResult: step.expectedResult,
            error: testError
          };

          stepResults.push(stepResult);
          overallStatus = 'failed';
        }
      }

      // Update scenario status based on results
      scenario.updateStatus(overallStatus === 'passed' ? 'PASSED' : 'FAILED');

    } catch (error) {
      overallStatus = 'error';
      scenario.updateStatus('FAILED');

      errors.push({
        type: 'system',
        message: error instanceof Error ? error.message : 'System error',
        stackTrace: error instanceof Error ? (error.stack || '') : '',
        timestamp: new Date(),
        severity: 'critical'
      });
    }

    const endTime = new Date();
    const metrics: PerformanceMetrics = {
      responseTime: endTime.getTime() - startTime.getTime(),
      throughput: stepResults.length / ((endTime.getTime() - startTime.getTime()) / 1000),
      errorRate: (errors.length / Math.max(stepResults.length, 1)) * 100,
      memoryUsage: process.memoryUsage().heapUsed,
      cpuUsage: 0, // Would need actual CPU monitoring
      networkIO: {
        bytesSent: 0,
        bytesReceived: 0,
        requestCount: stepResults.length,
        connectionTime: 0
      }
    };

    return new FlowResultModel({
      id: resultId,
      scenarioId: scenario.id,
      runId,
      status: overallStatus,
      startTime,
      endTime,
      steps: stepResults,
      metrics,
      errors,
      artifacts: [],
      environment: environment.name,
      buildInfo: {
        version: '1.0.0',
        commit: 'HEAD',
        branch: 'main',
        buildDate: new Date(),
        environment: environment.name
      }
    });
  }

  private async executeStep(step: any, _environment: TestEnvironmentModel, options: ExecutionOptions): Promise<void> {
    // Simulate step execution with timeout
    const timeout = step.timeout || options.timeout || 30000;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Step ${step.name} timed out after ${timeout}ms`));
      }, timeout);

      // Simulate async work
      setTimeout(() => {
        clearTimeout(timer);

        // Simulate occasional failures for testing
        if (Math.random() < 0.1) { // 10% failure rate
          reject(new Error(`Step ${step.name} failed randomly`));
        } else {
          resolve();
        }
      }, Math.random() * 1000); // Random delay 0-1s
    });
  }

  private generateExecutionSummary(
    results: FlowResultModel[],
    startTime: Date,
    endTime: Date,
    environment: string
  ): ExecutionSummary {
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed' || r.status === 'error').length;
    const skipped = results.filter(r => r.status === 'timeout').length;

    const totalResponseTime = results.reduce((sum, r) => sum + r.metrics.responseTime, 0);
    const averageResponseTime = results.length > 0 ? totalResponseTime / results.length : 0;

    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const errorRate = results.length > 0 ? (totalErrors / results.length) * 100 : 0;

    return {
      totalScenarios: results.length,
      passed,
      failed,
      skipped,
      duration: endTime.getTime() - startTime.getTime(),
      environment,
      startTime,
      endTime,
      averageResponseTime,
      errorRate
    };
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private initializeDefaultEnvironments(): void {
    const defaultEnvs = [
      {
        id: 'local',
        name: 'Local Development',
        type: 'local' as const,
        baseUrl: 'http://localhost:3000',
        services: [],
        credentials: { encrypted: false, credentials: {} },
        features: [],
        limits: {
          maxConcurrentTests: 5,
          maxMemoryMB: 1024,
          maxExecutionTimeMs: 300000,
          maxFileUploadMB: 10,
          maxApiCallsPerMinute: 100,
          maxStorageGB: 1
        },
        mockConfig: {
          enabled: true,
          serviceEndpoints: [],
          responseDelay: 100,
          errorRate: 0,
          fallbackToReal: false
        },
        isActive: true
      },
      {
        id: 'test',
        name: 'Test Environment',
        type: 'ci' as const,
        baseUrl: 'http://localhost:3001',
        services: [],
        credentials: { encrypted: false, credentials: {} },
        features: [],
        limits: {
          maxConcurrentTests: 10,
          maxMemoryMB: 2048,
          maxExecutionTimeMs: 600000,
          maxFileUploadMB: 50,
          maxApiCallsPerMinute: 500,
          maxStorageGB: 5
        },
        mockConfig: {
          enabled: true,
          serviceEndpoints: [],
          responseDelay: 50,
          errorRate: 0,
          fallbackToReal: false
        },
        isActive: true
      }
    ];

    for (const envData of defaultEnvs) {
      const environment = new TestEnvironmentModel(envData);
      this.environments.set(environment.id, environment);
    }
  }
}

export default E2EFlowsService;