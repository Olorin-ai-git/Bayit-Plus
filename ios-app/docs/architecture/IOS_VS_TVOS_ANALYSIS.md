# Bayit+ iOS App vs tvOS App: Comprehensive Analysis

**Date:** 2026-02-15
**Scope:** Full codebase comparison of BayitPlusApp (iOS) and BayitPlusTVApp (tvOS)

---

## 1. Scale Overview

| Metric | iOS App (BayitPlusApp) | tvOS App (BayitPlusTVApp) |
|--------|----------------------|--------------------------|
| **Total Swift lines** | 64,131 | 29,000 |
| **View files** | 243 | 156 |
| **ViewModels** | 80 (all in BayitPlusApp/) | 3 tvOS-specific + 77 shared from iOS |
| **Top-level directories** | 11 (App, AppIntents, Docs, Helpers, Models, Navigation, Repositories, Services, ViewModels, Views, Resources) | 7 (App, Navigation, Services, ViewModels, Views, Assets, Resources) |
| **Shared packages** | 12 SPM packages | Same 12 packages |

---

## 2. Architecture Pattern

Both apps follow **MVVM with Dependency Injection**.

### iOS App

- `BayitPlusApp.swift` -- App entry point, composition root
- `AppConfiguration`, `AppAuthConfiguration`, `AppNetworkConfiguration` -- iOS-specific config
- `RepositoryProvider` -- dependency container
- `@Observable` ViewModels (iOS 17+)
- `NavigationStack` with `TabView` (bottom tab bar via `GlassTabBar`)

### tvOS App

- `BayitPlusTVApp.swift` -- App entry point, composition root (mirrors iOS)
- `TVAppAuthConfiguration`, `TVAppNetworkConfiguration`, `TVAppAPILogger` -- tvOS-specific config
- `TVRepositoryProvider` -- tvOS dependency container
- `TVNavigationCoordinator` -- centralized focus-aware navigation
- `TVMainTabView` -- top-level TabView (tvOS sidebar style)
- `TVContentView` / `TVAuthView` -- root view switching

### Key Architectural Difference

iOS uses decentralized navigation (each view manages its own `NavigationStack`). tvOS uses a centralized `TVNavigationCoordinator` that manages navigation state and player presentation, which is critical for the focus engine.

---

## 3. Code Sharing Strategy

### What tvOS REUSES from iOS (~70-80% of business logic)

| Layer | Sharing Method |
|-------|---------------|
| **Models** | tvOS target includes `BayitPlusApp/Models/` directly via `project.yml` |
| **Repositories** | tvOS target includes `BayitPlusApp/Repositories/` directly |
| **ViewModels** | 77 of 80 ViewModels are shared (tvOS has only 3 unique: `TVAvatarViewModel`, `TVChatbotViewModel`, `TVQRAuthViewModel`) |
| **Helpers/Services** | Selectively shared individual files |
| **12 SPM Packages** | Fully shared (BayitCore, BayitNetworking, BayitAuth, BayitLocalization, BayitDesignSystem, BayitMedia, BayitVoice, BayitPersistence, BayitAnalytics, BayitWidgetShared, BayitNotifications, BayitCast) |

### What tvOS has UNIQUE

| Component | Count | Purpose |
|-----------|-------|---------|
| `App/` files | 11 | App entry, config, coordinator, tab view |
| `Navigation/` | 3 | TVRoute, TVDeepLinkRouter, TVContentTypeMapper |
| `Services/` | 1 | TopShelfDataProvider |
| `ViewModels/` | 3 | TVAvatarViewModel, TVChatbotViewModel, TVQRAuthViewModel |
| `Views/` | 156 | All UI re-implemented for 10-foot experience |

### Platform Compilation Guards

Code uses `#if os(iOS)` and `#if os(tvOS)` extensively:

- `MediaPlayerViewModel.swift` has separate `init()` for each platform (iOS includes `WidgetBridge`)
- `BayitVoice` package: iOS uses `SFSpeechRecognizer`, tvOS uses `TVAudioRecordingService` (Siri Remote mic)
- `BayitDesignSystem`: `TVDesignTokens` and `TVFocusModifier` are tvOS-only
- `BayitAuth`: Apple Sign-In, Google Sign-In, Passkey helpers are iOS-only

---

## 4. Feature-by-Feature Comparison

### Screens Present in BOTH Platforms

| Feature Area | iOS Views | tvOS Views | Notes |
|-------------|-----------|------------|-------|
| **Home** | HomeView + sections | TVHomeView + TVHeroItem, TVHomeSectionConfig, TVCityContentRow, TVLocationContentRow, TVTrendingRow | tvOS has hero carousel (GlassHeroCarousel), iOS has scroll-based hero |
| **Live TV** | LiveTVView, EPGView | TVLiveTVView, TVEPGView | Both have EPG (Electronic Program Guide) |
| **VOD** | VODView, MovieDetailView, SeriesDetailView | TVVODView, TVMovieDetailView, TVSeriesDetailView | Full parity |
| **Radio** | RadioView + cards | TVRadioView (4-column grid) | tvOS uses LazyVGrid with focus |
| **Podcasts** | PodcastsView, PodcastDetailView, AddPodcastView | TVPodcastsView, TVPodcastDetailView, TVAddPodcastView | Full parity |
| **Audiobooks** | AudiobooksView, AudiobookDetailView, AudiobookFilterView, AudiobookCardView | TVAudiobooksView, TVAudiobookDetailView | iOS has filter + card views |
| **Player** | PlayerView + 51 sub-views | TVPlayerView + 35 sub-views + TVPlayerControlBar | See detailed player comparison below |
| **Search** | SearchView | TVSearchView + TVSearchFilterPillsView, TVSearchSuggestionsView | tvOS has dedicated filter pills |
| **LLM Search** | LLMSearchView | TVLLMSearchView, TVLLMSearchInterpretationView, TVLLMSearchResultsView | tvOS splits into 3 views |
| **Auth** | LoginView, RegisterView, AuthFlowView, ProfileSelectionView, BiometricPromptView, AddProfileSheetView, AuthComponents | TVSignInView, TVQRCodePanel, TVCredentialPanel | tvOS uses QR code pairing instead of full auth UI |
| **Profile** | ProfileView | TVProfileView, TVProfileSelectionView, TVEditProfileView, TVPreferencesView, TVViewingHistoryView, TVAccountSettingsView, TVAvatarPickerView | tvOS has more granular profile sub-views |
| **Settings** | SettingsView (single view with sections) | TVSettingsView + 9 sub-views (Language, Subscription, Billing, Notification, Security, Passkey, DevicePairing, Trivia, FamilyControls) | tvOS decomposes settings into separate navigable views |
| **Trivia** | TriviaView + components | TVTriviaView | Both reuse `TriviaViewModel` |
| **Watch Party** | WatchPartyView | TVWatchPartyView + TVCreatePartySheet, TVJoinPartySheet | Full parity |
| **Culture** | CultureView | TVCultureView | Full parity |
| **Judaism** | JudaismView | TVJudaismView | Full parity |
| **Shabbat** | ShabbatView | TVShabbatBannerView, TVZmanimView | tvOS splits into banner + times |
| **Children** | ChildrenView | TVChildrenView | Full parity |
| **Kids** | KidsHubView | TVKidsHubView | Full parity |
| **Favorites** | FavoritesView | TVFavoritesView | Full parity |
| **Recordings** | RecordingsView | TVRecordingsView | Full parity |
| **Rewards** | RewardsView | TVRewardsView | Full parity |
| **Beta Credits** | BetaCreditsView | TVBetaCreditsView | Full parity |
| **Voice** | VoiceAssistantView + subviews | TVVoiceAssistantSheet, TVVoiceOnboardingView, TVVoiceOnboardingSteps, TVWakeWordSettingsView, TVProactiveSuggestionBannerView | tvOS has proactive suggestion banner |
| **Chat** | ChatbotView | TVChatbotView, TVChatMessageBubble | tvOS has dedicated message bubble |
| **Chess** | ChessView | TVChessView, TVChessBoardView, TVChessControlsView, TVChessMoveHistoryView, TVChessPieceView | tvOS decomposes chess into 5 views |
| **Avatar/ZehAni** | AvatarModeView, AvatarPreferencesView, ZehAniHubView | TVAvatarModeView, TVAvatarPreferencesView, TVVoiceAvatarFAB, TVZehAniHubView, TVAvatar3DPreviewView, TVLiveAvatarOverlayView, TVMagicMirrorView, TVMagicMirrorSubviews | tvOS has expanded 3D avatar features |
| **Missions** | MissionsView | TVMissionsDashboardView, TVMissionLevelCardView, TVMissionPerksView | tvOS decomposes missions UI |
| **Daily Missions** | (in MissionsView) | TVDailyMissionsView | tvOS has dedicated daily view |
| **Friends** | FriendsView | TVFriendsView | Full parity |
| **Social/DMs** | DirectMessagesView | TVDirectMessagesView, TVConversationView + TVMessageBubble, TVMessageInputBar, TVOnlineStatusBadge, TVUserAvatarRow, TVFriendSearchResultsSection | tvOS has 6 social sub-views |
| **Widgets** | WidgetsView | TVWidgetsView, TVCreateWidgetView, TVWidgetContainerView, TVWidgetDockView, TVWidgetSidebarView, TVYnetMivzakimContentView | tvOS has rich widget dock system |
| **Glossary** | GlossaryView | TVGlossaryView | Full parity |
| **Flows** | FlowsView | TVFlowsView | Full parity |
| **Household** | HouseholdView | TVHouseholdView | Full parity |
| **Morning Ritual** | MorningRitualView | TVMorningRitualView | Full parity |
| **Star Story** | StarStoryView | TVStarStoryGalleryView, TVStarStoryPlayerView | tvOS splits into gallery + player |
| **Youngsters** | YoungstersView | TVYoungstersView | Full parity |
| **Leaderboard** | LeaderboardView | TVLeaderboardView | Full parity |
| **Collections** | CollectionDetailView | TVCollectionDetailView, TVCollectionPromoBannerView | tvOS adds promo banner |
| **GrandparentBridge** | GrandparentBridgeView | TVNewsClipView | Different approach per platform |
| **PhoneticMirror** | PhoneticMirrorView | TVPhoneticMirrorView, TVSpeechRecognitionEngine | tvOS adds speech engine |
| **InteractiveMission** | InteractiveMissionView | TVInteractiveMissionPlayerView | Full parity |
| **Device Pairing** | DevicePairingView | TVDevicePairingView, TVDeviceCodeView | tvOS adds device code view |
| **Zine Reader** | (not present) | TVZineReaderView | tvOS-only feature |

### iOS-ONLY Features (not on tvOS)

| Feature | iOS Files | Reason |
|---------|-----------|--------|
| **Onboarding** | OnboardingView, OnboardingAIView, WelcomeView | Phone-first experience, tvOS uses QR pairing |
| **Downloads** | DownloadsView | Offline downloads are mobile-only |
| **Family Controls** | FamilyControlsView (iOS native) | Uses iOS Screen Time framework |
| **CarPlay** | CarPlay integration | Hardware-specific |
| **Widgets (iOS)** | WidgetExtension | iOS Home Screen widgets |
| **Live Activities** | Dynamic Island support | iPhone 14+ specific |
| **AirPlay** | AirPlayView | Cast from iOS to TV |
| **PiP** | PiPController | Picture-in-Picture (iOS) |
| **Biometric Auth** | BiometricPromptView | Face ID / Touch ID |
| **Siri Intents** | AppIntents/ directory | Siri Shortcuts |
| **Help** | HelpView | In-app help center |
| **Support** | SupportView | In-app support tickets |
| **Subscription Gate** | SubscriptionGateView | Paywall UI |
| **Playlist** | PlaylistView | User playlists management |
| **Messages** | MessagesView | In-app messaging |

### tvOS-ONLY Features

| Feature | tvOS Files | Reason |
|---------|-----------|--------|
| **Splash Screen** | TVSplashView | TV boot animation |
| **Top Shelf** | TopShelfDataProvider | Apple TV Top Shelf extension |
| **Hero Carousel** | GlassHeroCarousel | Full-bleed TV hero experience |
| **QR Auth** | TVQRCodePanel, TVQRAuthViewModel | Pair with phone to sign in |
| **Widget Dock** | TVWidgetDockView, TVWidgetSidebarView | TV sidebar widget system |
| **Zine Reader** | TVZineReaderView | Magazine-style content for TV |
| **Proactive Voice** | TVProactiveSuggestionBannerView | "Hey, want to watch..." suggestions |

---

## 5. Player Comparison (Deep Dive)

### iOS Player (51 files)

```
PlayerView.swift (main)
PlayerView+LiveFeatures.swift
PlayerView+AIControls.swift
PlayerView+SplitSubtitles.swift
VideoPlayerView.swift

Dubbing:
  LiveDubbingControlsView, LiveDubbingOverlayView, BilingualDubbingOverlayView
  LanguageRatioView, VoiceSelectorView, DubbingPremiumGateView

Subtitles:
  SubtitleSettingsView, SubtitleModePicker, SubtitleLanguagePickerView
  InteractiveSubtitlesOverlay, InteractiveSubtitlesView, LiveSubtitleOverlayView
  OpenSubtitlesDownloadView, ShoreshHighlightView, TranslationPopoverView
  Subtitles/LiveSplitSubtitleOverlayView, SubtitlePaneView, AISubtitlesPickerView
  Subtitles/SplitSubtitleOverlayView, SplitSubtitleLanguagePickerView

AI Features:
  GlassAIFeaturesPanel, GlassAILanguagePickerView
  AICompanion/AICompanionSidebarView, CompanionContextTab, CompanionQuizTab,
  CompanionVocabularyTab
  SceneSearchView, CulturalContextBadge, CulturalExplanationSheet

TalkBack:
  TalkBackOverlayView, TalkBackCharacterView, TalkBackResultView

CatchUp:
  CatchUpView, CatchUpSummaryView, CatchUpAutoPromptView

Player Controls:
  AudioTrackSelectorView, PlaybackSpeedControlView, QualitySelectorView
  ChapterNavigationView, ChapterListView, ChapterMarkersView

Other:
  MovieDetailView, SeriesDetailView, MovieDetailLoadingView
  StreamLimitExceededView, ChannelChatView
```

### tvOS Player (35 files)

```
TVPlayerView.swift (main)
TVPlayerControlBar.swift
TVVideoPlayerRepresentable.swift

Dubbing:
  TVLiveDubbingOverlayView, TVBilingualDubbingOverlayView, TVVoiceSelectorView

Subtitles:
  TVSubtitleSettingsView, TVSubtitleModePicker, TVSubtitleLanguagePickerView
  TVInteractiveSubtitleOverlay, TVLiveSubtitleOverlayView
  TVOpenSubtitlesDownloadView, TVShoreshHighlightView, TVTranslationPopoverView
  TVSplitSubtitleOverlayView, TVSplitLanguagePickerView

AI Features:
  TVAIFeaturesPanel, TVAILanguagePickerView
  TVCulturalContextOverlay, TVComprehensionQuizOverlayView, TVTriviaFactsOverlayView
  TVSceneSearchView

TalkBack:
  TVTalkBackOverlayView, TVTalkBackResultView

CatchUp:
  TVCatchUpView, TVCatchUpAutoPromptView

Player Controls:
  TVAudioTrackSelectorView, TVPlaybackSpeedControlView, TVQualitySelectorView
  TVChapterNavigationView, TVChapterListView, TVChapterMarkersView

Other:
  TVStreamLimitExceededView, TVChannelChatView
```

### Player Feature Differences

| Feature | iOS | tvOS |
|---------|-----|------|
| **AI Companion Sidebar** | Full sidebar with 3 tabs (Context, Quiz, Vocabulary) | Overlay-based (ComprehensionQuiz, TriviaFacts, CulturalContext) |
| **Player Controls** | Touch-based overlays with gestures | `TVPlayerControlBar` -- remote-optimized bar |
| **Video Representation** | Native `AVPlayerView` | `TVVideoPlayerRepresentable` (UIKit bridge) |
| **DubbingPremiumGateView** | Paywall for dubbing | Shared from iOS (referenced in project.yml) |
| **CatchUp Summary** | `CatchUpSummaryView` | Not present in tvOS |
| **LanguageRatioView** | Slider for dubbing mix ratio | Not present in tvOS |

---

## 6. Navigation Comparison

### iOS Navigation

- `TabView` with `GlassTabBar` (custom bottom tab bar)
- `NavigationStack` per tab
- Deep links via URL schemes
- Modal presentations (sheets, fullScreenCover)

### tvOS Navigation

- `TVMainTabView` -- top-level `TabView` (tvOS sidebar)
- `TVNavigationCoordinator` (@Observable) -- centralized state
  - `presentPlayer(contentId:contentType:)` -- modal player
  - Route-based navigation via `TVRoute` enum
- `TVDeepLinkRouter` -- URL-to-route mapping
- `TVContentTypeMapper` -- content type resolution
- Focus-driven navigation via Siri Remote
- `.onMoveCommand()` for directional input

---

## 7. Design System Comparison

### Shared Design Tokens

| Token | iOS (`DesignTokens`) | tvOS (`TVDesignTokens`) |
|-------|---------------------|------------------------|
| **Font sizes** | xs: 12 ... hero: 64 | xs: 18 ... hero: 80 (1.5-2x larger) |
| **Spacing** | xxs: 4 ... xxxxl: 96 | xs: 8 ... xxxxl: 96 (generous) |
| **Focus scale** | N/A | 1.05x scale on focus |
| **Focus ring** | N/A | 3pt ring width, purple glow |
| **Min touch/focus** | 44pt touch target | 60pt focusable min size |
| **Poster sizes** | Variable | 300x450 standard, 500pt hero height |
| **Colors** | Same purple palette | Same purple palette |

### Platform-Specific Components

| Component | iOS | tvOS |
|-----------|-----|------|
| `GlassButton` | Touch-based with haptics | Focus-scaled with `.tvFocusStyle()` |
| `GlassCard` | Standard glassmorphism | Focus ring + scale animation |
| `GlassHeroCarousel` | N/A | Manual offset paging, auto-advance, remote L/R |
| `GlassFocusPoster` | N/A | tvOS focus-optimized poster |
| `GlassLiveControlButton` | iOS-only live indicator | N/A |
| `TVFocusModifier` | N/A | Scale + ring + shadow + spring animation |

---

## 8. Authentication Comparison

| Aspect | iOS | tvOS |
|--------|-----|------|
| **Email/Password** | Full login/register forms | `TVCredentialPanel` (simplified) |
| **Apple Sign-In** | Native `ASAuthorizationController` | Available via entitlements |
| **Google Sign-In** | `GoogleSignIn` SDK | Not available |
| **QR Code Pairing** | N/A | `TVQRCodePanel` + `TVQRAuthViewModel` |
| **Biometric** | Face ID / Touch ID | N/A |
| **Passkey** | `PasskeyHelper` | `TVPasskeyManagementView` |
| **Auth Config** | `AppAuthConfiguration` | `TVAppAuthConfiguration` |
| **Entitlements** | Full (Sign in with Apple, Push, etc.) | `com.apple.developer.applesignin` only |

---

## 9. Voice/Input Comparison

| Aspect | iOS | tvOS |
|--------|-----|------|
| **Speech Recognition** | `SFSpeechRecognizer` (on-device, 3 languages) | `TVAudioRecordingService` (Siri Remote mic, sends to backend) |
| **TTS** | ElevenLabs API | ElevenLabs API (same) |
| **Wake Word** | On-device listening | `TVWakeWordSettingsView` |
| **Proactive Voice** | `ProactiveVoiceViewModel` | `TVProactiveSuggestionBannerView` |
| **Text Input** | Native keyboard | On-screen keyboard (limited) |
| **Primary Input** | Touch gestures + keyboard | Siri Remote (D-pad, select, menu, play/pause) |

---

## 10. Assets Comparison

| Aspect | iOS | tvOS |
|--------|-----|------|
| **Asset Catalog** | `Images.xcassets` | `Assets.xcassets` |
| **App Icon** | Standard iOS icon set | Brand Assets (App Icon + Top Shelf) |
| **Custom Images** | (various) | Jerusalem, Masada, TelAviv image sets |
| **Top Shelf** | N/A | `TopShelfDataProvider` service |
| **Intro Videos** | MP4 intro files (restored) | N/A |

---

## 11. Feature Flags (Identical)

Both platforms share the same `FeatureFlags.swift` with 18 flags:

- `isLiveDubbingEnabled`
- `isTriviaEnabled`
- `isLLMSearchEnabled`
- `isShabbatModeEnabled`
- `isFamilyControlsEnabled`
- `isWakeWordEnabled`
- `isBeta500Enabled`
- `isPasskeyEnabled`
- `isCarPlayEnabled`
- `isAvatarModeEnabled`
- `isProactiveVoiceEnabled`
- `isInteractiveSubtitlesEnabled`
- `isChapterNavigationEnabled`
- `isAudiobooksEnabled`
- `isHouseholdEnabled`
- `isDevicePairingEnabled`
- `isRewardsEnabled`
- `isLegacyFeaturesEnabled`

Note: `isCarPlayEnabled` is effectively dead on tvOS but still included in the shared flag file.

---

## 12. Build Configuration

| Aspect | iOS | tvOS |
|--------|-----|------|
| **Deployment Target** | iOS 17.0+ | tvOS 17.0+ |
| **Swift Version** | 5.9+ | 5.9+ |
| **Project Generator** | XcodeGen (`project.yml`) | XcodeGen (`project.yml`) |
| **Package Manager** | SPM (12 local packages) | SPM (same 12 packages) |
| **External Deps** | Firebase, GoogleSignIn, GLTFKit2 | Firebase, GLTFKit2 (no GoogleSignIn) |
| **Entitlements** | Full (Sign-in, Push, App Groups) | Minimal (Sign-in only) |
| **Extensions** | WidgetExtension | TopShelf extension |

---

## 13. Shared Packages (12 Total)

| Package | Files | Purpose |
|---------|-------|---------|
| **BayitCore** | 4 | DI container, logging (OSLog), environment config, correlation IDs |
| **BayitNetworking** | 16 | Actor-based APIClient, WebSocketManager, retry logic, auth interceptor |
| **BayitAuth** | 19 | Firebase Auth, Keychain, token exchange, multi-profile, Apple/Google Sign-In |
| **BayitLocalization** | 4 + 10 JSON | 10-language i18n (en, he, es, fr, zh, it, hi, ta, bn, ja), RTL support |
| **BayitDesignSystem** | 19 components | Glass UI: GlassButton, GlassCard, GlassHeroCarousel, tokens, focus modifiers |
| **BayitMedia** | 10 | AVPlayer wrapper, audio session, Now Playing, PiP (iOS), AirPlay (iOS), 3D scenes |
| **BayitVoice** | 11 | VoiceOrchestrator, SFSpeechRecognizer (iOS), TVAudioRecording (tvOS), ElevenLabs TTS |
| **BayitPersistence** | 1 | Placeholder for Phase 4 offline cache (SwiftData) |
| **BayitAnalytics** | 2 | Firebase Crashlytics integration |
| **BayitWidgetShared** | 9 | App Group data sharing, Live Activity attributes, deep links |
| **BayitNotifications** | 7 | Firebase Cloud Messaging, topic subscriptions, permission management |
| **BayitCast** | 8 | Google Cast session management, MediaPlayer bridge |

### Package Dependency Graph

```
BayitCore (no deps)
  |-- BayitNetworking
  |     |-- BayitAuth --> Firebase Auth, GoogleSignIn (iOS only)
  |     |-- BayitMedia --> GLTFKit2
  |     |-- BayitVoice
  |     |-- BayitNotifications --> Firebase Messaging
  |     |-- BayitAnalytics --> Firebase Crashlytics
  |-- BayitLocalization
  |-- BayitDesignSystem
  |-- BayitPersistence
  |-- BayitWidgetShared
  |-- BayitCast --> BayitMedia
```

---

## 14. Key Design Patterns

| Pattern | Implementation |
|---------|---------------|
| **Dependency Injection** | Constructor injection, `RepositoryProvider` / `TVRepositoryProvider` composition roots |
| **Actor-Based Concurrency** | `APIClient`, `WebSocketManager`, `VoiceOrchestrator`, `WidgetDataStore` |
| **Observable State** | `@Observable` macro (iOS 17+) for AuthManager, LocalizationManager, MediaPlayer, ViewModels |
| **Protocol Abstractions** | `AuthTokenProvider`, `LocationProvider`, `NetworkConfiguration`, `CastSessionProtocol` |
| **Structured Logging** | `BayitLogger` wrapping `os.Logger` -- no `print()` or `console.log` |
| **Conditional Compilation** | `#if os(iOS)`, `#if os(tvOS)`, `#if canImport(GoogleSignIn)` |
| **Repository Pattern** | 50+ repositories with protocol + API implementation |

---

## 15. ViewModels List (80 Total, Shared)

All are `@MainActor @Observable final class`:

| ViewModel | Domain |
|-----------|--------|
| HomeViewModel | Featured content, categories, hero, spotlight |
| MediaPlayerViewModel | Stream resolution, progress tracking, widget sync |
| LiveTVViewModel | EPG, channel browsing, catch-up |
| VODViewModel | Movie/series browsing |
| SearchViewModel | Full-text + LLM hybrid search |
| RadioViewModel | Station listing, playback |
| PodcastsViewModel | Browse, subscribe, episodes |
| PodcastDetailViewModel | Episode list, chapters |
| AudiobooksViewModel | Audiobook catalog |
| AudiobookDetailViewModel | Chapters, progress |
| TriviaViewModel | Quiz sessions, scoring |
| ChatbotViewModel | AI conversation |
| ChessViewModel (+WebSocket) | Game state, moves |
| WatchPartyViewModel (+WebSocket) | Party creation, sync |
| DirectMessagesViewModel (+WebSocket) | Chat streaming |
| FriendsViewModel | Social graph |
| ProfileViewModel | User profile |
| SettingsViewModel | App configuration |
| AvatarViewModel | Mesh customization |
| BetaCreditsViewModel | Credit balance |
| ShabbatViewModel | Times, mode toggle |
| FavoritesViewModel | Bookmarks |
| PlaylistViewModel | Custom collections |
| DownloadsViewModel | Offline content |
| RewardsViewModel | Points, badges |
| MissionsViewModel | Achievements |
| LeaderboardViewModel | Rankings |
| LiveDubbingViewModel | Real-time dubbing |
| LiveSubtitlesViewModel | Real-time captions |
| InteractiveSubtitlesViewModel | Clickable words |
| CatchUpViewModel | Rewind features |
| ChapterNavigationViewModel | Scene markers |
| CulturalContextViewModel | Context explanations |
| SceneSearchViewModel | Scene-based search |
| TalkBackViewModel | Accessibility descriptions |
| MovieDetailViewModel | Movie info |
| SeriesDetailViewModel | Series/episode info |
| CollectionDetailViewModel | Curated collections |
| EPGViewModel | Program guide |
| FamilyControlsViewModel | Parental controls |
| SecurityViewModel | Account security |
| PasskeyViewModel | Passkey auth |
| SubscriptionViewModel | Plan management |
| HouseholdViewModel | Family accounts |
| DevicePairingViewModel | Multi-device |
| LLMSearchViewModel | AI search |
| ProactiveVoiceViewModel | AI suggestions |
| VoiceOnboardingViewModel | Voice setup |
| OnboardingAIViewModel | Guided setup |
| StarStoryViewModel | Narrative content |
| MorningRitualViewModel | Morning content |
| FlowsViewModel | Content playlists |
| GlossaryViewModel | Dictionary |
| JudaismViewModel | Religious content |
| CultureContentViewModel | Cultural content |
| TrendingViewModel | Popular content |
| YoungstersViewModel | Youth content |
| ChildrenViewModel | Kids content |
| CardActionsViewModel | Card interactions |
| ContentPickerViewModel | Content selection |
| WidgetsViewModel | Widget management |
| WidgetDockViewModel | Dock UI |
| WidgetPlayerViewModel | In-widget player |
| YnetMivzakimViewModel | News updates |
| HelpViewModel | Help center |
| SupportViewModel | Support tickets |
| SubscriptionGateViewModel | Paywall |
| BiometricViewModel | Face ID |
| LiveLayerViewModel | Live overlays |
| BilingualDubbingViewModel | Dual audio |
| ChannelChatViewModel | Live chat |
| RecordingsViewModel | DVR |
| AICompanionViewModel | AI sidebar |
| TriviaFactsViewModel | Trivia overlays |
| V2VPracticeViewModel | Voice practice |
| ProgressTracker | Watch progress |
| StreamResolver | Stream URL resolution |

---

## 16. Gaps and Issues

### tvOS Missing Features (vs iOS)

1. No offline downloads -- expected (no local storage UX on TV)
2. No onboarding flow -- relies on QR pairing, no guided tour
3. No Playlist management -- can browse but not create/edit
4. No Help/Support center -- no in-app help
5. No CatchUp Summary -- has CatchUp but without summary overlay
6. No Language Ratio slider -- cannot adjust dubbing mix balance
7. No AI Companion Sidebar -- replaced by simpler overlay approach
8. No Google Sign-In -- framework unavailable on tvOS

### tvOS Unique Advantages (vs iOS)

1. Hero Carousel -- immersive full-bleed hero with auto-advance
2. Widget Dock System -- sidebar widget management (Ynet Mivzakim, etc.)
3. QR Auth -- seamless pairing with mobile device
4. Top Shelf -- content preview in Apple TV home screen
5. Splash Screen -- branded boot experience
6. Zine Reader -- magazine-style content viewer
7. Proactive Suggestion Banner -- AI-driven content recommendations
8. 3D Avatar Preview -- expanded ZehAni features on big screen
9. Richer Social UI -- 6 sub-views for messaging vs iOS's single view

### Code Quality Observations

1. **FeatureFlags duplication** -- `FeatureFlags.swift` exists identically in both `BayitPlusApp/App/` and `BayitPlusTVApp/App/` instead of being shared via `project.yml` or a package
2. **CarPlay flag on tvOS** -- `isCarPlayEnabled` is included in tvOS feature flags but is meaningless there
3. **Conditional compilation consistency** -- Some ViewModels use `#if os(iOS)` / `#else` patterns well (e.g., `MediaPlayerViewModel`), while tvOS views sometimes reimplement logic that could be shared
4. **tvOS ViewModels are thin** -- Only 3 unique tvOS ViewModels means the platform is well-leveraging shared code
5. **Settings decomposition** -- tvOS properly decomposes Settings into 9+ focused views (better for focus navigation), while iOS uses a single SettingsView

---

## 17. Summary

The iOS and tvOS apps share a well-designed modular architecture with ~70-80% code reuse through:

- 12 shared SPM packages (networking, auth, media, design system, localization, voice, etc.)
- Direct file sharing of Models, Repositories, and ViewModels via `project.yml`
- Consistent `#if os()` compilation guards in shared code

The tvOS app is not a port -- it is a purpose-built 10-foot experience with 156 custom views adapted for focus-based navigation, Siri Remote input, and living room UX. It properly leverages the shared business logic while reimplementing every UI surface for the TV form factor.

| Final Metric | iOS | tvOS | Shared |
|-------------|-----|------|--------|
| **Swift Lines** | 64,131 | 29,000 | -- |
| **Views** | 243 | 156 | 0 (all platform-specific) |
| **ViewModels** | 80 | 3 unique | 77 shared |
| **Models** | 61 | 0 unique | 61 shared |
| **Repositories** | 50 | 0 unique | 50 shared |
| **SPM Packages** | 12 | 12 | 12 (all shared) |
| **Package Swift Files** | 128 | 128 | 128 (all shared) |
| **Languages** | 10 | 10 | 10 (shared locale files) |
| **Design Components** | 19 | 19 | 19 (with platform adaptations) |
