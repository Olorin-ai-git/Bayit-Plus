# CV Processing Migration from Analytics to CV-Processing

## CRITICAL CV Processing Migration TODO

**Status**: Started
**Objective**: Migrate misplaced CV processing functionality from analytics submodule to cv-processing submodule

### Phase 1: Analysis and Planning
- [ ] Analyze analytics submodule for CV processing files
- [ ] Analyze cv-processing submodule structure
- [ ] Identify broken imports and dependencies
- [ ] Create migration plan

### Phase 2: Critical File Migration

#### CV Feature Analysis (CRITICAL - 468 lines)
- [ ] `src/services/ml-pipeline/features/CVFeatureService.ts`
- [ ] `src/services/ml-pipeline/features/DerivedFeatureService.ts`
- [ ] `src/services/ml-pipeline/features/MatchingFeatureService.ts`

#### ML Pipeline for CV Processing
- [ ] `src/services/ml-pipeline/core/MLPipelineOrchestrator.ts`
- [ ] `src/services/ml-pipeline/predictions/InterviewPredictor.ts`
- [ ] `src/services/ml-pipeline/predictions/SalaryPredictor.ts`
- [ ] `src/services/ml-pipeline/predictions/TimeToHirePredictor.ts`
- [ ] `src/services/ml-pipeline/predictions/OfferPredictor.ts`
- [ ] `src/services/ml-pipeline/predictions/CompetitivenessAnalyzer.ts`

#### CV Recommendation Engine
- [ ] `src/services/ml-pipeline/recommendations/RecommendationEngine.ts`

#### CV-Related Types
- [ ] Extract CV-specific parts from `src/types/phase2-models.ts`
- [ ] `src/types/user-outcomes.ts`

#### Services
- [ ] `src/services/prediction-model.service.ts`
- [ ] `src/services/ml-pipeline.service.ts`

### Phase 3: Import Resolution
- [ ] Fix broken `ParsedCV` imports
- [ ] Update cross-references to use cv-processing exports
- [ ] Update package.json dependencies

### Phase 4: CV-Processing Integration
- [ ] Add ML pipeline to cv-processing exports
- [ ] Ensure `@cvplus/cv-processing/ml-pipeline` export path
- [ ] Maintain API contract compatibility

### Phase 5: Analytics Cleanup (REQUIRES USER APPROVAL)
- [ ] **ASK USER APPROVAL**: Remove migrated files from analytics
- [ ] **ASK USER APPROVAL**: Clean up analytics package.json
- [ ] **ASK USER APPROVAL**: Update analytics exports

### Critical Requirements Met:
- ⚠️ **MANDATORY**: Working within cv-processing submodule autonomously
- 🚫 **ABSOLUTE PROHIBITION**: No mock data or placeholders
- 🚨 **CRITICAL**: Never delete files without explicit user approval

**Next Action**: Navigate to analytics submodule and analyze CV processing files