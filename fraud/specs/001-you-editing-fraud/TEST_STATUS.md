# Investigation Comparison Testing Status

**Date**: 2025-01-27  
**Status**: ⚠️ **IN PROGRESS** - Route matching issue

## Test Files Created

### ✅ Frontend E2E Tests (Playwright)
**File**: `olorin-front/src/shared/testing/e2e/investigation-comparison.e2e.test.ts`

**Test Cases** (8 total):
1. ✅ should display delta metrics when comparison completes (PASSING)
2. ⚠️ should display comparison page with controls (FAILING - route issue)
3. ⏸️ should run comparison with default presets (BLOCKED by route issue)
4. ⏸️ should allow custom window selection (BLOCKED by route issue)
5. ⏸️ should navigate from investigations-management page (BLOCKED by route issue)
6. ⏸️ should limit selection to 2 investigations (BLOCKED by route issue)
7. ⏸️ should export comparison results as JSON (BLOCKED by route issue)
8. ⏸️ should handle empty state gracefully (BLOCKED by route issue)

### ✅ Backend Integration Test
**File**: `olorin-server/scripts/test_investigation_comparison.py`

**Status**: Ready to run (needs test data)

## Current Issue

### Route Matching Problem

**Problem**: The route `/investigations/investigate/compare` is not matching correctly.

**Root Cause**: 
- InvestigationApp is mounted at `/investigations/*` in the shell
- The comparison route is defined as `investigate/compare` (relative) in InvestigationApp
- Expected full path: `/investigations/investigate/compare`
- Actual behavior: Redirects to `/` (home page)

**Attempted Fixes**:
1. ✅ Changed route from `/investigate/compare` to `investigate/compare` (relative path)
2. ⚠️ Still not matching - may need to check React Router v6 behavior

**Next Steps**:
1. Verify React Router v6 route matching behavior for nested routes
2. Check if route needs to be registered at shell level instead
3. Verify ComparisonPage component loads without errors
4. Check browser console for React Router errors

## Test Execution

### Frontend Tests
```bash
cd olorin-front
npx playwright test investigation-comparison.e2e.test.ts
```

**Current Results**:
- 1 passing (delta metrics test - doesn't require route)
- 1 failing (display controls test - route issue)
- 6 blocked (all require route to work)

### Backend Tests
```bash
cd olorin-server
poetry run python scripts/test_investigation_comparison.py
```

**Requirements**:
- At least 2 investigations in database
- Both must have same `entity_type` and `entity_id`
- Both must have `from` and `to` time windows

## Files Modified

1. ✅ `olorin-front/src/shared/testing/e2e/investigation-comparison.e2e.test.ts` - Created
2. ✅ `olorin-server/scripts/test_investigation_comparison.py` - Created
3. ⚠️ `olorin-front/src/microservices/investigation/InvestigationApp.tsx` - Route path changed (still debugging)

## Next Actions

1. **Fix Route Matching** (HIGH PRIORITY)
   - Investigate React Router v6 nested route behavior
   - Verify route registration
   - Test route manually in browser

2. **Complete Frontend Tests** (MEDIUM PRIORITY)
   - Once route is fixed, all 8 tests should pass
   - Verify all UI interactions work correctly

3. **Run Backend Tests** (MEDIUM PRIORITY)
   - Create test investigations with matching entities
   - Run integration test
   - Verify comparison logic works end-to-end

4. **End-to-End Validation** (LOW PRIORITY)
   - Test full flow: investigations-management → comparison
   - Verify URL parameters work correctly
   - Test export functionality

---

**Last Updated**: 2025-01-27  
**Blocked By**: Route matching issue in InvestigationApp.tsx

