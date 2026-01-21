/**
 * CVPlus Unified Module Requirements System
 * Main entry point for the complete system
 */

// Core exports
export { getUnifiedModuleRequirementsService } from './lib/index';
export { UnifiedModuleRequirementsService } from './lib/UnifiedModuleRequirementsService';

// API exports
export { ModuleRequirementsServer } from './api/server';
export { validationRoutes } from './api/routes/validation';
export { templateRoutes } from './api/routes/templates';
export { architectureRoutes } from './api/routes/architecture';
export { reportingRoutes } from './api/routes/reporting';
export { healthRoutes } from './api/routes/health';

// CLI exports
export { validateModuleCommand } from './cli/validate-module';
export { validateBatchCommand } from './cli/validate-batch';
export { generateReportCommand } from './cli/generate-report';
export { analyzeArchitectureCommand } from './cli/analyze-architecture';
export { templateManagerCommand } from './cli/template-manager';

// Type exports
export * from './models/types';

// Utility exports
export { createValidationRequest } from './lib/utils/RequestFactory';
export { formatValidationReport } from './lib/utils/ReportFormatter';

// Version information
export const VERSION = '1.0.0';
export const SYSTEM_NAME = 'CVPlus Unified Module Requirements System';

// System information
export const SUPPORTED_REQUIREMENTS = [
  'code-segregation',
  'distribution-architecture',
  'real-implementation',
  'build-test-standards',
  'dependency-integrity'
] as const;

export const SUPPORTED_FORMATS = [
  'html',
  'json',
  'markdown',
  'csv',
  'xml'
] as const;

// Quick start utility
export async function quickValidation(modulePaths: string[]) {
  const service = getUnifiedModuleRequirementsService();
  return await service.performQuickValidation({
    modulePaths,
    enableBuildCheck: true,
    enableMockDetection: true
  });
}

// System health check
export async function systemHealthCheck() {
  const service = getUnifiedModuleRequirementsService();
  return service.getServiceStatus();
}