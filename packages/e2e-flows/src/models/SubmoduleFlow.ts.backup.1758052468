/**
 * SubmoduleFlow entity model
 * Isolated test scenarios for individual CVPlus submodules with dependency mocking.
 */

import { TestScenario } from './TestScenario';

export interface ModuleDependency {
  name: string;
  version: string;
  type: 'internal' | 'external' | 'peer';
  required: boolean;
  mockable: boolean;
  endpoint?: string;
  description: string;
}

export interface MockService {
  serviceName: string;
  mockType: 'static' | 'dynamic' | 'recorded' | 'ai-generated';
  mockData: any;
  responses: MockResponse[];
  behavior: MockBehavior;
  enabled: boolean;
}

export interface MockResponse {
  method: string;
  endpoint: string;
  status: number;
  headers: Record<string, string>;
  body: any;
  delay?: number;
  errorRate?: number;
}

export interface MockBehavior {
  responsePattern: 'sequential' | 'random' | 'weighted';
  failureMode: 'none' | 'intermittent' | 'cascading';
  latencySimulation: {
    min: number;
    max: number;
    distribution: 'uniform' | 'normal' | 'exponential';
  };
}

export interface CoverageTarget {
  linesCoverage: number;
  functionsCoverage: number;
  branchesCoverage: number;
  statementsCoverage: number;
  minimumThreshold: number;
  enforceGates: boolean;
}

export interface IsolationConfig {
  level: IsolationLevel;
  mockedServices: string[];
  allowedExternalCalls: string[];
  networkIsolation: boolean;
  filesystemIsolation: boolean;
  databaseIsolation: boolean;
}

export type IsolationLevel = 'full' | 'partial' | 'none';

export interface SubmoduleFlow {
  id: string;
  moduleName: string;
  moduleVersion: string;
  dependencies: ModuleDependency[];
  mocks: MockService[];
  testScenarios: TestScenario[];
  isolationLevel: IsolationLevel;
  setupCommands: string[];
  teardownCommands: string[];
  coverage: CoverageTarget;
}

export class SubmoduleFlowModel implements SubmoduleFlow {
  public readonly id: string;
  public moduleName: string;
  public moduleVersion: string;
  public dependencies: ModuleDependency[];
  public mocks: MockService[];
  public testScenarios: TestScenario[];
  public isolationLevel: IsolationLevel;
  public setupCommands: string[];
  public teardownCommands: string[];
  public coverage: CoverageTarget;

  private static readonly VALID_MODULES = [
    'core', 'auth', 'i18n', 'cv-processing', 'multimedia', 'analytics',
    'premium', 'recommendations', 'public-profiles', 'admin', 'workflow',
    'payments', 'e2e-flows', 'portal-generator', 'portal-analytics',
    'rag-chat', 'shell', 'logging'
  ];

  constructor(data: SubmoduleFlow) {
    this.id = data.id;
    this.moduleName = data.moduleName;
    this.moduleVersion = data.moduleVersion;
    this.dependencies = data.dependencies;
    this.mocks = data.mocks;
    this.testScenarios = data.testScenarios;
    this.isolationLevel = data.isolationLevel;
    this.setupCommands = data.setupCommands;
    this.teardownCommands = data.teardownCommands;
    this.coverage = data.coverage;

    this.validate();
  }

  public validate(): void {
    if (!this.moduleName?.trim()) {
      throw new Error('Module name is required');
    }

    if (!SubmoduleFlowModel.VALID_MODULES.includes(this.moduleName)) {
      throw new Error(`Module name must match existing submodule. Valid modules: ${SubmoduleFlowModel.VALID_MODULES.join(', ')}`);
    }

    if (!this.isValidSemanticVersion(this.moduleVersion)) {
      throw new Error('Version must be valid semantic version (e.g., 1.0.0)');
    }

    this.validateIsolationConfiguration();
    this.validateCoverageTargets();
    this.validateMockServices();
    this.validateDependencies();
  }

  private isValidSemanticVersion(version: string): boolean {
    const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
    return semverRegex.test(version);
  }

  private validateIsolationConfiguration(): void {
    if (!['full', 'partial', 'none'].includes(this.isolationLevel)) {
      throw new Error('Isolation level must be properly configured (full, partial, or none)');
    }

    // Full isolation requires mocks for all external dependencies
    if (this.isolationLevel === 'full') {
      const externalDeps = this.dependencies.filter(dep => dep.type === 'external' && dep.required);
      const mockedServices = new Set(this.mocks.filter(mock => mock.enabled).map(mock => mock.serviceName));

      for (const dep of externalDeps) {
        if (dep.mockable && !mockedServices.has(dep.name)) {
          throw new Error(`Full isolation requires mock for external dependency: ${dep.name}`);
        }
      }
    }
  }

  private validateCoverageTargets(): void {
    const { coverage } = this;

    const coverageFields = ['linesCoverage', 'functionsCoverage', 'branchesCoverage', 'statementsCoverage', 'minimumThreshold'];

    for (const field of coverageFields) {
      const value = (coverage as any)[field];
      if (typeof value !== 'number' || value < 0 || value > 100) {
        throw new Error(`Coverage ${field} must be between 0 and 100`);
      }
    }

    // Minimum threshold should not be higher than any specific coverage target
    const maxTarget = Math.max(
      coverage.linesCoverage,
      coverage.functionsCoverage,
      coverage.branchesCoverage,
      coverage.statementsCoverage
    );

    if (coverage.minimumThreshold > maxTarget) {
      throw new Error('Minimum threshold cannot be higher than the maximum coverage target');
    }
  }

  private validateMockServices(): void {
    const serviceNames = new Set<string>();

    for (const mock of this.mocks) {
      if (serviceNames.has(mock.serviceName)) {
        throw new Error(`Duplicate mock service: ${mock.serviceName}`);
      }
      serviceNames.add(mock.serviceName);

      // Validate mock responses
      for (const response of mock.responses) {
        if (!response.method || !response.endpoint) {
          throw new Error(`Mock service ${mock.serviceName}: method and endpoint are required`);
        }

        if (response.status < 100 || response.status > 599) {
          throw new Error(`Mock service ${mock.serviceName}: invalid HTTP status code ${response.status}`);
        }

        if (response.delay && (response.delay < 0 || response.delay > 60000)) {
          throw new Error(`Mock service ${mock.serviceName}: delay must be between 0ms and 60 seconds`);
        }

        if (response.errorRate && (response.errorRate < 0 || response.errorRate > 100)) {
          throw new Error(`Mock service ${mock.serviceName}: error rate must be between 0% and 100%`);
        }
      }

      // Validate latency simulation
      const latency = mock.behavior.latencySimulation;
      if (latency.min < 0 || latency.max < latency.min || latency.max > 60000) {
        throw new Error(`Mock service ${mock.serviceName}: invalid latency simulation configuration`);
      }
    }
  }

  private validateDependencies(): void {
    const dependencyNames = new Set<string>();

    for (const dep of this.dependencies) {
      if (dependencyNames.has(dep.name)) {
        throw new Error(`Duplicate dependency: ${dep.name}`);
      }
      dependencyNames.add(dep.name);

      if (!this.isValidSemanticVersion(dep.version)) {
        throw new Error(`Dependency ${dep.name}: invalid semantic version ${dep.version}`);
      }

      if (!['internal', 'external', 'peer'].includes(dep.type)) {
        throw new Error(`Dependency ${dep.name}: invalid type ${dep.type}`);
      }
    }
  }

  public addDependency(dependency: ModuleDependency): void {
    // Check for duplicate
    if (this.dependencies.some(dep => dep.name === dependency.name)) {
      throw new Error(`Dependency ${dependency.name} already exists`);
    }

    this.dependencies.push(dependency);
    this.validate();
  }

  public removeDependency(dependencyName: string): void {
    const initialLength = this.dependencies.length;
    this.dependencies = this.dependencies.filter(dep => dep.name !== dependencyName);

    if (this.dependencies.length === initialLength) {
      throw new Error(`Dependency ${dependencyName} not found`);
    }

    // Remove associated mocks
    this.mocks = this.mocks.filter(mock => mock.serviceName !== dependencyName);
  }

  public addMockService(mockService: MockService): void {
    // Check for duplicate
    if (this.mocks.some(mock => mock.serviceName === mockService.serviceName)) {
      throw new Error(`Mock service ${mockService.serviceName} already exists`);
    }

    this.mocks.push(mockService);
    this.validate();
  }

  public removeMockService(serviceName: string): void {
    const initialLength = this.mocks.length;
    this.mocks = this.mocks.filter(mock => mock.serviceName !== serviceName);

    if (this.mocks.length === initialLength) {
      throw new Error(`Mock service ${serviceName} not found`);
    }
  }

  public enableMock(serviceName: string): void {
    const mock = this.mocks.find(m => m.serviceName === serviceName);
    if (!mock) {
      throw new Error(`Mock service ${serviceName} not found`);
    }
    mock.enabled = true;
  }

  public disableMock(serviceName: string): void {
    const mock = this.mocks.find(m => m.serviceName === serviceName);
    if (!mock) {
      throw new Error(`Mock service ${serviceName} not found`);
    }
    mock.enabled = false;
  }

  public addTestScenario(scenario: TestScenario): void {
    // Validate scenario is appropriate for this module
    if (scenario.tags && !scenario.tags.some(tag => tag.includes(this.moduleName))) {
      scenario.tags.push(`module:${this.moduleName}`);
    }

    this.testScenarios.push(scenario);
  }

  public removeTestScenario(scenarioId: string): void {
    const initialLength = this.testScenarios.length;
    this.testScenarios = this.testScenarios.filter(scenario => scenario.id !== scenarioId);

    if (this.testScenarios.length === initialLength) {
      throw new Error(`Test scenario ${scenarioId} not found`);
    }
  }

  public getEnabledMocks(): MockService[] {
    return this.mocks.filter(mock => mock.enabled);
  }

  public getRequiredDependencies(): ModuleDependency[] {
    return this.dependencies.filter(dep => dep.required);
  }

  public updateCoverageTarget(updates: Partial<CoverageTarget>): void {
    this.coverage = { ...this.coverage, ...updates };
    this.validate();
  }

  public toJSON(): SubmoduleFlow {
    return {
      id: this.id,
      moduleName: this.moduleName,
      moduleVersion: this.moduleVersion,
      dependencies: this.dependencies,
      mocks: this.mocks,
      testScenarios: this.testScenarios,
      isolationLevel: this.isolationLevel,
      setupCommands: this.setupCommands,
      teardownCommands: this.teardownCommands,
      coverage: this.coverage
    };
  }

  public static fromJSON(data: any): SubmoduleFlowModel {
    return new SubmoduleFlowModel({
      id: data.id,
      moduleName: data.moduleName,
      moduleVersion: data.moduleVersion,
      dependencies: data.dependencies,
      mocks: data.mocks,
      testScenarios: data.testScenarios,
      isolationLevel: data.isolationLevel,
      setupCommands: data.setupCommands,
      teardownCommands: data.teardownCommands,
      coverage: data.coverage
    });
  }
}

export default SubmoduleFlowModel;