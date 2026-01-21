# Firestore Internal Assertion Error (ID: b815) Fix Plan

**Author**: Gil Klainert  
**Date**: 2025-08-19  
**Status**: Planning  
**Priority**: Critical  

## Problem Analysis

The Firestore Internal Assertion Error (ID: b815) is caused by multiple services setting up separate `onSnapshot` listeners on the same Firestore document references, creating state conflicts in the Firebase SDK.

### Identified Duplicate Listeners

**All listening to `doc(db, 'jobs', jobId)`:**
1. JobSubscriptionManager (line 472)
2. useEnhancedProgressTracking (line 100)
3. useProgressTracking (line 32)  
4. RecommendationProgressTracker (line 91)
5. PreviewService (line 173)
6. FinalResultsPage_backup (line 363)

**Additional listeners on related documents:**
- useProgressiveEnhancement: `doc(db, 'jobs', jobId, 'progress', 'enhancement')` (line 740)

## Root Cause

Multiple components and services are independently creating Firestore listeners on the same document, causing:
- Firestore SDK internal state conflicts
- Memory leaks from uncoordinated cleanup
- Race conditions in listener setup/teardown
- Performance degradation from redundant network calls

## Solution Strategy

### Phase 1: Consolidate Job Document Listeners
1. **Single Source of Truth**: All job document access must go through JobSubscriptionManager
2. **Eliminate Direct Listeners**: Remove all direct `onSnapshot` calls outside JobSubscriptionManager
3. **Enhanced Callback System**: Extend JobSubscriptionManager to support multiple callback types

### Phase 2: Create Specialized Listener Types
1. **Progress Tracking Callbacks**: Add progress-specific callback support
2. **Preview Callbacks**: Add preview-specific callback support  
3. **Feature-Specific Filtering**: Allow callbacks to filter for specific data changes

### Phase 3: Error Boundaries and Recovery
1. **Firestore Error Boundaries**: Wrap all Firestore operations in try-catch
2. **Graceful Degradation**: Handle listener failures without crashing
3. **Automatic Recovery**: Implement retry logic for listener setup failures

## Implementation Plan

### Step 1: Enhance JobSubscriptionManager
- Add specialized callback types (progress, preview, feature-specific)
- Implement data change filtering to only notify relevant callbacks
- Add error recovery and retry mechanisms
- Improve cleanup timing to prevent memory leaks

### Step 2: Refactor Direct Listener Usage
- Replace useProgressTracking direct listeners with JobSubscriptionManager callbacks
- Replace useEnhancedProgressTracking direct listeners with JobSubscriptionManager callbacks
- Replace PreviewService direct listeners with JobSubscriptionManager callbacks
- Replace RecommendationProgressTracker direct listeners with JobSubscriptionManager callbacks

### Step 3: Create Unified Progress Service
- Consolidate all progress tracking logic into a single service
- Use JobSubscriptionManager as the data source
- Provide specialized hooks for different progress types

### Step 4: Add Error Boundaries
- Create Firestore-specific error boundary components
- Add error recovery mechanisms
- Implement fallback UI states

### Step 5: Testing and Validation
- Add comprehensive tests for listener management
- Test listener cleanup under various scenarios
- Validate no duplicate listeners are created
- Monitor for assertion errors

## Success Criteria

1. **Zero Firestore assertion errors** - Eliminate ID: b815 errors completely
2. **Single listener per document** - Only one onSnapshot per Firestore document
3. **Proper cleanup** - All listeners properly unsubscribed on component unmount
4. **Performance improvement** - Reduced redundant Firestore calls
5. **Error resilience** - Graceful handling of Firestore failures

## Risk Mitigation

- **Backward compatibility**: Maintain existing API contracts during transition
- **Gradual migration**: Implement changes incrementally to identify issues early
- **Rollback plan**: Keep original implementations until new system is validated
- **Monitoring**: Add logging to track listener creation/destruction

## Files to Modify

### Primary Changes
- `/frontend/src/services/JobSubscriptionManager.ts`
- `/frontend/src/hooks/useProgressTracking.ts`
- `/frontend/src/hooks/useEnhancedProgressTracking.ts`
- `/frontend/src/services/enhancement/preview.service.ts`
- `/frontend/src/components/RecommendationProgressTracker.tsx`

### New Files
- `/frontend/src/services/UnifiedProgressService.ts`
- `/frontend/src/components/error-boundaries/FirestoreErrorBoundary.tsx`
- `/frontend/src/utils/firestore-error-recovery.ts`

### Test Files
- `/frontend/src/services/__tests__/UnifiedProgressService.test.ts`
- `/frontend/src/components/__tests__/FirestoreErrorBoundary.test.tsx`

## Implementation Order

1. Enhance JobSubscriptionManager with callback types
2. Create FirestoreErrorBoundary component  
3. Refactor useProgressTracking to use JobSubscriptionManager
4. Refactor useEnhancedProgressTracking to use JobSubscriptionManager
5. Refactor PreviewService to use JobSubscriptionManager
6. Refactor RecommendationProgressTracker to use JobSubscriptionManager
7. Add comprehensive testing
8. Cleanup deprecated code

## Post-Implementation

- Monitor browser console for assertion errors
- Track Firestore operation metrics
- Validate memory usage improvements
- Document new listener patterns for future development