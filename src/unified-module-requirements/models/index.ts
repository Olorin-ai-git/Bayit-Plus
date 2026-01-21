// Core type definitions and enums
export * from './types';

// Compliance rule engine and validation
export * from './ComplianceRule';

// Module structure validation
export * from './ModuleStructure';

// Validation reporting and analysis
export * from './ValidationReport';

// Module template system
export * from './ModuleTemplate';

// Re-export commonly used interfaces for convenience
export type {
  ModuleType,
  RuleCategory,
  RuleSeverity,
  ValidationStatus,
  ModuleValidationRequest,
  ValidationResult,
  ValidationReport,
  BatchValidationRequest,
  BatchValidationReport,
  TemplateOption,
  TemplateListResponse,
  CodeSegregationRequest,
  CodeSegregationReport,
  DistributionCheckRequest,
  DistributionComplianceReport,
  MockDetectionRequest,
  MockDetectionReport,
  BuildValidationRequest,
  BuildValidationReport,
  DependencyAnalysisRequest,
  DependencyAnalysisReport
} from './types';

export type {
  ExportDefinition,
  ModuleStructure,
  ModuleState
} from './ModuleStructure';

export type {
  ComplianceRule,
  RuleExecutionContext,
  RuleExecutionResult
} from './ComplianceRule';

export type {
  ModuleTemplate,
  TemplateFile,
  TemplateGenerationConfig
} from './ModuleTemplate';

// Export class instances for direct use
export { ModuleStructureValidator } from './ModuleStructure';
export { ComplianceRuleEngine } from './ComplianceRule';
export { ValidationReportBuilder, ValidationReportAnalyzer } from './ValidationReport';
export { ModuleTemplateEngine } from './ModuleTemplate';