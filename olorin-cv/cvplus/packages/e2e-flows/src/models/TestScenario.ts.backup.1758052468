/**
 * TestScenario entity model
 * Represents a complete test flow with steps, expected outcomes, and validation criteria.
 */

export interface TestStep {
  order: number;
  name: string;
  action: string;
  parameters: Record<string, any>;
  expectedResult: any;
  timeout: number;
}

export interface TestOutcome {
  type: 'assertion' | 'performance' | 'visual' | 'functional';
  condition: string;
  expectedValue: any;
  tolerance?: number;
}

export interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  exponentialBackoff: boolean;
  retryableStatuses: string[];
}

export type TestScenarioType = 'e2e' | 'integration' | 'api' | 'load' | 'regression';
export type TestScenarioStatus = 'CREATED' | 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'TIMEOUT' | 'RETRYING';

export interface TestScenario {
  id: string;
  name: string;
  description: string;
  type: TestScenarioType;
  environment: string;
  steps: TestStep[];
  expectedOutcomes: TestOutcome[];
  tags: string[];
  timeout: number;
  dependencies: string[];
  retryConfig: RetryConfig;
  createdAt: Date;
  updatedAt: Date;
  status?: TestScenarioStatus;
}

export class TestScenarioModel implements TestScenario {
  public readonly id: string;
  public name: string;
  public description: string;
  public type: TestScenarioType;
  public environment: string;
  public steps: TestStep[];
  public expectedOutcomes: TestOutcome[];
  public tags: string[];
  public timeout: number;
  public dependencies: string[];
  public retryConfig: RetryConfig;
  public readonly createdAt: Date;
  public updatedAt: Date;
  public status: TestScenarioStatus;

  constructor(data: Omit<TestScenario, 'createdAt' | 'updatedAt' | 'status'>) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.type = data.type;
    this.environment = data.environment;
    this.steps = data.steps;
    this.expectedOutcomes = data.expectedOutcomes;
    this.tags = data.tags;
    this.timeout = data.timeout;
    this.dependencies = data.dependencies;
    this.retryConfig = data.retryConfig;
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.status = 'CREATED';

    this.validate();
  }

  public validate(): void {
    if (!this.name?.trim()) {
      throw new Error('TestScenario name is required');
    }

    if (this.timeout < 1000 || this.timeout > 1200000) { // 1 second to 20 minutes
      throw new Error('Timeout must be between 1 second and 20 minutes');
    }

    if (this.expectedOutcomes.length === 0) {
      throw new Error('At least one expected outcome is required');
    }

    if (this.steps.length === 0) {
      throw new Error('At least one test step is required');
    }

    // Validate steps are in logical order
    const orders = this.steps.map(step => step.order);
    const sortedOrders = [...orders].sort((a, b) => a - b);
    if (!orders.every((order, index) => order === sortedOrders[index])) {
      throw new Error('Steps must be in logical execution order');
    }

    // Validate step order uniqueness
    const uniqueOrders = new Set(orders);
    if (uniqueOrders.size !== orders.length) {
      throw new Error('Step orders must be unique');
    }
  }

  public updateStatus(status: TestScenarioStatus): void {
    // Validate state transitions
    const validTransitions: Record<TestScenarioStatus, TestScenarioStatus[]> = {
      'CREATED': ['PENDING'],
      'PENDING': ['RUNNING'],
      'RUNNING': ['PASSED', 'FAILED', 'TIMEOUT'],
      'PASSED': [], // Terminal state
      'FAILED': ['RETRYING'],
      'TIMEOUT': ['RETRYING'],
      'RETRYING': ['RUNNING']
    };

    const allowedTransitions = validTransitions[this.status] || [];
    if (!allowedTransitions.includes(status)) {
      throw new Error(`Invalid status transition from ${this.status} to ${status}`);
    }

    this.status = status;
    this.updatedAt = new Date();
  }

  public addStep(step: Omit<TestStep, 'order'>): void {
    const nextOrder = Math.max(...this.steps.map(s => s.order), 0) + 1;
    this.steps.push({ ...step, order: nextOrder });
    this.updatedAt = new Date();
    this.validate();
  }

  public removeStep(order: number): void {
    this.steps = this.steps.filter(step => step.order !== order);
    this.updatedAt = new Date();
    this.validate();
  }

  public addExpectedOutcome(outcome: TestOutcome): void {
    this.expectedOutcomes.push(outcome);
    this.updatedAt = new Date();
    this.validate();
  }

  public toJSON(): TestScenario {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      type: this.type,
      environment: this.environment,
      steps: this.steps,
      expectedOutcomes: this.expectedOutcomes,
      tags: this.tags,
      timeout: this.timeout,
      dependencies: this.dependencies,
      retryConfig: this.retryConfig,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      status: this.status
    };
  }

  public static fromJSON(data: any): TestScenarioModel {
    const scenario = new TestScenarioModel({
      id: data.id,
      name: data.name,
      description: data.description,
      type: data.type,
      environment: data.environment,
      steps: data.steps,
      expectedOutcomes: data.expectedOutcomes,
      tags: data.tags,
      timeout: data.timeout,
      dependencies: data.dependencies,
      retryConfig: data.retryConfig
    });

    if (data.status) {
      scenario.status = data.status;
    }
    if (data.createdAt) {
      (scenario as any).createdAt = new Date(data.createdAt);
    }
    if (data.updatedAt) {
      scenario.updatedAt = new Date(data.updatedAt);
    }

    return scenario;
  }
}

export default TestScenarioModel;