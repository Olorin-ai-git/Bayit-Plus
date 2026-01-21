# Admin Button Styles Guide

## Overview

All admin pages should use the shared glassmorphic button styles from `adminButtonStyles.ts` to maintain visual consistency across the admin interface.

## Usage

### 1. Import the styles

```typescript
import { adminButtonStyles } from '@/styles/adminButtonStyles';
```

### 2. Apply to GlassButton components

Always use `variant="secondary"` with the shared styles:

```tsx
<GlassButton
  title={t('common.add')}
  variant="secondary"  // Always use secondary
  style={adminButtonStyles.primaryButton}  // Then override with shared style
  textStyle={adminButtonStyles.buttonText}  // Ensure text is visible
  icon={<Plus size={18} color={colors.text} />}
  onPress={handleAdd}
/>
```

## Available Button Styles

### Action Buttons

- **`primaryButton`** - Green, for create/add actions
  ```tsx
  style={adminButtonStyles.primaryButton}
  ```

- **`secondaryButton`** - White/transparent, for edit/view actions
  ```tsx
  style={adminButtonStyles.secondaryButton}
  ```

- **`dangerButton`** - Red, for delete/remove actions
  ```tsx
  style={adminButtonStyles.dangerButton}
  ```

- **`infoButton`** - Blue, for info/details actions
  ```tsx
  style={adminButtonStyles.infoButton}
  ```

- **`warningButton`** - Orange, for warning/caution actions
  ```tsx
  style={adminButtonStyles.warningButton}
  ```

- **`successButton`** - Green, for save/confirm actions
  ```tsx
  style={adminButtonStyles.successButton}
  ```

- **`cancelButton`** - White/transparent, for cancel/dismiss actions
  ```tsx
  style={adminButtonStyles.cancelButton}
  ```

### Toggle Buttons

- **`selectedButton`** - Blue, for selected state
- **`unselectedButton`** - White/transparent, for unselected state

```tsx
<GlassButton
  variant="secondary"
  style={isSelected ? adminButtonStyles.selectedButton : adminButtonStyles.unselectedButton}
  textStyle={adminButtonStyles.buttonText}
/>
```

## Migration Checklist

When updating an admin page:

- [ ] Import `adminButtonStyles`
- [ ] Change all `variant="primary"` to `variant="secondary"`
- [ ] Add appropriate `style={adminButtonStyles.xxxButton}`
- [ ] Add `textStyle={adminButtonStyles.buttonText}` to all buttons
- [ ] Remove inline `backgroundColor` styles
- [ ] Test all button states (normal, hover, disabled)

## Examples

### Before (Inconsistent)
```tsx
<GlassButton
  title="Delete"
  variant="primary"
  style={{ backgroundColor: colors.error }}
  onPress={handleDelete}
/>
```

### After (Consistent)
```tsx
<GlassButton
  title={t('common.delete')}
  variant="secondary"
  style={adminButtonStyles.dangerButton}
  textStyle={adminButtonStyles.buttonText}
  onPress={handleDelete}
/>
```

## Updated Pages

✅ SubscriptionsListPage
✅ UsersListPage
✅ CampaignsListPage

## Remaining Pages

The following pages should be updated with the same pattern:

- [ ] AdminDashboardPage
- [ ] BillingOverviewPage
- [ ] MarketingDashboardPage
- [ ] SettingsPage
- [ ] UserDetailPage
- [ ] FreeContentImportPage
- [ ] PlanManagementPage
- [ ] CampaignEditPage
- [ ] LiveChannelsPage
- [ ] RadioStationsPage
- [ ] TransactionsPage
- [ ] AuditLogsPage
- [ ] RefundsPage
- [ ] WidgetsPage
- [ ] EmailCampaignsPage
- [ ] PushNotificationsPage
- [ ] CategoriesPage
- [ ] ContentLibraryPage
- [ ] ContentEditorPage
- [ ] LibrarianAgentPage
- [ ] PodcastEpisodesPage
- [ ] PodcastsPage

## Color Palette

All button styles use subtle glassmorphic colors:

- **Primary/Success**: `rgba(34, 197, 94, 0.15)` with border `rgba(34, 197, 94, 0.3)`
- **Danger**: `rgba(239, 68, 68, 0.1)` with border `rgba(239, 68, 68, 0.3)`
- **Info/Selected**: `rgba(59, 130, 246, 0.15)` with border `rgba(59, 130, 246, 0.4)`
- **Warning**: `rgba(245, 158, 11, 0.1)` with border `rgba(245, 158, 11, 0.3)`
- **Secondary/Cancel**: `rgba(255, 255, 255, 0.05)` with border `rgba(255, 255, 255, 0.15)`

These maintain the dark glassmorphism aesthetic with subtle transparency and borders.
