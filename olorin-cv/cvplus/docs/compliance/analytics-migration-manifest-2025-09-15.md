# Analytics Migration Manifest

**Date**: 2025-09-15
**Author**: Gil Klainert
**Purpose**: Detailed file-by-file migration mapping for analytics architectural violations
**Total Files Audited**: 75+ TypeScript files

## Migration Categories Overview

| Category | Files to Migrate | Target Module | Priority | Estimated Effort |
|----------|------------------|---------------|----------|------------------|
| **CV Processing** | 15 files | `packages/cv-processing/` | CRITICAL | 2-3 days |
| **Premium/Subscription** | 8 files | `packages/premium/` | HIGH | 1-2 days |
| **Multimedia/Video** | 3 files | `packages/multimedia/` | MEDIUM | 0.5-1 day |
| **Admin/Monitoring** | 2-3 files | `packages/admin/` | LOW-MEDIUM | 0.5-1 day |
| **Analytics Core** | 45+ files | REMAIN in `packages/analytics/` | N/A | Maintain |

---

## CRITICAL PRIORITY: CV Processing Migration

### **Target Module**: `packages/cv-processing/`

#### **Services to Migrate (11 files)**:

1. **`src/services/ml-pipeline/features/CVFeatureService.ts`** - **468 lines**
   - **Function**: Core CV analysis and feature extraction
   - **Dependencies**: ParsedCV type (broken import), FeatureVector
   - **Migration Target**: `packages/cv-processing/src/services/features/CVFeatureService.ts`
   - **Critical Issues**: Broken import `import { ParsedCV } from '../../../types/job';`

2. **`src/services/ml-pipeline/core/MLPipelineOrchestrator.ts`**
   - **Function**: CV processing workflow orchestration
   - **Dependencies**: CV feature services, prediction models
   - **Migration Target**: `packages/cv-processing/src/services/orchestration/MLPipelineOrchestrator.ts`

3. **`src/services/ml-pipeline/features/DerivedFeatureService.ts`**
   - **Function**: CV-specific feature derivation and enhancement
   - **Migration Target**: `packages/cv-processing/src/services/features/DerivedFeatureService.ts`

4. **`src/services/ml-pipeline/features/MatchingFeatureService.ts`**
   - **Function**: CV-job matching algorithms and scoring
   - **Migration Target**: `packages/cv-processing/src/services/matching/MatchingFeatureService.ts`

5. **`src/services/ml-pipeline/recommendations/RecommendationEngine.ts`**
   - **Function**: CV improvement recommendations and suggestions
   - **Migration Target**: `packages/cv-processing/src/services/recommendations/RecommendationEngine.ts`

6. **`src/services/prediction-model.service.ts`**
   - **Function**: CV success prediction models
   - **Migration Target**: `packages/cv-processing/src/services/predictions/PredictionModelService.ts`

7. **`src/services/ml-pipeline.service.ts`**
   - **Function**: CV analysis pipeline coordination
   - **Migration Target**: `packages/cv-processing/src/services/MLPipelineService.ts`

8. **`src/services/ml-pipeline/predictions/InterviewPredictor.ts`**
   - **Function**: CV-based interview prediction
   - **Migration Target**: `packages/cv-processing/src/services/predictions/InterviewPredictor.ts`

9. **`src/services/ml-pipeline/predictions/SalaryPredictor.ts`**
   - **Function**: CV-based salary prediction
   - **Migration Target**: `packages/cv-processing/src/services/predictions/SalaryPredictor.ts`

10. **`src/services/ml-pipeline/predictions/OfferPredictor.ts`**
    - **Function**: CV-based job offer prediction
    - **Migration Target**: `packages/cv-processing/src/services/predictions/OfferPredictor.ts`

11. **`src/services/ml-pipeline/predictions/CompetitivenessAnalyzer.ts`**
    - **Function**: CV competitiveness analysis
    - **Migration Target**: `packages/cv-processing/src/services/analysis/CompetitivenessAnalyzer.ts`

#### **Types to Migrate (2 files)**:

12. **`src/types/phase2-models.ts`** - **336 lines**
    - **Critical Types**: `CVFeatures`, `FeatureVector`, CV analysis interfaces
    - **Migration Target**: `packages/cv-processing/src/types/CVModels.ts`
    - **Note**: Split into logical type groups (features, models, interfaces)

13. **`src/types/user-outcomes.ts`**
    - **CV-Related Content**: CV success tracking, outcome metrics
    - **Migration Target**: `packages/cv-processing/src/types/CVOutcomes.ts`
    - **Note**: Keep only CV-related outcome types, analytics-specific outcomes remain

#### **Supporting Files (2 files)**:

14. **`src/services/ml-pipeline/index.ts`**
    - **Function**: CV processing service exports
    - **Migration Target**: `packages/cv-processing/src/services/index.ts`

15. **`src/services/ml-pipeline/core/PredictionCache.ts`**
    - **Function**: CV prediction caching (if CV-specific)
    - **Migration Target**: `packages/cv-processing/src/services/cache/PredictionCache.ts`
    - **Note**: Evaluate if this is CV-specific or general analytics caching

---

## HIGH PRIORITY: Premium/Subscription Migration

### **Target Module**: `packages/premium/`

#### **Middleware & Guards (1 file)**:

1. **`src/middleware/enhancedPremiumGuard.ts`**
   - **Function**: Premium access control and feature gating
   - **Dependencies**: User subscription management, feature registry
   - **Migration Target**: `packages/premium/src/middleware/PremiumGuard.ts`

#### **Services (4 files)**:

2. **`src/services/premium/featureRegistry.ts`**
   - **Function**: CV feature tier definitions and premium gating
   - **Critical Data**: Complete premium feature catalog
   - **Migration Target**: `packages/premium/src/services/FeatureRegistry.ts`

3. **`src/services/premium/pricingAnalytics.ts`**
   - **Function**: Premium pricing logic and billing analytics
   - **Migration Target**: `packages/premium/src/services/PricingAnalytics.ts`

4. **`src/services/premium/reportBuilder.ts`**
   - **Function**: Premium report generation services
   - **Migration Target**: `packages/premium/src/services/ReportBuilder.ts`

5. **`src/services/retention-automation.service.ts`** (Evaluate)
   - **Function**: User retention automation (may be premium-specific)
   - **Migration Target**: `packages/premium/src/services/RetentionAutomation.ts` (if premium-specific)

#### **Functions (3 files)**:

6. **`src/functions/premium/advancedAnalytics.ts`**
   - **Function**: Premium-specific analytics functions
   - **Migration Target**: `packages/premium/src/functions/AdvancedAnalytics.ts`

7. **`src/functions/premium/batchTrackingEvents.ts`**
   - **Function**: Premium event tracking and batching
   - **Migration Target**: `packages/premium/src/functions/BatchTracking.ts`

8. **`src/functions/premium/getRealtimeUsageStats.ts`**
   - **Function**: Premium usage tracking and monitoring
   - **Migration Target**: `packages/premium/src/functions/RealtimeUsageStats.ts`

---

## MEDIUM PRIORITY: Multimedia/Video Migration

### **Target Module**: `packages/multimedia/`

#### **Interfaces (1 file)**:

1. **`src/services/video-providers/base-provider.interface.ts`**
   - **Function**: Video provider interfaces and contracts
   - **Migration Target**: `packages/multimedia/src/interfaces/VideoProvider.ts`

#### **Dashboard Functions (1 file)**:

2. **`src/functions/dashboard/video-analytics-dashboard.ts`**
   - **Function**: Video analytics dashboard functionality
   - **Migration Target**: `packages/multimedia/src/functions/VideoAnalyticsDashboard.ts`

#### **Performance Monitoring (1 file - Evaluate)**:

3. **`src/services/performance-monitor.service.ts`** (Evaluate)
   - **Assessment**: May contain video performance monitoring
   - **Action**: Review content to determine if multimedia-specific or general analytics
   - **Potential Target**: `packages/multimedia/src/services/PerformanceMonitor.ts`

---

## LOW-MEDIUM PRIORITY: Admin/Monitoring Review

### **Target Module**: `packages/admin/` (if determined to be admin functionality)

#### **Services to Evaluate (2 files)**:

1. **`src/services/alert-manager.service.ts`**
   - **Assessment**: Could be admin functionality or analytics infrastructure
   - **Action**: Review content to determine domain placement
   - **Potential Target**: `packages/admin/src/services/AlertManager.ts`

2. **Dashboard Functions** (Various files)
   - **Assessment**: Some may be admin dashboards vs. analytics dashboards
   - **Action**: Domain-specific review of each dashboard function
   - **Potential Targets**: `packages/admin/src/functions/` if admin-specific

---

## REMAIN IN ANALYTICS: Core Analytics Infrastructure

### **Analytics-Specific Services (Should NOT migrate)**:

#### **Business Intelligence & Metrics**:
- `src/services/analytics-engine.service.ts` ✅ KEEP
- `src/services/business-intelligence.service.ts` ✅ KEEP
- `src/services/revenue-analytics.service.ts` ✅ KEEP
- `src/services/cohort-analysis.service.ts` ✅ KEEP
- `src/functions/getRevenueMetrics.ts` ✅ KEEP

#### **A/B Testing & Experimentation**:
- `src/services/ab-testing.service.ts` ✅ KEEP
- `src/types/ab-testing.types.ts` ✅ KEEP
- `src/__tests__/ab-testing.test.ts` ✅ KEEP

#### **Analytics SDK & Tracking**:
- `src/services/analytics-sdk.service.ts` ✅ KEEP
- `src/services/outcome-tracking.service.ts` ✅ KEEP
- `src/functions/outcome/trackOutcome.ts` ✅ KEEP
- `src/types/tracking.types.ts` ✅ KEEP

#### **Privacy & Compliance**:
- `src/services/privacy-compliance.service.ts` ✅ KEEP
- `src/types/privacy.types.ts` ✅ KEEP
- `src/__tests__/privacy-compliance.test.ts` ✅ KEEP

#### **Caching & Performance**:
- `src/services/cache/analytics-cache.service.ts` ✅ KEEP
- `src/services/cache/cache.service.ts` ✅ KEEP
- `src/services/cache/redis-client.service.ts` ✅ KEEP
- `src/services/analytics-cache.service.ts` ✅ KEEP
- `src/services/cache-performance-monitor.service.ts` ✅ KEEP

#### **Analytics Types & Infrastructure**:
- `src/types/analytics.types.ts` ✅ KEEP
- `src/types/analytics-core.types.ts` ✅ KEEP
- `src/types/enhanced-analytics.ts` ✅ KEEP
- `src/types/business-intelligence.types.ts` ✅ KEEP
- `src/types/revenue.types.ts` ✅ KEEP
- `src/types/cohort.types.ts` ✅ KEEP
- `src/types/dashboard.types.ts` ✅ KEEP

#### **Configuration & Infrastructure**:
- `src/config/cors.ts` ✅ KEEP
- `src/config/environment.ts` ✅ KEEP
- `src/config/firebase.ts` ✅ KEEP
- `src/shared/base-service.ts` ✅ KEEP
- `src/shared/logger.ts` ✅ KEEP
- `src/shared/service-registry.ts` ✅ KEEP

#### **Authentication & Middleware**:
- `src/middleware/auth.middleware.ts` ✅ KEEP
- `src/middleware/authGuard.ts` ✅ KEEP

#### **Models & Backend**:
- `src/models/analytics.service.ts` ✅ KEEP
- `src/backend/functions/analytics/get.ts` ✅ KEEP

#### **Frontend & Integration**:
- `src/frontend/index.ts` ✅ KEEP
- `src/frontend/components/AnalyticsDashboard.tsx` ✅ KEEP
- `src/integration-examples/dependency-injection-usage.ts` ✅ KEEP

---

## Migration Implementation Strategy

### **Phase 1: Critical CV Processing (Days 1-3)**

#### **Day 1: Preparation & Broken Imports**
1. Create feature branch: `migration/cv-processing-from-analytics`
2. **IMMEDIATE**: Fix broken import in CVFeatureService.ts
   - Create ParsedCV type in cv-processing module
   - Update import path to resolve immediate compilation error
3. Audit all CV processing dependencies and import chains
4. Map external references to CV processing functionality

#### **Day 2: Core CV Services Migration**
1. Move CVFeatureService.ts (468 lines) to cv-processing module
2. Move MLPipelineOrchestrator.ts and related orchestration
3. Move CV feature extraction and derivation services
4. Update import paths to @cvplus/cv-processing/backend pattern
5. Test CV processing functionality in isolation

#### **Day 3: CV Types & Validation**
1. Move phase2-models.ts (336 lines) CV-related types
2. Move CV prediction and recommendation services
3. Update all import references across the system
4. Comprehensive testing of CV processing pipeline
5. Validate Firebase Function exports compatibility

### **Phase 2: Premium/Subscription Migration (Days 4-5)**

#### **Day 4: Premium Services & Middleware**
1. Create feature branch: `migration/premium-from-analytics`
2. Move premium guard middleware and access control
3. Move feature registry and premium service definitions
4. Update premium function exports and dependencies

#### **Day 5: Premium Functions & Testing**
1. Move premium-specific analytics and tracking functions
2. Update import paths to @cvplus/premium/backend pattern
3. Test premium access control and feature gating
4. Validate billing and subscription functionality

### **Phase 3: Multimedia & Admin Review (Days 6-7)**

#### **Day 6: Multimedia Migration**
1. Move video provider interfaces to multimedia module
2. Relocate video analytics dashboard functionality
3. Update multimedia service dependencies

#### **Day 7: Admin Review & Final Validation**
1. Analyze alert manager and monitoring services
2. Determine proper domain placement for admin functionality
3. Perform final system validation and testing
4. Update documentation and architectural guidelines

---

## Success Validation Checklist

### **Technical Validation**:
- [ ] All TypeScript compilation errors resolved
- [ ] No broken imports across any module
- [ ] All test suites pass in affected modules
- [ ] Firebase Functions deploy successfully
- [ ] Performance benchmarks maintained

### **Functional Validation**:
- [ ] CV processing pipeline works end-to-end
- [ ] Premium access control functions correctly
- [ ] Video analytics and multimedia features operational
- [ ] Analytics BI and metrics continue working
- [ ] User workflows unaffected

### **Architectural Validation**:
- [ ] No business logic remaining in analytics outside BI/metrics
- [ ] Clean domain boundaries established
- [ ] Import chains follow @cvplus/[module]/backend pattern
- [ ] No circular dependencies introduced
- [ ] Module responsibilities clearly defined

---

## Risk Mitigation

### **Rollback Plans**:
1. **Git Branch Rollback**: Each phase maintains independent feature branch
2. **Module-Level Revert**: Submodule structure enables atomic rollback
3. **Function Export Backup**: Maintain compatibility layer during transition
4. **Incremental Deployment**: Gradual rollout with monitoring

### **Testing Strategy**:
1. **Unit Tests**: Comprehensive testing of migrated functionality
2. **Integration Tests**: Cross-module dependency validation
3. **End-to-End Tests**: Complete user workflow testing
4. **Performance Tests**: Ensure no degradation in critical paths

### **Monitoring**:
1. **Error Tracking**: Monitor for new errors post-migration
2. **Performance Monitoring**: Track response times and throughput
3. **Function Health**: Monitor Firebase Function success rates
4. **User Impact**: Track user-facing functionality metrics

---

## Final Notes

This migration manifest provides detailed guidance for resolving the architectural violations in the analytics submodule. The key to success is maintaining the phased approach with comprehensive testing at each stage.

**CRITICAL REMINDERS**:
1. Fix broken CVFeatureService.ts import IMMEDIATELY
2. Maintain atomic rollback capability throughout migration
3. Preserve all Firebase Function exports for external API compatibility
4. Test thoroughly at each phase before proceeding
5. Update architectural documentation post-migration

**Expected Outcome**: A clean analytics module focused solely on BI, metrics tracking, and analytics infrastructure, with all domain-specific business logic properly located in specialized submodules.