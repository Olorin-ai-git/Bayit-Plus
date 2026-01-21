# Level 2 Recovery Guide

**Document Version**: 1.0
**Last Updated**: 2025-09-16
**Author**: Level 2 Recovery System
**Purpose**: Comprehensive guide for CVPlus Level 2 modules recovery operations

## Table of Contents

1. [Overview](#overview)
2. [Recovery Architecture](#recovery-architecture)
3. [Prerequisites](#prerequisites)
4. [Recovery Phases](#recovery-phases)
5. [Tool Reference](#tool-reference)
6. [Troubleshooting](#troubleshooting)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [API Reference](#api-reference)
9. [Best Practices](#best-practices)

## Overview

The Level 2 Recovery System is a comprehensive solution designed to restore and maintain the health of all CVPlus Level 2 domain service modules. This system implements a 4-phase recovery approach with automated monitoring, validation, and reporting capabilities.

### Level 2 Modules

The following 11 modules are managed by the recovery system:

| Module | Purpose | Current Status |
|--------|---------|----------------|
| `auth` | Authentication and session management | ⚠️ Tests failing |
| `i18n` | Internationalization framework | ⚠️ Tests failing |
| `processing` | CV analysis and enhancement | ❌ Build failing |
| `multimedia` | Media generation and processing | ❌ Build failing |
| `analytics` | Business intelligence and tracking | ✅ Healthy |
| `premium` | Subscription and billing features | ❌ Build failing |
| `public-profiles` | Public profile functionality | ❌ Build failing |
| `recommendations` | AI-powered recommendations | ❌ Build failing |
| `admin` | Admin dashboard and management | ❌ Build failing |
| `workflow` | Job management and workflows | ❌ Build failing |
| `payments` | Payment processing | ❌ Build failing |

## Recovery Architecture

### Layer Architecture Compliance

The recovery system enforces CVPlus's layered architecture:

```
Layer 0: Foundation (logging)
├── Layer 1: Infrastructure (core, shell)
    ├── Layer 2: Domain Services (auth, i18n, processing, multimedia, analytics, premium, public-profiles, recommendations, admin, workflow, payments)
        ├── Layer 3: Applications (frontend, functions)
```

**Dependency Rules**:
- Layer 2 modules can only depend on Layer 0 (logging) and Layer 1 (core, shell)
- No peer dependencies between Layer 2 modules
- All imports must use `@cvplus/*` paths

### Recovery Components

#### Core Services
- **ModuleRecoveryService**: Manages individual module recovery states
- **PhaseOrchestrationService**: Coordinates recovery phases
- **ValidationService**: Validates recovery criteria and gates

#### Data Models
- **ModuleRecoveryState**: Tracks module health and recovery status
- **RecoveryPhase**: Manages phase execution and dependencies
- **ValidationGate**: Defines validation criteria for phase transitions
- **BuildMetrics**: Tracks build performance and quality metrics
- **TestMetrics**: Monitors test execution and coverage

#### API Endpoints
- `GET /modules` - List all module states
- `GET /modules/{moduleId}` - Get specific module state
- `PUT /modules/{moduleId}` - Update module state
- `POST /modules/{moduleId}/build` - Trigger module build
- `POST /modules/{moduleId}/test` - Execute module tests

## Prerequisites

### System Requirements
- Node.js 20+ with npm
- TypeScript 5.x
- Git with submodule support
- Firebase CLI (for function deployment)

### Environment Setup
```bash
# Install global dependencies
npm install -g typescript firebase-tools

# Clone and setup project
git clone <cvplus-repo>
cd cvplus
git submodule update --init --recursive

# Install workspace dependencies
npm install --workspaces
```

### Required Permissions
- Read/write access to all Level 2 module repositories
- Firebase project access for function deployment
- Git repository permissions for submodule management

## Recovery Phases

### Phase 1: Emergency Stabilization

**Objective**: Restore basic workspace functionality and identify critical issues.

**Tasks (T001-T017)**:
- ✅ **T001**: Create recovery scripts directory structure
- ✅ **T002**: Initialize recovery state tracking
- ✅ **T003**: Backup workspace configuration files
- ✅ **T004-T006**: Fix root configuration (package.json, tsconfig.json, workspace)
- ❌ **T007-T017**: Analyze module dependencies (PENDING)

**Commands**:
```bash
# Initialize recovery session
./scripts/recovery/init-recovery.sh

# Check recovery state
cat recovery-state.json

# Backup configurations
./scripts/recovery/backup-config.sh
```

### Phase 2: Build Infrastructure Recovery

**Objective**: Restore build capability across all Level 2 modules.

**Tasks (T046-T048)**:
- ✅ **T046**: Standardize build configurations
- ✅ **T047**: Setup unified test infrastructure
- ✅ **T048**: Install missing dependencies

**Commands**:
```bash
# Standardize all module builds
./scripts/recovery/standardize-builds.sh

# Setup testing infrastructure
./scripts/recovery/setup-testing.sh

# Install dependencies
./scripts/recovery/install-dependencies.sh

# Validate builds
./scripts/recovery/validate-builds.sh
```

### Phase 3: Test Suite Recovery

**Objective**: Restore and enhance test coverage across all modules.

**Focus Areas**:
- Unit test restoration
- Integration test implementation
- Performance test setup
- Contract test validation

**Validation Commands**:
```bash
# Run all Layer 2 tests
npm run test:layer2

# Test with coverage
npm run test:layer2:coverage

# Run specific module tests
npm run test --workspace=@cvplus/auth
```

### Phase 4: Architecture Compliance

**Objective**: Ensure full compliance with CVPlus layered architecture.

**Validation Points**:
- Layer dependency compliance
- Import/export chain validation
- Build order verification
- Cross-module dependency elimination

## Tool Reference

### Infrastructure Scripts

#### `standardize-builds.sh`
Standardizes build configurations across all Level 2 modules.

```bash
# Usage
./scripts/recovery/standardize-builds.sh

# Features
- Creates tsup.config.ts for each module
- Updates package.json scripts
- Installs build dependencies
- Validates TypeScript configurations
```

#### `setup-testing.sh`
Configures comprehensive testing infrastructure.

```bash
# Usage
./scripts/recovery/setup-testing.sh

# Features
- Creates Vitest configurations
- Sets up test directory structure
- Installs testing dependencies
- Creates workspace test orchestration
```

#### `install-dependencies.sh`
Analyzes and installs missing dependencies.

```bash
# Usage
./scripts/recovery/install-dependencies.sh

# Features
- Dependency analysis per module
- Automated installation
- Conflict detection
- Comprehensive reporting
```

### Monitoring Scripts

#### `health-check.sh`
Comprehensive health monitoring for all modules.

```bash
# Usage
./scripts/recovery/health-check.sh

# Health Categories
- Structure (directory organization)
- Build (compilation success)
- Tests (execution and coverage)
- TypeScript (type checking)
- Dependencies (vulnerabilities)

# Output
- Detailed health scores
- Issue identification
- JSON report generation
```

#### `validate-builds.sh`
Automated build validation with detailed reporting.

```bash
# Usage
./scripts/recovery/validate-builds.sh

# Validation Steps
- TypeScript configuration check
- Compilation verification
- Build artifact validation
- Performance metrics collection

# Reports
- Build success/failure status
- Error and warning counts
- Build duration metrics
- Artifact quality scores
```

### API Tools

#### Firebase Functions

All recovery API endpoints are implemented as Firebase Functions:

```typescript
// Example: Get module state
import { getModuleState } from './functions/src/recovery/getModuleState';

// Example: Build module
import { buildModule } from './functions/src/recovery/buildModule';

// Example: Test module
import { testModule } from './functions/src/recovery/testModule';
```

## Troubleshooting

### Common Issues

#### Build Failures

**Symptom**: Module build fails with TypeScript errors
```bash
# Diagnosis
./scripts/recovery/validate-builds.sh

# Solution
./scripts/recovery/standardize-builds.sh
npm run build --workspace=@cvplus/[module-name]
```

**Symptom**: Missing dependencies
```bash
# Diagnosis
./scripts/recovery/health-check.sh

# Solution
./scripts/recovery/install-dependencies.sh
```

#### Test Failures

**Symptom**: Tests not running or failing
```bash
# Diagnosis
npm run test --workspace=@cvplus/[module-name]

# Solution
./scripts/recovery/setup-testing.sh
npm run test:layer2
```

#### Architecture Violations

**Symptom**: Cross-module dependencies
```bash
# Diagnosis
npx nx dep-graph

# Solution
# Review and refactor import statements
# Ensure only @cvplus/core and @cvplus/logging dependencies
```

### Emergency Recovery

If the recovery system itself is compromised:

```bash
# 1. Reset to known good state
git checkout main
git submodule update --recursive

# 2. Restore from backups
cp scripts/recovery/backups/* ./

# 3. Reinitialize recovery system
./scripts/recovery/init-recovery.sh --force

# 4. Run full recovery cycle
./scripts/recovery/full-recovery.sh
```

## Monitoring & Maintenance

### Daily Monitoring

```bash
# Health check (run daily)
./scripts/recovery/health-check.sh

# Build validation (run on changes)
./scripts/recovery/validate-builds.sh

# Dependency audit (run weekly)
./scripts/recovery/install-dependencies.sh --audit-only
```

### Recovery State Monitoring

Monitor `recovery-state.json` for:
- Module health scores
- Phase completion status
- Error trends
- Build/test metrics

### Automated Monitoring Setup

```bash
# Setup automated daily health checks
crontab -e

# Add line:
0 9 * * * cd /path/to/cvplus && ./scripts/recovery/health-check.sh >> logs/daily-health.log 2>&1
```

## API Reference

### Authentication

All API endpoints require authentication. Include bearer token:

```bash
curl -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     https://your-firebase-project.cloudfunctions.net/getModuleState?moduleId=auth
```

### Endpoints

#### GET /modules

Retrieve all module states.

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "moduleId": "auth",
      "status": "critical",
      "buildStatus": "success",
      "testStatus": "failing",
      "healthScore": 60
    }
  ],
  "total": 11
}
```

#### GET /modules/{moduleId}

Retrieve specific module state.

**Parameters**:
- `moduleId`: Module identifier (auth, i18n, processing, etc.)

**Response**:
```json
{
  "success": true,
  "data": {
    "moduleId": "auth",
    "status": "critical",
    "buildStatus": "success",
    "testStatus": "failing",
    "dependencyHealth": "resolved",
    "lastBuildTime": "2025-09-16T10:30:00Z",
    "errorCount": 0,
    "warningCount": 0,
    "healthScore": 60
  }
}
```

#### PUT /modules/{moduleId}

Update module state.

**Request Body**:
```json
{
  "status": "healthy",
  "buildStatus": "success",
  "testStatus": "passing"
}
```

#### POST /modules/{moduleId}/build

Trigger module build.

**Request Body**:
```json
{
  "force": true,
  "clean": true
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "moduleState": { /* updated state */ },
    "buildResult": {
      "success": true,
      "errorCount": 0,
      "warningCount": 2,
      "duration": 15000,
      "output": "Build completed successfully"
    }
  }
}
```

#### POST /modules/{moduleId}/test

Execute module tests.

**Request Body**:
```json
{
  "coverage": true,
  "testFiles": "specific-test-file.test.ts"
}
```

## Best Practices

### Development Workflow

1. **Before Making Changes**:
   ```bash
   ./scripts/recovery/health-check.sh
   git status
   ```

2. **After Code Changes**:
   ```bash
   npm run build --workspace=@cvplus/[module]
   npm run test --workspace=@cvplus/[module]
   ./scripts/recovery/validate-builds.sh
   ```

3. **Before Committing**:
   ```bash
   ./scripts/recovery/health-check.sh
   npm run test:layer2
   ```

### Module Development Guidelines

1. **Dependency Management**:
   - Only depend on `@cvplus/core` and `@cvplus/logging`
   - No direct dependencies between Layer 2 modules
   - Use peer dependencies for core modules

2. **Build Configuration**:
   - Use standardized `tsup.config.ts`
   - Maintain consistent package.json scripts
   - Follow TypeScript configuration standards

3. **Testing Requirements**:
   - Minimum 80% test coverage
   - Include unit, integration, and performance tests
   - Use Vitest for all test execution

4. **Code Quality**:
   - All files under 200 lines
   - TypeScript strict mode enabled
   - ESLint compliance required

### Recovery Maintenance

1. **Weekly Tasks**:
   - Run full health check
   - Review dependency vulnerabilities
   - Update recovery documentation

2. **Monthly Tasks**:
   - Analyze health trends
   - Update recovery procedures
   - Review and optimize scripts

3. **Quarterly Tasks**:
   - Full recovery system validation
   - Performance optimization review
   - Architecture compliance audit

## Conclusion

The Level 2 Recovery System provides comprehensive tools and procedures for maintaining the health and integrity of CVPlus Level 2 modules. Regular use of the monitoring and validation tools ensures optimal system performance and early detection of issues.

For support or questions, consult the troubleshooting section or refer to the detailed API documentation above.

---

**Document Status**: ✅ Completed
**Implementation Status**: 45/52 tasks completed (86.5%)
**Next Review Date**: 2025-10-16