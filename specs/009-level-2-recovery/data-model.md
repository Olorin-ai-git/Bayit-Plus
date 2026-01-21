# Level 2 Recovery Data Model

**Date**: September 16, 2025
**Version**: 1.0.0
**Status**: Phase 1 Design

## Core Entities

### ModuleRecoveryState
Tracks the recovery status and health of each Level 2 module.

**Fields**:
- `moduleId`: string (enum: auth, i18n, cv-processing, multimedia, analytics, premium, public-profiles, recommendations, admin, workflow, payments)
- `status`: RecoveryStatus (enum: healthy, critical, recovering, recovered, failed)
- `buildStatus`: BuildStatus (enum: success, failed, building, not_started)
- `testStatus`: TestStatus (enum: passing, failing, running, not_configured, not_started)
- `dependencyHealth`: DependencyHealth (enum: resolved, missing, conflicted, circular)
- `lastBuildTime`: Date | null
- `lastTestRun`: Date | null
- `errorCount`: number
- `warningCount`: number
- `healthScore`: number (0-100)

**Validation Rules**:
- moduleId must be one of the 11 valid Level 2 modules
- healthScore calculated from build, test, and dependency status
- errorCount and warningCount must be non-negative integers

**State Transitions**:
- critical → recovering (when recovery process starts)
- recovering → recovered (when all validations pass)
- recovered → healthy (when stability period elapses)
- Any status → failed (when irrecoverable error occurs)

### RecoveryPhase
Represents each phase of the recovery process with validation gates.

**Fields**:
- `phaseId`: number (1-4)
- `name`: string (Emergency Stabilization, Build Infrastructure, Architecture Compliance, Prevention)
- `status`: PhaseStatus (enum: not_started, in_progress, validating, completed, failed)
- `startTime`: Date | null
- `completionTime`: Date | null
- `duration`: number | null (milliseconds)
- `prerequisitePhases`: number[] (array of phaseId dependencies)
- `validationGates`: ValidationGate[]
- `affectedModules`: string[] (array of moduleIds)

**Validation Rules**:
- Phases must complete in sequential order (1→2→3→4)
- Cannot start phase without prerequisite phases completed
- All validation gates must pass before phase completion

### ValidationGate
Defines specific validation criteria that must pass for phase progression.

**Fields**:
- `gateId`: string (unique identifier)
- `name`: string (descriptive name)
- `type`: GateType (enum: build_validation, test_validation, dependency_validation, architecture_validation)
- `criteria`: ValidationCriteria[]
- `status`: GateStatus (enum: pending, running, passed, failed)
- `lastRun`: Date | null
- `result`: ValidationResult | null

**Validation Rules**:
- All criteria must pass for gate to pass
- Gates can be re-run if they fail
- Gate results include detailed error messages

### ValidationCriteria
Specific measurable criteria for validation gates.

**Fields**:
- `criteriaId`: string (unique identifier)
- `description`: string (human readable description)
- `type`: CriteriaType (enum: build_success, test_pass_rate, dependency_resolved, import_valid, circular_dependency_check)
- `expectedValue`: any (expected result value)
- `actualValue`: any (measured result value)
- `operator`: ComparisonOperator (enum: equals, greater_than, less_than, contains, not_contains)
- `passed`: boolean

**Validation Rules**:
- Comparison between expectedValue and actualValue using operator
- actualValue must be populated before criteria can be evaluated

### DependencyInfo
Tracks dependency status and resolution for each module.

**Fields**:
- `moduleId`: string (Level 2 module identifier)
- `dependencyType`: DependencyType (enum: workspace_internal, npm_external, dev_dependency)
- `packageName`: string (npm package or @cvplus/* name)
- `version`: string (semver version)
- `status`: DependencyStatus (enum: resolved, missing, version_mismatch, circular)
- `resolvedVersion`: string | null
- `errorMessage`: string | null

**Validation Rules**:
- Internal @cvplus/* dependencies must use workspace:* pattern
- External dependencies must have valid semver versions
- Circular dependencies not allowed for Level 2 modules

### BuildMetrics
Captures build performance and health metrics.

**Fields**:
- `moduleId`: string (Level 2 module identifier)
- `buildTime`: number (milliseconds)
- `outputSize`: number (bytes)
- `errorCount`: number
- `warningCount`: number
- `typeScriptErrors`: TypeScriptError[]
- `timestamp`: Date

**Validation Rules**:
- buildTime should be < 60000ms (1 minute) for acceptable performance
- errorCount must be 0 for successful build
- warningCount should be minimized

### TestMetrics
Captures test execution results and coverage.

**Fields**:
- `moduleId`: string (Level 2 module identifier)
- `testSuite`: string (jest/vitest identifier)
- `totalTests`: number
- `passedTests`: number
- `failedTests`: number
- `skippedTests`: number
- `coverage`: TestCoverage | null
- `executionTime`: number (milliseconds)
- `timestamp`: Date

**Validation Rules**:
- passedTests + failedTests + skippedTests must equal totalTests
- passedTests must equal totalTests for 100% pass rate requirement
- executionTime should be reasonable for CI/CD integration

### TestCoverage
Test coverage metrics per module.

**Fields**:
- `statements`: number (percentage 0-100)
- `branches`: number (percentage 0-100)
- `functions`: number (percentage 0-100)
- `lines`: number (percentage 0-100)

**Validation Rules**:
- All percentages must be between 0 and 100
- Adequate coverage typically requires >80% across all metrics

## Entity Relationships

```
RecoveryPhase (1) ----> (many) ValidationGate
ValidationGate (1) ----> (many) ValidationCriteria
ModuleRecoveryState (1) ----> (many) DependencyInfo
ModuleRecoveryState (1) ----> (many) BuildMetrics
ModuleRecoveryState (1) ----> (many) TestMetrics
TestMetrics (1) ----> (1) TestCoverage
```

## Enumerations

### RecoveryStatus
- `healthy`: Module fully functional, builds and tests pass
- `critical`: Module has build failures blocking development
- `recovering`: Module currently undergoing recovery process
- `recovered`: Module recovery complete, awaiting validation
- `failed`: Module recovery failed, manual intervention required

### PhaseStatus
- `not_started`: Phase not yet initiated
- `in_progress`: Phase currently executing
- `validating`: Phase execution complete, running validation gates
- `completed`: Phase complete with all validations passed
- `failed`: Phase failed validation, requires remediation

### GateStatus
- `pending`: Validation gate not yet executed
- `running`: Validation gate currently executing
- `passed`: Validation gate passed all criteria
- `failed`: Validation gate failed one or more criteria

## Data Constraints

### Business Rules
1. **Sequential Phase Execution**: Phases 1-4 must complete in order
2. **Module Independence**: Each Level 2 module recovery can proceed independently within a phase
3. **Validation Required**: No phase can complete without passing all validation gates
4. **Health Score Calculation**: Weighted average of build (40%), test (40%), dependency (20%) status
5. **Stability Requirement**: Modules must maintain recovered status for 24 hours before marking healthy

### Technical Constraints
1. **Layer Architecture**: Level 2 modules can only depend on Layer 0 (logging) and Layer 1 (core, shell)
2. **Workspace Dependencies**: Internal @cvplus/* dependencies must use workspace protocol
3. **Test Infrastructure**: All modules must have functional test scripts and configurations
4. **Build Performance**: Module builds must complete within 60 seconds
5. **Zero Error Policy**: Successful builds must have exactly 0 compilation errors

## Data Storage

### Implementation Notes
- Recovery state tracked in memory during execution
- Metrics stored in JSON files for persistence
- Build outputs captured in structured logs
- Test results archived for historical analysis
- Configuration changes version controlled in git

### File Structure
```
specs/009-level-2-recovery/
├── data/
│   ├── module-states.json          # Current ModuleRecoveryState
│   ├── phase-progress.json         # RecoveryPhase status
│   ├── validation-results.json     # ValidationGate outcomes
│   ├── build-metrics/              # BuildMetrics by module
│   └── test-results/               # TestMetrics by module
```

---

*This data model supports the Level 2 Recovery process with full traceability and validation.*