# Bayit+ Android App (Native Kotlin + Jetpack Compose)

Native Android app for Bayit+ streaming platform, built with Kotlin, Jetpack Compose, and MVVM architecture.

## Project Structure

```
android-app/
├── app/                          # Main application module
│   └── src/main/java/tv/bayit/plus/
│       ├── BayitPlusApplication.kt
│       ├── MainActivity.kt
│       ├── navigation/           # Route, DeepLinkHandler, BayitNavHost
│       └── di/                   # AppConfigModule, RepositoryModule
├── core/
│   ├── core-common/              # BayitResult, Logger, CorrelationId, NetworkMonitor
│   ├── core-network/             # Retrofit, OkHttp, WebSocket, Interceptors
│   ├── core-model/               # @Serializable data classes (19 files)
│   ├── core-data/                # 48 repository interfaces + implementations
│   ├── core-database/            # Room + DataStore
│   ├── core-auth/                # Firebase Auth, Biometric, Passkey
│   ├── core-media/               # ExoPlayer, Cast, MediaSession
│   ├── core-voice/               # TTS, Speech, Wake Word
│   └── core-analytics/           # Firebase Analytics, event tracking
├── designsystem/                 # Glass UI components (15 files)
│   ├── theme/                    # DesignTokens, BayitPlusTheme
│   ├── modifier/                 # GlassMorphism
│   └── component/                # 12 Glass components
├── localization/                 # 10 language support
└── feature/                      # 21 feature modules
    ├── feature-home/
    ├── feature-livetv/
    ├── feature-vod/
    ├── feature-player/
    ├── feature-auth/
    ├── feature-social/           # Friends, Watch Party, Chess, DMs
    ├── feature-zehani/           # Me in the Story
    └── ...
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Language | Kotlin 2.0+ |
| UI | Jetpack Compose + Material 3 |
| Architecture | MVVM + Repository Pattern |
| DI | Hilt 2.51+ |
| Networking | Retrofit 2.11 + OkHttp 4.12 |
| Serialization | kotlinx.serialization 1.7+ |
| WebSocket | OkHttp WebSocket |
| Database | Room 2.6 + DataStore 1.1 |
| Media | Media3 (ExoPlayer) 1.4 + Cast |
| Image Loading | Coil 3.0 |
| Auth | Firebase Auth 23.0 + Biometric |
| Navigation | Navigation Compose 2.8 |

## Build & Run

### Prerequisites

- Android Studio Ladybug or later
- JDK 17+
- Android SDK 34
- Gradle 8.5+

### Configuration

Create `local.properties` in the project root:

```properties
sdk.dir=/path/to/Android/sdk

# Optional: Override API endpoints
bayit.api.baseUrl=https://api.bayit.tv/
bayit.ws.baseUrl=wss://ws.bayit.tv/
```

### Build Commands

```bash
# Build debug APK
./gradlew assembleDebug

# Install on connected device
./gradlew installDebug

# Run unit tests
./gradlew test

# Run connected tests
./gradlew connectedAndroidTest

# Generate code coverage report
./gradlew jacocoTestReport

# Verify snapshot tests (Paparazzi)
./gradlew verifyPaparazziDebug
```

## Module Dependencies

### Core Module Graph

```
core-common (base)
  ↓
core-model (data classes only)
  ↓
core-network (Retrofit + WebSocket)
  ↓
core-database (Room + DataStore)
  ↓
core-data (repositories)
```

### Feature Module Pattern

All feature modules depend on:
- `core-common`, `core-model`, `core-data`
- `designsystem` (Glass UI)
- `localization` (i18n)
- Compose + Lifecycle + Navigation + Hilt

Specialized dependencies:
- `feature-player` → `core-media` (ExoPlayer)
- `feature-voice` → `core-voice` (TTS/Speech)
- `feature-downloads` → WorkManager
- `feature-widgets` → Glance

## Network Architecture

### HTTP Client (Retrofit + OkHttp)

**Interceptor Chain** (execution order):
1. `AuthInterceptor` - Bearer token from AuthTokenProvider
2. `CorrelationIdInterceptor` - X-Correlation-ID UUID per request
3. `LocaleInterceptor` - Accept-Language from device
4. `RateLimitInterceptor` - 429 handling with Retry-After
5. `RetryInterceptor` - Exponential backoff for 5xx (max 3 retries)
6. `HttpLoggingInterceptor` - Request/response logging (debug only)

### WebSocket Manager

- Connection pooling (max 8 concurrent)
- Auth handshake: `{"type":"auth","token":"..."}`
- Ping/keepalive every 30s
- Auto-reconnect with exponential backoff
- 8 channel types: LIVE_DUBBING, LIVE_SUBTITLES, LIVE_TRIVIA, CHESS, DIRECT_MESSAGES, CHANNEL_CHAT, V2V, TALKBACK

## Glass Design System

**Design Tokens** (ported from iOS):
- Colors: Primary #7E22CE, Glass bg/border/tint, Background #0D0D1A
- Spacing: 4-point grid (2-48dp)
- Radius: sm(4dp) - full(9999dp)
- Typography: xs(10sp) - hero(48sp)
- Touch Targets: 48dp minimum

**Glass Components** (12):
- GlassButton, GlassCard, GlassTopBar, GlassBottomBar
- GlassTextField, GlassSearchBar
- GlassLoadingIndicator, GlassSpinner, GlassProgressBar
- GlassModal, GlassChip, GlassBadge

**GlassMorphism Modifier:**
- API 31+: `RenderEffect.createBlurEffect` with 20px blur
- API 24-30: Fallback semi-transparent overlay
- Purple border with rounded corners

## Navigation

**68 Route Destinations** (sealed class):
- 5 tab roots (Home, LiveTV, VOD, Podcasts, Search)
- Content detail (Movie, Series, Collection, Podcast, EPG, Player)
- Auth (Login, Register, Profile Management, MFA, Phone Verification)
- Settings (Language, Notifications, Billing, Security, etc.)
- Social (Friends, Watch Party, Chess, Direct Messages)
- Specialized (Trivia, Rewards, Missions, Zeh Ani, Culture, etc.)

**Deep Links:**
- Custom scheme: `bayitplus://`
- Universal links: `https://bayit.tv/`
- App Links auto-verification

## Repository Layer

**48 Repository Interfaces** (all under `core-data/repository/`):

**Content:** ContentRepository, LiveTVRepository, RadioRepository, PodcastRepository, SeriesRepository, MediaRepository, EPGRepository, CategoryRepository, AudiobookRepository, TrendingRepository

**User & Settings:** UserRepository, PlaylistRepository, SettingsRepository, SecurityRepository, FamilyControlsRepository, HouseholdRepository

**Social:** FriendsRepository, WatchPartyRepository, ChessRepository, DirectMessageRepository, ChatRepository, StatsRepository

**Features:** VoiceRepository, TriviaRepository, LiveDubbingRepository, SubtitleRepository, ChapterRepository, NewsRepository, SearchRepository, LLMSearchRepository

**Advanced:** MissionsRepository, StarStoryRepository, InteractiveMissionRepository, RewardRepository, WidgetRepository, DevicePairingRepository, BetaCreditsRepository, PasskeyRepository

**Zeh Ani:** ZehAniRepository, AvatarOutfitRepository, AvatarMeshRepository, FamilySnapRepository, PhoneticMirrorRepository, GrandparentBridgeRepository

**Engagement:** GamificationRepository, TalkBackRepository, CultureRepository, ShabbatRepository

## Testing Strategy

### Unit Tests (Target: 87%+ coverage)
- All 48 repository implementations (MockWebServer)
- All ViewModels (MockK + Turbine)
- Serialization (FlexibleRating custom serializer)
- Utilities, interceptors, WebSocket lifecycle

### Integration Tests
- Room migrations + schema validation
- DataStore preferences
- Auth flows (Firebase + Biometric)
- OkHttp interceptor chain
- WebSocket connection + reconnection

### UI Tests (Compose)
- All 12 Glass components (snapshot tests via Paparazzi)
- Navigation flows
- Deep link handling
- Accessibility (TalkBack)

### E2E Tests (Espresso)
- Login → Home → Play content
- Offline download → play
- Deep link navigation
- Widget tap → app launch

## Localization

**10 Languages Supported:**
- English (en) - Default
- Hebrew (he) - RTL
- Spanish (es)
- Chinese (zh)
- French (fr)
- Italian (it)
- Hindi (hi)
- Tamil (ta)
- Bengali (bn)
- Japanese (ja)

## Security

- Certificate pinning for `bayit.tv` (SHA-256)
- No cleartext traffic allowed
- EncryptedSharedPreferences for tokens
- ProGuard/R8 full obfuscation (release)
- Root detection (planned)
- Biometric authentication via AndroidX Biometric 1.2

## Development Workflow

1. **Feature development:**
   - Create feature module under `feature/`
   - Add ViewModel + UI in feature module
   - Add route to `Route.kt`
   - Register composable in `BayitNavHost.kt`

2. **Repository implementation:**
   - Add interface to `core-data/repository/`
   - Create implementation in `core-data/repository/impl/`
   - Add binding in `app/di/RepositoryModule.kt`
   - Inject into ViewModel via Hilt

3. **Model definition:**
   - Add `@Serializable` data class to `core-model/`
   - Use snake_case for JSON field names
   - Handle nullable fields with `?`

## Next Steps (Phase 2-7)

### Phase 2: Remaining Infrastructure (Week 2-3)
- [ ] Repository implementations (48 files)
- [ ] Firebase Auth integration
- [ ] Biometric service
- [ ] Secure storage service

### Phase 3: Core Screens (Week 3-7)
- [ ] Home screen + hero carousel
- [ ] LiveTV screen + EPG
- [ ] VOD screen + categories
- [ ] Player (ExoPlayer + PiP + Chromecast)
- [ ] Auth flows (Login, Register, Profile Selection)

### Phase 4: Feature Screens (Week 7-10)
- [ ] Settings suite (11 screens)
- [ ] Social features (8 screens)
- [ ] Content categories (11 screens)
- [ ] Specialized features (48 screens)

### Phase 5: Advanced Features (Week 10-14)
- [ ] Voice features (TTS, Speech, Wake Word, Dubbing Mixer)
- [ ] Offline support (WorkManager, Room cache)
- [ ] Widgets (Glance 1.1)
- [ ] App Shortcuts + FCM

### Phase 6: Testing & Polish (Week 14-16)
- [ ] 87%+ test coverage
- [ ] Performance optimization (Baseline Profiles, R8)
- [ ] Accessibility (TalkBack, font scaling)
- [ ] RTL verification (Hebrew)

### Phase 7: Release (Week 16-18)
- [ ] Signed AAB
- [ ] Google Play staged rollout (1% → 100%)
- [ ] Crashlytics + ANR monitoring
- [ ] App Store listing + screenshots

## License

Proprietary - Bayit+ Platform
