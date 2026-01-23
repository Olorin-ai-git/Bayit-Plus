# Flows Feature Removal Summary

**Date**: 2026-01-22
**Removed By**: Claude Code
**Reason**: User request to remove flow functionality from webapp, mobile app, and tvOS app

## Web App - Removed Files and Components

### Directories Removed
- ✅ `/web/src/pages/flows/` - Entire flows pages directory
- ✅ `/web/src/components/flow/` - Flow components directory
- ✅ `/shared/components/flows/` - Shared flow components

### Individual Files Removed
- ✅ `/web/src/pages/FlowsPage.tsx` - Main flows page
- ✅ `/web/src/stores/flowStore.ts` - Flow state management
- ✅ `/web/src/pages/watch/components/FlowHeader.tsx` - Flow header component
- ✅ `/shared/screens/FlowsScreen.tsx` - Shared flows screen

### Documentation Removed
- ✅ `/shared/data/support/docs/en/features/flows.md`
- ✅ `/shared/data/support/docs/es/features/flows.md`
- ✅ `/shared/data/support/docs/he/features/flows.md`

### Code Changes

#### `/web/src/App.tsx`
- ✅ Removed: `const FlowsPage = lazy(() => import('./pages/FlowsPage'))` (line 41)
- ✅ Removed: `<Route path="/flows" element={<FlowsPage />} />` (line 158)

#### `/web/src/components/layout/Layout.tsx`
- ✅ Removed: `import RunningFlowBanner from '../flow/RunningFlowBanner';` (line 10)
- ✅ Removed: `import { useFlowStore } from '@/stores/flowStore';` (line 19)
- ✅ Removed: `<RunningFlowBanner />` component (line 223)

#### `/web/src/components/layout/GlassSidebar.tsx`
- ✅ Removed: `{ id: 'flows', icon: '✨', labelKey: 'nav.flows', path: '/flows' }` from navigation (line 64)

## Files Still Containing Flow References (Need Manual Review)

The following files may still have flow-related imports or references:

### Widget Components
- `/web/src/components/widgets/form/ContentSelectionSection.tsx`
- `/web/src/components/widgets/form/useWidgetForm.ts`
- `/web/src/components/widgets/WidgetFormModal.legacy.tsx`
- `/web/src/components/widgets/WidgetFormModal.tsx`

**Action**: These files likely import flow types or have flow-related functionality. They should be reviewed and flow references removed.

## Backend Files (Not Removed - Requires Separate Decision)

The following backend files exist and may need removal:

### Python API & Models
- `/backend/app/api/routes/flows.py` - Flows API endpoints
- `/backend/app/models/flow.py` - Flow database model
- `/backend/app/api/routes/__pycache__/flows.cpython-313.pyc` - Cached bytecode
- `/backend/app/models/__pycache__/flow.cpython-313.pyc` - Cached bytecode

**Recommendation**: Remove these backend files to complete the flows feature removal. This includes:
1. Delete the Python files
2. Remove flow routes from API router registration
3. Remove flow-related database migrations
4. Drop flows table from MongoDB (if it exists)

## Mobile & tvOS Apps

**Status**: No flow-related files found in mobile directory during initial scan.

**Action Required**:
1. Check iOS/tvOS Xcode projects for flow screens
2. Check React Native navigation for flow routes
3. Remove any flow-related Swift/Objective-C code

## Translation Keys to Remove

The following i18n translation keys can be removed:

- `nav.flows` - Navigation label
- Any flow-related keys in translation files (search for "flow" in locale files)

## Next Steps

1. ✅ **Web App**: Flow functionality removed from frontend
2. ⏳ **Backend**: Remove flow API endpoints and models (awaiting decision)
3. ⏳ **Mobile/tvOS**: Verify no flow functionality exists
4. ⏳ **Widget Components**: Remove flow references from widget system
5. ⏳ **Translations**: Clean up flow-related i18n keys
6. ⏳ **Database**: Drop flows collection/table (if exists)

## Impact Assessment

### Features Affected
- ✅ Main navigation (flows removed from sidebar)
- ✅ Layout (RunningFlowBanner removed)
- ⏳ Widgets (may have flow selection functionality)

### User-Facing Changes
- Users can no longer access `/flows` route
- Flows navigation item removed from sidebar
- Running flow banner no longer displays
- Widget system may need updates if it allowed flow selection

### API Changes (Once Backend Removed)
- `/api/v1/flows/*` endpoints will return 404
- Flow-related API calls from widget system will fail

## Files That Reference "flow" But Are NOT Related to Flows Feature

The following files contain "flow" in their names but are **system flow diagrams** (NOT the Flows feature):

### System Diagrams (Keep These)
- `/shared/data/support/diagrams/auth-flow.mmd` - Authentication flow
- `/shared/data/support/diagrams/playback-flow.mmd` - Video playback flow
- `/shared/data/support/diagrams/voice-flow.mmd` - Voice command flow
- `/shared/data/support/diagrams/recording-flow.mmd` - DVR recording flow
- `/shared/data/support/diagrams/kids-safety-flow.mmd` - Parental controls flow
- `/shared/data/support/diagrams/librarian-flow.mmd` - Content librarian flow
- `/shared/data/support/diagrams/ticket-flow.mmd` - Support ticket flow
- `/shared/data/support/diagrams/subscription-flow.mmd` - Subscription flow

These are **process flow diagrams** for documentation purposes, not code related to the "Flows" feature.

## Verification Checklist

- ✅ Flow pages removed from web app
- ✅ Flow routes removed from routing
- ✅ Flow navigation removed from sidebar
- ✅ Flow components removed from layout
- ✅ Flow store removed
- ✅ Flow documentation removed
- ⏳ Widget system flow references removed
- ⏳ Backend flow API removed
- ⏳ Backend flow models removed
- ⏳ Mobile/tvOS flow functionality verified absent
- ⏳ Translation keys cleaned up
- ⏳ Database flows collection dropped

---

**Status**: Web app cleanup complete. Backend and widget system cleanup pending.
