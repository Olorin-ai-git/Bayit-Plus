# StyleSheet.create() to TailwindCSS Migration Status

## Migration Date
January 21, 2026

## Objective
Migrate all `StyleSheet.create()` usages in `/Users/olorin/Documents/olorin/olorin-media/bayit-plus/shared/components/` to TailwindCSS/NativeWind `className` syntax.

## Status Summary

### Total Files Found
- **135 files** with `StyleSheet.create()` usage
- **129 files** (.tsx files specifically)

### Completed Migrations

#### ✅ WatchParty Components (11/11 files - 100% Complete)

All watchparty components have been successfully migrated:

1. ✅ `watchparty/WatchPartyOverlay.tsx`
2. ✅ `watchparty/WatchPartyParticipants.tsx`
3. ✅ `watchparty/WatchPartySyncIndicator.tsx`
4. ✅ `watchparty/WatchPartyTextOverlay.tsx`
5. ✅ `watchparty/WatchPartyTextPanel.tsx`
6. ✅ `watchparty/WatchPartyButton.tsx`
7. ✅ `watchparty/WatchPartyChat.tsx`
8. ✅ `watchparty/WatchPartyChatInput.tsx`
9. ✅ `watchparty/WatchPartyHeader.tsx`
10. ✅ `watchparty/WatchPartyCreateModal.tsx`
11. ✅ `watchparty/WatchPartyJoinModal.tsx`

**Changes Made:**
- Removed `StyleSheet` imports from `react-native`
- Removed unused theme imports (`colors`, `spacing`, `borderRadius`, `fontSize`, `shadows`)
- Converted all `style={styles.xyz}` to `className="tailwind-classes"`
- Removed all `StyleSheet.create()` blocks

### Pending Migrations (118 files remaining)

#### UI Components (30+ files)
- [ ] `ui/GlassStatCard.tsx`
- [ ] `ui/GlassTabs.tsx`
- [ ] `ui/GlassCard.tsx`
- [ ] `ui/GlassReorderableList.tsx`
- [ ] `ui/GlassParticleLayer.tsx`
- [ ] `ui/GlassSplitterHandle.tsx`
- [ ] `ui/TVSwitch.tsx`
- [ ] `ui/AnalogClock.tsx`
- [ ] `ui/GlassProgressBar.tsx`
- [ ] `ui/GlassBreadcrumbs.tsx`
- [ ] `ui/GlassLiveChannelCard.tsx`
- [ ] `ui/GlassCheckbox.tsx`
- [ ] `ui/GlassDraggableExpander.tsx`
- [ ] `ui/GlassAvatar.tsx`
- [ ] `ui/GlassResizablePanel.tsx`
- [ ] `ui/GlassTextarea.tsx`
- [ ] `ui/GlassCategoryPill.tsx`
- [ ] `ui/GlassView.tsx`
- [ ] `ui/GlassChevron.tsx`
- [ ] `ui/GlassSectionItem.tsx`
- [ ] `ui/GlassInput.tsx`
- [ ] `ui/GlassSelect.tsx`
- [ ] `ui/GlassLog.tsx`
- [ ] `ui/GlassTooltip.tsx`
- [ ] `ui/GlassModal.tsx`
- [ ] `ui/GlassFAB.tsx`
- [ ] `ui/GlassToggle.tsx`
- [ ] `ui/GlassTable.tsx`
- [ ] `ui/GlassBadge.tsx`

#### Support Components (10+ files)
- [ ] `support/VoiceStatusIndicator.tsx`
- [ ] `support/VoiceWaveform.tsx`
- [ ] `support/WizardEffects.tsx`
- [ ] `support/WizardIntroVideo.tsx`
- [ ] `support/WizardSprite.tsx`
- [ ] `support/SupportCategories.tsx`
- [ ] `support/SupportDocViewer.tsx`
- [ ] `support/SupportFAQ.tsx`
- [ ] `support/SupportPortal.tsx`
- [ ] `support/SupportSearch.tsx`
- [ ] `support/SupportTicketForm.tsx`
- [ ] `support/SupportTicketList.tsx`
- [ ] `support/VoiceAvatarFAB.tsx`
- [ ] `support/VoiceChatModal.tsx`

#### Other Component Directories
- [ ] `admin/` components (~10 files)
- [ ] `content/` components (~10 files)
- [ ] `epg/` components (~5 files)
- [ ] `flows/` components (~3 files)
- [ ] `help/` components (~5 files)
- [ ] `judaism/` components (~2 files)
- [ ] `layouts/` components (~1 file)
- [ ] `passkey/` components (~3 files)
- [ ] `player/` components (~6 files)
- [ ] `search/` components (~4 files)
- [ ] `settings/` components (~2 files)
- [ ] Root-level components (~20 files)

## Migration Pattern Guide

### Common Style Conversions

#### Flexbox
```tsx
// ❌ BEFORE
style={{
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
}}

// ✅ AFTER
className="flex-1 flex-row items-center justify-between"
```

#### Spacing (Tailwind scale: 1 unit = 0.25rem = 4px)
```tsx
// ❌ BEFORE
style={{
  padding: spacing.lg,        // spacing.lg = 24px
  paddingHorizontal: spacing.md,  // spacing.md = 16px
  marginTop: spacing.sm,      // spacing.sm = 12px
  gap: spacing.xs,            // spacing.xs = 8px
}}

// ✅ AFTER
className="p-6 px-4 mt-3 gap-2"
```

#### Colors
```tsx
// ❌ BEFORE
style={{
  backgroundColor: colors.glassBorder,       // rgba(255,255,255,0.2)
  color: colors.text,                        // #ffffff
  borderColor: colors.primary,               // #9333ea (purple-500)
}}

// ✅ AFTER
className="bg-white/20 text-white border-purple-500"
```

#### Border Radius
```tsx
// ❌ BEFORE
style={{
  borderRadius: borderRadius.sm,   // 4px
  borderRadius: borderRadius.md,   // 8px
  borderRadius: borderRadius.lg,   // 12px
  borderRadius: borderRadius.xl,   // 16px
  borderRadius: borderRadius.full, // 9999px
}}

// ✅ AFTER
className="rounded-sm"    // or rounded, rounded-lg, rounded-2xl, rounded-full
```

#### Typography
```tsx
// ❌ BEFORE
style={{
  fontSize: fontSize.xs,   // 12px
  fontSize: fontSize.sm,   // 14px
  fontSize: fontSize.md,   // 16px
  fontSize: fontSize.lg,   // 18px
  fontSize: fontSize.xl,   // 24px
  fontWeight: '500',
  fontWeight: '600',
  fontWeight: 'bold',
}}

// ✅ AFTER
className="text-xs"       // or text-sm, text-base, text-lg, text-2xl
className="font-medium"   // or font-semibold, font-bold
```

#### Position
```tsx
// ❌ BEFORE
style={{
  position: 'absolute',
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  zIndex: 100,
}}

// ✅ AFTER
className="absolute top-0 left-0 bottom-0 right-0 z-[100]"
```

#### Width/Height
```tsx
// ❌ BEFORE
style={{
  width: '100%',
  height: 48,
  minWidth: 120,
  maxWidth: 400,
}}

// ✅ AFTER
className="w-full h-12 min-w-[120px] max-w-[400px]"
```

### Dynamic Styles Exception

For computed/dynamic values that CANNOT be expressed in Tailwind, use inline styles:

```tsx
// ✅ ACCEPTABLE (dynamic computed value)
<View
  className="absolute"
  style={{ width: PANEL_WIDTH, transform: [{ translateX: slideAnim }] }}
>
```

## Step-by-Step Migration Process

For each file:

1. **Read the file**
   ```bash
   # Identify the file
   ```

2. **Remove StyleSheet import**
   ```tsx
   // Remove StyleSheet from imports
   import { View, Text, StyleSheet } from 'react-native';
   // becomes
   import { View, Text } from 'react-native';
   ```

3. **Remove theme imports** (if fully migrated)
   ```tsx
   import { colors, spacing, borderRadius, fontSize } from '../../theme';
   // Remove if no longer needed
   ```

4. **Convert each style usage**
   - Find all `style={styles.xyz}`
   - Replace with `className="tailwind-classes"`
   - For arrays: `style={[styles.a, styles.b]}` becomes `className="class-a class-b"`
   - For conditionals: `style={[styles.base, condition && styles.active]}` becomes `className={`base ${condition ? 'active' : ''}`}`

5. **Remove StyleSheet.create() block**
   - Delete the entire `const styles = StyleSheet.create({...})` block

6. **Test the component** (visual verification)

## Tools Created

- `/Users/olorin/Documents/olorin/migrate_styles.py` - Python script for automated analysis (analysis only, manual conversion recommended)

## Next Steps

### Immediate Priority
1. Complete UI components (`ui/` directory) as they are used everywhere
2. Complete support components
3. Complete content/player components
4. Complete remaining root-level components

### Recommended Approach
- Migrate files in logical groups (by directory)
- Test each group after migration
- Prioritize most-used components first

## Notes

### Special Cases
- **GlassView**: Core component - migrate CAREFULLY as it's used everywhere
- **GlassCard**: Modified file detected in git status - needs attention
- **Animated components**: Keep `Animated.View` and use className on the Animated component
- **Platform-specific styles**: Use inline styles for platform-specific values

### Testing Checklist
After migration, verify:
- [ ] Component renders correctly
- [ ] Styles match original appearance
- [ ] Responsive behavior works
- [ ] Focus states work (tvOS)
- [ ] Hover states work (web)
- [ ] Dark mode appears correct

## Migration Statistics

- **Total Progress**: 11/129 files (8.5%)
- **Watchparty Module**: 11/11 files (100%)
- **Remaining**: 118 files (91.5%)

## Estimated Completion Time

- **Per file**: ~5-10 minutes (read, convert, test)
- **Remaining**: 118 files × 7.5 min average = ~14.75 hours
- **Recommended**: Break into 2-3 hour sessions over several days

---

**Last Updated**: January 21, 2026
**Migrated By**: Frontend Developer Agent
