/**
 * Testing Integration for Olorin Microservices
 * Provides comprehensive E2E testing, visual regression, and cross-service testing
 */

export { PlaywrightMCPClient, createPlaywrightMCPClient, PlaywrightServiceHelpers, defaultPlaywrightConfig } from './playwright-mcp';
export type {
  PlaywrightMCPConfig,
  ServiceConfig,
  TestScenario,
  TestStep,
  TestAssertion,
  TestResult,
  TestError,
  PerformanceMetrics,
  VisualRegressionResult
} from './playwright-mcp';

// Re-export for convenience
export { default as PlaywrightMCP } from './playwright-mcp';