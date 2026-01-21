# Data Model: Unified Module Requirements

**Date**: 2025-09-13
**Feature**: 007-unified-module-requirements

## Core Entities

### ModuleStructure
Represents the standardized directory layout and file organization requirements for CVPlus submodules.

**Fields**:
- `name: string` - Module name (e.g., "cv-processing", "multimedia")
- `type: ModuleType` - Module classification (backend, frontend, utility, api)
- `requiredFiles: string[]` - Mandatory files (README.md, package.json, tsconfig.json)
- `requiredDirectories: string[]` - Mandatory directories (src/, tests/, docs/)
- `optionalFiles: string[]` - Optional but recommended files (CHANGELOG.md, API.md)
- `entryPoint: string` - Main entry file path (src/index.ts)
- `exports: ExportDefinition[]` - Expected module exports
- `version: string` - Module version following semver
- `lastValidated: Date` - Timestamp of last compliance check

**Relationships**:
- Has many `ComplianceRule` entries
- Generates `ValidationReport` on assessment
- Can be created from `ModuleTemplate`

**State Transitions**:
- Draft → Under Review → Compliant → Non-compliant → Deprecated

### ComplianceRule
Defines specific requirements that modules must meet for standardization.

**Fields**:
- `id: string` - Unique rule identifier (e.g., "README_REQUIRED", "TESTS_DIRECTORY")
- `category: RuleCategory` - Rule classification (structure, documentation, configuration, testing)
- `severity: RuleSeverity` - Enforcement level (warning, error, critical, auto-fix)
- `description: string` - Human-readable rule description
- `checkFunction: string` - Validation logic reference
- `remediation: string` - Guidance for fixing violations
- `applicableTypes: ModuleType[]` - Which module types this rule applies to
- `enabled: boolean` - Whether rule is active
- `version: string` - Rule version for backward compatibility

**Validation Rules**:
- ID must be unique across all rules
- CheckFunction must reference valid validation logic
- Severity must match enforcement capabilities
- Remediation must provide actionable guidance

**Relationships**:
- Applied to `ModuleStructure` during validation
- Produces `ValidationResult` entries
- Can be grouped into `RuleSet` collections

### ValidationReport
Contains assessment results for module compliance with detailed findings.

**Fields**:
- `moduleId: string` - Reference to validated module
- `reportId: string` - Unique report identifier
- `timestamp: Date` - When validation was performed
- `overallScore: number` - Compliance percentage (0-100)
- `status: ValidationStatus` - Overall result (pass, fail, warning)
- `results: ValidationResult[]` - Individual rule check results
- `summary: ReportSummary` - Aggregated metrics
- `recommendations: string[]` - Suggested improvements
- `validator: string` - Tool/person who ran validation
- `context: ValidationContext` - Environment and configuration info

**Validation Rules**:
- OverallScore must be calculated from individual results
- Status must reflect most severe violation level
- Results must include all applicable compliance rules
- Recommendations must be specific and actionable

**Relationships**:
- Belongs to one `ModuleStructure`
- Contains multiple `ValidationResult` entries
- Can trigger `RemediationTask` creation

### ModuleTemplate
Standardized starting point for creating new compliant modules.

**Fields**:
- `templateId: string` - Unique template identifier
- `name: string` - Template display name
- `description: string` - Template purpose and usage
- `moduleType: ModuleType` - Target module classification
- `baseFiles: TemplateFile[]` - Core files with variable substitution
- `configurableOptions: TemplateOption[]` - User-customizable settings
- `dependencies: string[]` - Default npm dependencies
- `devDependencies: string[]` - Default development dependencies
- `scripts: Record<string, string>` - Default package.json scripts
- `version: string` - Template version
- `maintainer: string` - Template owner/maintainer

**Validation Rules**:
- BaseFiles must include all required module files
- Dependencies must be compatible versions
- Scripts must support standard operations (build, test, lint)
- ConfigurableOptions must have valid default values

**Relationships**:
- Generates `ModuleStructure` instances
- Can be customized through `TemplateOption` values
- Validates against `ComplianceRule` set

## Supporting Types

### ModuleType
Enumeration of module classifications:
- `BACKEND` - Server-side logic and APIs
- `FRONTEND` - Client-side user interfaces
- `UTILITY` - Shared helper libraries
- `API` - External API integrations
- `CORE` - Fundamental system components

### RuleCategory
Enumeration of compliance rule groupings:
- `STRUCTURE` - Directory and file organization
- `DOCUMENTATION` - README, API docs, comments
- `CONFIGURATION` - Package.json, TypeScript, build config
- `TESTING` - Test setup, coverage, quality
- `SECURITY` - Vulnerability scanning, permissions
- `PERFORMANCE` - Bundle size, optimization

### RuleSeverity
Enumeration of enforcement levels:
- `WARNING` - Logged but doesn't block
- `ERROR` - Fails CI/CD but allows manual override
- `CRITICAL` - Blocks merges and deployments
- `AUTO_FIX` - Automatically resolved by tooling

### ValidationStatus
Enumeration of validation outcomes:
- `PASS` - All rules satisfied
- `FAIL` - Critical violations found
- `WARNING` - Non-critical violations present
- `PARTIAL` - Validation incomplete
- `ERROR` - Validation process failed

## Data Flow

### Module Creation Flow
1. User selects `ModuleTemplate`
2. Template generates base `ModuleStructure`
3. User customizes through `TemplateOption` values
4. System validates against `ComplianceRule` set
5. Compliant module created with full structure

### Validation Flow
1. System identifies modules for validation
2. Applicable `ComplianceRule` set determined
3. Each rule executed against `ModuleStructure`
4. `ValidationResult` entries collected
5. `ValidationReport` generated with summary
6. Remediation recommendations provided

### Compliance Monitoring Flow
1. Scheduled validation runs across module ecosystem
2. `ValidationReport` entries aggregated
3. Compliance trends and metrics calculated
4. Non-compliant modules flagged for remediation
5. Teams notified of violations requiring attention

## Constraints and Assumptions

### Performance Constraints
- Validation must complete within 30 seconds per module
- Template generation must complete within 5 seconds
- Report generation must handle 50+ modules efficiently
- Caching must be used to avoid redundant validations

### Compatibility Constraints
- Must work with existing CVPlus submodule structure
- Backward compatibility with current module formats
- Integration with existing CI/CD workflows
- Support for incremental migration approach

### Security Constraints
- No secrets or sensitive data in validation reports
- Secure handling of module file system access
- Audit trail for all compliance modifications
- Input validation for all user-provided data