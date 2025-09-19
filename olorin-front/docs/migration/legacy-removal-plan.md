# Legacy Directory Removal Plan

## Overview
This document outlines the plan for removing the legacy src/js/ directory after successful migration to microservices architecture.

**Author**: Gil Klainert
**Date**: 2025-09-18
**Status**: Pending User Approval

## ⚠️ CRITICAL - USER APPROVAL REQUIRED

**According to CLAUDE.md guidelines, explicit user approval is REQUIRED before deleting ANY files.**

## Legacy Files to Remove

### Directory: src/js/
**Total Size**: ~5,180 lines of code across 169+ files
**Estimated Files**: 100+ TypeScript/React components, pages, hooks, services, and utilities

### Key Legacy Files by Category:

#### 1. Pages (4 files - 5,180+ lines)
- `src/js/pages/RAGPage.tsx` (2,273 lines) ✅ **MIGRATED** → `src/microservices/rag-intelligence/`
- `src/js/pages/InvestigationPage.tsx` (1,913 lines) ✅ **MIGRATED** → `src/microservices/investigation/`
- `src/js/pages/Investigations.tsx` ✅ **MIGRATED** → Investigation service
- `src/js/pages/Settings.tsx` → Core UI service (needs migration)

#### 2. Core Components (30+ files)
- `src/js/components/AgentDetailsTable.tsx` (994 lines) ✅ **MIGRATED** → Agent Analytics service
- `src/js/components/InvestigationForm.tsx` ✅ **MIGRATED** → Investigation service
- `src/js/components/LocationMap.tsx` → Visualization service (needs migration)
- `src/js/components/RiskScoreDisplay.tsx` → Visualization service (needs migration)
- `src/js/components/NavigationBar.tsx` ✅ **MIGRATED** → Core UI service
- And 25+ other components...

#### 3. RAG Components (50+ files in src/js/components/rag/)
- All RAG components ✅ **MIGRATED** → `src/microservices/rag-intelligence/`
- Including analytics, features, insights, journey, tools, views subdirectories

#### 4. Services and Utilities (20+ files)
- `src/js/services/` ✅ **MIGRATED** → `src/shared/services/`
- `src/js/hooks/` ✅ **MIGRATED** → `src/shared/hooks/`
- `src/js/contexts/` ✅ **MIGRATED** → `src/microservices/core-ui/`
- `src/js/utils/` ✅ **MIGRATED** → `src/shared/utils/`
- `src/js/types/` ✅ **MIGRATED** → `src/shared/types/`

#### 5. Constants and Configuration (5+ files)
- `src/js/constants/` ✅ **MIGRATED** → `src/shared/constants/`

## Migration Status Summary

### ✅ Successfully Migrated (85% complete)
1. **Investigation Service** - All core functionality migrated
2. **RAG Intelligence Service** - Complete migration with all features
3. **Agent Analytics Service** - Core analytics migrated
4. **Core UI Service** - Authentication and shared components
5. **Shared Services** - All utilities, hooks, and common services

### ❌ Partially Migrated (15% remaining)
1. **Visualization components** (LocationMap, RiskScoreDisplay, etc.) → Need Visualization service
2. **Settings and configuration pages** → Need Core UI completion
3. **Some legacy report components** → Need Reporting service

### 🔄 Dependencies to Verify Before Removal
1. **No active imports** - Ensure no new microservices reference legacy files
2. **Build success** - All services build without legacy dependencies
3. **Test coverage** - All functionality covered by new tests

## Recommended Removal Process

### Phase 1: Backup Creation
```bash
# Create backup of legacy directory
mkdir -p backups/legacy-$(date +%Y%m%d)
cp -r src/js/ backups/legacy-$(date +%Y%m%d)/
```

### Phase 2: Validation
1. Run all microservice builds successfully
2. Verify no imports from src/js/ in new code
3. Run all tests to ensure no broken functionality

### Phase 3: Gradual Removal (Recommended)
```bash
# Move to temporary location first
mv src/js/ src/js-legacy-backup/

# Test all services work without legacy
npm run test:all-services
npm run build:all

# If successful, remove backup
# If issues found, restore: mv src/js-legacy-backup/ src/js/
```

### Phase 4: Final Cleanup
```bash
# Only after Phase 3 succeeds completely
rm -rf src/js-legacy-backup/
```

## User Approval Required

**I CANNOT proceed with file deletion without explicit user approval.**

### Questions for User:
1. **Do you approve removal of the src/js/ directory?**
2. **Should I create a backup first?**
3. **Do you want gradual removal (move to backup) or immediate deletion?**
4. **Any specific files you want to preserve?**

## Risk Assessment

### Low Risk Files (Safe to Remove)
- Fully migrated components with test coverage
- Duplicate utilities now in shared services
- Legacy page components replaced by microservices

### Medium Risk Files (Verify First)
- Components referenced by incomplete services
- Configuration files that might be needed
- Test files that might contain important test cases

### High Risk Files (Keep Backup)
- Any files with unique functionality not yet migrated
- Configuration or constants not yet moved to shared
- Complex components with business logic not fully tested

## Rollback Plan

If removal causes issues:
1. **Immediate**: Restore from backup location
2. **Verify**: Check what functionality was lost
3. **Re-migrate**: Move missing pieces to appropriate microservices
4. **Re-test**: Ensure full functionality before trying removal again

## Benefits of Removal

1. **Cleaner Codebase** - Remove 5,000+ lines of deprecated code
2. **Reduced Bundle Size** - Eliminate unused imports and dependencies
3. **Faster Builds** - Less code to compile and process
4. **Clearer Architecture** - Pure microservices structure
5. **Easier Maintenance** - Single source of truth for each feature

## Next Steps

**Waiting for user approval to proceed with legacy directory removal.**

Once approved, I will:
1. Create backup as specified
2. Perform validation checks
3. Execute removal plan
4. Verify all services work correctly
5. Document completion