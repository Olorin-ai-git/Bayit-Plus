# CRITICAL SUBMODULE EXTRACTION PLAN

**Author**: Gil Klainert
**Date**: 2025-09-14
**Phase**: Migration Phase 4C - Final Submodule Extraction

## EXECUTION OBJECTIVE
Extract 8 staged domains from `/packages/core/src/staging-for-submodules/` to independent git submodules with zero breaking changes.

## DOMAINS TO EXTRACT

### 1. CV-Processing Domain
- **Source**: `src/staging-for-submodules/cv-processing/`
- **Target**: `packages/cv-processing/`
- **Content**: CV analysis, generation, validation, ATS optimization, policy enforcement
- **Repository**: `git@github.com:gilco1973/cvplus-cv-processing.git`

### 2. Analytics Domain
- **Source**: `src/staging-for-submodules/analytics/`
- **Target**: `packages/analytics/`
- **Content**: Analytics caching, performance monitoring
- **Repository**: `git@github.com:gilco1973/cvplus-analytics.git`

### 3. Premium Domain
- **Source**: `src/staging-for-submodules/premium/`
- **Target**: `packages/premium/`
- **Content**: Feature access, pricing, subscription, usage caching
- **Repository**: `git@github.com:gilco1973/cvplus-premium.git`

### 4. Multimedia Domain
- **Source**: `src/staging-for-submodules/multimedia/`
- **Target**: `packages/multimedia/`
- **Content**: Enhanced QR service, video providers
- **Repository**: `git@github.com:gilco1973/cvplus-multimedia.git`

### 5. Workflow Domain
- **Source**: `src/staging-for-submodules/workflow/`
- **Target**: `packages/workflow/`
- **Content**: Timeline generation, calendar integration, timeline processing
- **Repository**: `git@github.com:gilco1973/cvplus-workflow.git`

### 6. I18n Domain
- **Source**: `src/staging-for-submodules/i18n/`
- **Target**: `packages/i18n/`
- **Content**: Regional localization, compliance, cultural optimization
- **Repository**: `git@github.com:gilco1973/cvplus-i18n.git`

### 7. Auth Domain
- **Source**: `src/staging-for-submodules/auth/`
- **Target**: `packages/auth/`
- **Content**: Session checkpointing
- **Repository**: `git@github.com:gilco1973/cvplus-auth.git`

### 8. External-Data Domain
- **Source**: `src/staging-for-submodules/external-data/`
- **Target**: `packages/external-data/`
- **Content**: Data adapters, enrichment services, validation
- **Repository**: `git@github.com:gilco1973/cvplus-external-data.git`

## CRITICAL REQUIREMENTS

### Zero Breaking Changes
- All Firebase Function exports must remain functional
- TypeScript compilation must succeed after extraction
- All current API contracts must be preserved
- Backward compatibility through core re-exports during transition

### Import Pattern Updates
- Replace staging imports: `../../staging-for-submodules/domain/`
- With submodule imports: `@cvplus/domain/backend`
- Update all re-export files in core module
- Maintain temporary compatibility layer

### Submodule Independence
- Each domain can build independently: `npm run build`
- Each domain can test independently: `npm run test`
- Each domain can deploy independently
- Proper package.json for each submodule

## EXECUTION PHASES

### Phase 1: Git Repository Preparation
1. Verify all target submodule repositories exist
2. Check current git submodule configuration
3. Ensure proper .gitmodules setup

### Phase 2: Content Migration per Domain
For each domain:
1. Copy staged content to target submodule
2. Create proper package.json with dependencies
3. Set up TypeScript configuration
4. Create index.ts with proper exports
5. Test independent build capability

### Phase 3: Import Chain Updates
1. Update core module re-exports to use @cvplus/domain pattern
2. Update consuming code import statements
3. Verify TypeScript compilation
4. Test Firebase Function exports

### Phase 4: Validation & Cleanup
1. Run full TypeScript build across all modules
2. Verify Firebase Function export integrity
3. Test deployment pipeline
4. Remove staging directories after confirmation

## SUCCESS CRITERIA
- ✅ All 8 domains extracted to independent submodules
- ✅ Zero TypeScript compilation errors
- ✅ All Firebase Functions deploy successfully
- ✅ All API contracts preserved
- ✅ Independent build capability for each submodule
- ✅ Clean removal of staging directories

## RISK MITIGATION
- Atomic migration per domain with rollback capability
- Backup staging content before removal
- Staged git commits for each phase
- Independent testing of each extracted domain

## NEXT ACTIONS
1. Use git-expert subagent for git operations
2. Use core-module-specialist for orchestration
3. Use domain-specific specialists for each extraction
4. Systematic validation after each domain extraction