# NoMock Command - Comprehensive Mock Data Detection and Removal System

## Overview
The `/nomock` command provides a comprehensive system to proactively scan codebases for mock, placeholder, and demo data, then create detailed removal plans using the Opus 4.1 model. This command enforces the ZERO-TOLERANCE policy for mock data across all projects.

## Command Execution Protocol

### Phase 1: Initialization and Orchestration
**Responsible Agent**: `orchestrator`

1. **Take Control**: Orchestrator subagent assumes full control of the nomock process
2. **Task Assignment**: Coordinate all subsequent phases through specialized subagents
3. **Progress Tracking**: Maintain comprehensive progress tracking throughout execution

### Phase 2: Comprehensive Codebase Scanning
**Responsible Agent**: `search-specialist` or `general-purpose`

#### 2.1 Mock Data Detection Patterns
The scanning subagent will search for the following patterns across all code files:

**Explicit Mock Patterns**:
- `mock`, `Mock`, `MOCK` (as standalone words or in variable/function names)
- `placeholder`, `Placeholder`, `PLACEHOLDER`
- `demo`, `Demo`, `DEMO`
- `fake`, `Fake`, `FAKE`
- `dummy`, `Dummy`, `DUMMY`
- `sample`, `Sample`, `SAMPLE`
- `test`, `Test`, `TEST` (when used as data, not tests)
- `example`, `Example`, `EXAMPLE`

**Implicit Mock Patterns**:
- Hardcoded email addresses ending in `@example.com`, `@test.com`, `@fake.com`
- Phone numbers like `123-456-7890`, `555-0123`, `(555) 123-4567`
- Names like `John Doe`, `Jane Smith`, `Test User`, `Sample Person`
- Addresses containing `123 Main St`, `Fake Street`, `Sample Ave`
- Lorem ipsum text patterns
- Placeholder URLs like `http://example.com`, `https://placeholder.com`
- Generic user IDs like `user123`, `testuser`, `sampleid`
- Default passwords like `password123`, `test123`, `changeme`
- Credit card numbers like `4111-1111-1111-1111`, `5555-5555-5555-4444`

**Development/Testing Artifacts**:
- API keys containing `test`, `demo`, `sample`, `fake`
- Database connection strings with `test`, `demo`, or `local` in names
- Configuration values explicitly marked as placeholder
- Hardcoded development tokens or secrets
- Fixture data in non-test directories

#### 2.2 File Type Coverage
Scan all relevant file types:
- **Code Files**: `.js`, `.ts`, `.jsx`, `.tsx`, `.py`, `.java`, `.rb`, `.php`, `.go`, `.rs`, `.cpp`, `.c`, `.cs`
- **Configuration**: `.json`, `.yaml`, `.yml`, `.xml`, `.toml`, `.ini`, `.env`
- **Documentation**: `.md`, `.rst`, `.txt`
- **Data Files**: `.csv`, `.sql`, `.graphql`
- **Templates**: `.html`, `.hbs`, `.mustache`, `.jinja`, `.ejs`

#### 2.3 Directory Exclusions
Exclude legitimate directories:
- `node_modules/`, `vendor/`, `.git/`, `dist/`, `build/`, `target/`
- `__pycache__/`, `.pytest_cache/`, `coverage/`
- **Test directories**: `test/`, `tests/`, `spec/`, `__tests__/`, `cypress/`
- Documentation examples that explicitly document mock patterns

### Phase 3: Detailed Analysis and Categorization
**Responsible Agent**: `general-purpose` or `code-reviewer`

#### 3.1 Context Analysis
For each detected instance, analyze:
- **File path and line number**
- **Code context** (surrounding 5 lines)
- **Usage purpose** (initialization, API calls, configuration, etc.)
- **Scope of impact** (local variable, exported constant, configuration setting)
- **Replacement complexity** (simple value swap vs. architectural change)

#### 3.2 Risk Assessment
Categorize findings by risk level:
- **CRITICAL**: Production code with hardcoded mock data
- **HIGH**: Configuration files with placeholder values
- **MEDIUM**: Development utilities with mock data
- **LOW**: Documentation examples (legitimate use cases)

#### 3.3 False Positive Filtering
Identify and exclude legitimate uses:
- Test files and test utilities
- Documentation examples that show mock data usage
- Code comments explaining mock data patterns
- Mock libraries and frameworks (jest.mock, sinon, etc.)
- Explicitly documented example data

### Phase 4: Comprehensive Reporting
**Responsible Agent**: `general-purpose`

#### 4.1 Executive Summary
Generate a high-level report including:
- **Total mock instances found**
- **Files affected**
- **Risk level distribution**
- **Estimated effort for removal**
- **Priority recommendations**

#### 4.2 Detailed Findings Report
Create detailed documentation with:
```markdown
## Mock Data Detection Report

### Summary
- **Total Issues**: X instances across Y files
- **Critical Issues**: X instances requiring immediate attention
- **High Priority**: X instances affecting configuration/production
- **Medium Priority**: X instances in development code
- **Low Priority**: X instances (documentation/legitimate examples)

### Critical Issues (Immediate Action Required)

#### File: path/to/file.ts:123
**Pattern**: mockUser = { name: "John Doe", email: "john@example.com" }
**Context**: Production user initialization
**Risk**: High - Hardcoded user data in production code
**Replacement**: Require actual user data source or user input
**Effort**: Medium - Requires user authentication flow

#### File: config/database.json:45
**Pattern**: "connectionString": "mongodb://test:password@localhost"
**Context**: Database configuration
**Risk**: Critical - Hardcoded test credentials
**Replacement**: Environment variable or secure configuration
**Effort**: Low - Simple configuration change

### Recommendations by Priority
1. **Immediate (Critical/High)**: 
   - Replace hardcoded production data
   - Secure configuration values
   - Remove test credentials
2. **Short-term (Medium)**:
   - Refactor development utilities
   - Update initialization patterns
3. **Documentation (Low)**:
   - Review examples for accuracy
   - Add disclaimers for mock data usage
```

### Phase 5: Opus 4.1 Plan Generation
**Responsible Agent**: `predictive-orchestrator` using Opus 4.1 model

#### 5.1 Strategic Planning
Generate comprehensive removal strategy:
- **Architecture implications** of removing mock data
- **Data flow analysis** to identify real data sources
- **Dependencies and integration points**
- **Risk mitigation strategies**
- **Incremental implementation approach**

#### 5.2 Implementation Roadmap
Create detailed step-by-step plan:
```markdown
## Mock Data Removal Implementation Plan

### Phase 1: Critical Security Issues (Week 1)
**Objective**: Remove all hardcoded credentials and production mock data

#### Task 1.1: Secure Configuration Migration
- **Target**: config/database.json, .env files, API configurations
- **Action**: Migrate to environment variables and secure vaults
- **Validation**: Verify no hardcoded secrets remain
- **Testing**: Ensure configuration loading works in all environments

#### Task 1.2: Production Data Sources
- **Target**: User initialization, API responses, data models
- **Action**: Implement proper data fetching mechanisms
- **Validation**: Verify all mock user data replaced with real data flows
- **Testing**: Integration tests with actual data sources

### Phase 2: Development Environment Cleanup (Week 2)
**Objective**: Replace development mock data with proper factories

#### Task 2.1: Data Factory Implementation
- **Target**: Test data generation, development utilities
- **Action**: Create configurable data factories
- **Validation**: Mock data replaced with factory-generated data
- **Testing**: Development environment functions properly

### Phase 3: Documentation and Examples (Week 3)
**Objective**: Update documentation with proper examples

#### Task 3.1: Example Data Update
- **Target**: README files, API documentation, code comments
- **Action**: Replace with realistic but clearly example data
- **Validation**: Examples are helpful but not misleading
- **Testing**: Documentation builds and renders correctly
```

#### 5.3 Code Implementation Strategy
For each critical finding, provide specific implementation guidance:
- **Current code pattern**
- **Recommended replacement pattern**
- **Required dependencies or infrastructure**
- **Migration steps**
- **Validation approach**

### Phase 6: Validation and Quality Assurance
**Responsible Agent**: `test-writer-fixer` and `quality-system-engineer`

#### 6.1 Implementation Validation
- **Code Review**: Verify all suggested replacements are implemented
- **Testing**: Ensure functionality is preserved after mock removal
- **Security Scan**: Confirm no hardcoded secrets remain
- **Performance**: Validate that real data sources perform adequately

#### 6.2 Compliance Verification
- **Policy Adherence**: Confirm zero-tolerance mock data policy compliance
- **Documentation**: Update project documentation with new patterns
- **Training**: Provide guidance for preventing future mock data introduction

## Command Usage

### Syntax
```bash
/nomock
```

### Options
- `--scope [directory]`: Scan specific directory instead of entire codebase
- `--report-only`: Generate report without creating removal plan
- `--critical-only`: Focus only on critical and high-priority issues
- `--exclude-patterns [patterns]`: Additional patterns to exclude from scanning

### Example Usage
```bash
# Full codebase scan with complete plan generation
/nomock

# Scan specific directory only
/nomock --scope src/

# Generate report without implementation plan
/nomock --report-only

# Focus on critical issues only
/nomock --critical-only
```

## Output Artifacts

### 1. Detection Report
**Location**: `/docs/nomock/mock-data-detection-report.md`
**Content**: Comprehensive findings with context and risk assessment

### 2. Removal Plan
**Location**: `/docs/nomock/mock-data-removal-plan.md`
**Content**: Opus 4.1 generated strategic implementation roadmap

### 3. Implementation Guide
**Location**: `/docs/nomock/implementation-guide.md`
**Content**: Detailed technical guidance for each required change

### 4. Progress Tracking
**Location**: `/docs/nomock/progress-tracker.md`
**Content**: Checklist and progress tracking for implementation

## Success Criteria

### Immediate Success
- **Complete codebase scan** performed
- **All mock instances detected** and categorized
- **Comprehensive report generated** with context and risk assessment
- **Detailed removal plan created** using Opus 4.1 intelligence

### Implementation Success
- **Zero critical mock data** instances remaining
- **All production code** free of placeholder data
- **Proper data sources** implemented for all functionality
- **Documentation updated** with correct examples
- **Team trained** on mock data prevention

## Integration with Global Standards

### CLAUDE.md Compliance
- **Enforces global zero-tolerance policy** for mock data
- **Uses orchestrator subagent** for task coordination
- **Implements proper handover protocols** between specialist subagents
- **Generates comprehensive documentation** under /docs structure
- **Creates implementation plans** using Opus 4.1 model

### Quality Assurance
- **Multi-layer validation** through specialized subagents
- **Comprehensive testing** of all replacements
- **Security verification** for credential and sensitive data handling
- **Performance monitoring** of real data source implementations

### Continuous Monitoring
- **Regular scans** to prevent reintroduction of mock data
- **CI/CD integration** for automated detection
- **Team education** on proper data handling patterns
- **Best practices documentation** for future development

This comprehensive system ensures absolute compliance with the zero-tolerance mock data policy while providing practical, implementable solutions for all detected issues.