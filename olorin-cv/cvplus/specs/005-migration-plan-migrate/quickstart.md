# Quickstart: CVPlus Code Migration to Submodules

**Date**: 2025-09-13
**Estimated Time**: 30 minutes for validation setup
**Prerequisites**: Git, Node.js 20+, Firebase CLI

## Overview

This quickstart demonstrates how to validate the CVPlus code migration from root repository to submodules. It provides step-by-step verification that all functionality is preserved during the migration process.

## Quick Setup (5 minutes)

### 1. Repository Preparation
```bash
# Clone the repository if not already available
cd /Users/gklainert/Documents/cvplus

# Verify current branch
git branch --show-current
# Should show: 005-migration-plan-migrate

# Verify submodules are initialized
git submodule status
# Should show 18+ submodules in packages/
```

### 2. Environment Verification
```bash
# Verify Node.js version
node --version
# Should show: v20.x.x or higher

# Verify Firebase CLI
firebase --version
# Should show Firebase CLI version

# Verify TypeScript compiler
npx tsc --version
# Should show TypeScript version
```

### 3. Initial Build Validation
```bash
# Install dependencies
cd functions && npm install
cd ../frontend && npm install
cd ..

# Run TypeScript compilation
cd functions && npx tsc --noEmit
# Should complete without errors

# Verify existing function exports
cd functions/src
grep -c "export" index.ts
# Should show 166+ exports
```

## Migration Validation Test Scenarios

### Scenario 1: Pre-Migration Baseline (5 minutes)

**Objective**: Establish baseline functionality before migration

```bash
# Test current Firebase Functions build
cd functions
npm run build
# Expected: Build completes successfully

# Test current frontend build
cd ../frontend
npm run build
# Expected: Build completes successfully

# Test TypeScript compilation across codebase
cd .. && find . -name "*.ts" -not -path "./node_modules/*" | head -10
# Expected: TypeScript files found in multiple locations

# Verify current function count
cd functions/src && node -e "
const index = require('./index.js');
console.log('Total exports:', Object.keys(index).length);
"
# Expected: 166+ function exports
```

**Success Criteria**:
- ✅ Both builds complete without errors
- ✅ TypeScript compilation succeeds
- ✅ 166+ function exports available
- ✅ All submodules accessible

### Scenario 2: Migration Unit Classification (10 minutes)

**Objective**: Verify migration classification system works correctly

```bash
# Identify files requiring migration
cd functions/src

# List service files in root (should be migrated)
find . -name "*.service.ts" -not -path "./test/*"
# Expected: ai-analysis.service.ts, cv-processor.service.ts, multimedia.service.ts, profile-manager.service.ts

# List model files in root (should be migrated)
find . -name "*.(model|service).ts" -path "./models/*"
# Expected: analytics.service.ts, generated-content.service.ts, public-profile.service.ts

# List new function files (should be migrated to appropriate submodules)
find . -path "./functions/*/*.ts" | head -10
# Expected: cv/upload.ts, multimedia/podcast.ts, profile/create.ts, analytics/get.ts

# Verify existing submodule structure
ls ../../packages/
# Expected: 18+ directories (core, auth, cv-processing, multimedia, analytics, etc.)
```

**Success Criteria**:
- ✅ Service files identified for migration
- ✅ Model files identified for domain assignment
- ✅ New API functions identified for submodule placement
- ✅ Target submodules exist and accessible

### Scenario 3: Import Chain Validation (5 minutes)

**Objective**: Verify import/export chain preservation works

```bash
# Check current @cvplus/* imports in index.ts
cd functions/src
grep "@cvplus/" index.ts | head -5
# Expected: Multiple @cvplus/[module]/backend imports

# Verify one submodule import resolves
node -e "
try {
  const cvProcessing = require('@cvplus/cv-processing/backend');
  console.log('CV Processing functions:', Object.keys(cvProcessing).length);
} catch (e) {
  console.log('Import resolution test:', e.message);
}
"
# Expected: Function count or clear error message

# Test TypeScript import resolution
npx tsc --traceResolution --noEmit index.ts | grep "@cvplus" | head -3
# Expected: Resolution paths for @cvplus imports
```

**Success Criteria**:
- ✅ @cvplus/* import pattern already established
- ✅ Submodule imports resolve correctly
- ✅ TypeScript module resolution working

### Scenario 4: API Contract Preservation (5 minutes)

**Objective**: Ensure external API contracts remain unchanged

```bash
# Extract all exported function names
cd functions/src
node -e "
const fs = require('fs');
const content = fs.readFileSync('index.ts', 'utf8');
const exports = content.match(/export\s*\{\s*([^}]+)\s*\}/g);
exports.forEach(exp => console.log(exp));
" | head -10
# Expected: Export statements showing function names

# Verify Firebase function deployment structure
firebase functions:list --project getmycv-ai 2>/dev/null || echo "Firebase config check"
# Expected: Function list or configuration verification

# Check package.json for function dependencies
grep -A 5 -B 5 "@cvplus" package.json || echo "No @cvplus dependencies yet"
# Expected: Either existing dependencies or indication they will be added
```

**Success Criteria**:
- ✅ All function exports identified
- ✅ Firebase deployment configuration present
- ✅ Dependency structure understood

## Post-Migration Validation Commands

### After Each Migration Batch
```bash
# Validate TypeScript compilation
npx tsc --noEmit

# Validate function export count
node -e "console.log('Exports:', Object.keys(require('./index.js')).length)"

# Validate specific domain functions (example for CV processing)
node -e "
const index = require('./index.js');
const cvFunctions = ['processCV', 'analyzeCV', 'generateCV'];
cvFunctions.forEach(fn => console.log(fn, typeof index[fn]));
"

# Test build process
npm run build

# Test Firebase functions validation (emulator)
firebase emulators:exec --only functions "echo 'Functions loaded successfully'"
```

### Final Migration Validation
```bash
# Complete build validation
npm run build && cd ../frontend && npm run build && cd ../functions

# Export count verification
node -e "
const index = require('./index.js');
const exportCount = Object.keys(index).length;
console.log('Total exports after migration:', exportCount);
if (exportCount < 166) {
  console.error('ERROR: Missing exports detected!');
  process.exit(1);
}
console.log('SUCCESS: All exports preserved');
"

# TypeScript strict validation
npx tsc --strict --noEmit

# Test deployment (dry run)
firebase deploy --only functions --dry-run
```

## Troubleshooting

### Common Issues

**TypeScript compilation errors**:
```bash
# Check for missing @cvplus/* packages
npm ls | grep "@cvplus"
# Fix: npm install @cvplus/[missing-package]
```

**Import resolution failures**:
```bash
# Verify submodule initialization
git submodule update --init --recursive
cd packages/[submodule] && npm install
```

**Function export count mismatch**:
```bash
# Compare exports before/after migration
diff <(node -e "console.log(Object.keys(require('./index.js')).sort().join('\n'))") \
     <(node -e "console.log(Object.keys(require('./index.backup.js')).sort().join('\n'))")
```

## Success Validation Checklist

- [ ] **Pre-migration baseline**: All builds pass, 166+ exports present
- [ ] **Migration classification**: All files correctly categorized by domain
- [ ] **Import resolution**: @cvplus/* imports resolve correctly
- [ ] **API preservation**: External function contracts unchanged
- [ ] **Post-migration validation**: All builds pass, export count maintained
- [ ] **Performance**: Build times within acceptable range (<5 minutes)
- [ ] **Deployment**: Firebase Functions deploy successfully

## Next Steps

After completing this quickstart validation:

1. **Execute Migration Plan**: Use the validated process to migrate code batches
2. **Monitor Metrics**: Track build times, export counts, and API functionality
3. **Rollback Plan**: Keep validated rollback procedures ready
4. **Documentation Updates**: Update project documentation with new structure

**Estimated Total Migration Time**: 2-4 hours depending on validation depth and any issues encountered.

This quickstart provides the foundation for confident, validated migration execution with clear success criteria and rollback capabilities.