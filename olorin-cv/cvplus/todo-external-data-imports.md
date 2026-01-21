# External-Data Import Updates Todo List

## Task: Update import statements across CVPlus codebase for external-data functionality

### Phase 1: Discovery and Analysis ✅
- [x] Search for all external-data imports across codebase
- [x] Identify files referencing external-data services/types
- [x] Check Firebase Functions index.ts for external-data exports
- [x] Map current import patterns and usage

**FINDINGS**:
- Main issue: `/packages/cv-processing/src/backend/functions/enrichCVWithExternalData.ts` imports from `../services/external-data`
- Analytics submodule has external-data integrated at `/packages/analytics/src/external-data/`
- Analytics properly exports external-data functionality through `./services/external-data`
- CV processing needs to import from `@cvplus/analytics` and add it as dependency

### Phase 2: Import Statement Updates ⏳
- [x] Check analytics external-data exports structure
- [ ] Add @cvplus/analytics dependency to cv-processing package.json
- [ ] Update enrichCVWithExternalData.ts import from `../services/external-data` to `@cvplus/analytics`
- [ ] Update cv-processing external-data.ts service imports
- [ ] Fix any other cv-processing references to old external-data paths
- [ ] Check frontend external-data imports

### Phase 3: Root Functions Integration ⏳
- [ ] Review `/functions/src/index.ts` for external-data exports
- [ ] Ensure enrichCVWithExternalData imports from analytics
- [ ] Maintain all existing Firebase Function exports
- [ ] Validate function re-export patterns

### Phase 4: Dependency Validation ⏳
- [ ] Check package.json files for analytics dependencies
- [ ] Remove references to old external-data package
- [ ] Ensure cross-module dependencies are correct
- [ ] Validate import paths resolve correctly

### Phase 5: Cross-Module Integration ⏳
- [ ] CV Processing → Analytics external-data (verify)
- [ ] Premium → Analytics external-data (if applicable)
- [ ] Admin → Analytics external-data (if applicable)
- [ ] Functions → Analytics external-data
- [ ] Core → Analytics external-data (if applicable)

### Phase 6: Final Validation ⏳
- [ ] Test import resolution across all modules
- [ ] Verify no broken external-data functionality
- [ ] Confirm Firebase Functions still export correctly
- [ ] Run TypeScript compilation checks

---
**Status**: Phase 2 In Progress - Adding Analytics Dependency
**Current Task**: Adding @cvplus/analytics dependency to cv-processing package.json
**Next**: Update import statement in enrichCVWithExternalData.ts