# iPad App Parity Review vs iOS App

**Date:** 2026-02-18
**Scope:** Full feature-by-feature comparison

## Executive Summary

| Metric | iOS App | iPad App | Gap |
|--------|---------|----------|-----|
| Swift files | 526 | 11 | 515 missing |
| Total lines | 72,280 | 1,892 | 70,388 missing |
| View directories | 52 | 7 | 45 missing |
| Components | 20+ | 0 (inline) | All missing |
| Services | 7 | 0 | All missing |
| ViewModels | 9 (functional) | 9 (stubs in shared/) | All stub |
| Models | 8 (Codable) | 4 (no Codable) | 4 missing |

The iPad app is a **UI shell only** - 11 SwiftUI view files with zero functional backend.
Every view model method body is an empty comment. No networking, no Firebase, no persistence.

---

## SECTION 1: INFRASTRUCTURE GAPS (Critical - App Cannot Function)

### 1.1 No Networking Layer
- iOS has: `APIClient.swift` (URLSession-based, auth token injection, error handling)
- iPad has: Nothing. Zero HTTP capability.
- **Action:** iPad must use shared `BayitNetworking` package (APIClient, APIEndpoint, APIError)

### 1.2 No Authentication
- iOS has: `AuthService.swift` (Firebase Auth, token refresh, sign-in/up/out), `AuthViewModel.swift` (functional)
- iPad has: `AuthViewModel` in shared/ with empty method bodies, `LoginView` in shared/ with empty callbacks
- **Action:** iPad must use shared `BayitAuth` package (AuthService, KeychainManager)

### 1.3 No App Entry Point
- iOS has: `BayitPlusApp.swift` (@main App struct), `AppDelegate.swift` (Firebase config, push notifications)
- iPad has: No @main App struct. Cannot compile.
- **Action:** Create `BayitPlusIPadApp.swift` with proper app lifecycle

### 1.4 No Configuration
- iOS has: `AppConfig.swift` (environment-based URLs, API keys from config)
- iPad has: Nothing
- **Action:** Use shared `BayitConfig` package (AppConfig, Environment)

### 1.5 Models Not Codable
- iOS has: 8 model files with full Codable conformance for JSON parsing
- iPad shared models: `MediaItem`, `PodcastSeries`, `Subscription`, `UserProfile` - none are Codable
- **Action:** iPad must use `BayitModels` package which has proper Codable models

### 1.6 No Image Caching
- iOS has: `ImageCacheService.swift` (disk + memory cache), `CachedAsyncImage` component
- iPad has: Raw `AsyncImage` everywhere
- **Action:** Use `BayitUI` package's `MediaImage` component

### 1.7 No Structured Logging
- iOS has: References to `LoggingService.shared`
- iPad has: Nothing
- **Action:** Use shared `BayitCore` logging infrastructure

---

## SECTION 2: MISSING TABS / MAJOR FEATURES

### 2.1 Radio Tab - COMPLETELY MISSING
- iOS has: `RadioView.swift` (station grid with category filtering), `RadioPlayerView.swift` (full-screen player with artwork, now-playing, sleep timer), `RadioViewModel.swift`, `RadioService.swift`, `RadioStationCard.swift`
- iPad has: No radio view, no radio tab, no mention of radio
- **Action:** Create `IPadRadioView.swift` and `IPadRadioPlayerView.swift`

### 2.2 Audiobooks Tab - COMPLETELY MISSING
- iOS has: `AudiobooksView.swift` (featured + grid), `AudiobookDetailView.swift` (chapters, "Start Listening"), `AudiobooksViewModel.swift`, `AudiobookCard.swift`
- iPad has: No audiobook view, no audiobook tab
- **Action:** Create `IPadAudiobooksView.swift` and `IPadAudiobookDetailView.swift`

### 2.3 Auth Views - LOGIN ONLY, NO SIGNUP
- iOS has: `LoginView.swift` (email/password + social), `SignUpView.swift` (registration with validation)
- iPad has: Basic `LoginView` in shared/ (email/password + Google/Apple buttons, all stubs)
- **Action:** Create proper auth flow with SignUp

### 2.4 Onboarding - MISSING
- iOS has: `OnboardingView.swift` (first-run experience)
- iPad has: Nothing
- **Action:** Create `IPadOnboardingView.swift`

### 2.5 Content Detail Views - ALL MISSING
- iOS has: `VODDetailView.swift` (synopsis, cast, seasons, episodes, play button), `PodcastDetailView.swift` (metadata, episode list), `AudiobookDetailView.swift` (chapters), `ChannelDetailView.swift` (EPG schedule)
- iPad has: Tapping any content goes straight to player. No detail screen anywhere.
- **Action:** Create detail views for VOD, Podcasts, Channels, Audiobooks

### 2.6 Downloads / Offline - MISSING
- iOS has: `Downloads/` directory with download management
- iPad has: Settings mentions downloads but no download functionality
- **Action:** Create download management views

### 2.7 Subscription Management - MISSING
- iOS has: `Subscription/SubscriptionView.swift`, RevenueCat integration via `SubscriptionService`
- iPad has: Profile shows a static subscription badge, no management
- **Action:** Create subscription view with RevenueCat

---

## SECTION 3: MISSING FEATURE AREAS (iOS View Directories Not in iPad)

| # | iOS Feature Area | Files | iPad Status |
|---|-----------------|-------|-------------|
| 1 | Avatar | 3 | Missing |
| 2 | Beta (Beta 500 AI Credits) | 2 | Missing |
| 3 | Chat | 2 | Missing |
| 4 | Chess | 5 | Missing |
| 5 | Children | 2 | Missing |
| 6 | Content (generic detail) | 2 | Missing |
| 7 | Culture | 4 | Missing |
| 8 | Downloads | 1 | Missing |
| 9 | FamilyControls | 5 | Missing |
| 10 | Favorites | 1 | Missing |
| 11 | Flows | 1 | Missing |
| 12 | Friends | 2 | Missing |
| 13 | Glossary | 2 | Missing |
| 14 | GrandparentBridge | 2 | Missing |
| 15 | Help | 1 | Missing |
| 16 | Household | 1 | Missing |
| 17 | InteractiveMission | 8 | Missing |
| 18 | Judaism | 1 | Missing |
| 19 | Kids | 2 | Missing |
| 20 | Messages | 2 | Missing |
| 21 | Missions | 12 | Missing |
| 22 | MorningRitual | 1 | Missing |
| 23 | Onboarding | 1 | Missing |
| 24 | PhoneticMirror | 3 | Missing |
| 25 | Player/AICompanion | 4 | Missing |
| 26 | Player/Subtitles | 5 | Missing |
| 27 | Playlist | 1 | Missing |
| 28 | Recordings | 1 | Missing |
| 29 | Rewards | 1 | Missing |
| 30 | Shabbat | 1 | Missing |
| 31 | Social | 4 | Missing |
| 32 | StarStory | 7 | Missing |
| 33 | Subscription | 1 | Missing |
| 34 | Support | 1 | Missing |
| 35 | Trivia | 8 | Missing |
| 36 | Voice | 9 | Missing |
| 37 | WatchParty | 4 | Missing |
| 38 | Widgets | 9 | Missing |
| 39 | ZehAni | 18 | Missing |
| 40 | Radio | 1 | Missing |
| 41 | Audiobooks | 4 | Missing |
| 42 | Auth (SignUp) | 10 | Partial (LoginView only) |
| 43 | Shared (9 common views) | 9 | Missing |

**Total: 43 feature areas missing or partial**

---

## SECTION 4: COMPONENT GAPS

### iOS Components (BayitPlusApp/Components/) - ALL MISSING FROM iPAD

**Cards/ (7 components)**
| Component | Description | iPad Status |
|-----------|-------------|-------------|
| AudiobookCard | Cover art, title, author | Missing |
| ChannelCard | Logo, name, LIVE indicator, glass BG | Inline in IPadLiveTVView (partial) |
| ContentCard | Generic content thumbnail card | Inline in IPadHomeView (partial) |
| EpisodeRow | Episode number, title, duration, download icon | Inline in IPadPodcastsView (partial) |
| PodcastCard | Dual-layout (standard/compact) | Missing |
| RadioStationCard | Logo, name, frequency, current show | Missing |
| VODCard | Dual-mode (featured/standard) | Inline in IPadVODView (partial) |

**Common/ (6 components)**
| Component | Description | iPad Status |
|-----------|-------------|-------------|
| CachedAsyncImage | Disk+memory cached image loader | Missing (uses raw AsyncImage) |
| ErrorView | Error state with retry button | Missing |
| GlassBackground | Glass morphism view modifier | Missing |
| GlassButton | Themed button (gold selected/glass unselected) | Missing |
| LoadingView | Full-screen loading overlay | Missing |
| SearchBar | Custom search input with clear button | Inline in IPadSearchView (partial) |

**Player/ (5 components)**
| Component | Description | iPad Status |
|-----------|-------------|-------------|
| MiniPlayerView | Compact bar above tab bar | Missing |
| NowPlayingBar | Thin progress indicator | Missing |
| PlayerControlsView | Reusable transport controls | Inline in IPadPlayerView |
| SleepTimerButton | Moon icon toggle | Missing |
| SleepTimerPickerView | Duration selection list | Missing |

**Rows/ (2 components)**
| Component | Description | iPad Status |
|-----------|-------------|-------------|
| ContentRow | Titled horizontal scroll row | Inline in IPadHomeView |
| FeaturedContentRow | Paging carousel | Missing |

---

## SECTION 5: SERVICE LAYER GAPS

### iOS Services (BayitPlusApp/Services/) - ALL MISSING FROM iPAD

| Service | What It Does | iPad Status |
|---------|-------------|-------------|
| APIClient | URLSession HTTP client, auth headers, error handling | Missing |
| AuthService | Firebase Auth, token management, sign-in/up/out | Missing |
| AudioPlayerService | AVPlayer management, Combine bindings, background audio | Missing (basic AVPlayer in PlayerVM) |
| ChannelService | Fetch channels, EPG, stream URLs | Missing |
| VODService | Fetch VOD catalog, search, categories | Missing |
| RadioService | Fetch stations, now-playing, categories | Missing |
| SleepTimerService | Timer management with notifications | Missing |
| ImageCacheService | Disk + memory image caching | Missing |

### Shared Packages Available (Packages/BayitCore/) - NOT USED BY iPAD

| Package | Contents | Used by iPad? |
|---------|----------|---------------|
| BayitNetworking | APIClient, APIEndpoint, APIError, PaginatedResponse | NO |
| BayitAuth | AuthService, KeychainManager, AuthState | NO |
| BayitModels | Channel, VODContent, RadioStation, Podcast, Audiobook, etc. | NO |
| BayitConfig | AppConfig, Environment | NO |
| BayitAnalytics | AnalyticsService, FirebaseAnalyticsProvider, AnalyticsEvent | NO |
| BayitServices | ChannelService, ContentService, EPGService, RadioService, PodcastService, AudiobookService, SubscriptionService | NO |
| BayitPlayer | PlayerService, SleepTimer, PlayerState, PlayerError | NO |
| BayitUI | GlassBackground, GlassButton, GlassCard, GlassColors, GlassTextField, ChannelCard, ContentCard, ContentRow, LoadingView, MediaImage, PlayerControls, BayitTheme, Typography | NO |

---

## SECTION 6: VIEW-BY-VIEW PARITY COMPARISON

### 6.1 Home View
| Feature | iOS | iPad | Gap |
|---------|-----|------|-----|
| Featured carousel (paging TabView) | Yes | Basic hero banner | No carousel |
| Continue Watching row | Yes | Row exists but empty VM | VM stub |
| Live TV row | Yes | Row exists but empty VM | VM stub |
| Trending row | Yes | Row exists but empty VM | VM stub |
| Popular Podcasts row | Yes | Missing | Not present |
| Pull-to-refresh | Yes | Yes | OK |
| Settings gear in toolbar | Yes | No | Missing |
| Sheet navigation to detail views | Yes | No detail views | Missing |
| Loading overlay | Yes | No | Missing |
| Error state | Yes | No | Missing |
| Concurrent API loading (5 calls) | Yes | No API calls | Missing |

### 6.2 Live TV View
| Feature | iOS | iPad | Gap |
|---------|-----|------|-----|
| Category filter bar | Yes | Yes | OK (layout differs) |
| Channel grid | 2-col LazyVGrid | Adaptive grid | OK |
| Channel card: logo | Yes | AsyncImage thumbnail | Different layout |
| Channel card: LIVE indicator | Pulsing dot + "LIVE" | Red dot + "LIVE" | Minor diff |
| Channel card: current program | Yes | Optional subtitle | Less info |
| Channel card: dubbing badge | Yes | No | Missing |
| Channel detail view (EPG) | Yes (ChannelDetailView) | No | Missing |
| Glass background on cards | Yes | Drop shadow instead | Style gap |
| Tap to play | Yes (via PlayerVM) | Yes (callback) | Different mechanism |

### 6.3 VOD View
| Feature | iOS | iPad | Gap |
|---------|-----|------|-----|
| Category filter | Yes | Yes | OK |
| Featured carousel | Yes (paging TabView) | No | Missing |
| Grid layout | 3-col | Adaptive (200-280) | OK |
| VOD card: poster image | Yes | Yes | OK |
| VOD card: title, year | Yes | Yes | OK |
| VOD card: rating (stars) | Yes | Yes | OK |
| VOD card: "Dubbed" badge | Yes | No | Missing |
| Sort options | No (categories only) | Yes (4 options) | iPad has MORE |
| List view toggle | No | Yes (grid/list) | iPad has MORE |
| Infinite scroll pagination | Yes | No | Missing |
| VOD detail view | Yes (full: synopsis, seasons, episodes, cast) | No (straight to player) | Missing |
| Loading overlay | Yes | No | Missing |

### 6.4 Podcasts View
| Feature | iOS | iPad | Gap |
|---------|-----|------|-----|
| Featured section | Yes (horizontal scroll) | No | Missing |
| All podcasts | Yes (vertical list, compact cards) | Yes (list with search) | Different layout |
| Search/filter | No (.searchable modifier) | Yes (.searchable) | iPad has MORE |
| Podcast card (standard) | 150x150 cover, title, author | 60x60 row layout | Different |
| Podcast card (compact) | Row with episode count, chevron | N/A | Missing |
| Podcast detail view | Yes (cover, metadata, episode list, glass cards) | Inline split-view detail | Simplified |
| Episode row: download indicator | Yes | No | Missing |
| Episode row: glass background | Yes | No | Missing |
| Sleep timer in detail | Referenced | No | Missing |

### 6.5 Search View
| Feature | iOS | iPad | Gap |
|---------|-----|------|-----|
| Search bar | Custom SearchBar component | Custom inline TextField | Different |
| Debounced search (300ms) | Yes | No (submit-on-return only) | Missing |
| Recent searches | Yes (UserDefaults, max 10) | No | Missing |
| Clear recent searches | Yes | No | Missing |
| Search results: thumbnail | 60x60 | Adaptive grid cards | Different layout |
| Search results: content type badge | Yes | No | Missing |
| Search results: navigation to detail | Yes (tab-based) | Yes (onPlayMedia) | Different |
| Browse categories (empty state) | No | Yes | iPad has MORE |
| Loading state | Yes (LoadingView) | Yes (ProgressView) | OK |
| No results state | Yes (custom) | Yes (ContentUnavailableView) | OK |
| Voice search | No | No | Both missing |

### 6.6 Profile View
| Feature | iOS | iPad | Gap |
|---------|-----|------|-----|
| User avatar | Photo or person icon | AsyncImage or person icon | OK |
| Display name + email | Yes | Yes | OK |
| Subscription info | Plan tier + Beta 500 status | Plan name badge | Less info |
| Preferences section | Language, dubbing, video quality | No | Missing |
| Stats (watch time, shows, favorites) | No | Yes | iPad has MORE |
| Favorites row | No | Yes (horizontal scroll) | iPad has MORE |
| Watch history row | No | Yes (horizontal scroll) | iPad has MORE |
| Settings button | Yes (opens sheet) | No | Missing |
| Sign out | Yes (GlassButton) | Yes (red button) | OK |
| Profile editing | No | No | Both missing |
| Beta 500 indicator | Yes | No | Missing |

### 6.7 Settings View
| Feature | iOS | iPad | Gap |
|---------|-----|------|-----|
| Video quality picker | Yes | Yes | OK |
| Audio quality picker | Yes | No | Missing |
| Auto-play toggle | Yes | Yes | OK |
| Dubbing preference | Yes | No | Missing |
| Subtitles toggle + language | Yes | Yes (toggle + language) | OK |
| Download settings | No | Yes (quality, wifi-only, storage, clear) | iPad has MORE |
| Notification toggles | No | Yes (3 toggles) | iPad has MORE |
| Theme picker | No | Yes (system/light/dark) | iPad has MORE |
| About section (version, build) | Yes | Yes (version only) | Minor gap |
| Privacy Policy link | No | Yes | iPad has MORE |
| Terms of Service link | No | Yes | iPad has MORE |
| Contact Support | No | Yes | iPad has MORE |
| Clear Image Cache | Yes | No | Missing |
| Done button to dismiss | Yes | No | Missing |

### 6.8 Player View
| Feature | iOS | iPad | Gap |
|---------|-----|------|-----|
| Full-screen player | Yes (FullScreenPlayerView) | Yes (IPadPlayerView) | Different impl |
| Mini player bar | Yes (MiniPlayerView) | No | Missing |
| Play/pause/seek | Yes | Yes | OK |
| Skip forward/backward (15s) | Yes | Yes | OK |
| Progress scrubber | Slider (native) | Custom GeometryReader drag | Different |
| Sleep timer button | Yes (SleepTimerButton) | No | Missing |
| Sleep timer picker | Yes (SleepTimerPickerView) | No | Missing |
| Sleep timer countdown | Yes | No | Missing |
| PiP button | No | Yes (stub) | iPad UI exists, no impl |
| Subtitles toggle | Implied via settings | Yes (stub) | iPad UI exists, no impl |
| Audio track picker | No | Yes (stub) | iPad UI exists, no impl |
| Quality selector | No | Yes (stub) | iPad UI exists, no impl |
| Fullscreen toggle | No | Yes (stub) | iPad UI exists, no impl |
| Artwork display | Yes (300x300) | No (video only) | Missing for audio |
| Content type label | Yes | No | Missing |
| Auto-hide controls (5s) | No | Yes | iPad has MORE |
| AirPlay | No | No | Both missing |

---

## SECTION 7: SHARED PACKAGES THE iPAD SHOULD USE

The iOS project has a mature set of Swift packages under `Packages/BayitCore/` and `Packages/BayitUI/`:

### BayitCore (Sources/)
- **BayitNetworking**: APIClient, APIEndpoint (all route definitions), APIError, PaginatedResponse
- **BayitAuth**: AuthService (Firebase), KeychainManager, AuthState
- **BayitModels**: Channel, ChannelGroup, VODContent, RadioStation, RadioGenre, Podcast, PodcastEpisode, Audiobook, AudiobookChapter, EPGSchedule, EPGProgram, ContentRow, Subscription, SubscriptionPlan, UserProfile, ContentType, PaginatedResponse
- **BayitConfig**: AppConfig (environment URLs, API keys, RevenueCat key), Environment enum
- **BayitAnalytics**: AnalyticsService, AnalyticsEvent (30+ events), FirebaseAnalyticsProvider, AnalyticsProvider protocol
- **BayitServices**: ChannelService, ContentService, EPGService, RadioService, PodcastService, AudiobookService, SubscriptionService (RevenueCat)
- **BayitPlayer**: PlayerService (AVPlayer, sleep timer, analytics), SleepTimer, PlayerState, PlayerError

### BayitUI (Sources/)
- **BayitGlass**: GlassBackground, GlassButton, GlassCard, GlassColors, GlassTextField
- **BayitUI/Components**: ChannelCard, ContentCard, ContentRow, LoadingView, MediaImage, PlayerControls
- **BayitUI/Modifiers**: GlassModifiers
- **BayitUI/Theme**: BayitTheme, Typography

The iPad app uses NONE of these packages. Instead it has its own stub models in `shared/Models/` and stub view models in `shared/ViewModels/`.

---

## SECTION 8: iPAD-SPECIFIC FEATURES TO ADD

Beyond parity, the iPad app should leverage iPad-specific capabilities:

| Feature | Priority | Description |
|---------|----------|-------------|
| Keyboard shortcuts | High | Spacebar play/pause, arrow key navigation, Cmd+F search |
| Pointer/trackpad hover effects | High | `.hoverEffect()` on all interactive elements |
| Split View / Slide Over | Medium | Proper multitasking support |
| Stage Manager | Medium | Resizable window support |
| Drag and Drop | Low | Drag content to playlists |
| Apple Pencil | Low | Note-taking during educational content |

---

## SECTION 9: DESIGN SYSTEM VIOLATIONS

The iPad app does NOT use the Bayit+ design system:

| Element | iOS (Correct) | iPad (Wrong) |
|---------|--------------|-------------|
| Backgrounds | `.glassBackground()` modifier | System colors, drop shadows |
| Buttons | `GlassButton` (gold/glass) | Native SwiftUI `Button` |
| Cards | Glass cards with translucent BG | Opaque system background |
| Colors | `Color.bayitGold`, `Color.bayitBackground` | `.accentColor`, system defaults |
| Images | `CachedAsyncImage` with cache | Raw `AsyncImage` (no cache) |
| Loading | Gold `LoadingView` overlay | Inline `ProgressView` |
| Errors | `ErrorView` with retry | No error states |
| Typography | `BayitTheme` / `Typography` | Default system fonts |

---

## SECTION 10: PRIORITY IMPLEMENTATION ORDER

### Phase 1: Foundation (Make it compile and run)
1. Wire up `BayitCore` and `BayitUI` packages as dependencies
2. Create `BayitPlusIPadApp.swift` (@main entry point with Firebase setup)
3. Replace stub models/ViewModels with shared package types
4. Replace `IPadContentView` to use `BayitAuth.AuthService`
5. Apply `BayitGlass` design system to all existing views
6. Replace `AsyncImage` with `MediaImage` (cached)

### Phase 2: Core Streaming Features (Make it functional)
7. Wire `IPadHomeView` to `ContentService` + `ChannelService`
8. Wire `IPadLiveTVView` to `ChannelService` + `EPGService`
9. Wire `IPadVODView` to `ContentService`
10. Wire `IPadPodcastsView` to `PodcastService`
11. Wire `IPadSearchView` to `ContentService.search()`
12. Wire `IPadPlayerView` to `PlayerService` (replace basic AVPlayer)
13. Wire `IPadProfileView` to real user data
14. Wire `IPadSettingsView` to persisted preferences

### Phase 3: Missing Tabs
15. Create `IPadRadioView` + `IPadRadioPlayerView` using `RadioService`
16. Create `IPadAudiobooksView` + `IPadAudiobookDetailView` using `AudiobookService`
17. Add Radio and Audiobooks tabs to `IPadSidebarView` and `IPadMainView`

### Phase 4: Content Detail Views
18. Create `IPadVODDetailView` (synopsis, seasons, episodes)
19. Create `IPadChannelDetailView` (EPG schedule)
20. Create `IPadPodcastDetailView` (metadata, episodes)
21. Create `IPadAudiobookDetailView` (chapters)

### Phase 5: Player Enhancements
22. Add `MiniPlayerView` for iPad (persistent bar)
23. Add sleep timer (SleepTimerButton + SleepTimerPickerView)
24. Implement PiP support
25. Implement subtitle rendering
26. Add AirPlay route picker

### Phase 6: Auth & Onboarding
27. Create proper auth flow (LoginView + SignUpView using BayitAuth)
28. Create `IPadOnboardingView`
29. Add social sign-in (Google, Apple)

### Phase 7: Engagement Features
30. Trivia (8 views)
31. ZehAni (18 views)
32. Missions + InteractiveMission (20 views)
33. Chess (5 views)
34. Voice features (9 views)
35. StarStory (7 views)
36. Social features (4 views)
37. WatchParty (4 views)
38. Chat (2 views)
39. Friends (2 views)
40. Messages (2 views)

### Phase 8: Family & Community
41. FamilyControls (5 views)
42. Children mode (2 views)
43. Kids mode (2 views)
44. GrandparentBridge (2 views)
45. Household management (1 view)

### Phase 9: Cultural & Educational
46. Culture section (4 views)
47. Judaism section (1 view)
48. Glossary (2 views)
49. PhoneticMirror (3 views)
50. MorningRitual (1 view)
51. Shabbat mode (1 view)

### Phase 10: Utility & Polish
52. Downloads management
53. Favorites management
54. Playlists
55. Recordings
56. Rewards system
57. Beta 500 views
58. Subscription management
59. Help / Support
60. Avatar system
61. Widgets
62. Keyboard shortcuts
63. Pointer/trackpad hover effects
64. Analytics integration
65. Push notification handling

---

## TOTAL ESTIMATED SCOPE

- **~515 new Swift files** needed for full parity
- **~70,000 lines** of new code
- Many files can directly reuse shared packages + adapt iOS views for iPad layout
- iPad-specific adaptations: NavigationSplitView, larger grids, sidebar navigation, keyboard/pointer support
