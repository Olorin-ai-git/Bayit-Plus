/**
 * E2E Testing Flows Models
 * Export all entity models for the e2e-flows submodule
 */

// Core entity models
export { default as TestScenarioModel, TestScenario, TestStep, TestOutcome, RetryConfig, TestScenarioType, TestScenarioStatus } from './TestScenario';
export { default as MockDataSetModel, MockDataSet, MockDataMetadata, JSONSchema, MockDataType } from './MockDataSet';
export { default as FlowResultModel, FlowResult, StepResult, PerformanceMetrics, NetworkMetrics, TestError, ResultArtifact, BuildInfo, FlowResultStatus } from './FlowResult';
export { default as TestEnvironmentModel, TestEnvironment, ServiceEndpoint, AuthConfig, RateLimitConfig, EnvironmentCredentials, FeatureFlag, ResourceLimits, MockConfiguration, EnvironmentType } from './TestEnvironment';
export { default as APITestCaseModel, APITestCase, ResponseAssertion, APIResult, AssertionResult, HTTPMethod } from './APITestCase';
export { default as SubmoduleFlowModel, SubmoduleFlow, ModuleDependency, MockService, MockResponse, MockBehavior, CoverageTarget, IsolationConfig, IsolationLevel } from './SubmoduleFlow';
export { default as RegressionBaselineModel, RegressionBaseline, BaselineMetrics, BaselineResults, BaselineOutcome, BaselineArtifact, ToleranceConfig, ComparisonRule, RuleViolation, ComparisonResult, ComparisonSummary } from './RegressionBaseline';

// Model collection for dynamic loading
import TestScenarioModelClass from './TestScenario';
import MockDataSetModelClass from './MockDataSet';
import FlowResultModelClass from './FlowResult';
import TestEnvironmentModelClass from './TestEnvironment';
import APITestCaseModelClass from './APITestCase';
import SubmoduleFlowModelClass from './SubmoduleFlow';
import RegressionBaselineModelClass from './RegressionBaseline';

export const E2EModels = {
  TestScenario: TestScenarioModelClass,
  MockDataSet: MockDataSetModelClass,
  FlowResult: FlowResultModelClass,
  TestEnvironment: TestEnvironmentModelClass,
  APITestCase: APITestCaseModelClass,
  SubmoduleFlow: SubmoduleFlowModelClass,
  RegressionBaseline: RegressionBaselineModelClass
} as const;

// Type for model names
export type E2EModelName = keyof typeof E2EModels;

// Factory function for creating models
export function createModel<T extends E2EModelName>(
  modelName: T,
  data: any
): InstanceType<(typeof E2EModels)[T]> {
  const ModelClass = E2EModels[modelName];
  return new ModelClass(data) as InstanceType<(typeof E2EModels)[T]>;
}

// Factory function for creating models from JSON
export function createModelFromJSON<T extends E2EModelName>(
  modelName: T,
  data: any
): InstanceType<(typeof E2EModels)[T]> {
  const ModelClass = E2EModels[modelName];
  return ModelClass.fromJSON(data) as InstanceType<(typeof E2EModels)[T]>;
}