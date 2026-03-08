# iPadOS Full Parity Plan

## Current State

13 iPad-specific files (~2,160 lines) covering core browsing/playback:

- App: IPadContentView, IPadMainView
- Navigation: IPadSidebarView
- Views: Home, LiveTV, Player, Podcasts, Profile, Search, Settings, VOD (+ VODCard), ZehAni

All ViewModels, Repositories, Models, Services are shared. Only UI layer differs.
Runtime routing: `ContentView.swift:37` checks `UIDevice.current.userInterfaceIdiom == .pad`.

## Architecture Approach

iPad views wrap existing iOS views with multi-column layouts, wider grids, and sidebar patterns.
The `RouteDestinationResolver` already handles all routes for pushed views - only **tab root views** need iPad wrappers.
Non-root views (detail screens pushed via navigation) already render fine on iPad through the resolver.

Key principle: **Only create iPad wrappers where the layout genuinely needs to differ** (multi-column, wider grids). Views that work well on iPad as-is should be used directly.

---

## Phase 1: Missing Sidebar Navigation Items (1 file, ~30 lines changed)

Add missing feature sections to `IPadSidebarView`:

### IPadSidebarView additions:

- Social section: Friends, Watch Party, Chess, Direct Messages
- Content section: Recordings, Playlists, Widgets
- Account section: Household, Rewards, Beta Credits, Family Controls, Support

These all navigate via `coordinator.navigate(to: .route)` and render through the existing `RouteDestinationResolver`.

---

## Phase 2: iPad-Optimized Tab Root Wrappers (6 new files)

These tab roots currently fall through to iOS views. Create iPad wrappers:

### 2a. IPadListenView.swift (~180 lines)

- Replaces `ListenView` for `.podcasts` tab on iPad
- 3-tab layout: Podcasts (3-col grid), Radio (2-col grid), Audiobooks (3-col grid)
- Reuses `PodcastShowCard`, `RadioView`, `AudiobooksView` components

### 2b. IPadFavoritesView.swift (~120 lines)

- Two-column layout: left = filter sidebar, right = favorites grid (4-col)
- Wraps existing `FavoritesView` content with wider grid

### 2c. IPadDownloadsView.swift (~100 lines)

- Two-column: left = download categories, right = download items grid
- Better use of horizontal space vs single-column iPhone layout

### 2d. IPadRecordingsView.swift (~100 lines)

- Grid layout (3-col) for recording cards
- Wraps `RecordingsView` data with grid presentation

### 2e. IPadPlaylistView.swift (~100 lines)

- Split view: left = playlist list, right = selected playlist items
- Master-detail pattern natural for iPad

### 2f. IPadWidgetsView.swift (~120 lines)

- Gallery grid (3-col) for widget cards
- Wider canvas for widget previews

---

## Phase 3: Social & Real-time iPad Wrappers (4 new files)

### 3a. IPadFriendsView.swift (~150 lines)

- Three-column: friend list | friend detail/activity | chat
- Leverages iPad width for communication hub

### 3b. IPadWatchPartyView.swift (~130 lines)

- Split: left = party list/create, right = active party with player embed
- Natural fit for iPad's screen real estate

### 3c. IPadDirectMessagesView.swift (~140 lines)

- Classic Messages.app pattern: conversations list (left) | chat (right)
- Wraps `DirectMessagesView` + `ConversationView`

### 3d. IPadChessView.swift (~120 lines)

- Board centered with chat panel on right side
- Wraps existing `ChessView` with better layout distribution

---

## Phase 4: Feature-Specific iPad Views (5 new files)

### 4a. IPadBYOCView.swift (~130 lines)

- Two-column: source list sidebar | content library grid (4-col)
- Wraps `BYOCSourceListView` + `BYOCDetailView`

### 4b. IPadFamilyControlsView.swift (~100 lines)

- Split: child profiles sidebar | settings detail for selected child
- Natural master-detail for family management

### 4c. IPadMissionsDashboardView.swift (~130 lines)

- Two-column: mission progress + daily missions (left) | leaderboard + rewards (right)
- Wraps existing missions views in wider layout

### 4d. IPadHouseholdView.swift (~100 lines)

- Split: member list (left) | member detail + invite (right)
- Master-detail for household management

### 4e. IPadSubscriptionView.swift (~120 lines)

- Full-width plan comparison cards (horizontal layout)
- Wider tier cards with feature comparison table

---

## Phase 5: iPad Platform Features (3 new files + modifications)

### 5a. IPadKeyboardShortcuts.swift (~80 lines)

ViewModifier adding keyboard shortcuts to IPadMainView:

- Cmd+1..7: Switch tabs
- Cmd+F: Focus search
- Cmd+,: Open settings
- Space: Play/pause media
- Cmd+L: Toggle sidebar
- Cmd+Shift+F: Fullscreen player

### 5b. IPadPointerModifier.swift (~60 lines)

ViewModifier for pointer/trackpad interaction:

- `.hoverEffect(.highlight)` on cards and buttons
- `.contentShape(.hoverEffect, ...)` for custom hover regions
- Applied to sidebar items, content cards, action buttons

### 5c. IPadSceneDelegate.swift (~100 lines)

Multi-window / Stage Manager support:

- `UIApplicationDelegateAdaptor` scene configuration
- Support opening player in separate window
- `handlesExternalEvents(matching:)` for content deep links
- Window restoration via `NSUserActivity`

### 5d. Drag & Drop Support (~40 lines across existing files)

- Add `.draggable(contentId)` to content cards
- Add `.dropDestination` to playlist and favorites views
- Enables drag content to playlist, drag to favorites

---

## Phase 6: Navigation Wiring (modifications to existing files)

### IPadMainView.swift changes:

- Update `tabRootView(for:)` to use new iPad views where created
- Add `.focusedSceneValue` for keyboard shortcut context

### IPadContentView.swift changes:

- Handle additional fullscreen routes (chess, watch party, etc.)
- Add multi-window scene support

### IPadSidebarView.swift changes:

- Add new navigation sections (Social, Content, Account)
- Add keyboard shortcut indicators next to sidebar items

---

## Phase 7: Integration & Testing

### Build verification:

```bash
cd ios-app && xcodegen generate && xcodebuild \
  -project BayitPlus.xcodeproj \
  -scheme BayitPlusApp \
  -destination 'platform=iOS Simulator,name=iPad Pro 13-inch (M4)' \
  -derivedDataPath /tmp/bayit-ipad-derived build
```

### Test on iPad simulator:

- Verify all sidebar navigation items work
- Test keyboard shortcuts
- Test pointer hover effects
- Verify Stage Manager multi-window (if simulator supports)
- Test drag and drop between views
- Verify all feature views render correctly in iPad layouts

---

## File Count Summary

| Phase        | New Files | Modified Files | Est. Lines |
| ------------ | --------- | -------------- | ---------- |
| 1. Sidebar   | 0         | 1              | ~60        |
| 2. Tab Roots | 6         | 0              | ~720       |
| 3. Social    | 4         | 0              | ~540       |
| 4. Features  | 5         | 0              | ~580       |
| 5. Platform  | 3         | 2              | ~320       |
| 6. Wiring    | 0         | 3              | ~80        |
| **Total**    | **18**    | **6**          | **~2,300** |

## Implementation Order

Phases 1-2 first (core navigation + tab roots) -> build & verify -> Phases 3-4 (features) -> build & verify -> Phases 5-6 (platform + wiring) -> final build & test

## Notes

- All files must stay under 200 lines per codebase rules
- Use `@bayit/glass` components exclusively
- No hardcoded values - use DesignTokens throughout
- Localization via `localization.t()` for all user-facing strings
- No emojis in code/comments/logs
