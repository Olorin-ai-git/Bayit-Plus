/**
 * E2E Testing Services
 * Export all service classes for the e2e-flows submodule
  */

// Core services
import E2EFlowsServiceClass, { ExecutionOptions, ExecutionSummary, ScenarioFilter } from './E2EFlowsService';
import MockDataServiceClass, { DataGenerationOptions, DataCacheOptions, DataExportOptions, DataTemplate } from './MockDataService';
import APITestingServiceClass, { TestSuiteOptions, TestSuiteResult, TestSummary, EndpointGroup } from './APITestingService';

export { E2EFlowsServiceClass as E2EFlowsService };
export { MockDataServiceClass as MockDataService };
export { APITestingServiceClass as APITestingService };
export type { ExecutionOptions, ExecutionSummary, ScenarioFilter };
export type { DataGenerationOptions, DataCacheOptions, DataExportOptions, DataTemplate };
export type { TestSuiteOptions, TestSuiteResult, TestSummary, EndpointGroup };

// Service collection for dependency injection
export const E2EServices = {
  E2EFlowsService: E2EFlowsServiceClass,
  MockDataService: MockDataServiceClass,
  APITestingService: APITestingServiceClass
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