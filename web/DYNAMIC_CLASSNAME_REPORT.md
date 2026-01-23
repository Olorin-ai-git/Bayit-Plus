# Dynamic className Usage Report

**Date**: 2026-01-22
**Purpose**: Identify files that require StyleSheet conversion due to dynamic className patterns that break with NativeWind

## Summary

- **Total files with dynamic className**: 79
- **Pattern type**: Template literals with conditional logic (ternary, string interpolation)
- **Primary patterns**:
  - RTL support: `${isRTL ? 'flex-row-reverse' : ''}`
  - Conditional styling: `${isActive ? 'text-purple-500' : 'text-white'}`
  - Dynamic classes: `` className={`base-class ${dynamicVar}`} ``

## Files Requiring Conversion

### Settings Components (45 files)
**Location**: `./components/settings/`

#### Voice Settings (15 files)
- `./components/settings/voice/components/AccessibilitySection.tsx`
- `./components/settings/voice/components/HybridFeedbackSection.tsx`
- `./components/settings/voice/components/PrivacyNotice.tsx`
- `./components/settings/voice/components/SensitivitySelector.tsx`
- `./components/settings/voice/components/SpeedControl.tsx`
- `./components/settings/voice/components/TTSSection.tsx`
- `./components/settings/voice/components/VoiceModeCard.tsx`
- `./components/settings/voice/components/VoiceModeSection.tsx`
- `./components/settings/voice/components/VoiceSearchSection.tsx`
- `./components/settings/voice/components/VoiceSettingsHeader.tsx`
- `./components/settings/voice/components/VolumeControl.tsx`
- `./components/settings/voice/components/WakeWordSection.tsx`
- `./components/settings/voice/components/WakeWordTestButton.tsx`
- `./components/settings/voice/components/VoiceSettingRow.tsx` (from grep)
- `./components/settings/voice/components/Toggle.tsx` (from grep)

#### Ritual Settings (6 files)
- `./components/settings/ritual/components/ContentTypesSection.tsx`
- `./components/settings/ritual/components/EnableToggleCard.tsx`
- `./components/settings/ritual/components/OptionsSection.tsx`
- `./components/settings/ritual/components/RitualHeader.tsx`
- `./components/settings/ritual/components/SaveButton.tsx`
- `./components/settings/ritual/components/TimeRangeSection.tsx`
- `./components/settings/ritual/components/Toggle.tsx` (from grep)

#### AI Settings (1 file)
- `./components/settings/AISettings.tsx`

### Admin Components (13 files)
**Location**: `./components/admin/` and `./pages/admin/`

- `./components/admin/activity/ActivityLogItem.tsx`
- `./components/admin/AdminSidebar.tsx`
- `./components/admin/hierarchy/ColumnRenderers.tsx`
- `./components/admin/hierarchy/TreeRow.tsx`
- `./components/admin/queue/components/ActiveJobCard.tsx`
- `./components/admin/queue/components/QueuedItemsList.tsx`
- `./components/admin/queue/components/QueueHeader.tsx`
- `./components/admin/queue/components/QueuePausedWarning.tsx`
- `./components/admin/queue/components/RecentCompletedList.tsx`
- `./components/admin/queue/GlassQueue.tsx`
- `./components/admin/StatCard.tsx`
- `./components/admin/StreamUrlInput.tsx`
- `./pages/admin/SubscriptionsListPage.tsx`
- `./pages/admin/TransactionsPage.tsx`
- `./pages/admin/WidgetsPage.tsx`
- `./components/admin/schedule/ScheduleEditModal.tsx` (from grep)
- `./components/admin/schedule/ScheduleCardHeader.tsx` (from grep)
- `./components/admin/image/ImageDropZone.tsx` (from grep)
- `./components/admin/AdminLayout.tsx` (from grep)

### Chat Components (5 files)
**Location**: `./components/chat/`

- `./components/chat/Chatbot.tsx`
- `./components/chat/ChatInputBar.tsx`
- `./components/chat/ChatMessageList.tsx`
- `./components/chat/ChatRecommendations.tsx`
- `./components/chat/ChatSuggestionsPanel.tsx`

### Watch Party Components (5 files)
**Location**: `./components/watchparty/`

- `./components/watchparty/AudioControls.tsx`
- `./components/watchparty/WatchPartyChat.tsx`
- `./components/watchparty/WatchPartyChatInput.tsx`
- `./components/watchparty/WatchPartyOverlay.tsx`
- `./components/watchparty/WatchPartyJoinModal.tsx` (from grep)
- `./components/watchparty/WatchPartyParticipants.tsx` (from grep)
- `./components/watchparty/WatchPartySyncIndicator.tsx` (from grep)
- `./components/watchparty/WatchPartyPanel.tsx` (from grep)

### Flows Pages (10 files)
**Location**: `./pages/flows/components/`

- `./pages/flows/components/ActiveFlowBanner.tsx`
- `./pages/flows/components/ContentPickerModal.tsx`
- `./pages/flows/components/FlowCard.tsx`
- `./pages/flows/components/FlowCarouselCard.tsx`
- `./pages/flows/components/FlowCarouselRow.tsx`
- `./pages/flows/components/FlowDetailsModal.tsx`
- `./pages/flows/components/FlowFormModal.tsx`
- `./pages/flows/components/FlowHero.tsx`
- `./pages/flows/components/FlowItemList.tsx`
- `./pages/flows/components/FlowTopBar.tsx`
- `./pages/flows/components/TriggerConfigPanel.tsx`

### Friends Components (4 files)
**Location**: `./pages/friends/`

- `./pages/friends/components/FriendCard.tsx`
- `./pages/friends/components/IncomingRequestCard.tsx`
- `./pages/friends/components/StatsHeader.tsx`
- `./pages/friends/tabs/RequestsTab.tsx`

### Profile Components (3 files)
**Location**: `./pages/profile/components/`

- `./pages/profile/components/QuickActions.tsx`
- `./pages/profile/components/SettingRow.tsx`
- `./pages/profile/components/Toggle.tsx`

### Player Components (3 files)
**Location**: `./components/player/`

- `./components/player/ChapterCard.tsx`
- `./components/player/LiveSubtitleControls.tsx`
- `./components/player/subtitle/SubtitleLanguageList.tsx`

### Watch/Watchlist Pages (5 files)
**Location**: `./pages/watch/` and `./pages/watchlist/`

- `./pages/watch/components/FlowHeader.tsx`
- `./pages/watch/components/PlaylistPanel.tsx`
- `./pages/watch/components/ScheduleSection.tsx`
- `./pages/watch/components/EpisodesList.tsx` (from grep)
- `./pages/watch/components/BackButton.tsx` (from grep)
- `./pages/watchlist/WatchlistGrid.tsx`
- `./pages/watchlist/WatchlistPageHeader.tsx`

### Miscellaneous Components (11 files)

- `./components/chess/ChessChat.tsx`
- `./components/epg/EPGTimeControls.tsx`
- `./components/judaism/JewishNewsFeed.tsx`
- `./components/judaism/ShabbatModeBanner.tsx` *(already converted)*
- `./components/layouts/vertical-feed/FeedItem.tsx`
- `./components/ritual/MorningRitual.tsx`
- `./components/widgets/SystemWidgetGallery.tsx`
- `./components/widgets/WidgetCard.tsx`
- `./pages/podcasts/PodcastsPageHeader.tsx`
- `./utils/sanitizeTailwind.ts`

## Common Patterns Requiring Conversion

### Pattern 1: RTL Conditional Flex Direction
```tsx
// ❌ Breaks with NativeWind
<View className={`flex-row items-center ${isRTL ? 'flex-row-reverse' : ''}`}>

// ✅ Fix with StyleSheet
<View style={[styles.row, isRTL && styles.rowReverse]}>

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  rowReverse: { flexDirection: 'row-reverse' },
});
```

### Pattern 2: RTL Conditional Text Alignment
```tsx
// ❌ Breaks with NativeWind
<Text className={`text-white ${isRTL ? 'text-right' : ''}`}>

// ✅ Fix with StyleSheet
<Text style={[styles.text, isRTL && styles.textRight]}>

const styles = StyleSheet.create({
  text: { color: '#fff' },
  textRight: { textAlign: 'right' },
});
```

### Pattern 3: Conditional Color/Style
```tsx
// ❌ Breaks with NativeWind
<Text className={`${isActive ? 'text-purple-500' : 'text-white'}`}>

// ✅ Fix with StyleSheet
<Text style={[styles.text, isActive && styles.textActive]}>

const styles = StyleSheet.create({
  text: { color: '#fff' },
  textActive: { color: '#a855f7' },
});
```

### Pattern 4: Conditional Opacity
```tsx
// ❌ Breaks with NativeWind
<View className={`p-4 ${!enabled ? 'opacity-50' : ''}`}>

// ✅ Fix with StyleSheet
<View style={[styles.container, !enabled && styles.disabled]}>

const styles = StyleSheet.create({
  container: { padding: 16 },
  disabled: { opacity: 0.5 },
});
```

## Next Steps

1. **Convert these 79 files** from dynamic className to StyleSheet arrays
2. **Keep static className** in all other files (NativeWind works fine for static classes)
3. **Test RTL layouts** after conversion to ensure proper directional handling
4. **Verify conditional styling** works correctly with StyleSheet arrays

## Files Already Unnecessarily Converted

The following pages were converted to StyleSheet but didn't actually need it (static className only):
- All pages in `/src/pages/` directory (HomePage, LoginPage, RegisterPage, etc.)
- Most admin pages (they don't use dynamic className)
- Player profile components (static styles)

**Recommendation**: Consider reverting these conversions back to NativeWind for consistency, or keep them as-is (StyleSheet works fine, just unnecessary).
