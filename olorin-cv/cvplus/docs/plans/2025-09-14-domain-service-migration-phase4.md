# Phase 4: Domain Service Migration Plan - CVPlus Core Business Logic

**Author**: Gil Klainert
**Date**: 2025-09-14
**Phase**: Implementation Planning
**Type**: Code Migration Strategy
**Status**: ⏳ PENDING

## Executive Summary

This plan details the migration of business logic services from the Core module to appropriate domain submodules, achieving 100% architectural compliance with the CVPlus submodule-only architecture. The migration preserves all external APIs while relocating domain-specific services to their specialized submodules.

## Current State Analysis

### Services Requiring Migration (75+ files)

#### 1. CV Processing Domain (High Priority - Layer 2)
**Target Submodule**: `@cvplus/cv-processing`

**Core CV Services** (15 files):
- `src/services/cv/cv-analysis.service.ts` - CV content analysis
- `src/services/cv/cv-generation.service.ts` - CV generation orchestration
- `src/services/cv/cv-template.service.ts` - Template management
- `src/services/cv/cv-validation.service.ts` - CV validation logic
- `src/services/cvGenerator.ts` - Main CV generator
- `src/services/cv-generator/types.ts` - CV generator types
- `src/services/cv-hash.service.ts` - CV deduplication
- `src/services/enhanced-ats-analysis.service.ts` - ATS optimization
- `src/services/policy-enforcement.service.ts` - CV policy checks

**CV Enhancement Services** (8 files):
- `src/services/enhanced-prompt-engine.service.ts` - AI prompt generation
- `src/services/prompt-engine/*` (5 files) - Prompt optimization
- `src/services/enhancements/enhancement-processing.service.ts` - CV enhancements

**CV Validation Services** (6 files):
- `src/services/validation/cv-validator.ts` - CV content validation
- `src/services/validation/validation-service.ts` - Generic validation
- `src/services/validation/text-validator.ts` - Text validation
- `src/services/validation/portal-validator.ts` - Portal validation
- `src/services/validation/types.ts` - Validation types
- `src/services/validation/index.ts` - Validation exports

**External Data Services** (10 files):
- `src/services/external-data/*` - External data integration
- LinkedIn, GitHub, website adapters
- Enrichment services for skills, certifications

#### 2. Analytics Domain (Medium Priority - Layer 2)
**Target Submodule**: `@cvplus/analytics`

**Analytics Services** (3 files):
- `src/services/cache/analytics-cache.service.ts` - Analytics caching
- Analytics-related functionality in enhanced types
- Performance monitoring services

#### 3. Multimedia Domain (Medium Priority - Layer 2)
**Target Submodule**: `@cvplus/multimedia`

**Media Services** (4 files):
- `src/services/enhanced-qr.service.ts` - QR code generation
- `src/services/video-providers/base-provider.interface.ts` - Video providers
- Media processing utilities
- Multimedia generation orchestration

#### 4. Workflow/Timeline Domain (Medium Priority - Layer 2)
**Target Submodule**: `@cvplus/workflow`

**Timeline Services** (15 files):
- `src/services/timeline-generation-v2.service.ts` - Timeline generation v2
- `src/services/timeline-generation.service.ts` - Timeline generation v1
- `src/services/timeline/*` (10 files) - Timeline processing components
- `src/services/types/timeline.types.ts` - Timeline types
- `src/services/calendar-integration.service.ts` - Calendar integration

#### 5. Regional/i18n Domain (Medium Priority - Layer 2)
**Target Submodule**: `@cvplus/i18n`

**Localization Services** (5 files):
- `src/services/regional-localization.service.ts` - Main localization service
- `src/services/regional-localization/*` (4 files) - Regional optimization
- `src/services/language-proficiency.service.ts` - Language skills

#### 6. Authentication Domain (Low Priority - Layer 2)
**Target Submodule**: `@cvplus/auth`

**Session Services** (2 files):
- `src/services/session-checkpoint.service.ts` - Session management
- User authentication utilities

#### 7. Premium/Subscription Domain (Low Priority - Layer 2)
**Target Submodule**: `@cvplus/premium`

**Premium Services** (4 files):
- `src/services/cache/subscription-cache.service.ts` - Subscription caching
- `src/services/cache/pricing-cache.service.ts` - Pricing caching
- `src/services/cache/feature-access-cache.service.ts` - Feature access
- `src/services/tier-management/*` (2 files) - Tier management

#### 8. Shared Infrastructure (Remain in Core - Layer 1)
**Target**: Keep in `@cvplus/core`

**Foundation Services** (20+ files):
- `src/services/base-service.ts` - Service base class
- `src/services/enhanced-base-service.ts` - Enhanced base service
- `src/services/logger.ts` - Logging utilities
- `src/services/cache/cache.service.ts` - Core caching
- `src/services/cache/redis-client.service.ts` - Redis client
- `src/services/resilience.service.ts` - Resilience patterns
- `src/services/circuit-breaker.service.ts` - Circuit breaker
- All utility mixins and shared types

## Migration Strategy

### Phase 4.1: CV Processing Services Migration (Week 1)
**Scope**: Migrate CV processing domain services to `@cvplus/cv-processing`

**Services to Migrate**:
1. CV core services (`cv/` directory)
2. CV generator and hash services
3. ATS analysis and policy enforcement
4. Prompt engine and enhancement services
5. CV validation framework
6. External data integration services

**Migration Steps**:
1. **Prepare Target Submodule**:
   - Create service directories in `@cvplus/cv-processing/src/services/`
   - Set up proper TypeScript configuration
   - Establish dependency structure

2. **Migrate Service Files**:
   - Copy service files to target submodule
   - Update import paths to use `@cvplus/core` for shared utilities
   - Update Firebase and external library imports
   - Maintain all public interfaces

3. **Update Export Structure**:
   - Create barrel exports in `@cvplus/cv-processing/src/services/index.ts`
   - Ensure all public APIs are accessible
   - Maintain backward compatibility

4. **Establish Temporary Re-exports**:
   - Add re-exports in Core's service index
   - Use `export { CVAnalysisService } from '@cvplus/cv-processing';`
   - Document deprecation warnings

5. **Update Dependencies**:
   - Add `@cvplus/cv-processing` to consuming packages
   - Update import statements progressively
   - Test all functionality

### Phase 4.2: Analytics and Multimedia Services (Week 2)
**Scope**: Migrate analytics and multimedia services

**Analytics Migration**:
- Move analytics cache services to `@cvplus/analytics`
- Update analytics types and interfaces
- Establish analytics API contracts

**Multimedia Migration**:
- Move QR service to `@cvplus/multimedia`
- Migrate video provider interfaces
- Update media processing utilities

### Phase 4.3: Workflow and i18n Services (Week 3)
**Scope**: Migrate workflow and internationalization services

**Workflow Migration**:
- Move timeline services to `@cvplus/workflow`
- Migrate calendar integration
- Update workflow orchestration

**i18n Migration**:
- Move regional localization to `@cvplus/i18n`
- Migrate language proficiency services
- Update cultural optimization

### Phase 4.4: Auth and Premium Services (Week 4)
**Scope**: Complete remaining domain service migrations

**Authentication Migration**:
- Move session management to `@cvplus/auth`
- Update authentication utilities

**Premium Migration**:
- Move subscription services to `@cvplus/premium`
- Migrate tier management
- Update feature access controls

### Phase 4.5: Integration and Cleanup (Week 5)
**Scope**: Complete migration and remove temporary re-exports

**Integration Tasks**:
1. Remove all temporary re-exports from Core
2. Update all consuming packages to use direct imports
3. Validate all functionality works correctly
4. Run complete test suite
5. Update documentation

## Dependency Management Strategy

### Layer Architecture Compliance
```
Layer 0 (Infrastructure): @cvplus/logging
Layer 1 (Foundation): @cvplus/core, @cvplus/shell
Layer 2 (Domain): @cvplus/cv-processing, @cvplus/analytics, etc.
```

### Import Pattern Updates
**Before Migration** (Core internal):
```typescript
import { CVAnalysisService } from '../services/cv/cv-analysis.service';
```

**After Migration** (Cross-module):
```typescript
import { CVAnalysisService } from '@cvplus/cv-processing';
```

**Temporary Re-export** (Compatibility):
```typescript
// In @cvplus/core/src/services/index.ts
export { CVAnalysisService } from '@cvplus/cv-processing';
```

### Dependency Rules
1. **Domain modules** can import from `@cvplus/core` (Layer 1)
2. **Domain modules** cannot import from other domain modules (Layer 2)
3. **Core module** maintains shared utilities and types only
4. **External dependencies** allowed in all modules

## Risk Assessment and Mitigation

### High Risks
1. **Breaking API Changes**: Existing Firebase Functions depend on current exports
   - **Mitigation**: Maintain temporary re-exports until all imports updated
   - **Validation**: Comprehensive API contract testing

2. **Import Chain Breaks**: Complex dependency chains between services
   - **Mitigation**: Gradual migration with temporary compatibility layer
   - **Validation**: TypeScript compilation checks at each step

3. **Firebase Function Deployment**: Functions may fail if imports break
   - **Mitigation**: Test deployments in staging environment
   - **Validation**: Full function deployment testing

### Medium Risks
1. **TypeScript Configuration**: Path mapping and module resolution
   - **Mitigation**: Update tsconfig.json files systematically
   - **Validation**: Type checking across all packages

2. **Test Suite Dependencies**: Tests may reference moved services
   - **Mitigation**: Update test imports systematically
   - **Validation**: Run complete test suite after each migration phase

### Low Risks
1. **Build Performance**: Additional build dependencies
   - **Mitigation**: Optimize build order and dependency graph
   - **Validation**: Monitor build times

## Validation Strategy

### Phase Validation Checkpoints
1. **TypeScript Compilation**: All packages must compile without errors
2. **Test Suite Execution**: All tests must pass
3. **Firebase Function Deployment**: All functions must deploy successfully
4. **API Contract Testing**: All external APIs must respond correctly
5. **Integration Testing**: End-to-end functionality must work

### Success Criteria
- ✅ Zero breaking changes to external APIs
- ✅ All Firebase Functions deploy successfully
- ✅ All tests pass in all packages
- ✅ TypeScript compilation successful across all modules
- ✅ Documentation updated and accurate
- ✅ No circular dependencies
- ✅ Performance maintained or improved

## Implementation Timeline

### Week 1: CV Processing Migration
- ✅ Analyze CV processing service dependencies
- ✅ Create target directory structure in `@cvplus/cv-processing`
- ✅ Migrate CV core services (analysis, generation, validation)
- ✅ Migrate CV enhancement services (prompt engine, ATS analysis)
- ✅ Update export structure and establish re-exports
- ✅ Test CV processing functionality

### Week 2: Analytics and Multimedia Migration
- ✅ Migrate analytics cache services to `@cvplus/analytics`
- ✅ Migrate multimedia services to `@cvplus/multimedia`
- ✅ Update export structures
- ✅ Test analytics and multimedia functionality

### Week 3: Workflow and i18n Migration
- ✅ Migrate timeline services to `@cvplus/workflow`
- ✅ Migrate localization services to `@cvplus/i18n`
- ✅ Update export structures
- ✅ Test workflow and i18n functionality

### Week 4: Auth and Premium Migration
- ✅ Migrate session services to `@cvplus/auth`
- ✅ Migrate premium services to `@cvplus/premium`
- ✅ Update export structures
- ✅ Test authentication and premium functionality

### Week 5: Integration and Cleanup
- ✅ Remove temporary re-exports from Core
- ✅ Update all import statements
- ✅ Complete integration testing
- ✅ Deploy to staging and production

## Post-Migration Benefits

### Architectural Compliance
- ✅ 100% business logic moved to domain submodules
- ✅ Core module contains only shared utilities and types
- ✅ Clear separation of concerns across domains
- ✅ Scalable and maintainable architecture

### Development Benefits
- ✅ Domain experts can work independently on their modules
- ✅ Clearer responsibility boundaries
- ✅ Reduced coupling between domains
- ✅ Better testability and maintainability

### Operational Benefits
- ✅ Independent deployment of domain modules
- ✅ Better error isolation
- ✅ Improved debugging and monitoring
- ✅ Scalable team organization

## Next Steps

1. **Phase 4.1 Execution**: Begin CV processing services migration
2. **Create Migration Scripts**: Automate file movement and import updates
3. **Set Up Validation Pipeline**: Automated testing for each migration phase
4. **Documentation Updates**: Update all affected documentation
5. **Team Communication**: Coordinate with team on migration timeline

---

**Migration Status**: ⏳ PENDING - Ready for implementation
**Phase 4 Objective**: Achieve 100% architectural compliance through domain service migration
**Success Metric**: Zero business logic services remaining in Core module