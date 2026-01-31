# Emoji to Olorin Icons Migration Plan

**Status:** Ready for Implementation
**Created:** 2026-01-31
**Scope:** 306+ non-flag emoji usages across Bayit+ ecosystem
**Package:** `@olorin/shared-icons` v2.0.0

---

## Executive Summary

This plan migrates all non-flag emojis in the Bayit+ codebase to the `@olorin/shared-icons` package. Flag emojis (🇮🇱, 🇺🇸, etc.) used for language selection are **exempt** and will remain.

### Migration Statistics

| Category | Count | Action |
|----------|-------|--------|
| Non-flag emojis to replace | 306+ | Migrate to @olorin/shared-icons |
| Flag emojis (allowed) | 9 | Keep as-is |
| Files requiring changes | 85+ | Update imports and components |
| New icons to add to registry | 28 | Extend iconRegistry.ts |

---

## Phase 1: Icon Registry Extension

**Priority:** CRITICAL - Must complete before Phase 2
**Estimated Scope:** Add 28 new icons to registry

### 1.1 New Icons Required

The current registry has 47 icons. The following 28 icons must be added:

#### Navigation/UI Icons (8)

| Icon Name | Lucide Icon | Emoji Replaced | Usage |
|-----------|-------------|----------------|-------|
| `logout` | LogOut | 🚪 | Sign out action |
| `lock` | Lock | 🔒 | Security, permissions |
| `unlock` | Unlock | 🔓 | Unlocked state |
| `key` | Key | 🔑 | Passkey, authentication |
| `globe` | Globe | 🌐🌍 | Language, international |
| `location` | MapPin | 📍 | Location services |
| `calendar` | Calendar | 📅 | Date selection, events |
| `notification` | Bell | 🔔 | Alerts, notifications |

#### Content Type Icons (8)

| Icon Name | Lucide Icon | Emoji Replaced | Usage |
|-----------|-------------|----------------|-------|
| `stories` | BookOpen | 📖 | Stories content |
| `music` | Music | 🎵 | Music content |
| `educational` | GraduationCap | 📚 | Educational content |
| `cartoons` | Clapperboard | 🎬 (kids context) | Cartoons |
| `news` | Newspaper | 📰 | News content |
| `document` | FileText | 📄 | Documents |
| `folder` | Folder | 📁📂 | Folders, categories |
| `broadcast` | Radio | 📡 | Broadcasting, signals |

#### Action Icons (6)

| Icon Name | Lucide Icon | Emoji Replaced | Usage |
|-----------|-------------|----------------|-------|
| `trash` | Trash2 | 🗑️ | Delete action |
| `record` | Circle | 🎤⏹️ | Recording |
| `stop` | Square | ⏹️ | Stop action |
| `eye` | Eye | 👁️ | Visibility, views |
| `eyeOff` | EyeOff | 👁️‍🗨️🙈 | Hide, privacy |
| `upload` | Upload | 📤 | Upload action |

#### Status/Category Icons (6)

| Icon Name | Lucide Icon | Emoji Replaced | Usage |
|-----------|-------------|----------------|-------|
| `rainbow` | Sparkles | 🌈 | All categories (kids) |
| `baby` | Baby | 👶 | Kids section |
| `users` | Users | 👥 | Groups, people |
| `target` | Target | 🎯 | Goals, targeting |
| `flame` | Flame | 🔥 | Trending, hot |
| `gem` | Gem | 💎 | Premium content |

### 1.2 Icon Registry Update File

**File:** `packages/ui/shared-icons/src/registry/iconRegistry.ts`

```typescript
// Add to ICON_REGISTRY object:

// Navigation/UI
logout: { name: 'logout', icon: LogOut, category: 'actions', defaultColor: 'secondary' },
lock: { name: 'lock', icon: Lock, category: 'status', defaultColor: 'warning' },
unlock: { name: 'unlock', icon: Unlock, category: 'status', defaultColor: 'success' },
key: { name: 'key', icon: Key, category: 'status', defaultColor: 'gold' },
globe: { name: 'globe', icon: Globe, category: 'navigation', defaultColor: 'info' },
location: { name: 'location', icon: MapPin, category: 'navigation', defaultColor: 'error' },
calendar: { name: 'calendar', icon: Calendar, category: 'ui', defaultColor: 'primary' },
notification: { name: 'notification', icon: Bell, category: 'ui', defaultColor: 'warning' },

// Content Types
stories: { name: 'stories', icon: BookOpen, category: 'content', defaultColor: 'primary' },
music: { name: 'music', icon: Music, category: 'content', defaultColor: 'secondary' },
educational: { name: 'educational', icon: GraduationCap, category: 'content', defaultColor: 'info' },
cartoons: { name: 'cartoons', icon: Clapperboard, category: 'content', defaultColor: 'primary' },
news: { name: 'news', icon: Newspaper, category: 'content', defaultColor: 'secondary' },
document: { name: 'document', icon: FileText, category: 'library', defaultColor: 'secondary' },
folder: { name: 'folder', icon: Folder, category: 'library', defaultColor: 'primary' },
broadcast: { name: 'broadcast', icon: Radio, category: 'content', defaultColor: 'error' },

// Actions
trash: { name: 'trash', icon: Trash2, category: 'actions', defaultColor: 'error' },
record: { name: 'record', icon: Circle, category: 'actions', defaultColor: 'error' },
stop: { name: 'stop', icon: Square, category: 'actions', defaultColor: 'secondary' },
eye: { name: 'eye', icon: Eye, category: 'actions', defaultColor: 'secondary' },
eyeOff: { name: 'eyeOff', icon: EyeOff, category: 'actions', defaultColor: 'secondary' },
upload: { name: 'upload', icon: Upload, category: 'actions', defaultColor: 'info' },

// Status/Category
rainbow: { name: 'rainbow', icon: Sparkles, category: 'content', defaultColor: 'gold' },
baby: { name: 'baby', icon: Baby, category: 'content', defaultColor: 'primary' },
users: { name: 'users', icon: Users, category: 'navigation', defaultColor: 'secondary' },
target: { name: 'target', icon: Target, category: 'status', defaultColor: 'error' },
flame: { name: 'flame', icon: Flame, category: 'status', defaultColor: 'error' },
gem: { name: 'gem', icon: Gem, category: 'status', defaultColor: 'gold' },
```

---

## Phase 2: Shared Component Migration

**Priority:** HIGH
**Scope:** 15 files in shared components

### 2.1 Glass Components Package

| File | Emojis | Icons Needed | Priority |
|------|--------|--------------|----------|
| `GlassEmptyState.tsx` | 15 | search, vod, folder, lock, live, podcasts, broadcast, radio, audiobooks, location | HIGH |
| `GlassSectionItem.tsx` | 2 | eye, eyeOff | MEDIUM |
| `GlassLiveChannelCard.tsx` | 1 | live | MEDIUM |
| `GlassPosterCard.tsx` | 2 | live, vod | MEDIUM |
| `GlassCard.tsx` | 1 | vod | LOW |
| `GlassBreadcrumbs.tsx` | 1 | home | MEDIUM |
| `GlassLocationConsentModal.tsx` | 2 | location, lock | HIGH |
| `GlassToast/styles.ts` | 1 | error | LOW |

### 2.2 Shared UI Components

| File | Emojis | Icons Needed | Priority |
|------|--------|--------------|----------|
| `GlassSidebar.tsx` | 10 | home, live, vod, radio, podcasts, children, watchlist, profile, gem, audiobooks | CRITICAL |
| `AdminSidebar.tsx` | 12 | admin, users, target, settings, discover, watchlist, folder, notification, upload, document, home, logout | CRITICAL |
| `PermissionGate.tsx` | 1 | lock | HIGH |
| `DemoBanner.tsx` | 1 | vod (theater mask) | LOW |
| `TrendingRow.tsx` | 5 | lock, judaism, vod, flame, discover | HIGH |
| `GlassTopBar.tsx` | 1 | search | MEDIUM |
| `CultureSelector.tsx` | 3 | globe, calendar (candle), calendar (moon) | HIGH |

### 2.3 Admin Components

| File | Emojis | Icons Needed | Priority |
|------|--------|--------------|----------|
| `UploadProgress.tsx` | 3 | upload, error, folder | HIGH |
| `DataTable.tsx` | 1 | search | MEDIUM |
| `SupportTicketCard.tsx` | 2 | edit, folder | MEDIUM |

### 2.4 Chat Components

| File | Emojis | Icons Needed | Priority |
|------|--------|--------------|----------|
| `Chatbot.tsx` | 4 | trash, vod, record, stop | HIGH |

### 2.5 Passkey Components

| File | Emojis | Icons Needed | Priority |
|------|--------|--------------|----------|
| `PasskeyAuthModal.tsx` | 1 | lock | HIGH |
| `UnlockButton.tsx` | 3 | lock | HIGH |
| `PasskeyManager.tsx` | 2 | lock, key | HIGH |

---

## Phase 3: Web App Migration

**Priority:** HIGH
**Scope:** 20+ files

### 3.1 Player Components

| File | Emojis | Icons Needed | Priority |
|------|--------|--------------|----------|
| `SettingsPanel.tsx` | 2 | judaism (synagogue), globe | HIGH |
| `SubtitleControls.tsx` | 3 | globe, error | HIGH |
| `HebrewModePickerModal.tsx` | 3 | settings, stories, info | HIGH |
| `SubtitleErrorDisplay.tsx` | 2 | broadcast, settings | MEDIUM |
| `SubtitleLanguageList.tsx` | 5 | settings, stories, globe, error | HIGH |
| `VideoTopBar.tsx` | 1 | globe | MEDIUM |
| `PodcastLanguageSelector.tsx` | 1 | globe | MEDIUM |
| `DubbingOnboarding.tsx` | 2 | globe, settings | MEDIUM |
| `VideoPlayer.legacy.tsx` | 1 | globe | LOW |
| `VideoPlayerControlsOverlay.tsx` | 1 | globe | MEDIUM |
| `GlassLiveControlsPanel.tsx` | 1 | judaism | MEDIUM |

### 3.2 Content Components

| File | Emojis | Icons Needed | Priority |
|------|--------|--------------|----------|
| `ContentCard.tsx` | 1 | location | MEDIUM |

### 3.3 Admin Components (Web)

| File | Emojis | Icons Needed | Priority |
|------|--------|--------------|----------|
| `HierarchicalContentTable.tsx` | 1 | globe | MEDIUM |
| `TreeActions.tsx` | 1 | globe | MEDIUM |
| `getContentTableColumns.tsx` | 1 | globe | MEDIUM |
| `FreeContentImportWizard.legacy.tsx` | 4 | vod, live, radio, podcasts | LOW |
| `PermissionGate.tsx` | 1 | lock | HIGH |

---

## Phase 4: Mobile App Migration

**Priority:** HIGH
**Scope:** 10+ files

### 4.1 Screen Components

| File | Emojis | Icons Needed | Priority |
|------|--------|--------------|----------|
| `RadioScreenMobile.tsx` | 1 | radio | MEDIUM |
| `ChildrenScreenMobile.tsx` | 10 | rainbow, cartoons, educational, music, stories, clock, baby | CRITICAL |

### 4.2 UI Components

| File | Emojis | Icons Needed | Priority |
|------|--------|--------------|----------|
| `SubscriptionGateModal.tsx` | 4 | vod, live, broadcast, gem | HIGH |
| `SplashScreen.tsx` | 6 | vod (logging) | LOW (dev logging) |
| `CreditBalanceWidget.tsx` | 1 | warning | MEDIUM |
| `SwipeableCard.tsx` | 1 | trash | MEDIUM |

---

## Phase 5: TV App Migration

**Priority:** HIGH
**Scope:** 25+ files

### 5.1 Screen Components

| File | Emojis | Icons Needed | Priority |
|------|--------|--------------|----------|
| `LiveTVScreen.tsx` | 1 | live | MEDIUM |
| `FlowsScreen.tsx` | 2 | vod | MEDIUM |
| `NotFoundScreen.tsx` | 3 | search, home | HIGH |
| `YoungstersScreen.tsx` | 10 | target, flame, news, vod, educational, music, cartoons, vod, users | CRITICAL |
| `WatchlistScreen.tsx` | 4 | watchlist, vod, live | HIGH |
| `ChildrenScreen.tsx` | 8 | rainbow, cartoons, educational, music, stories, baby | CRITICAL |
| `RegisterScreen.tsx` | 4 | profile, eyeOff, eye, lock | HIGH |
| `AudiobooksScreenTVOS.tsx` | 3 | audiobooks | MEDIUM |
| `SearchScreen.tsx` | 4 | search, clock | HIGH |
| `FavoritesScreen.tsx` | 5 | vod, live, broadcast, podcasts, radio | HIGH |
| `DownloadsScreen.tsx` | 4 | vod, live, podcasts, trash | HIGH |
| `PodcastsScreen.tsx` | 4 | podcasts, audiobooks | MEDIUM |
| `VODScreen.tsx` | 3 | vod | MEDIUM |
| `RadioScreen.tsx` | 1 | radio | MEDIUM |

### 5.2 Profile Screens

| File | Emojis | Icons Needed | Priority |
|------|--------|--------------|----------|
| `ProfileScreen.tsx` | 1 | logout | HIGH |
| `BillingTab.tsx` | 2 | settings, document | MEDIUM |
| `SubscriptionTab.tsx` | 1 | live | MEDIUM |

### 5.3 Judaism Screens

| File | Emojis | Icons Needed | Priority |
|------|--------|--------------|----------|
| `JudaismScreen.tsx` | 2 | news, judaism | MEDIUM |
| `CalendarWidget.tsx` | 2 | calendar, stories | MEDIUM |
| `ShabbatEveBanner.tsx` | 4 | calendar, flame, calendar | HIGH |

### 5.4 TV Components

| File | Emojis | Icons Needed | Priority |
|------|--------|--------------|----------|
| `AudiobookCardTVOS.tsx` | 1 | audiobooks | MEDIUM |
| `CinematicHero.tsx` | 1 | vod | MEDIUM |
| `SubscriptionGateModal.tsx` | 2 | lock, gem | HIGH |
| `ChaptersOverlay.tsx` | 2 | document | MEDIUM |

### 5.5 tvOS App

| File | Emojis | Icons Needed | Priority |
|------|--------|--------------|----------|
| `ProfileFormScreen.tsx` | 10 | profile (avatar selection) | HIGH |
| `CreditBalanceWidget.tsx` | 1 | warning | MEDIUM |

---

## Phase 6: Backend Migration

**Priority:** MEDIUM
**Scope:** 15+ files (mostly API responses)

### 6.1 API Routes

| File | Emojis | Icons Needed | Priority |
|------|--------|--------------|----------|
| `profiles.py` | 5 | live, flame, judaism, discover, folder | HIGH |
| `search_suggestions.py` | 6 | vod, live, children, vod, vod, vod | HIGH |
| `trending.py` | 8 | news, lock, judaism, vod, vod, flame, vod, location | HIGH |
| `jerusalem.py` | 1 | judaism | MEDIUM |
| `podcasts.py` | 2 | radio (logging) | LOW |
| `websocket_dm.py` | 2 | (emoji reactions - KEEP) | EXEMPT |
| `support.py` | 1 | podcasts (logging) | LOW |
| `content/discovery.py` | 1 | radio (logging) | LOW |

### 6.2 Models

| File | Emojis | Icons Needed | Priority |
|------|--------|--------------|----------|
| `documentation.py` | 1 | document | LOW |
| `culture.py` | 3 | judaism, vod, vod | MEDIUM |

### 6.3 Scripts (Low Priority - Dev Tools)

| File | Emojis | Icons Needed | Priority |
|------|--------|--------------|----------|
| `migrate_channel_languages.py` | 6 | (logging only) | LOW |
| `audit/scheduler.py` | 1 | watchlist | LOW |

---

## Phase 7: Special Cases

### 7.1 Emoji Reactions (KEEP AS-IS)

**File:** `backend/app/api/routes/websocket_dm.py`

Emoji reactions in chat (👍, ❤️, etc.) are **exempt** from this migration as they represent user-generated emoji reactions, not UI icons.

### 7.2 Avatar Selection (NEEDS DESIGN DECISION)

**File:** `tvos-app/src/screens/ProfileFormScreen.tsx`

Current: Uses 10 emoji avatars (👤👨👩👶👦👧🧒👨‍💼👩‍💼🎭)

**Options:**
1. Create custom avatar icons in the icon package
2. Use existing profile icon + color variations
3. Create avatar image assets

**Recommendation:** Create dedicated avatar components with proper illustrations.

### 7.3 Cultural/Religious Icons

**Files:** Various Judaism screens and culture settings

| Emoji | Current Use | Proposed Solution |
|-------|-------------|-------------------|
| 🕍 | Yiddish language | Add `synagogue` icon or use `judaism` |
| 🕯️ | Shabbat candles | Add `candle` icon |
| 🌙 | Moon/night | Add `moon` icon |
| 🕎 | Menorah | Add `menorah` icon |
| 🍞 | Challah (text) | Keep as text/emoji in content strings |

---

## Implementation Order

### Week 1: Foundation

1. **Day 1-2:** Extend icon registry with 28 new icons
2. **Day 2-3:** Update icon exports and types
3. **Day 3-4:** Create migration utility functions
4. **Day 4-5:** Unit tests for new icons

### Week 2: Critical Components

1. **Day 1:** GlassSidebar.tsx (navigation)
2. **Day 2:** AdminSidebar.tsx (admin navigation)
3. **Day 3:** ChildrenScreenMobile.tsx, ChildrenScreen.tsx (kids)
4. **Day 4:** YoungstersScreen.tsx (youngsters)
5. **Day 5:** GlassEmptyState.tsx (empty states)

### Week 3: High Priority

1. **Day 1-2:** All passkey components
2. **Day 2-3:** All player subtitle components
3. **Day 3-4:** Subscription gate modals
4. **Day 4-5:** Search and profile screens

### Week 4: Medium Priority

1. **Day 1-2:** Remaining TV app screens
2. **Day 2-3:** Remaining web components
3. **Day 3-4:** Backend API responses
4. **Day 4-5:** Testing and validation

### Week 5: Cleanup

1. **Day 1-2:** Low priority files
2. **Day 2-3:** Legacy files cleanup
3. **Day 3-4:** Documentation updates
4. **Day 4-5:** Final review and signoff

---

## Migration Pattern

### Before (Emoji)

```tsx
// ❌ WRONG - Using emoji
const categories = [
  { id: 'all', label: 'All', icon: '🌈' },
  { id: 'movies', label: 'Movies', icon: '🎬' },
  { id: 'educational', label: 'Educational', icon: '📚' },
];

return (
  <View>
    <Text>{category.icon}</Text>
    <Text>{category.label}</Text>
  </View>
);
```

### After (Olorin Icons)

```tsx
// ✅ CORRECT - Using @olorin/shared-icons
import { NativeIcon } from '@olorin/shared-icons/native';

const categories = [
  { id: 'all', label: 'All', icon: 'rainbow' },
  { id: 'movies', label: 'Movies', icon: 'vod' },
  { id: 'educational', label: 'Educational', icon: 'educational' },
];

return (
  <View>
    <NativeIcon name={category.icon} size="md" />
    <Text>{category.label}</Text>
  </View>
);
```

### Web Pattern

```tsx
// ✅ CORRECT - Web platform
import { Icon } from '@olorin/shared-icons/web';

return (
  <div className="flex items-center gap-2">
    <Icon name="search" size="md" />
    <span>Search</span>
  </div>
);
```

### Backend Pattern

```python
# Before
category_icons = {
    "movies": "🎬",
    "live": "📺",
}

# After - Return icon names, not emojis
category_icons = {
    "movies": "vod",
    "live": "live",
}
# Frontend renders the actual icon
```

---

## Validation Checklist

After migration, verify:

- [ ] All 306+ emoji usages replaced (except flags and emoji reactions)
- [ ] Icon registry extended with 28 new icons
- [ ] All platforms tested (web, mobile, tvOS)
- [ ] No emoji characters in source files (except allowed)
- [ ] All imports use `@olorin/shared-icons`
- [ ] No hardcoded emoji strings in components
- [ ] Backend returns icon names, not emojis
- [ ] Glass styling applied to all icons
- [ ] Accessibility labels present
- [ ] Focus states working on TV

---

## File Count Summary

| Phase | Files | Priority |
|-------|-------|----------|
| Phase 1: Icon Registry | 3 | CRITICAL |
| Phase 2: Shared Components | 18 | HIGH |
| Phase 3: Web App | 17 | HIGH |
| Phase 4: Mobile App | 6 | HIGH |
| Phase 5: TV App | 25 | HIGH |
| Phase 6: Backend | 12 | MEDIUM |
| Phase 7: Special Cases | 3 | VARIES |
| **TOTAL** | **84** | - |

---

## Success Criteria

1. **Zero non-flag emojis** in production code
2. **100% icon coverage** from @olorin/shared-icons
3. **Consistent styling** via glass effects
4. **Cross-platform parity** (web, mobile, TV)
5. **No regression** in functionality
6. **Improved accessibility** via ARIA labels

---

## Appendix A: Complete Emoji to Icon Mapping

| Emoji | Icon Name | Category | Notes |
|-------|-----------|----------|-------|
| 🏠 | `home` | navigation | Existing |
| 📺 | `live` | content | Existing |
| 🎬 | `vod` | content | Existing |
| 📻 | `radio` | content | Existing |
| 🎙️ | `podcasts` | content | Existing |
| 🎧 | `audiobooks` | content | Existing |
| 👶 | `baby` | content | NEW |
| 📋 | `watchlist` | library | Existing |
| 👤 | `profile` | navigation | Existing |
| 💎 | `gem` | status | NEW |
| 🔍 | `search` | navigation | Existing |
| 🔒 | `lock` | status | NEW |
| 🔑 | `key` | status | NEW |
| 🌐 | `globe` | navigation | NEW |
| 🌍 | `globe` | navigation | NEW |
| 📍 | `location` | navigation | NEW |
| 🗑️ | `trash` | actions | NEW |
| 👁️ | `eye` | actions | NEW |
| 👁️‍🗨️ | `eyeOff` | actions | NEW |
| 🙈 | `eyeOff` | actions | NEW |
| 📤 | `upload` | actions | NEW |
| 🚪 | `logout` | actions | NEW |
| 🌈 | `rainbow` | content | NEW |
| 📚 | `educational` | content | NEW |
| 🎵 | `music` | content | NEW |
| 📖 | `stories` | content | NEW |
| 📰 | `news` | content | NEW |
| 🎯 | `target` | status | NEW |
| 🔥 | `flame` | status | NEW |
| 👥 | `users` | navigation | NEW |
| 📁 | `folder` | library | NEW |
| 📂 | `folder` | library | NEW |
| 📄 | `document` | library | NEW |
| 📅 | `calendar` | ui | NEW |
| 🔔 | `notification` | ui | NEW |
| 📡 | `broadcast` | content | NEW |
| ⏱️ | `clock` | status | Existing |
| 🕐 | `clock` | status | Existing |
| ⏹️ | `stop` | actions | NEW |
| 🎤 | `record` | actions | NEW |
| 🚫 | `error` | status | Existing |
| 💡 | `info` | status | Existing |
| 🔧 | `settings` | navigation | Existing |
| 📊 | `admin` | navigation | Existing |
| 💳 | `settings` | navigation | Map to settings/billing |
| 📈 | `discover` | navigation | Existing |
| 📦 | `folder` | library | Map to folder |
| 📣 | `notification` | ui | Map to notification |
| 📜 | `document` | library | Map to document |
| 🎭 | `vod` | content | Map to vod (theater) |
| 🏛️ | `judaism` | content | Existing |
| 🕍 | `judaism` | content | Map to judaism |
| 🕎 | `judaism` | content | Map to judaism |
| 🕯️ | `calendar` | ui | Map to calendar (candle) |
| 🌙 | `calendar` | ui | Map to calendar (moon) |
| 🔤 | `settings` | navigation | Map to settings (text) |
| 📑 | `document` | library | Map to document |
| 🎚️ | `settings` | navigation | Map to settings (audio) |
| 🎥 | `vod` | content | Map to vod |
| 📭 | `search` | navigation | Map to empty mailbox |
| 🐛 | `error` | status | Map to error (debug) |
| 🎨 | `settings` | navigation | Map to settings |
| 🚨 | `warning` | status | Existing |
| 🎁 | `gem` | status | Map to gem (gift) |

---

## Appendix B: Files Exempt from Migration

1. **Flag emojis** in `LanguageSelector.tsx` - Required for language identification
2. **Emoji reactions** in `websocket_dm.py` - User-generated content
3. **Development logging** in scripts - Not user-facing (low priority)

---

**Document Version:** 1.0
**Last Updated:** 2026-01-31
**Author:** Claude Code
**Approved By:** Pending multi-agent review
