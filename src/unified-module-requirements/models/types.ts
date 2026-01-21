// Core enumerations for module types and validation
export enum ModuleType {
  BACKEND = 'BACKEND',
  FRONTEND = 'FRONTEND',
  UTILITY = 'UTILITY',
  API = 'API',
  CORE = 'CORE'
}

export enum RuleCategory {
  STRUCTURE = 'STRUCTURE',
  DOCUMENTATION = 'DOCUMENTATION',
  CONFIGURATION = 'CONFIGURATION',
  TESTING = 'TESTING',
  SECURITY = 'SECURITY',
  PERFORMANCE = 'PERFORMANCE',
  ARCHITECTURE = 'ARCHITECTURE'
}

export enum RuleSeverity {
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
  AUTO_FIX = 'AUTO_FIX'
}

export enum ValidationStatus {
  PASS = 'PASS',
  FAIL = 'FAIL',
  WARNING = 'WARNING',
  PARTIAL = 'PARTIAL',
  ERROR = 'ERROR'
}

// Request/Response interfaces for API contracts

// Module Validation
export interface ModuleValidationRequest {
  modulePath: string;
  ruleIds: string[];
  strictMode: boolean;
}

export interface ValidationViolation {
  filePath: string;
  ruleId: string;
  severity: RuleSeverity;
  message: string;
  line?: number;
  column?: number;
  remediation: string;
}

export interface ValidationReport {
  modulePath: string;
  violations: ValidationViolation[];
  passed: boolean;
  timestamp: Date;
  rulesSummary: {
    totalChecked: number;
    passed: number;
    failed: number;
  };
}

export interface ValidationResult {
  passed: boolean;
  details: string;
  metadata: Record<string, any>;
}

export interface RuleExecutionResult {
  passed: boolean;
  details: string;
  metadata: Record<string, any>;
}

export interface RuleExecutionContext {
  modulePath: string;
  packageJson?: any;
  tsConfig?: any;
  files: string[];
  directories: string[];
}

// Batch Validation
export interface BatchValidationRequest {
  validationRequests: ModuleValidationRequest[];
  parallel: boolean;
  maxConcurrency: number;
  continueOnError: boolean;
}

export interface BatchValidationReport {
  results: ValidationReport[];
  totalRequests: number;
  successfulValidations: number;
  failedValidations: number;
  errors: string[];
  executionTime: number;
}

// Template Management
export interface TemplateOption {
  name: string;
  type: 'string' | 'boolean' | 'number' | 'array' | 'object';
  description: string;
  defaultValue: any;
  required: boolean;
  validation?: string;
}

export interface TemplateMetadata {
  name: string;
  description: string;
  category: string;
  tags: string[];
  customizableOptions: string[];
}

export interface TemplateListRequest {
  category?: string;
  includeMetadata: boolean;
}

export interface TemplateSearchRequest {
  searchTerm?: string;
  moduleType?: ModuleType;
  tags?: string[];
  sortBy?: 'name' | 'usage' | 'updated';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  exactMatch?: boolean;
  query?: string;
}

export interface TemplateSearchResponse {
  templates: {
    templateId: string;
    name: string;
    description: string;
    moduleType: ModuleType;
    version: string;
    maintainer: string;
    metadata: {
      usageCount: number;
      lastUpdated: Date;
      tags: string[];
    };
    configurableOptions: TemplateOption[];
  }[];
  totalCount: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface ModuleGenerationRequest {
  moduleName: string;
  outputPath: string;
  templateName: string;
  customOptions: Record<string, any>;
}

export interface ModuleGenerationResult {
  moduleName: string;
  outputPath: string;
  templateUsed: string;
  filesCreated: string[];
  success: boolean;
  errors: string[];
}

// Code Segregation Analysis
export interface CodeSegregationRequest {
  modulePaths: string[];
  strictMode: boolean;
  excludePatterns: string[];
}

export interface CodeSegregationViolation {
  filePath: string;
  violationType: string;
  content: string;
  suggestion: string;
  severity: RuleSeverity;
  confidence: number;
}

export interface CodeSegregationReport {
  totalFiles: number;
  scannedFiles: number;
  violations: CodeSegregationViolation[];
  domainSuggestions: MigrationSuggestion[];
  severityBreakdown: Record<RuleSeverity, number>;
}

export interface MigrationSuggestion {
  action: 'move' | 'split' | 'merge' | 'refactor';
  sourcePath: string;
  targetPath: string;
  rationale: string;
  impact: 'low' | 'medium' | 'high';
}

// Distribution Architecture
export interface DistributionValidationRequest {
  modulePath: string;
  strictMode: boolean;
  checkPackageJson: boolean;
  validateArtifacts: boolean;
}

export interface DistributionViolation {
  modulePath: string;
  violationType: 'missing_dist' | 'invalid_structure' | 'build_failure' | 'packaging_error';
  message: string;
  severity: RuleSeverity;
  remediation: string;
}

export interface DistributionValidationReport {
  modulePath: string;
  hasValidDistribution: boolean;
  violations: DistributionViolation[];
  distStructure: {
    hasMainFile: boolean;
    hasTypes: boolean;
    hasSourceMaps: boolean;
  };
  packageInfo: {
    hasMainField: boolean;
    hasTypesField: boolean;
    hasExportsField: boolean;
    buildScripts: string[];
  };
}

// Mock Detection
export interface MockDetectionRequest {
  modulePaths: string[];
  strictMode: boolean;
  scanPatterns: string[];
  excludePatterns: string[];
}

export interface MockViolation {
  filePath: string;
  violationType: 'stub' | 'placeholder' | 'commented_code' | 'mock_implementation' | 'todo' | 'fixme';
  lineNumber: number;
  content: string;
  severity: RuleSeverity;
  remediation: string;
}

export interface MockDetectionReport {
  totalFiles: number;
  scannedFiles: number;
  violations: MockViolation[];
  mockTypes: {
    stubs: number;
    placeholders: number;
    commentedCode: number;
    mockImplementations: number;
    todos: number;
    fixmes: number;
  };
  severityBreakdown: Record<RuleSeverity, number>;
}

// Build Validation
export interface BuildValidationRequest {
  modulePaths: string[];
  enableTypeCheck: boolean;
  enableBuild: boolean;
  enableTests: boolean;
  parallel: boolean;
}

export interface BuildResult {
  modulePath: string;
  typeCheckSuccess: boolean;
  buildSuccess: boolean;
  testSuccess: boolean;
  errors: string[];
  warnings: string[];
  executionTime: number;
}

export interface BuildValidationReport {
  overallSuccess: boolean;
  results: BuildResult[];
  totalTime: number;
  summary: {
    totalModules: number;
    successfulBuilds: number;
    failedBuilds: number;
  };
}

// Dependency Analysis
export interface DependencyAnalysisRequest {
  modulePaths: string[];
  includeFileTypes: string[];
  includeTestDependencies: boolean;
  excludePatterns: string[];
  maxDependencyDepth?: number;
  forbiddenDependencies?: string[];
}

export interface DependencyViolation {
  modulePath: string;
  violationType: 'circular_dependency' | 'missing_dependency' | 'forbidden_dependency' | 'excessive_depth' | 'analysis_error';
  dependency: string;
  lineNumber: number;
  content: string;
  severity: RuleSeverity;
  remediation: string;
}

export interface CircularDependencyChain {
  modules: string[];
  severity: RuleSeverity;
  description: string;
}

export enum DependencyType {
  INTERNAL = 'INTERNAL',
  EXTERNAL = 'EXTERNAL',
  CIRCULAR = 'CIRCULAR',
  MISSING = 'MISSING'
}

export interface DependencyAnalysisReport {
  totalModules: number;
  scannedModules: number;
  violations: DependencyViolation[];
  dependencyGraph: Map<string, Set<string>>;
  circularDependencies: CircularDependencyChain[];
  externalDependencies: Set<string>;
  internalDependencies: Map<string, Set<string>>;
  dependencyTypes: Record<DependencyType, number>;
  severityBreakdown: Record<RuleSeverity, number>;
}

// Reporting
export type ReportFormat = 'html' | 'json' | 'markdown' | 'csv' | 'xml';

export interface ReportRequest {
  title?: string;
  format: ReportFormat;
  outputPath?: string;
  validationReport?: ValidationReport;
  structureReport?: ModuleStructureReport;
  distributionReport?: DistributionValidationReport;
  mockDetectionReport?: MockDetectionReport;
  buildReport?: BuildValidationReport;
  dependencyReport?: DependencyAnalysisReport;
}

export interface ReportResponse {
  format: ReportFormat;
  content: string;
  outputPath?: string;
  generatedAt: string;
  summary: Record<string, any>;
}

// Mock Detection
export interface MockDetectionRequest {
  modulePaths: string[];
  scanPatterns: string[];
  excludePatterns: string[];
  strictMode: boolean;
}

export interface MockViolation {
  filePath: string;
  violationType: 'stub' | 'placeholder' | 'commented_code' | 'mock_implementation' | 'todo' | 'fixme';
  lineNumber: number;
  content: string;
  severity: RuleSeverity;
  remediation: string;
}

export interface MockDetectionReport {
  totalFiles: number;
  scannedFiles: number;
  violations: MockViolation[];
  mockTypes: {
    stubs: number;
    placeholders: number;
    commentedCode: number;
    mockImplementations: number;
    todos: number;
    fixmes: number;
  };
  severityBreakdown: Record<RuleSeverity, number>;
}

// Module Structure
export interface ModuleStructureReport {
  modulePath: string;
  isValid: boolean;
  missingFiles: string[];
  unexpectedFiles: string[];
  structure: {
    hasPackageJson: boolean;
    hasTsConfig: boolean;
    hasSourceDirectory: boolean;
    hasTestDirectory: boolean;
  };
}

// Additional helper types for glob patterns and other utilities
export interface GlobOptions {
  absolute?: boolean;
  cwd?: string;
  ignore?: string[];
}