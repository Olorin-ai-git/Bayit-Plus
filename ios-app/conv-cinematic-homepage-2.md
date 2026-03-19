# Cinematic Homepage Continuation - Context Export

**Date:** 2026-03-16
**Branch:** feature/portal-monetization
**Context capacity:** ~6% remaining at export

## What Was Done This Session

### Continued from conv.txt (previous session)

The previous session designed and implemented the tvOS Cinematic Homepage. This session continued debugging and fixing issues.

### Key Issue: Home Tab Not Visible

The Home tab was not showing in the tvOS tab bar. Investigation revealed TWO causes:

1. **Tab overflow (pre-existing):** 10 tabs in tvOS TabView overflow the tab bar. Fixed by moving Home to first position in TVMainTabView.swift (was previously after Search).

2. **State restoration override:** `TVContentView.swift` line 168-178 has `lastVisitedRouteManager.restore()` that overrides `selectedTab` to whatever tab the user was last on (usually Search). Fixed by only restoring tab when there's an active deep link route -- without a route, the app lands on Home.

### Cinematic Homepage Confirmed Working

With debug indicators, confirmed the cinematic view renders correctly:

- Hero carousel shows "Back to the Future" with movie poster backdrop from API
- 5 cards in rotation (1 AI showcase + 4 culture)
- Dock visible at bottom
- Image assets (Masada, Jerusalem, TelAviv) load properly

### Files Modified This Session

**TVMainTabView.swift** - Home tab moved to first position (before Search)
**TVContentView.swift** - State restoration only restores tab+route when deep link route exists, otherwise stays on Home

### Files From Previous Session (conv.txt)

**Created:**

- `BayitPlusTVApp/Views/Home/TVCinematicHomeView.swift` - Cinematic layout with hero carousel + dock + Shabbat overlay
- `BayitPlusTVApp/Views/Home/TVHomeDock.swift` - Glass capsule dock matching TVQuickDockView style
- `docs/design/TVOS_CINEMATIC_HOMEPAGE.md` - Design document

**Modified:**

- `TVOnboardingPreferences.swift` - Added `homepageStyle` / `isCinematicHome` (default: "cinematic")
- `TVPreferencesView.swift` - Added Display category with Cinematic/Classic picker
- `TVHomeView.swift` - Branching between cinematic and classic views
- `BayitPlus.xcodeproj` - Added new files to tvOS target
- All 10 locale files - Added `settings.display.*` (6 keys) and `cinematic.*` (8 keys)

### Build Status

- Build: SUCCEEDS
- Last installed on Apple TV simulator: 9751674D-E696-47F1-B565-BD4C7D43E415
- Install command: `xcrun simctl install 9751674D-E696-47F1-B565-BD4C7D43E415 /tmp/bayit-tv-derived/Build/Products/Debug-appletvsimulator/BayitPlusTV.app`

### What Still Needs Testing

1. Rebuild with the tab fix (TVContentView change) and verify Home tab shows on launch
2. Verify cinematic homepage renders in full tab mode (not just forced Home-only mode)
3. Test settings toggle between Cinematic and Classic
4. Test hero carousel auto-rotation (8s interval)
5. Test dock navigation (Discover, Live TV, Listen buttons)

### Design Decisions (from conv.txt brainstorming)

- Two homepage modes: Cinematic (default) and Classic (settings toggle)
- Hero carousel: 1 AI showcase + 4 fixed culture cards (What's Hot, Jerusalem, Tel Aviv, Near Me) + dynamic, randomized after AI card
- Auto-rotation 8s with Siri Remote swipe override
- Bottom dock: 3 fixed (Discover, Live TV, Listen) + 0-3 conditional (Continue Watching, My Plex, My YouTube)
- Existing left sidebar with widgets stays unchanged
- Shabbat banner as thin overlay strip on hero

### Plan File

`/Users/olorin/.claude/plans/tvos-cinematic-homepage.md`
