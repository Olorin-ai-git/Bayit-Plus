# Progress Page to Results Page Transition - Fixes Applied

## Issues Found

### Issue 1: No Automatic Navigation on Completion
**Location**: `useProgressLifecycle.ts` lines 38-43
**Problem**: Had placeholder comment but no actual navigation logic when investigation completes.

### Issue 2: ResultsPage Investigation ID Source
**Location**: `ResultsPage.tsx` line 58
**Problem**: Only checked route params, but navigation uses query params (`?id=`).

### Issue 3: Structured Investigations Not Handled
**Location**: `useProgressLifecycle.ts`
**Problem**: Only checked hybrid graph completion, structured investigations also need completion detection.

## Fixes Applied

### Fix 1: Automatic Navigation on Completion ✅
**File**: `olorin-front/src/microservices/investigation/hooks/useProgressLifecycle.ts`

**Changes**:
- Added `useNavigate` hook import
- Added `structuredProgress` parameter to detect structured investigation completion
- Added navigation logic for hybrid graph investigations (when `hybridStatus?.status === 'completed'`)
- Added navigation logic for structured investigations (when `lifecycleStage === 'completed'` or `status === 'completed'`)
- Added `hasNavigatedRef` to prevent duplicate navigations
- Navigates to `/investigation/results?id={investigationId}` preserving the investigation ID

**Code**:
```typescript
// Results navigation - Hybrid Graph
React.useEffect(() => {
  if (
    isHybridGraph &&
    hybridStatus?.status === 'completed' &&
    investigationId &&
    !hasNavigatedRef.current
  ) {
    console.log('✅ [useProgressLifecycle] Hybrid graph investigation completed, navigating to results');
    hasNavigatedRef.current = true;
    navigate(`/investigation/results?id=${investigationId}`, { replace: true });
  }
}, [isHybridGraph, hybridStatus?.status, investigationId, navigate]);

// Results navigation - Structured Investigation
React.useEffect(() => {
  if (
    !isHybridGraph &&
    structuredProgress &&
    (structuredProgress.lifecycleStage === 'completed' ||
      structuredProgress.status === 'completed') &&
    investigationId &&
    !hasNavigatedRef.current
  ) {
    console.log('✅ [useProgressLifecycle] Structured investigation completed, navigating to results');
    hasNavigatedRef.current = true;
    navigate(`/investigation/results?id=${investigationId}`, { replace: true });
  }
}, [isHybridGraph, structuredProgress?.lifecycleStage, structuredProgress?.status, investigationId, navigate]);
```

### Fix 2: ResultsPage Investigation ID Handling ✅
**File**: `olorin-front/src/microservices/investigation/pages/ResultsPage.tsx`

**Changes**:
- Added `useSearchParams` import
- Now reads investigation ID from multiple sources:
  1. Route params (`useParams` - for routes like `/investigation/results/:investigationId`)
  2. URL query params (`useSearchParams` - for routes like `/investigation/results?id=123`)
  3. Store (`investigation?.id` - fallback)

**Code**:
```typescript
const { investigationId: routeInvestigationId } = useParams<{ investigationId?: string }>();
const [searchParams] = useSearchParams();
const urlInvestigationId = searchParams.get('id');

// Get investigation ID from URL params (route or query), or store
const effectiveInvestigationId = routeInvestigationId || urlInvestigationId || investigation?.id;
```

### Fix 3: ProgressPage Integration ✅
**File**: `olorin-front/src/microservices/investigation/pages/ProgressPage.tsx`

**Changes**:
- Updated `useProgressLifecycle` call to pass `structuredProgress` parameter
- Updated investigation ID to use both `investigationId` (hybrid) and `structuredInvestigationId` (structured)

**Code**:
```typescript
useProgressLifecycle(
  isHybridGraph,
  investigationId || structuredInvestigationId || null,
  hybridStatus,
  structuredProgress,
  {
    startHybridPolling, stopHybridPolling, updatePhaseProgress, updateToolStatus, addAnomaly, addRelationship, updateAgentMetrics
  }
);
```

## Navigation Flow

### Before:
```
Progress Page → [No automatic navigation] → User must manually navigate to Results
```

### After:
```
Progress Page → [Detects completion] → Automatically navigates to Results Page with investigation ID
```

## Completion Detection

### Hybrid Graph Investigations:
- Monitors: `hybridStatus?.status === 'completed'`
- Action: Navigates to `/investigation/results?id={investigationId}`

### Structured Investigations:
- Monitors: `structuredProgress.lifecycleStage === 'completed'` OR `structuredProgress.status === 'completed'`
- Action: Navigates to `/investigation/results?id={investigationId}`

## Verification

- ✅ No linter errors
- ✅ Investigation ID preserved in URL (`?id=`)
- ✅ Both investigation types (hybrid graph and structured) supported
- ✅ Prevents duplicate navigations with `hasNavigatedRef`
- ✅ ResultsPage can read investigation ID from query params

## Files Modified

1. ✅ `olorin-front/src/microservices/investigation/hooks/useProgressLifecycle.ts`
2. ✅ `olorin-front/src/microservices/investigation/pages/ProgressPage.tsx`
3. ✅ `olorin-front/src/microservices/investigation/pages/ResultsPage.tsx`

## Testing Checklist

- [ ] Hybrid graph investigation completes → automatically navigates to results
- [ ] Structured investigation completes → automatically navigates to results
- [ ] Investigation ID is preserved in URL (`?id=`)
- [ ] ResultsPage can fetch results using investigation ID from URL
- [ ] No duplicate navigations occur
- [ ] Manual navigation still works (via progress indicator)

