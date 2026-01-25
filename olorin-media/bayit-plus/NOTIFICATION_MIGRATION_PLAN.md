# Notification System Migration Plan

## Overview

This document outlines the migration strategy from the legacy `useModal()` context and `Alert.alert()` patterns to the new `useNotifications()` GlassToast system.

**Target**: Migrate all 57 files across web, mobile-app, tv-app, shared, and glass-components packages.

**Timeline**: Incremental migration in batches by priority and platform.

---

## File Categories

### Category 1: Core Infrastructure (4 files)
These files define or use the modal/notification infrastructure and must be migrated first.

- ✅ `web/src/contexts/ModalContext.tsx` - **DEPRECATE** (legacy modal context)
- ✅ `shared/contexts/ModalContext.tsx` - **DEPRECATE** (shared legacy modal context)
- ✅ `tv-app/src/contexts/ModalContext.tsx` - **DEPRECATE** (tv-app legacy modal context)
- ✅ `shared/contexts/index.ts` - Update exports to remove ModalContext

**Migration Action**: These files should be deprecated but not deleted yet (to allow consumers to migrate). Mark with deprecation warnings.

---

### Category 2: Compatibility/Wrapper Layers (2 files)
Alert compatibility layer and modal wrapper components.

- `bayit-plus/packages/ui/glass-components/src/compat/AlertCompat.ts` - Update to use `Notifications` imperative API
- `bayit-plus/shared/components/ui/GlassAlert.tsx` - Ensure uses GlassToast internally

**Migration Action**: Verify these use new `Notifications` imperative API for backwards compatibility during transition.

---

### Category 3: Error Handling & Utilities (2 files)
High-priority files that handle errors and are called globally.

- 🔴 `mobile-app/src/utils/errorHandling.ts` - **CRITICAL**: Replace all `Alert.alert()` calls
- 🔴 `mobile-app/src/utils/biometricAuth.ts` - Replace `Alert.alert()` calls

**Pattern**: `Alert.alert(title, message, buttons)` → `Notifications.showError(message, title)`

**Migration Action**: Replace Alert.alert with Notifications imperative API (works outside React components).

---

### Category 4: Mobile App Screens & Components (9 files)
Mobile-specific screens using Alert.alert and useModal patterns.

- `mobile-app/src/screens/NotificationSettingsScreen.tsx`
- `mobile-app/src/screens/SettingsScreenMobile.tsx`
- `mobile-app/src/screens/SecurityScreenMobile.tsx`
- `mobile-app/src/screens/SubscriptionScreenMobile.tsx`
- `mobile-app/src/screens/BillingScreenMobile.tsx`
- `mobile-app/src/screens/VoiceOnboardingScreen.tsx`
- `mobile-app/src/screens/DownloadsScreenMobile.tsx`
- `mobile-app/src/components/voice/VoiceSettings.tsx`
- `mobile-app/src/components/voice/VoiceCommandHistory.tsx`

**Pattern**: `const { showError, showSuccess } = useModal()` → `const notifications = useNotifications()`

**Migration Action**: Replace with hook-based API in components.

---

### Category 5: Mobile App Hooks (1 file)
Mobile-specific hook using useModal.

- `mobile-app/src/hooks/useVoiceMobile.ts` - Replace `useModal()` with `useNotifications()`

**Migration Action**: Replace with hook-based API.

---

### Category 6: Web App (12 files)
Web application pages and components using useModal and GlassModal.

#### Pages (8 files):
- `web/src/App.tsx` - Root app using ModalProvider (remove provider)
- `web/src/pages/admin/CategoriesPage.tsx`
- `web/src/pages/admin/ContentLibraryPage.tsx`
- `web/src/pages/admin/FeaturedManagementPage.tsx`
- `web/src/pages/admin/SettingsPage.tsx`
- `web/src/pages/admin/UploadsPage.tsx`
- `web/src/pages/admin/UserDetailPage.tsx`
- `web/src/pages/admin/WidgetsPage.tsx`

#### Components (4 files):
- `web/src/components/player/RecordButton.tsx`
- `web/src/components/recordings/RecordingCard.tsx`
- `web/src/components/recordings/RecordingCard.legacy.tsx`
- `web/src/pages/MyRecordingsPage.tsx`

**Pattern**: Replace `useModal()` hook with `useNotifications()` and remove GlassModal JSX.

**Migration Action**: Replace hook and remove modal component JSX.

---

### Category 7: Web App Admin Pages (11 files)
Web admin-specific pages using useModal extensively.

- `web/src/pages/admin/LiveChannelsPage.tsx`
- `web/src/pages/admin/PodcastEpisodesPage.tsx`
- `web/src/pages/admin/PodcastsPage.tsx`
- `web/src/pages/admin/PushNotificationsPage.tsx`
- `web/src/pages/admin/RadioStationsPage.tsx`
- `web/src/pages/admin/RecordingsManagementPage.tsx`
- `web/src/pages/EPGPage.tsx`
- `web/src/pages/watch/WatchPage.tsx`

**Pattern**: Replace `useModal()` with `useNotifications()`.

**Migration Action**: Replace hook usage.

---

### Category 8: Shared Admin Screens (12 files)
Shared screens used across multiple platforms.

- `shared/screens/admin/AuditLogsScreen.tsx`
- `shared/screens/admin/CampaignDetailScreen.tsx`
- `shared/screens/admin/CampaignsListScreen.tsx`
- `shared/screens/admin/EmailCampaignsScreen.tsx`
- `shared/screens/admin/MarketingDashboardScreen.tsx`
- `shared/screens/admin/PlanManagementScreen.tsx`
- `shared/screens/admin/PushNotificationsScreen.tsx`
- `shared/screens/admin/RefundsScreen.tsx`
- `shared/screens/admin/SettingsScreen.tsx`
- `shared/screens/admin/SubscriptionsScreen.tsx`
- `shared/screens/admin/TransactionsScreen.tsx`
- `shared/screens/admin/UserDetailScreen.tsx`
- `shared/screens/admin/UsersListScreen.tsx`

**Pattern**: Replace `useModal()` with `useNotifications()`.

**Migration Action**: Replace hook usage.

---

### Category 9: Shared Components & Settings (2 files)
Shared components using notification patterns.

- `shared/components/settings/HomeSectionConfiguration.tsx`
- `shared/screens/SettingsScreen.tsx`

**Pattern**: Replace `useModal()` with `useNotifications()`.

**Migration Action**: Replace hook usage.

---

### Category 10: Glass Components (2 files)
GlassComponent library internal files that may reference old patterns.

- `packages/ui/glass-components/src/native/components/GlassModal.tsx` - Keep for now, but document deprecation
- `shared/components/ui/GlassModal.tsx` - Keep for backwards compatibility

**Migration Action**: Document as legacy, no changes needed yet.

---

## Migration Phases

### Phase 1: Foundation (Days 1-2)
1. Verify GlassToast system is fully operational
2. Set up deprecation warnings in ModalContext files
3. Update AlertCompat to use new Notifications API
4. Create compatibility wrapper if needed for legacy consumers

**Files**: 4-6 files

---

### Phase 2: Error Handling (Days 2-3)
Migrate critical error paths that affect all users.

1. Migrate `mobile-app/src/utils/errorHandling.ts` - uses Alert.alert imperatively
2. Migrate `mobile-app/src/utils/biometricAuth.ts` - uses Alert.alert

**Impact**: These files are used globally by error handling system.

**Files**: 2 files

---

### Phase 3: Mobile App (Days 3-5)
Migrate mobile app screens and components.

1. Screens using useModal/Alert.alert (9 files)
2. Mobile hooks using useModal (1 file)

**Batch Strategy**:
- Batch 3a: NotificationSettingsScreen, SettingsScreenMobile, SecurityScreenMobile
- Batch 3b: SubscriptionScreenMobile, BillingScreenMobile, VoiceOnboardingScreen
- Batch 3c: DownloadsScreenMobile, VoiceSettings, VoiceCommandHistory
- Batch 3d: useVoiceMobile hook

**Files**: 10 files

---

### Phase 4: Web App (Days 5-7)
Migrate web app pages and components.

1. Root app (1 file)
2. Page components (8 files)
3. Other page components (4 files)
4. Admin pages (11 files)

**Batch Strategy**:
- Batch 4a: App.tsx (remove ModalProvider)
- Batch 4b: Core admin pages (Categories, ContentLibrary, Featured, Settings, Uploads)
- Batch 4c: More admin pages (UserDetail, Widgets, LiveChannels, Podcasts)
- Batch 4d: Remaining admin pages (PodcastEpisodes, PushNotifications, RadioStations, RecordingsManagement)
- Batch 4e: Pages (EPG, MyRecordings, Watch, RecordButton, RecordingCard)

**Files**: 24 files

---

### Phase 5: Shared Components (Days 7-8)
Migrate shared components used across platforms.

1. Shared admin screens (12 files)
2. Shared settings components (2 files)

**Batch Strategy**:
- Batch 5a: Audit, Campaign, Email screens
- Batch 5b: Marketing, Plans, PushNotifications screens
- Batch 5c: Refunds, Settings, Subscriptions screens
- Batch 5d: Transactions, UserDetail, UsersList screens
- Batch 5e: HomeSectionConfiguration, SettingsScreen

**Files**: 14 files

---

### Phase 6: Cleanup (Days 8-9)
Remove deprecated files and verify all migrations.

1. Remove old ModalContext files from web, shared, tv-app
2. Update shared/contexts/index.ts exports
3. Run full test suite
4. Verify no remaining Alert.alert or useModal references

**Files**: 4 files removed/updated

---

## Migration Patterns

### Pattern 1: Simple Notifications (useModal hook)

**Before**:
```tsx
import { useModal } from '../contexts/ModalContext';

function MyComponent() {
  const { showError, showSuccess, showInfo, showWarning } = useModal();

  const handleAction = async () => {
    try {
      await doSomething();
      showSuccess('Operation completed successfully');
    } catch (error) {
      showError('Operation failed: ' + error.message);
    }
  };
}
```

**After**:
```tsx
import { useNotifications } from '@bayit/glass-ui/hooks'; // or from glass-components

function MyComponent() {
  const notifications = useNotifications();

  const handleAction = async () => {
    try {
      await doSomething();
      notifications.showSuccess('Operation completed successfully', 'Success');
    } catch (error) {
      notifications.showError('Operation failed: ' + error.message, 'Error');
    }
  };
}
```

**Key Changes**:
- Replace `useModal()` with `useNotifications()`
- Methods take (message, title) params instead of just message
- Remove GlassModal JSX from return statement
- Notifications display automatically via GlassToastContainer

---

### Pattern 2: Confirm Dialog (useModal hook)

**Before**:
```tsx
const { showConfirm } = useModal();

const handleDelete = () => {
  showConfirm('Are you sure?', async () => {
    await delete();
    showSuccess('Deleted successfully');
  }, {
    title: 'Delete Item',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    destructive: true
  });
};
```

**After**:
```tsx
const notifications = useNotifications();

const handleDelete = async () => {
  // Using a confirmation pattern with notifications
  if (!window.confirm('Are you sure?')) return; // Temporary fallback for web

  try {
    await delete();
    notifications.showSuccess('Deleted successfully', 'Success');
  } catch (error) {
    notifications.showError(error.message, 'Error');
  }
};
```

**Alternative using action-based notification** (recommended):
```tsx
const notifications = useNotifications();

const handleDelete = () => {
  notifications.show({
    level: 'warning',
    title: 'Delete Item',
    message: 'Are you sure you want to delete this?',
    action: {
      label: 'Delete',
      type: 'action',
      onPress: async () => {
        try {
          await delete();
          notifications.showSuccess('Deleted successfully', 'Success');
        } catch (error) {
          notifications.showError(error.message, 'Error');
        }
      }
    },
    dismissable: true
  });
};
```

**Note**: For complex confirmations, consider creating a `useConfirmation()` hook that wraps notification patterns.

---

### Pattern 3: Alert.alert (Imperative API)

**Before** (mobile-app/src/utils/errorHandling.ts):
```tsx
import { Alert } from 'react-native';

Alert.alert(
  i18n.t('errors.offline.title'),
  i18n.t('errors.offline.message'),
  [{ text: i18n.t('errors.buttons.ok') }]
);
```

**After**:
```tsx
import { Notifications } from '@bayit/glass-ui/hooks'; // or from glass-components

Notifications.showError(
  i18n.t('errors.offline.message'),
  i18n.t('errors.offline.title')
);
```

**Key Changes**:
- Use imperative `Notifications` API (not hook-based)
- Works outside React components
- No need for context or provider in utility files
- Automatically routes to notification store

---

### Pattern 4: GlassModal Component

**Before**:
```tsx
import { GlassModal } from '@bayit/shared/ui';

function MyComponent() {
  const [visible, setVisible] = useState(false);
  const { showError } = useModal();

  return (
    <>
      <GlassModal
        visible={visible}
        type="error"
        title="Error"
        message="Something went wrong"
        buttons={[{ text: 'OK' }]}
        onClose={() => setVisible(false)}
      />
    </>
  );
}
```

**After**:
```tsx
import { useNotifications } from '@bayit/glass-ui/hooks';

function MyComponent() {
  const notifications = useNotifications();

  // Trigger notification directly
  const showError = () => {
    notifications.showError('Something went wrong', 'Error');
  };

  // No GlassModal JSX needed - notifications display via GlassToastContainer
  return <button onClick={showError}>Show Error</button>;
}
```

---

## Testing Strategy

### Unit Tests
- Test each migrated component separately
- Verify notifications are called with correct parameters
- Mock useNotifications hook

### Integration Tests
- Test multiple notifications in sequence
- Test notification clearing and dismissal
- Test notification display and hiding

### Manual Testing Checklist
```
[ ] Error notifications display correctly
[ ] Success notifications display correctly
[ ] Warning notifications display correctly
[ ] Info notifications display correctly
[ ] Notifications auto-dismiss after timeout
[ ] User can manually dismiss notifications
[ ] Multiple notifications queue correctly
[ ] No console warnings about missing context
[ ] No remnants of useModal() context
[ ] No Alert.alert() calls remaining
```

---

## Rollback Plan

If issues arise during migration:

1. **Phase Rollback**: Revert individual phase commits
2. **File-Level Rollback**: For specific files with issues, revert to old pattern
3. **Gradual Rollout**: Deploy phase-by-phase to catch issues early

---

## Success Criteria

- ✅ All 57 files successfully migrated
- ✅ Zero Alert.alert() calls in non-demo code
- ✅ Zero useModal() imports in non-demo code
- ✅ All tests passing (87%+ coverage)
- ✅ No console warnings about missing providers
- ✅ Notifications display correctly on all platforms
- ✅ No performance regression
- ✅ Old ModalContext files removed or deprecated
- ✅ Documentation updated with new patterns

---

## Files Requiring Special Attention

### 1. web/src/App.tsx
**Current**: Uses ModalProvider at root level

**Action**: Remove ModalProvider wrapper, ensure GlassToastContainer is in place from glass-components package

### 2. shared/contexts/index.ts
**Current**: Exports ModalContext and useModal

**Action**: Update exports, add deprecation notice

### 3. glass-components Package
**Current**: May have compatibility layers

**Action**: Verify all exports correctly point to new useNotifications API

---

## Dependencies & Assumptions

- GlassToastContainer must be available at app root
- GlassToastContainer is provided by glass-components package
- Notifications store is initialized globally
- No breaking changes to existing notification levels (debug, info, warning, success, error)

---

## Next Steps

1. Review this plan with team
2. Set up git branches for each phase
3. Begin Phase 1: Foundation
4. Run incremental testing after each batch
5. Track completion and performance metrics
6. Document lessons learned

---

**Last Updated**: 2026-01-24
**Status**: Ready for Phase 1
