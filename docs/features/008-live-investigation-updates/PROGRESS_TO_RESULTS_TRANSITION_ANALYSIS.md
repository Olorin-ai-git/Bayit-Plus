# Progress Page to Results Page Transition Analysis

## Current Implementation

### 1. Navigation Flow
- **Settings → Progress**: Manual via `goNext()` after starting investigation
- **Progress → Results**: **MISSING** - No automatic navigation on completion

### 2. Investigation ID Passing
- ✅ **ProgressPage**: Gets `investigationId` from URL params (`useParams`) or store
- ✅ **ResultsPage**: Gets `investigationId` from URL params (`useParams`) or store  
- ✅ **InvestigationWizard**: Preserves investigation ID in URL when navigating between steps

### 3. Completion Detection
- ⚠️ **useProgressLifecycle**: Has placeholder comment but no actual navigation logic
- ⚠️ **ProgressPage**: Doesn't monitor completion status to auto-navigate
- ⚠️ **No automatic transition**: User must manually navigate to results

## Issues Found

### Issue 1: No Automatic Navigation on Completion
**Location**: `useProgressLifecycle.ts` lines 38-43
```typescript
// Results navigation
React.useEffect(() => {
  if (isHybridGraph && hybridStatus?.status === 'completed') {
    // Investigation completed, ready to view results
  }
}, [isHybridGraph, hybridStatus?.status]);
```
**Problem**: Comment says "ready to view results" but doesn't actually navigate.

### Issue 2: Structured Investigations Not Handled
**Location**: `useProgressLifecycle.ts`
**Problem**: Only checks `isHybridGraph` completion, but structured investigations also need completion detection.

### Issue 3: ResultsPage Investigation ID Source
**Location**: `ResultsPage.tsx` line 58
```typescript
const { investigationId } = useParams<{ investigationId?: string }>();
```
**Problem**: ResultsPage expects `investigationId` in URL params, but the route might not include it.

### Issue 4: Route Configuration
**Location**: `InvestigationApp.tsx` and `InvestigationWizard.tsx`
**Problem**: Need to verify if routes support investigation ID parameter.

## Required Fixes

### Fix 1: Add Automatic Navigation on Completion
- Monitor `structuredProgress.lifecycleStage === 'completed'` for structured investigations
- Monitor `hybridStatus?.status === 'completed'` for hybrid graph investigations
- Navigate to `/investigation/results?id={investigationId}` when completed

### Fix 2: Ensure Investigation ID is Preserved
- Verify URL structure supports investigation ID
- Ensure ResultsPage can get investigation ID from URL or store

### Fix 3: Handle Both Investigation Types
- Add completion detection for structured investigations
- Keep existing hybrid graph completion detection

