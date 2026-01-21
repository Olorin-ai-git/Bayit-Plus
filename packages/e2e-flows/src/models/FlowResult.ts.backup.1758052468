/**
 * FlowResult entity model
 * Captures test execution outcomes including performance metrics, validation results, and error details.
 */

export interface StepResult {
  stepOrder: number;
  stepName: string;
  status: 'passed' | 'failed' | 'skipped' | 'timeout';
  startTime: Date;
  endTime: Date;
  duration: number;
  actualResult: any;
  expectedResult: any;
  error?: TestError;
  artifacts?: ResultArtifact[];
}

export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
  networkIO: NetworkMetrics;
}

export interface NetworkMetrics {
  bytesSent: number;
  bytesReceived: number;
  requestCount: number;
  connectionTime: number;
}

export interface TestError {
  type: string;
  message: string;
  stackTrace?: string;
  code?: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
}

export interface ResultArtifact {
  type: 'log' | 'screenshot' | 'recording' | 'report' | 'data';
  name: string;
  path: string;
  size: number;
  mimeType: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface BuildInfo {
  version: string;
  commit: string;
  branch: string;
  buildNumber?: string;
  buildDate: Date;
  environment: string;
}

export type FlowResultStatus = 'passed' | 'failed' | 'timeout' | 'error';

export interface FlowResult {
  id: string;
  scenarioId: string;
  runId: string;
  status: FlowResultStatus;
  startTime: Date;
  endTime: Date;
  duration: number;
  steps: StepResult[];
  metrics: PerformanceMetrics;
  errors: TestError[];
  artifacts: ResultArtifact[];
  environment: string;
  buildInfo: BuildInfo;
}

export class FlowResultModel implements FlowResult {
  public readonly id: string;
  public readonly scenarioId: string;
  public readonly runId: string;
  public status: FlowResultStatus;
  public startTime: Date;
  public endTime: Date;
  public duration: number;
  public steps: StepResult[];
  public metrics: PerformanceMetrics;
  public errors: TestError[];
  public artifacts: ResultArtifact[];
  public readonly environment: string;
  public readonly buildInfo: BuildInfo;

  constructor(data: Omit<FlowResult, 'duration'>) {
    this.id = data.id;
    this.scenarioId = data.scenarioId;
    this.runId = data.runId;
    this.status = data.status;
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.steps = data.steps;
    this.metrics = data.metrics;
    this.errors = data.errors;
    this.artifacts = data.artifacts;
    this.environment = data.environment;
    this.buildInfo = data.buildInfo;

    // Calculate duration
    this.duration = this.endTime.getTime() - this.startTime.getTime();

    this.validate();
  }

  public validate(): void {
    if (this.endTime <= this.startTime) {
      throw new Error('End time must be after start time');
    }

    const calculatedDuration = this.endTime.getTime() - this.startTime.getTime();
    if (Math.abs(this.duration - calculatedDuration) > 1000) { // Allow 1 second tolerance
      throw new Error('Duration must match calculated time difference');
    }

    // Validate status consistency
    const hasFailedSteps = this.steps.some(step => step.status === 'failed');
    const hasTimeoutSteps = this.steps.some(step => step.status === 'timeout');
    const hasErrors = this.errors.length > 0;

    if (this.status === 'passed' && (hasFailedSteps || hasTimeoutSteps || hasErrors)) {
      throw new Error('Status cannot be passed when there are failed steps or errors');
    }

    if (this.status === 'failed' && !hasFailedSteps && !hasErrors) {
      throw new Error('Failed status requires failed steps or errors');
    }

    if (this.status === 'timeout' && !hasTimeoutSteps) {
      throw new Error('Timeout status requires timeout steps');
    }

    // Validate all errors have descriptive messages
    for (const error of this.errors) {
      if (!error.message?.trim()) {
        throw new Error('All errors must have descriptive messages');
      }
    }

    // Validate step results
    for (const step of this.steps) {
      if (step.endTime <= step.startTime) {
        throw new Error(`Step ${step.stepName}: end time must be after start time`);
      }

      const stepDuration = step.endTime.getTime() - step.startTime.getTime();
      if (Math.abs(step.duration - stepDuration) > 100) { // Allow 100ms tolerance
        throw new Error(`Step ${step.stepName}: duration must match calculated time difference`);
      }
    }
  }

  public addStepResult(stepResult: StepResult): void {
    this.steps.push(stepResult);
    this.updateOverallStatus();
  }

  public addError(error: TestError): void {
    this.errors.push(error);
    this.updateOverallStatus();
  }

  public addArtifact(artifact: ResultArtifact): void {
    this.artifacts.push(artifact);
  }

  private updateOverallStatus(): void {
    const hasFailedSteps = this.steps.some(step => step.status === 'failed');
    const hasTimeoutSteps = this.steps.some(step => step.status === 'timeout');
    const hasErrors = this.errors.length > 0;
    const hasCriticalErrors = this.errors.some(error => error.severity === 'critical');

    if (hasCriticalErrors) {
      this.status = 'error';
    } else if (hasTimeoutSteps) {
      this.status = 'timeout';
    } else if (hasFailedSteps || hasErrors) {
      this.status = 'failed';
    } else if (this.steps.length > 0 && this.steps.every(step => step.status === 'passed')) {
      this.status = 'passed';
    }
  }

  public getSuccessRate(): number {
    if (this.steps.length === 0) return 0;
    const passedSteps = this.steps.filter(step => step.status === 'passed').length;
    return (passedSteps / this.steps.length) * 100;
  }

  public getTotalArtifactSize(): number {
    return this.artifacts.reduce((total, artifact) => total + artifact.size, 0);
  }

  public getErrorsByType(): Record<string, TestError[]> {
    return this.errors.reduce((acc, error) => {
      if (!acc[error.type]) {
        acc[error.type] = [];
      }
      acc[error.type].push(error);
      return acc;
    }, {} as Record<string, TestError[]>);
  }

  public getCriticalErrors(): TestError[] {
    return this.errors.filter(error => error.severity === 'critical');
  }

  public toJSON(): FlowResult {
    return {
      id: this.id,
      scenarioId: this.scenarioId,
      runId: this.runId,
      status: this.status,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.duration,
      steps: this.steps,
      metrics: this.metrics,
      errors: this.errors,
      artifacts: this.artifacts,
      environment: this.environment,
      buildInfo: this.buildInfo
    };
  }

  public static fromJSON(data: any): FlowResultModel {
    return new FlowResultModel({
      id: data.id,
      scenarioId: data.scenarioId,
      runId: data.runId,
      status: data.status,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      steps: data.steps.map((step: any) => ({
        ...step,
        startTime: new Date(step.startTime),
        endTime: new Date(step.endTime),
        error: step.error ? {
          ...step.error,
          timestamp: new Date(step.error.timestamp)
        } : undefined
      })),
      metrics: data.metrics,
      errors: data.errors.map((error: any) => ({
        ...error,
        timestamp: new Date(error.timestamp)
      })),
      artifacts: data.artifacts.map((artifact: any) => ({
        ...artifact,
        createdAt: new Date(artifact.createdAt)
      })),
      environment: data.environment,
      buildInfo: {
        ...data.buildInfo,
        buildDate: new Date(data.buildInfo.buildDate)
      }
    });
  }
}

export default FlowResultModel;