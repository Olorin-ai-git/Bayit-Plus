# Level 2 Recovery Quickstart Guide

**Version**: 1.0.0
**Date**: September 16, 2025
**Estimated Time**: 2-4 hours for complete recovery

## Prerequisites

### Environment Setup
```bash
# Verify Node.js version
node --version  # Should be 20+

# Verify npm/yarn workspace support
npm --version   # Should be 8+

# Navigate to CVPlus root
cd /Users/gklainert/Documents/cvplus

# Verify git branch
git status      # Should be on 009-level-2-recovery branch
```

### Initial Assessment
```bash
# Quick health check - expect failures
./scripts/health-check.sh

# Module status check
ls -la packages/*/package.json | wc -l  # Should show 11 modules
```

## Phase 1: Emergency Stabilization (30-60 minutes)

### Step 1.1: Fix Workspace Configuration
```bash
# Update root package.json workspace configuration
npm run config:workspace

# Install all workspace dependencies
npm install --workspaces

# Verify workspace setup
npm ls --workspaces --depth=0
```

**Expected Output**: All 11 modules should appear with their dependencies resolved.

### Step 1.2: Configure TypeScript Path Resolution
```bash
# Update root TypeScript configuration
npm run config:typescript

# Verify path mapping
npx tsc --showConfig | grep "@cvplus"
```

**Expected Output**: Should show proper path mappings for @cvplus/* packages.

### Step 1.3: Install Missing Dependencies
```bash
# Install module-specific dependencies
npm run install:modules

# Check for missing peer dependencies
npm run check:dependencies
```

**Expected Output**: No missing dependency warnings.

### Step 1.4: Validate Phase 1
```bash
# Test basic TypeScript compilation
npm run build:check

# Validate workspace integrity
npm run validate:workspace
```

**Success Criteria**:
- ✅ All 11 modules present in workspace
- ✅ TypeScript can resolve @cvplus/* imports
- ✅ No missing dependency errors

## Phase 2: Build Infrastructure Recovery (60-90 minutes)

### Step 2.1: Standardize Build Configuration
```bash
# Apply consistent build configuration across modules
npm run standardize:build

# Verify build scripts
npm run verify:build-scripts
```

**Expected Output**: All modules should have identical build configuration patterns.

### Step 2.2: Configure Test Infrastructure
```bash
# Set up unified test configuration
npm run setup:testing

# Install test dependencies
npm run install:test-deps
```

**Expected Output**: Jest configuration applied to all modules.

### Step 2.3: Build All Modules
```bash
# Attempt build on healthy modules first
npm run build --workspace=@cvplus/auth
npm run build --workspace=@cvplus/i18n
npm run build --workspace=@cvplus/analytics

# Attempt build on critical modules
npm run build --workspace=@cvplus/cv-processing
npm run build --workspace=@cvplus/multimedia
npm run build --workspace=@cvplus/premium
```

**Expected Output**: All builds should complete with 0 errors.

### Step 2.4: Validate Phase 2
```bash
# Run build validation
npm run validate:builds

# Check build artifacts
npm run check:artifacts
```

**Success Criteria**:
- ✅ All 11 modules build successfully
- ✅ Build artifacts generated correctly
- ✅ No TypeScript compilation errors

## Phase 3: Test Suite Recovery (45-75 minutes)

### Step 3.1: Configure Test Environment
```bash
# Set up Firebase Functions test environment
npm run setup:test-env

# Configure test database
npm run setup:test-db
```

### Step 3.2: Run Test Suites
```bash
# Test healthy modules first
npm test --workspace=@cvplus/auth
npm test --workspace=@cvplus/i18n
npm test --workspace=@cvplus/analytics

# Test recovered modules
for module in cv-processing multimedia premium public-profiles recommendations admin workflow payments; do
  echo "Testing @cvplus/$module"
  npm test --workspace=@cvplus/$module
done
```

**Expected Output**: All test suites should pass with 100% success rate.

### Step 3.3: Generate Coverage Reports
```bash
# Generate coverage for all modules
npm run test:coverage

# Validate coverage thresholds
npm run validate:coverage
```

**Expected Output**: All modules should meet minimum coverage requirements.

### Step 3.4: Validate Phase 3
```bash
# Run comprehensive test validation
npm run validate:tests

# Check test infrastructure
npm run check:test-config
```

**Success Criteria**:
- ✅ All test suites pass (100% pass rate)
- ✅ Coverage meets minimum thresholds
- ✅ Test infrastructure properly configured

## Phase 4: Architecture Compliance (30-60 minutes)

### Step 4.1: Validate Layer Dependencies
```bash
# Check for layer violations
npm run validate:layers

# Audit circular dependencies
npm run audit:circular-deps
```

**Expected Output**: No layer violations or circular dependencies.

### Step 4.2: Validate Import Chains
```bash
# Validate @cvplus/* import patterns
npm run validate:imports

# Check Firebase Functions exports
npm run validate:exports
```

**Expected Output**: All imports follow Layer 2 rules.

### Step 4.3: Integration Testing
```bash
# Test module integration
npm run test:integration

# Validate Firebase Functions deployment
npm run validate:functions
```

**Expected Output**: All integration tests pass.

### Step 4.4: Final Validation
```bash
# Comprehensive architecture audit
npm run audit:architecture

# Full system validation
npm run validate:system
```

**Success Criteria**:
- ✅ All layer dependencies correct
- ✅ No circular dependencies
- ✅ Firebase Functions integration works
- ✅ All integration tests pass

## Verification & Deployment

### Complete Health Check
```bash
# Run full health check
npm run health:complete

# Generate recovery report
npm run report:recovery
```

**Expected Output**: All systems showing healthy status.

### Deployment Readiness
```bash
# Validate deployment readiness
npm run validate:deployment

# Test Firebase deployment (dry run)
firebase deploy --only functions --dry-run
```

**Expected Output**: Deployment validation passes.

### Final Verification
```bash
# Run end-to-end validation
npm run validate:e2e

# Performance check
npm run check:performance
```

**Success Criteria**:
- ✅ All 11 modules healthy
- ✅ Build time < 60s per module
- ✅ Test pass rate = 100%
- ✅ Deployment ready

## Troubleshooting

### Common Issues

#### Workspace Dependencies Not Resolving
```bash
# Clear workspace cache
rm -rf node_modules package-lock.json
rm -rf packages/*/node_modules packages/*/package-lock.json

# Reinstall with fresh lockfile
npm install --workspaces
```

#### TypeScript Path Resolution Failures
```bash
# Verify TypeScript configuration
npx tsc --showConfig

# Check path mappings
cat tsconfig.json | grep -A 10 "paths"

# Restart TypeScript server
npx tsc --build --clean
```

#### Build Failures in Specific Modules
```bash
# Check module-specific issues
cd packages/[MODULE_NAME]
npm run build --verbose

# Verify dependencies
npm ls
```

#### Test Suite Failures
```bash
# Check test configuration
cat jest.config.js

# Run tests with verbose output
npm test -- --verbose

# Clear test cache
npm test -- --clearCache
```

### Recovery Scripts

All recovery operations use standardized npm scripts:

```bash
npm run recovery:phase1    # Emergency stabilization
npm run recovery:phase2    # Build infrastructure
npm run recovery:phase3    # Test suite recovery
npm run recovery:phase4    # Architecture compliance

npm run recovery:validate  # Full validation
npm run recovery:report    # Generate status report
```

### Success Indicators

#### Module Health Scores
Each module should achieve:
- Build Status: ✅ Success
- Test Status: ✅ 100% Pass Rate
- Dependency Health: ✅ All Resolved
- Health Score: ✅ 95+ out of 100

#### Overall System Health
- Total Modules: 11/11 healthy
- Build Success Rate: 100%
- Test Pass Rate: 100%
- Architecture Compliance: 100%

## Next Steps

Once recovery is complete:

1. **Monitor Stability**: Observe system for 24 hours
2. **Update Documentation**: Record any configuration changes
3. **Implement Monitoring**: Set up health check automation
4. **Train Team**: Share recovery procedures with development team

## Support

For issues during recovery:
- Check logs in `logs/recovery/`
- Review error details in `recovery-report.json`
- Consult troubleshooting section above
- Contact CVPlus Architecture Team

---

*This quickstart guide provides a complete recovery pathway for all 11 Level 2 modules with validation at each step.*