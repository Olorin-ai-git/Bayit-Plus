/**
 * ValidationCriteria Model - T033
 * CVPlus Level 2 Recovery System
  */

export interface ValidationCriteria {
  criteriaId: string;
  name: string;
  description: string;
  weight: number;
  type: 'boolean' | 'numeric' | 'percentage' | 'enum';
  expectedValue: any;
  actualValue?: any;
  status: 'pending' | 'passed' | 'failed' | 'warning';
  errorMessage?: string;
  autoFixable: boolean;
  category: 'build' | 'test' | 'dependency' | 'configuration' | 'security' | 'performance';
  severity: 'critical' | 'high' | 'medium' | 'low';
  tags: string[];
  documentation?: string;
}

export interface CriteriaGroup {
  groupId: string;
  name: string;
  description: string;
  criteria: ValidationCriteria[];
  weight: number;
  required: boolean;
}

export const VALIDATION_CRITERIA = {
  // Workspace Health Criteria
  PACKAGE_JSON_VALID: 'package-json-valid',
  TSCONFIG_VALID: 'tsconfig-valid',
  GIT_STATUS_CLEAN: 'git-status-clean',
  NODE_MODULES_HEALTHY: 'node-modules-healthy',

  // Build Success Criteria
  TYPESCRIPT_COMPILATION: 'typescript-compilation',
  NO_BUILD_ERRORS: 'no-build-errors',
  ARTIFACT_GENERATION: 'artifact-generation',
  BUILD_PERFORMANCE: 'build-performance',

  // Test Coverage Criteria
  MINIMUM_COVERAGE_THRESHOLD: 'minimum-coverage-threshold',
  ALL_TESTS_PASSING: 'all-tests-passing',
  NO_SKIPPED_TESTS: 'no-skipped-tests',
  TEST_PERFORMANCE: 'test-performance',

  // Dependency Resolution Criteria
  NO_MISSING_DEPENDENCIES: 'no-missing-dependencies',
  NO_CIRCULAR_DEPENDENCIES: 'no-circular-dependencies',
  VERSION_COMPATIBILITY: 'version-compatibility',
  SECURITY_VULNERABILITIES: 'security-vulnerabilities',

  // Architecture Compliance Criteria
  MODULE_BOUNDARIES: 'module-boundaries',
  LAYER_SEPARATION: 'layer-separation',
  NAMING_CONVENTIONS: 'naming-conventions',
  CODE_STYLE: 'code-style',

  // Security Audit Criteria
  NO_HARDCODED_SECRETS: 'no-hardcoded-secrets',
  SECURE_DEPENDENCIES: 'secure-dependencies',
  PROPER_ERROR_HANDLING: 'proper-error-handling',
  LOGGING_SECURITY: 'logging-security'
} as const;

export function createValidationCriteria(
  criteriaId: string,
  name: string,
  type: ValidationCriteria['type'],
  expectedValue: any,
  weight: number = 1
): ValidationCriteria {
  return {
    criteriaId,
    name,
    description: `Validation criteria: ${name}`,
    weight,
    type,
    expectedValue,
    status: 'pending',
    autoFixable: false,
    category: 'configuration',
    severity: 'medium',
    tags: []
  };
}