/**
 * E2E Testing Services
 * Export all service classes for the e2e-flows submodule
  */

// Core services
export { default as E2EFlowsService, ExecutionOptions, ExecutionSummary, ScenarioFilter } from './E2EFlowsService';
export { default as MockDataService, DataGenerationOptions, DataCacheOptions, DataExportOptions, DataTemplate } from './MockDataService';
export { default as APITestingService, TestSuiteOptions, TestSuiteResult, TestSummary, EndpointGroup } from './APITestingService';

// Service collection for dependency injection
export const E2EServices = {
  E2EFlowsService,
  MockDataService,
  APITestingService
} as const;

// Type for service names
export type E2EServiceName = keyof typeof E2EServices;

// Factory function for creating services
export function createService<T extends E2EServiceName>(
  serviceName: T,
  ...args: any[]
): InstanceType<(typeof E2EServices)[T]> {
  const ServiceClass = E2EServices[serviceName];
  return new ServiceClass(...args) as InstanceType<(typeof E2EServices)[T]>;
}