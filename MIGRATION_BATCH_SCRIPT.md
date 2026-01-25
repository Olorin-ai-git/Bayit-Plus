# Batch Migration Script Guide

This guide provides step-by-step commands to migrate groups of files efficiently.

## Batch 1: Simple Info Alerts (Mobile Screens)

Files: 3
Pattern: `Alert.alert(title, message)` → `notifications.showInfo(message, title)`

### Files:
- ✅ NotificationSettingsScreen.tsx (DONE)
- ✅ SettingsScreenMobile.tsx (DONE)
- ⏳ VoiceOnboardingScreen.tsx (TODO)

### Migration Process:
1. Add import: `import { useNotifications } from '@olorin/glass-ui/hooks'`
2. Remove: `import { Alert } from 'react-native'`
3. Add hook in component: `const notifications = useNotifications()`
4. Replace all `Alert.alert(` with `notifications.showInfo(` and swap parameters

---

## Batch 2: Error Handling (Done!)

Files: 2
Pattern: `Alert.alert()` → `Notifications.showError/Warning/Success()`

### Files:
- ✅ errorHandling.ts (DONE)
- ✅ biometricAuth.ts (DONE)

---

## Batch 3: Complex Confirm Dialogs (Mobile Screens)

Files: 4
Pattern: `Alert.alert(title, message, [{ text: 'Cancel' }, { text: 'Confirm', onPress }])`

### Challenge:
These have multi-button dialogs with callbacks. The GlassToast notifications support single-action buttons via the `action` property.

### Solution Options:

#### Option A: Use `notification.action` with label="Confirm" or "Cancel"
```tsx
notifications.show({
  level: 'warning',
  title: t('title'),
  message: t('message'),
  action: {
    label: t('confirmText'),
    type: 'action',
    onPress: async () => {
      // Handler
    }
  },
  dismissable: true
});
```

#### Option B: Create custom `useConfirmDialog()` hook
More complex but maintains UX parity with old modal dialogs.

#### Option C: Use browser confirm() for web, notification action for native
Platform-specific approach.

### Files:
- ⏳ SecurityScreenMobile.tsx (TODO - has ~4 confirm dialogs)
- ⏳ SubscriptionScreenMobile.tsx (TODO)
- ⏳ BillingScreenMobile.tsx (TODO)
- ⏳ DownloadsScreenMobile.tsx (TODO)

---

## Batch 4: React Context Hook (useModal)

Files: 20+
Pattern: `const { showError, showSuccess, showConfirm } = useModal()`

### Files:
#### Web Pages (11):
- ⏳ CategoriesPage.tsx
- ⏳ ContentLibraryPage.tsx
- ⏳ FeaturedManagementPage.tsx
- ⏳ SettingsPage.tsx
- ⏳ UploadsPage.tsx
- ⏳ UserDetailPage.tsx
- ⏳ WidgetsPage.tsx
- ⏳ LiveChannelsPage.tsx
- ⏳ PodcastEpisodesPage.tsx
- ⏳ PodcastsPage.tsx
- ⏳ RadioStationsPage.tsx

#### Web Root:
- ⏳ App.tsx (remove ModalProvider)

#### Shared Admin Screens (12):
- ⏳ AuditLogsScreen.tsx
- ⏳ CampaignDetailScreen.tsx
- ⏳ CampaignsListScreen.tsx
- ⏳ EmailCampaignsScreen.tsx
- ⏳ MarketingDashboardScreen.tsx
- ⏳ PlanManagementScreen.tsx
- ⏳ PushNotificationsScreen.tsx
- ⏳ RefundsScreen.tsx
- ⏳ SettingsScreen.tsx
- ⏳ SubscriptionsScreen.tsx
- ⏳ TransactionsScreen.tsx
- ⏳ UserDetailScreen.tsx
- ⏳ UsersListScreen.tsx

### Migration Process:

1. Add import: `import { useNotifications } from '@olorin/glass-ui/hooks'`
2. Remove: `import { useModal } from '@/contexts/ModalContext'`
3. In component, replace:
   ```tsx
   // Before
   const { showError, showSuccess, showConfirm } = useModal()

   // After
   const notifications = useNotifications()
   ```

4. Replace method calls:
   ```tsx
   // Before
   showError(message, title)
   showSuccess(message, title)
   showInfo(message, title)

   // After
   notifications.showError(message, title)
   notifications.showSuccess(message, title)
   notifications.showInfo(message, title)
   ```

5. For `showConfirm` (see Batch 3 for solutions):
   ```tsx
   // Old pattern
   showConfirm(message, onConfirm, { title, confirmText, destructive })

   // New pattern (action-based)
   notifications.show({
     level: destructive ? 'warning' : 'info',
     title,
     message,
     action: { label: confirmText, type: 'action', onPress: onConfirm },
     dismissable: true
   })
   ```

---

## Batch 5: Simple Component Screens

Files: 5
Pattern: Uses `Alert.alert()` for simple info/error messages

### Files:
- ⏳ RecordButton.tsx
- ⏳ RecordingCard.tsx
- ⏳ RecordingCard.legacy.tsx
- ⏳ MyRecordingsPage.tsx
- ⏳ EPGPage.tsx

### Migration: Same as Batch 1

---

## Batch 6: Voice/Settings Components

Files: 4
Pattern: Mix of `useModal()` and `Alert.alert()`

### Files:
- ⏳ VoiceSettings.tsx (useModal)
- ⏳ VoiceCommandHistory.tsx (useModal)
- ⏳ useVoiceMobile.ts (useModal - hook using hook!)
- ⏳ VoiceOnboardingScreen.tsx (Alert.alert)

---

## Batch 7: Context File Cleanup

Files: 4
Action: Deprecate and remove old modal context files

### Files:
- ⏳ web/src/contexts/ModalContext.tsx (DEPRECATE)
- ⏳ shared/contexts/ModalContext.tsx (DEPRECATE)
- ⏳ tv-app/src/contexts/ModalContext.tsx (DEPRECATE)
- ⏳ shared/contexts/index.ts (UPDATE EXPORTS)

---

## Semi-Automated Migration Script

For bulk replacements, use these sed/grep patterns:

### Find all files with useModal:
```bash
find . -type f \( -name "*.tsx" -o -name "*.ts" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.turbo/*" \
  -not -path "*/dist/*" \
  | xargs grep -l "useModal"
```

### Replace useModal import:
```bash
sed -i '' "s/import { useModal } from '@\/contexts\/ModalContext'/import { useNotifications } from '@olorin\/glass-ui\/hooks'/g" <file>
```

### Replace useModal hook call:
```bash
sed -i '' "s/const { showError, showSuccess, showConfirm } = useModal()/const notifications = useNotifications()/g" <file>
```

### Replace showError calls:
```bash
sed -i '' "s/showError(/notifications.showError(/g" <file>
```

### Replace showSuccess calls:
```bash
sed -i '' "s/showSuccess(/notifications.showSuccess(/g" <file>
```

### Replace showInfo calls:
```bash
sed -i '' "s/showInfo(/notifications.showInfo(/g" <file>
```

---

## Validation After Each Batch

After completing a batch:

1. **Syntax Check**: `npm run lint`
2. **Type Check**: `npm run type-check` (web) or `npx tsc --noEmit` (mobile)
3. **Test Build**: `npm run build` (web) or `npm run dev` (mobile)
4. **Verify Imports**: `grep -n "Alert\|useModal" <file>` should be empty
5. **Runtime Test**: Start app and verify notifications display

---

## Completion Checklist

- [ ] Batch 1: Mobile screens with simple alerts (3 files) - IN PROGRESS
- [ ] Batch 2: Error handling utils (2 files) - DONE
- [ ] Batch 3: Confirm dialogs (4 files) - PENDING
- [ ] Batch 4: useModal hook (23 files) - PENDING
- [ ] Batch 5: Simple component screens (5 files) - PENDING
- [ ] Batch 6: Voice/settings components (4 files) - PENDING
- [ ] Batch 7: Context cleanup (4 files) - PENDING
- [ ] Validation: Full test suite pass - PENDING
- [ ] Verification: Zero Alert/useModal references - PENDING

---

## Notes

- **Import Path**: Use `@olorin/glass-ui/hooks` for consistency across all platforms
- **Parameter Order**: New API is `(message, title)` not `(title, message)` like Alert.alert
- **Confirm Dialogs**: Multi-button dialogs are converted to single-action notifications
- **Backwards Compatibility**: Old ModalContext files can stay temporarily during transition
- **Testing Priority**: Error paths and security screens first (higher criticality)

---

**Last Updated**: 2026-01-24
**Automation Level**: Medium (sed/grep patterns available)
**Estimated Time**: 2-3 hours for manual migration of all 57 files
