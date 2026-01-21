# Role Detection Integration into Unified Analysis Architecture

**Author**: Gil Klainert  
**Date**: 2025-08-24  
**Model**: Sonnet 4.1  
**Status**: Implementation Phase  

## Executive Summary

Implementing role detection functionality into the unified analysis architecture by extracting logic from RoleSelectionPage.tsx and RoleProfileIntegration.tsx, creating modular components under 200 lines each, and integrating progressive disclosure flow: Analysis → Role Detection → Role-based Improvements → Actions.

## Implementation Strategy

### Phase 1: Create Unified Analysis Context (Foundation)
1. Create UnifiedAnalysisContext with role detection state
2. Implement context actions and reducers
3. Create TypeScript interfaces and types

### Phase 2: Role Detection Components (< 200 lines each)
1. **RoleDetectionSection.tsx** - Main section container
2. **RoleDetectionProgress.tsx** - Progress indicator during detection
3. **DetectedRoleCard.tsx** - Display detected roles with confidence
4. **RoleSelectionModal.tsx** - Manual role selection/customization

### Phase 3: Integration and Flow Control
1. Extend UnifiedAnalysisContainer to orchestrate role detection
2. Implement progressive disclosure: auto-trigger after analysis
3. Connect role detection to improvements loading

## Component Architecture

```
UnifiedAnalysisContainer
├── AnalysisResults (existing)
├── RoleDetectionSection (new)
│   ├── RoleDetectionProgress
│   ├── DetectedRoleCard  
│   └── RoleSelectionModal
├── ImprovementsSection (existing)
└── ActionButtons (existing)
```

## State Management Extension

### Extended UnifiedAnalysisContextState
```typescript
interface UnifiedAnalysisContextState {
  // ... existing analysis state
  
  // Role Detection State
  detectedRoles: DetectedRole[];
  selectedRole: DetectedRole | null;
  roleDetectionStatus: 'idle' | 'analyzing' | 'detecting' | 'completed' | 'error';
  roleAnalysis: RoleProfileAnalysis | null;
  
  // Progressive Flow State
  currentStep: 'analysis' | 'role-detection' | 'improvements' | 'actions';
  autoTriggerEnabled: boolean;
}
```

### New Context Actions
```typescript
| { type: 'START_ROLE_DETECTION'; payload: { jobData: Job } }
| { type: 'SET_DETECTED_ROLES'; payload: DetectedRole[] }
| { type: 'SET_ROLE_ANALYSIS'; payload: RoleProfileAnalysis }
| { type: 'SELECT_ROLE'; payload: DetectedRole }
| { type: 'SET_ROLE_DETECTION_STATUS'; payload: RoleDetectionStatus }
| { type: 'SET_CURRENT_STEP'; payload: AnalysisStep }
```

## Progressive Disclosure Flow

1. **Analysis Complete** → Auto-trigger role detection
2. **Role Detection Running** → Show progress indicator
3. **Roles Detected** → Display cards with confidence scores
4. **Role Selected** → Auto-trigger improvements loading
5. **Improvements Ready** → Show role-based recommendations

## File Structure

```
frontend/src/components/analysis/
├── context/
│   ├── UnifiedAnalysisContext.tsx     # Extended context (< 200 lines)
│   ├── types.ts                       # Type definitions (< 200 lines)
│   └── actions.ts                     # Context actions (< 200 lines)
├── role-detection/
│   ├── RoleDetectionSection.tsx       # Main section (< 200 lines)
│   ├── RoleDetectionProgress.tsx      # Progress indicator (< 200 lines)
│   ├── DetectedRoleCard.tsx           # Role display (< 200 lines)
│   └── RoleSelectionModal.tsx         # Selection modal (< 200 lines)
├── unified/
│   └── UnifiedAnalysisContainer.tsx   # Extended container (< 200 lines)
└── hooks/
    └── useRoleDetection.ts            # Role detection hook (< 200 lines)
```

## Implementation Details

### RoleDetectionSection.tsx Features
- Orchestrates role detection flow
- Handles auto-triggering after analysis
- Manages role detection/selection state
- Progressive disclosure UI

### RoleDetectionProgress.tsx Features
- Animated progress indicator
- Stage-based progress (analyzing → detecting → completed)
- Estimated time display
- Cancel/retry options

### DetectedRoleCard.tsx Features
- Role information display
- Confidence score visualization
- Matching factors highlight
- Selection/customization actions

### RoleSelectionModal.tsx Features
- Manual role selection interface
- Role search and filtering
- Custom role creation
- Batch selection options

## Success Criteria

- ✅ All components under 200 lines
- ✅ Seamless progressive disclosure
- ✅ Auto-trigger after analysis completion
- ✅ Manual override capabilities
- ✅ Role-based improvements integration
- ✅ Preserved existing functionality
- ✅ TypeScript strict mode compliance

## Accompanying Mermaid Diagram

See: [/docs/diagrams/2025-08-24-role-detection-integration-flow.mermaid](/Users/gklainert/Documents/cvplus/docs/diagrams/2025-08-24-role-detection-integration-flow.mermaid)