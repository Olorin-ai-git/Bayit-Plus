# iOS/Android Parity Analysis

**Date:** 2026-02-14
**Status:** Complete
**Platforms:** iOS (React Native) vs Android (Kotlin/Jetpack Compose)
**Agent ID:** a1fd7cc

---

## Executive Summary

Comprehensive parity analysis reveals **significant feature and architectural gaps favoring Android**. iOS is missing **28 critical features** that exist in Android, while Android is missing only **1 minor utility** from iOS.

### Critical Findings

**iOS Missing (High Priority):**
- 7 complete screens (Register, Forgot Password, Beta 500, Podcast/Audiobook detail + players, Downloads, Favorites)
- Background media service (no audio in background/lock screen)
- Local database for offline data
- Glass UI component library (**CLAUDE.md violation**)
- Proper error handling in most screens
- TypeScript types (excessive `any` usage)
- Image caching strategy
- RTL layout helper for Hebrew/Arabic

**Android Missing:**
- Only 1 item: Streaming URL builder utility (low priority)

**Both Platforms:**
- **Fail 87% test coverage requirement** (iOS: <5%, Android: ~25-35%)
- Need significant test expansion

---

## 1. PROJECT STRUCTURE & CONFIGURATION

### iOS Structure
```
mobile-app/
├── ios/                      # Native iOS project (Xcode)
│   ├── BayitPlusMobile.xcworkspace
│   ├── BayitPlusMobile/      # App target
│   │   ├── Info.plist       # App configuration
│   │   ├── Images.xcassets  # App icons, splash
│   │   └── LaunchScreen.storyboard
│   └── Podfile              # CocoaPods dependencies
├── src/
│   ├── screens/             # 12 screens (flat structure)
│   ├── components/          # 6 components
│   ├── services/            # 3 services (api, auth, streaming)
│   ├── stores/              # 3 Zustand stores
│   ├── navigation/          # Tab + Stack navigators
│   └── i18n/                # i18next config
├── package.json             # npm dependencies
└── __tests__/               # 1 test file

Total: ~22 source files, ~8,000 LOC
```

### Android Structure
```
android/
├── app/
│   ├── src/main/
│   │   ├── AndroidManifest.xml  # App configuration
│   │   ├── java/tv/bayit/plus/
│   │   │   ├── ui/screens/      # 18 screen packages (Screen + ViewModel)
│   │   │   ├── ui/components/   # 11 reusable components
│   │   │   ├── ui/theme/        # 4 theme files
│   │   │   ├── ui/navigation/   # 3 navigation files
│   │   │   ├── data/
│   │   │   │   ├── remote/      # ApiService + 9 DTOs
│   │   │   │   ├── repository/  # 12 repositories
│   │   │   │   └── local/       # Room DB (3 DAOs, 3 entities)
│   │   │   ├── di/              # 4 Hilt modules
│   │   │   ├── player/          # 5 player files
│   │   │   ├── widget/          # 2 home screen widgets
│   │   │   └── util/            # 5 utilities
│   │   └── res/
│   │       ├── values*/         # 10 language strings.xml
│   │       ├── drawable/        # Icons, logos
│   │       ├── layout/          # Widget layouts
│   │       └── xml/             # Widget info, network security
│   ├── build.gradle            # App dependencies
│   └── src/test/               # 4 unit test files
│       └── src/androidTest/    # 3 UI test files
└── build.gradle                # Project config

Total: ~100+ source files, ~15,000 LOC
```

### Configuration Comparison

| Aspect | iOS | Android |
|--------|-----|---------|
| **Build system** | Xcode + CocoaPods + npm | Gradle + npm |
| **Dependency manager** | CocoaPods (native) + npm | Gradle + npm |
| **Min OS version** | iOS 13.0 (Info.plist) | Android 10 / API 29 (build.gradle) |
| **App name** | "Bayit+ Mobile" | "Bayit Plus" |
| **Bundle ID / Package** | `tv.bayit.plus.mobile` | `tv.bayit.plus` |
| **Version** | 1.4.0 (14) | 1.4.0 (14) |
| **Supported orientations** | Portrait + Landscape | Portrait + Landscape |
| **Permissions** | Camera, Microphone, Photo Library | Internet, Network State, Foreground Service, Notifications, Post Notifications, Wake Lock |
| **Supported languages** | 10 (via i18next) | 10 (via strings.xml) |
| **Deep linking** | ✗ None configured | ✓ `https://bayit.tv` + `bayitplus://` |
| **Widgets** | ✗ None | ✓ NowPlaying + EPG |
| **Background modes** | ✗ None | ✓ Foreground service for audio |

**Critical Gap:** iOS has no deep linking, no widgets, no background audio capability configured.

---

## 2. SCREENS & NAVIGATION

### iOS Screens (12 total)

| # | Screen | File | Description |
|---|--------|------|-------------|
| 1 | Home | `HomeScreen.tsx` | Featured content, live channels, trending |
| 2 | Live TV | `LiveTVScreen.tsx` | Live channel listing with categories |
| 3 | VOD | `VODScreen.tsx` | Movies & series with categories |
| 4 | Radio | `RadioScreen.tsx` | Radio station listing |
| 5 | Podcast | `PodcastScreen.tsx` | Podcast listing (no detail/player) |
| 6 | Audiobook | `AudiobookScreen.tsx` | Audiobook listing (no detail/player) |
| 7 | Search | `SearchScreen.tsx` | Live search across all content |
| 8 | Profile | `ProfileScreen.tsx` | User profile display |
| 9 | Settings | `SettingsScreen.tsx` | Language, playback settings |
| 10 | Player | `PlayerScreen.tsx` | Video/audio player |
| 11 | Channel Detail | `ChannelDetailScreen.tsx` | Channel info + schedule |
| 12 | Content Detail | `ContentDetailScreen.tsx` | Movie/series details + episodes |
| - | EPG | `EPGScreen.tsx` | Electronic Program Guide |
| - | Login | `LoginScreen.tsx` | Email/password login |

**Navigation:**
```typescript
TabNavigator (Home, LiveTV, VOD, Radio, Search, Profile)
  └── StackNavigator
      ├── Player
      ├── ChannelDetail
      ├── ContentDetail
      ├── EPG
      └── Settings
```

### Android Screens (25 total)

| # | Screen | File | Description |
|---|--------|------|-------------|
| 1 | Home | `home/HomeScreen.kt` | Featured, live channels, trending |
| 2 | Live TV | `livetv/LiveTVScreen.kt` | Channel listing with categories |
| 3 | VOD | `vod/VODScreen.kt` | Movies & series with categories |
| 4 | Radio | `radio/RadioScreen.kt` | Radio station listing |
| 5 | Podcast | `podcast/PodcastScreen.kt` | Podcast listing |
| 6 | **Podcast Detail** | `podcast/PodcastDetailScreen.kt` | Episode list, subscribe |
| 7 | **Podcast Player** | `podcast/PodcastPlayerScreen.kt` | Speed, chapters, queue |
| 8 | Audiobook | `audiobook/AudiobookScreen.kt` | Audiobook listing |
| 9 | **Audiobook Detail** | `audiobook/AudiobookDetailScreen.kt` | Chapter list, bookmarks |
| 10 | **Audiobook Player** | `audiobook/AudiobookPlayerScreen.kt` | Speed, chapters, sleep timer |
| 11 | Search | `search/SearchScreen.kt` | Live search across all content |
| 12 | Profile | `profile/ProfileScreen.kt` | User profile display |
| 13 | Settings | `settings/SettingsScreen.kt` | Language, playback, theme |
| 14 | **Downloads** | `downloads/DownloadsScreen.kt` | Offline content management |
| 15 | **Favorites** | `favorites/FavoritesScreen.kt` | Favorited content |
| 16 | **Beta 500** | `beta500/Beta500Screen.kt` | AI credits, usage stats |
| 17 | Player | `player/PlayerScreen.kt` | Video/audio player |
| 18 | Channel Detail | `channeldetail/ChannelDetailScreen.kt` | Channel info + schedule |
| 19 | Content Detail | `contentdetail/ContentDetailScreen.kt` | Movie/series + episodes |
| 20 | EPG | `epg/EPGScreen.kt` | Electronic Program Guide |
| 21 | **Login** | `auth/LoginScreen.kt` | Email/password login |
| 22 | **Register** | `auth/RegisterScreen.kt` | Create account |
| 23 | **Forgot Password** | `auth/ForgotPasswordScreen.kt` | Password reset |
| 24 | **Interactive Subtitles** | `subtitles/InteractiveSubtitlesScreen.kt` | Tap-to-translate |
| 25 | **Widget Gallery** | `widgets/WidgetGalleryScreen.kt` | Widget showcase |

**Navigation:**
```kotlin
BottomNavBar (Home, LiveTV, VOD, Radio, Podcasts, Profile)
  └── NavHost
      ├── Auth (Login, Register, ForgotPassword)
      ├── Player
      ├── PodcastDetail → PodcastPlayer
      ├── AudiobookDetail → AudiobookPlayer
      ├── ChannelDetail
      ├── ContentDetail
      ├── Downloads
      ├── Favorites
      ├── Beta500
      ├── EPG
      ├── Settings
      ├── InteractiveSubtitles
      └── WidgetGallery
```

### Missing from iOS

| # | Screen | Priority | Notes |
|---|--------|----------|-------|
| 1 | Register | HIGH | Service exists (`auth.ts`) but no screen |
| 2 | Forgot Password | HIGH | No service or screen |
| 3 | Beta 500 Credits | HIGH | Feature exists in backend |
| 4 | Podcast Detail | HIGH | Dead `onPress` handler in `PodcastScreen.tsx` |
| 5 | Podcast Player | HIGH | No playback controls for podcasts |
| 6 | Audiobook Detail | HIGH | Dead `onPress` handler in `AudiobookScreen.tsx` |
| 7 | Audiobook Player | HIGH | No playback controls for audiobooks |
| 8 | Downloads | MEDIUM | No offline functionality |
| 9 | Favorites | MEDIUM | No favorites management |
| 10 | Interactive Subtitles | LOW | Experimental feature |
| 11 | Widget Gallery | LOW | No widgets on iOS |

**Navigation Gap:** iOS has no dedicated Podcasts tab (Android has it in BottomNavBar).

---

## 3. UI COMPONENTS & GLASS DESIGN SYSTEM

### Android Glass Components

**Location:** `android/app/src/main/java/tv/bayit/plus/ui/components/`

| Component | File | Lines | Description |
|-----------|------|-------|-------------|
| GlassCard | `GlassCard.kt` | 45 | Card with glassmorphism blur/transparency |
| GlassButton | `GlassButton.kt` | 78 | Primary/secondary button with Glass effect |
| GlassTextField | `GlassTextField.kt` | 62 | Text input with Glass border |
| GlassTopBar | `GlassTopBar.kt` | 55 | App bar with Glass background |
| GlassBottomSheet | `GlassBottomSheet.kt` | 92 | Modal bottom sheet with Glass |
| GlassDialog | `GlassDialog.kt` | 68 | Alert dialog with Glass |
| LoadingIndicator | `LoadingIndicator.kt` | 35 | Circular progress indicator |
| ErrorView | `ErrorView.kt` | 48 | Error state with retry button |
| EmptyStateView | `EmptyStateView.kt` | 42 | Empty list placeholder |

**Theme System:**
```kotlin
// ui/theme/Color.kt
val GlassWhite = Color(0xFFFFFFFF)
val GlassBlack = Color(0xFF0A0A0A)
val GlassPrimary = Color(0xFF4A90E2)
val GlassSecondary = Color(0xFF50C878)
val GlassAccent = Color(0xFFFFD700)
// ... 15 more colors
```

**Typography:**
```kotlin
// ui/theme/Type.kt
val Typography = Typography(
    displayLarge = TextStyle(fontSize = 57.sp, fontWeight = FontWeight.Bold),
    headlineMedium = TextStyle(fontSize = 28.sp, fontWeight = FontWeight.SemiBold),
    // ... 13 more text styles
)
```

### iOS Components

**Location:** `mobile-app/src/components/`

| Component | File | Lines | Description |
|-----------|------|-------|-------------|
| ChannelCard | `ChannelCard.tsx` | 68 | Channel thumbnail with title |
| ContentCard | `ContentCard.tsx` | 72 | Content poster with metadata |
| MiniPlayer | `MiniPlayer.tsx` | 98 | Bottom persistent player |
| CategoryFilter | `CategoryFilter.tsx` | 55 | Horizontal category tabs |
| EPGGrid | `EPGGrid.tsx` | 156 | Program guide grid |
| SearchBar | `SearchBar.tsx` | 48 | Search input with icon |

**NO Glass Components:**
- Uses raw `<View>`, `<Text>`, `<TextInput>`, `<Pressable>`, `<Modal>`
- Hardcoded colors in every StyleSheet
- No theme system
- No loading/error/empty state components

**Example from `LoginScreen.tsx`:**
```typescript
<TextInput
  style={{
    backgroundColor: '#1a1a1a',  // Hardcoded
    color: '#fff',               // Hardcoded
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',         // Hardcoded
  }}
  // ...
/>
```

**MiniPlayer Icons (text characters):**
```typescript
<Text>{isPlaying ? 'II' : '>'}</Text>  // Should use icons
```

### Comparison

| Aspect | iOS | Android |
|--------|-----|---------|
| Glass UI components | ✗ 0 components | ✓ 9 components |
| Theme system | ✗ None | ✓ Color + Typography |
| Hardcoded colors | ✓ Everywhere | ✗ None |
| Loading states | ✗ None | ✓ LoadingIndicator |
| Error states | ✗ None | ✓ ErrorView |
| Empty states | ✗ None | ✓ EmptyStateView |
| Icons | Text characters ('II', '>') | Material Icons |
| CLAUDE.md compliance | ❌ **VIOLATION** | ✓ Compliant |

**Critical:** iOS violates CLAUDE.md requirement: "ALL UI components MUST use `@bayit/glass`."

---

## 4. STATE MANAGEMENT & ARCHITECTURE

### iOS: Flat Architecture

**State Management:**
- Zustand for global state (3 stores)
- `useState` for local state
- Direct API calls from screens

**Stores:**
```typescript
// stores/useAuthStore.ts
export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  login: async (email, password) => { /* ... */ },
  logout: async () => { /* ... */ },
}))

// stores/useContentStore.ts
export const useContentStore = create((set) => ({
  featuredContent: [],        // type: any[]
  liveChannels: [],           // type: any[]
  fetchFeaturedContent: async () => { /* ... */ },
}))

// stores/usePlayerStore.ts
export const usePlayerStore = create((set) => ({
  currentContent: null,       // type: any
  isPlaying: false,
  play: (content) => { /* ... */ },
}))
```

**Screen Pattern:**
```typescript
// HomeScreen.tsx
export default function HomeScreen() {
  const { featuredContent, liveChannels, fetchFeaturedContent } = useContentStore()
  const [loading, setLoading] = useState(true)  // No types

  useEffect(() => {
    fetchFeaturedContent()  // No error handling
  }, [])

  return (
    <View>
      {/* Inline styles with hardcoded colors */}
    </View>
  )
}
```

**Issues:**
- Excessive `any` types in stores
- No separation of data/domain/presentation
- No error handling in most screens
- Direct API calls from stores
- No dependency injection

### Android: Clean MVVM Architecture

**Architecture Layers:**
```
UI Layer (Screens + ViewModels)
    ↓
Domain Layer (UseCases - optional)
    ↓
Data Layer (Repositories + Data Sources)
    ↓
Network/Local (ApiService + Room DB)
```

**ViewModel Pattern:**
```kotlin
// home/HomeViewModel.kt
@HiltViewModel
class HomeViewModel @Inject constructor(
    private val homeRepository: HomeRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<HomeUiState>(HomeUiState.Loading)
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        loadHomeData()
    }

    private fun loadHomeData() {
        viewModelScope.launch {
            _uiState.value = HomeUiState.Loading
            try {
                val featured = homeRepository.getFeaturedContent()
                val live = homeRepository.getLiveChannels()
                _uiState.value = HomeUiState.Success(featured, live)
            } catch (e: Exception) {
                _uiState.value = HomeUiState.Error(e.message ?: "Unknown error")
            }
        }
    }
}

sealed class HomeUiState {
    object Loading : HomeUiState()
    data class Success(
        val featured: List<ContentDto>,
        val liveChannels: List<ChannelDto>
    ) : HomeUiState()
    data class Error(val message: String) : HomeUiState()
}
```

**Repository Pattern:**
```kotlin
// data/repository/HomeRepository.kt
class HomeRepository @Inject constructor(
    private val apiService: ApiService,
    private val homeDao: HomeDao
) {
    suspend fun getFeaturedContent(): List<ContentDto> {
        return try {
            val response = apiService.getFeaturedContent()
            homeDao.insertFeatured(response.map { it.toEntity() })
            response
        } catch (e: Exception) {
            homeDao.getFeatured().map { it.toDto() }
        }
    }
}
```

**Screen Pattern:**
```kotlin
// home/HomeScreen.kt
@Composable
fun HomeScreen(
    viewModel: HomeViewModel = hiltViewModel(),
    navController: NavController
) {
    val uiState by viewModel.uiState.collectAsState()

    when (val state = uiState) {
        is HomeUiState.Loading -> LoadingIndicator()
        is HomeUiState.Success -> HomeContent(
            featured = state.featured,
            liveChannels = state.liveChannels,
            onNavigate = navController::navigate
        )
        is HomeUiState.Error -> ErrorView(
            message = state.message,
            onRetry = viewModel::loadHomeData
        )
    }
}
```

**Dependency Injection:**
```kotlin
// di/AppModule.kt
@Module
@InstallIn(SingletonComponent::class)
object AppModule {
    @Provides
    @Singleton
    fun provideOkHttpClient(
        authInterceptor: AuthInterceptor
    ): OkHttpClient = OkHttpClient.Builder()
        .addInterceptor(authInterceptor)
        .build()

    @Provides
    @Singleton
    fun provideRetrofit(client: OkHttpClient): Retrofit = ...
}
```

### Comparison

| Aspect | iOS | Android |
|--------|-----|---------|
| Architecture | Flat (Screen → API) | MVVM (Screen → ViewModel → Repository → API) |
| State management | Zustand + useState | StateFlow/MutableStateFlow |
| Type safety | `any` everywhere | Full type safety with data classes |
| Error handling | Missing in most screens | Sealed classes for UI states |
| Dependency injection | None | Hilt DI |
| Separation of concerns | ✗ No layers | ✓ UI/Domain/Data layers |
| Local persistence | AsyncStorage (key-value) | Room database (relational) |
| Offline support | ✗ None | ✓ Repository caches data |
| Testability | Low (tight coupling) | High (DI + repositories) |
| Code organization | ~22 files | ~100+ files |

---

## 5. API INTEGRATION

### iOS API Client

**Location:** Uses `web/src/services/api.js` (not mobile-specific)

**Implementation:**
```typescript
// Shared with web
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  timeout: 10000,
});

// Auth interceptor in mobile-app/src/services/auth.ts
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

**Endpoints (17 shared):**
- GET `/channels` - Live channels
- GET `/channels/:id/schedule` - Channel schedule
- GET `/content` - All content
- GET `/content/movies` - Movies
- GET `/content/series` - Series
- GET `/content/series/:id/episodes` - Episodes
- GET `/radio/stations` - Radio stations
- GET `/podcasts` - Podcasts list
- GET `/audiobooks` - Audiobooks list
- GET `/search` - Universal search
- GET `/user/profile` - User profile
- GET `/user/watchlist` - Watch list
- POST `/user/watchlist` - Add to watch list
- DELETE `/user/watchlist/:id` - Remove from watch list
- GET `/epg` - EPG data
- POST `/auth/login` - Login
- POST `/auth/logout` - Logout

**Issues:**
- No typed response interfaces (all `any`)
- Shares web API client (not optimized for mobile)
- No response caching
- Limited error handling

### Android API Client

**Location:** `android/app/src/main/java/tv/bayit/plus/data/remote/`

**Implementation:**
```kotlin
// ApiService.kt
interface ApiService {
    @GET("channels")
    suspend fun getChannels(): List<ChannelDto>

    @GET("channels/{id}/schedule")
    suspend fun getChannelSchedule(@Path("id") id: String): List<ProgramDto>

    @GET("content/movies")
    suspend fun getMovies(@Query("category") category: String?): List<ContentDto>

    @GET("content/series")
    suspend fun getSeries(@Query("category") category: String?): List<ContentDto>

    @GET("content/series/{id}/episodes")
    suspend fun getSeriesEpisodes(@Path("id") id: String): List<EpisodeDto>

    @GET("radio/stations")
    suspend fun getRadioStations(): List<RadioStationDto>

    @GET("podcasts")
    suspend fun getPodcasts(): List<PodcastDto>

    @GET("podcasts/{id}")
    suspend fun getPodcastDetail(@Path("id") id: String): PodcastDetailDto

    @GET("podcasts/{id}/episodes")
    suspend fun getPodcastEpisodes(@Path("id") id: String): List<PodcastEpisodeDto>

    @GET("audiobooks")
    suspend fun getAudiobooks(): List<AudiobookDto>

    @GET("audiobooks/{id}")
    suspend fun getAudiobookDetail(@Path("id") id: String): AudiobookDetailDto

    @GET("search")
    suspend fun search(@Query("q") query: String): SearchResultDto

    @GET("user/profile")
    suspend fun getUserProfile(): UserProfileDto

    @GET("user/watchlist")
    suspend fun getWatchlist(): List<WatchlistItemDto>

    @POST("user/watchlist")
    suspend fun addToWatchlist(@Body item: WatchlistItemDto): Unit

    @DELETE("user/watchlist/{id}")
    suspend fun removeFromWatchlist(@Path("id") id: String): Unit

    @GET("user/favorites")
    suspend fun getFavorites(): List<FavoriteDto>

    @POST("user/favorites")
    suspend fun addFavorite(@Body item: FavoriteDto): Unit

    @DELETE("user/favorites/{id}")
    suspend fun removeFavorite(@Path("id") id: String): Unit

    @GET("user/downloads")
    suspend fun getDownloads(): List<DownloadDto>

    @GET("beta500/credits")
    suspend fun getBeta500Credits(): Beta500CreditsDto

    @GET("epg")
    suspend fun getEpg(): EpgDataDto
}
```

**DTOs (9 typed data classes):**
```kotlin
// dto/ChannelDto.kt
data class ChannelDto(
    val id: String,
    val name: String,
    val logo: String,
    val category: String,
    val streamUrl: String
)

// dto/ContentDto.kt
data class ContentDto(
    val id: String,
    val title: String,
    val description: String,
    val poster: String,
    val type: String,  // "movie" | "series"
    val rating: Double,
    val year: Int,
    val duration: Int?,
    val genres: List<String>
)

// ... 7 more DTOs
```

**Auth Interceptor:**
```kotlin
// data/remote/AuthInterceptor.kt
class AuthInterceptor @Inject constructor(
    private val authRepository: AuthRepository
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val token = runBlocking { authRepository.getToken() }
        val request = chain.request().newBuilder()
            .apply {
                token?.let { addHeader("Authorization", "Bearer $it") }
            }
            .build()
        return chain.proceed(request)
    }
}
```

### Comparison

| Aspect | iOS | Android |
|--------|-----|---------|
| API client | Axios (shared with web) | Retrofit (mobile-optimized) |
| Type safety | ✗ No types (`any`) | ✓ Full DTOs |
| Endpoints | 17 | 23 (6 more) |
| Auth injection | Interceptor | AuthInterceptor |
| Error handling | Basic | Sealed result classes |
| Response caching | ✗ None | ✓ Repository layer |
| Offline support | ✗ None | ✓ Room DB fallback |

**Android-Only Endpoints (6):**
1. GET `/podcasts/{id}` - Podcast detail
2. GET `/podcasts/{id}/episodes` - Podcast episodes
3. GET `/audiobooks/{id}` - Audiobook detail
4. GET `/user/favorites` (GET/POST/DELETE) - Favorites CRUD
5. GET `/user/downloads` - Downloads list
6. GET `/beta500/credits` - Beta 500 credits

---

## 6. MEDIA PLAYBACK

### iOS Player

**Video Player:**
```typescript
// PlayerScreen.tsx (react-native-video 6.0)
<Video
  source={{ uri: streamUrl }}
  style={styles.video}
  controls={false}
  paused={!isPlaying}
  onLoad={handleLoad}
  onProgress={handleProgress}
  selectedTextTrack={selectedSubtitle}
  selectedAudioTrack={selectedAudioTrack}
  resizeMode="contain"
/>
```

**Features:**
- ✓ HLS streaming support
- ✓ Subtitle track selection
- ✓ Audio track selection
- ✓ Quality selection (static list)
- ✗ No seek slider (only +/- 10s buttons)
- ✗ No playback speed control
- ✗ No dynamic quality/subtitle enumeration

**Audio Player:**
```typescript
// Radio/Podcast/Audiobook screens have NO audio player integration
// react-native-track-player is listed in package.json but NEVER USED
// No initialization, no service, no playback controls
```

**Critical Issue:** `react-native-track-player` dependency exists but is completely unused. No background audio capability.

### Android Player

**Unified Player Manager:**
```kotlin
// player/BayitPlayerManager.kt
object BayitPlayerManager {
    private var exoPlayer: ExoPlayer? = null

    fun initialize(context: Context) {
        exoPlayer = ExoPlayer.Builder(context)
            .setMediaSourceFactory(
                DefaultMediaSourceFactory(context)
                    .setDataSourceFactory(
                        DefaultHttpDataSource.Factory()
                            .setUserAgent("BayitPlus/1.4.0")
                    )
            )
            .build()
    }

    fun play(mediaItem: MediaItem) {
        exoPlayer?.setMediaItem(mediaItem)
        exoPlayer?.prepare()
        exoPlayer?.play()
    }

    fun setPlaybackSpeed(speed: Float) {
        exoPlayer?.setPlaybackSpeed(speed)
    }

    // ... pause, seekTo, release methods
}
```

**Background Service:**
```kotlin
// player/BayitPlayerService.kt
class BayitPlayerService : MediaSessionService() {
    private var mediaSession: MediaSession? = null

    override fun onCreate() {
        super.onCreate()
        val player = BayitPlayerManager.getPlayer()
        mediaSession = MediaSession.Builder(this, player)
            .setCallback(MediaSessionCallback())
            .build()
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? {
        return mediaSession
    }
}
```

**Managers:**
- `SubtitleManager.kt` - Enumerate/select subtitle tracks from stream
- `QualityManager.kt` - Enumerate/select video qualities with bitrate info
- `AudioTrackManager.kt` - Enumerate/select audio tracks with language

**Features:**
- ✓ HLS + DASH streaming
- ✓ Dynamic subtitle/audio/quality track enumeration
- ✓ Seek slider with time display
- ✓ Playback speed (0.5x - 2.0x)
- ✓ Background playback service
- ✓ Lock screen controls
- ✓ Notification media controls
- ✓ Picture-in-Picture (PiP)

### Comparison

| Feature | iOS | Android |
|---------|-----|---------|
| Video player | react-native-video | ExoPlayer (Media3) |
| Audio player | ✗ Unused dependency | ExoPlayer (unified) |
| HLS support | ✓ | ✓ |
| DASH support | ✗ | ✓ |
| Background audio | ✗ | ✓ MediaSessionService |
| Lock screen controls | ✗ | ✓ MediaSession |
| Playback speed | ✗ | ✓ 0.5x-2.0x |
| Seek slider | ✗ (only buttons) | ✓ Slider component |
| Dynamic track enumeration | ✗ Static lists | ✓ From stream metadata |
| Notification controls | ✗ | ✓ |
| Picture-in-Picture | ✗ | ✓ |

**Critical Gap:** iOS cannot play audio in background or show lock screen controls. Essential for radio, podcasts, and audiobooks.

---

## 7. LOCALIZATION (i18n)

### iOS Localization

**Framework:** i18next + react-i18next

**Configuration:**
```typescript
// i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as resources from './locales';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    supportedLngs: ['en', 'he', 'ru', 'fr', 'es', 'ar', 'de', 'pt', 'yi', 'am'],
    interpolation: {
      escapeValue: false,
    },
  });
```

**Translation Files:** `/locales/{lang}/common.json` (10 languages)

**Usage:**
```typescript
import { useTranslation } from 'react-i18next';

const { t, i18n } = useTranslation();
<Text>{t('home.welcome')}</Text>
```

**RTL Support:**
- ✗ No explicit RTL layout helper
- ✗ No `I18nManager.forceRTL()` calls
- React Native has built-in RTL support but not configured

### Android Localization

**Framework:** Android native `strings.xml` resources

**Configuration:**
```xml
<!-- res/values/strings.xml (English - default) -->
<resources>
    <string name="app_name">Bayit Plus</string>
    <string name="home_welcome">Welcome to Bayit+</string>
    <!-- ... 106 more strings -->
</resources>

<!-- res/values-he/strings.xml (Hebrew) -->
<resources>
    <string name="app_name">בית פלוס</string>
    <string name="home_welcome">ברוכים הבאים לבית+</string>
    <!-- ... 106 more strings -->
</resources>

<!-- 8 more language directories: ru, fr, es, ar, de, pt, yi, am -->
```

**RTL Helper:**
```kotlin
// util/LocaleHelper.kt
object LocaleHelper {
    fun setLocale(context: Context, languageCode: String): Context {
        val locale = Locale(languageCode)
        Locale.setDefault(locale)

        val config = Configuration(context.resources.configuration)
        config.setLocale(locale)
        config.setLayoutDirection(locale)

        return context.createConfigurationContext(config)
    }

    fun isRtl(languageCode: String): Boolean {
        return languageCode in listOf("he", "ar", "yi")
    }
}
```

**Manifest:**
```xml
<application android:supportsRtl="true">
```

### Comparison

| Aspect | iOS | Android |
|--------|-----|---------|
| Framework | i18next | Android resources |
| Languages | 10 | 10 (matching) |
| Language codes | en, he, ru, fr, es, ar, de, pt, yi, am | en, he, ru, fr, es, ar, de, pt, yi, am |
| String count | ~50 keys | 108 strings per language |
| RTL layout helper | ✗ Missing | ✓ LocaleHelper.isRtl() |
| RTL configuration | ✗ Not set up | ✓ setLayoutDirection() |
| Manifest RTL support | N/A | ✓ android:supportsRtl="true" |

**Gap:** iOS lacks explicit RTL layout configuration for Hebrew/Arabic/Yiddish.

---

## 8. AUTHENTICATION & SECURITY

### iOS Authentication

**Service:**
```typescript
// services/auth.ts
import auth from '@react-native-firebase/auth';

export const login = async (email: string, password: string) => {
  const userCredential = await auth().signInWithEmailAndPassword(email, password);
  return userCredential.user;
};

export const register = async (email: string, password: string, displayName: string) => {
  const userCredential = await auth().createUserWithEmailAndPassword(email, password);
  await userCredential.user.updateProfile({ displayName });
  return userCredential.user;
};

export const logout = async () => {
  await auth().signOut();
};

export const getToken = async () => {
  const user = auth().currentUser;
  if (!user) return null;
  return await user.getIdToken();
};
```

**Store:**
```typescript
// stores/useAuthStore.ts
export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  login: async (email, password) => {
    const user = await authService.login(email, password);
    set({ user, isAuthenticated: true });
  },
  checkAuth: async () => {
    const user = await authService.getCurrentUser();
    set({ user, isAuthenticated: !!user });
  },
}));
```

**Screens:**
- ✓ Login screen (`LoginScreen.tsx`)
- ✗ No Register screen (service exists but no UI)
- ✗ No Forgot Password screen

### Android Authentication

**Repository:**
```kotlin
// data/repository/AuthRepository.kt
class AuthRepository @Inject constructor(
    private val firebaseAuth: FirebaseAuth
) {
    private val _isAuthenticated = MutableStateFlow(false)
    val isAuthenticated: StateFlow<Boolean> = _isAuthenticated.asStateFlow()

    init {
        firebaseAuth.addAuthStateListener { auth ->
            _isAuthenticated.value = auth.currentUser != null
        }
    }

    suspend fun login(email: String, password: String): Result<FirebaseUser> {
        return try {
            val result = firebaseAuth.signInWithEmailAndPassword(email, password).await()
            Result.success(result.user!!)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun register(displayName: String, email: String, password: String): Result<FirebaseUser> {
        return try {
            val result = firebaseAuth.createUserWithEmailAndPassword(email, password).await()
            val user = result.user!!
            val profileUpdates = userProfileChangeRequest {
                this.displayName = displayName
            }
            user.updateProfile(profileUpdates).await()
            Result.success(user)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun sendPasswordReset(email: String): Result<Unit> {
        return try {
            firebaseAuth.sendPasswordResetEmail(email).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun logout() {
        firebaseAuth.signOut()
    }

    suspend fun getToken(): String? {
        return firebaseAuth.currentUser?.getIdToken(false)?.await()?.token
    }
}
```

**Screens:**
- ✓ Login (`auth/LoginScreen.kt`)
- ✓ Register (`auth/RegisterScreen.kt`)
- ✓ Forgot Password (`auth/ForgotPasswordScreen.kt`)

**ViewModels:** Each screen has dedicated ViewModel with form validation and error handling.

### Comparison

| Feature | iOS | Android |
|---------|-----|---------|
| Login screen | ✓ | ✓ |
| Register screen | ✗ (service exists) | ✓ |
| Forgot Password screen | ✗ | ✓ |
| Password reset API | ✗ | ✓ sendPasswordReset() |
| Auth state listener | Manual checkAuth() | Firebase AuthStateListener |
| Token management | getToken() | getToken() |
| Form validation | Basic | Comprehensive (ViewModels) |
| Error handling | Basic | Typed Result<T> |

---

## 9. PLATFORM-SPECIFIC FEATURES

### Android-Only Features

**1. Home Screen Widgets (2 widgets):**
```kotlin
// widget/NowPlayingWidget.kt
class NowPlayingWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val currentTrack = BayitPlayerManager.getCurrentTrack()
        provideContent {
            GlassCard {
                Column {
                    Text(currentTrack?.title ?: "Not Playing")
                    Row {
                        PlayPauseButton()
                        SkipButton()
                    }
                }
            }
        }
    }
}

// widget/EPGWidget.kt - Shows current & next program
```

**Widget Gallery Screen:** Showcases widgets with installation instructions.

**2. Deep Linking:**
```xml
<!-- AndroidManifest.xml -->
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="bayit.tv" />
    <data android:scheme="bayitplus" />
</intent-filter>
```

**3. Foreground Service:**
```kotlin
// player/BayitPlayerService.kt
class BayitPlayerService : MediaSessionService() {
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIFICATION_ID, createNotification())
        return START_STICKY
    }
}
```

**4. Network Monitoring:**
```kotlin
// util/NetworkMonitor.kt
class NetworkMonitor @Inject constructor(
    private val connectivityManager: ConnectivityManager
) {
    val isConnected: Flow<Boolean> = callbackFlow {
        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                trySend(true)
            }
            override fun onLost(network: Network) {
                trySend(false)
            }
        }
        connectivityManager.registerDefaultNetworkCallback(callback)
        awaitClose { connectivityManager.unregisterNetworkCallback(callback) }
    }
}
```

**5. Push Notifications:**
```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

**6. Splash Screen:**
```kotlin
// Uses AndroidX core-splashscreen library
implementation("androidx.core:core-splashscreen:1.0.1")
```

**7. Interactive Subtitles:**
```kotlin
// subtitles/InteractiveSubtitlesScreen.kt
// Placeholder for tap-to-translate subtitle feature
```

### iOS-Only Features

**1. Privacy Manifest:**
```xml
<!-- ios/BayitPlusMobile/PrivacyInfo.xcprivacy -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>NSPrivacyAccessedAPITypes</key>
    <array><!-- API declarations --></array>
</dict>
</plist>
```

**2. Launch Screen:**
```xml
<!-- ios/BayitPlusMobile/LaunchScreen.storyboard -->
```

**3. Landscape Support:**
```xml
<!-- ios/BayitPlusMobile/Info.plist -->
<key>UISupportedInterfaceOrientations</key>
<array>
    <string>UIInterfaceOrientationPortrait</string>
    <string>UIInterfaceOrientationLandscapeLeft</string>
    <string>UIInterfaceOrientationLandscapeRight</string>
</array>
```

### Both Missing

**iOS Missing:**
- ✗ No home screen widgets (WidgetKit exists but unused)
- ✗ No deep link handling (no URL scheme in Info.plist)
- ✗ No push notification registration code
- ✗ No network monitoring
- ✗ No foreground audio service

**Android Missing:**
- (None - Android has all platform features implemented)

---

## 10. PERFORMANCE & OPTIMIZATION

### iOS Performance

**Image Loading:**
```typescript
// Uses React Native <Image> with no caching
<Image source={{ uri: posterUrl }} style={styles.poster} />
```
- ✗ No image cache configuration
- ✗ No memory management
- ✗ No loading placeholders
- ✗ No error fallbacks

**Video Streaming:**
```typescript
// Basic react-native-video with no optimization
<Video source={{ uri: hlsUrl }} />
```
- ✗ No bitrate adaptation
- ✗ No preloading
- ✗ No buffer configuration

**List Rendering:**
```typescript
// Uses FlatList (good - virtualized)
<FlatList
  data={content}
  renderItem={({ item }) => <ContentCard item={item} />}
  keyExtractor={item => item.id}
/>
```

**Memory Management:**
- ✗ No explicit memory management
- ✗ No cleanup in useEffect

### Android Performance

**Image Loading (Coil):**
```kotlin
// util/ImageLoader.kt
object ImageLoader {
    fun initialize(context: Context) {
        val imageLoader = ImageLoader.Builder(context)
            .memoryCache {
                MemoryCache.Builder(context)
                    .maxSizePercent(0.25)  // 25% of available memory
                    .build()
            }
            .diskCache {
                DiskCache.Builder()
                    .directory(context.cacheDir.resolve("image_cache"))
                    .maxSizePercent(0.02)  // 2% of disk
                    .build()
            }
            .crossfade(true)
            .build()
        Coil.setImageLoader(imageLoader)
    }
}
```

**Usage:**
```kotlin
AsyncImage(
    model = posterUrl,
    contentDescription = title,
    placeholder = painterResource(R.drawable.placeholder),
    error = painterResource(R.drawable.error),
    modifier = Modifier.size(120.dp)
)
```

**Video Streaming (ExoPlayer):**
- Adaptive bitrate streaming
- Configurable buffer settings
- Preloading support

**List Rendering (Compose):**
```kotlin
LazyColumn {
    items(content) { item ->
        ContentCard(item)
    }
}
```

**Memory Management:**
```kotlin
// ViewModel
override fun onCleared() {
    super.onCleared()
    BayitPlayerManager.release()
}
```

**Build Optimization:**
```groovy
// build.gradle
buildTypes {
    release {
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

### Comparison

| Aspect | iOS | Android |
|--------|-----|---------|
| Image caching | ✗ None | ✓ Coil (25% mem, 2% disk) |
| Image placeholders | ✗ None | ✓ Built-in |
| Image error handling | ✗ None | ✓ Built-in |
| Video optimization | Basic | ExoPlayer (adaptive) |
| List virtualization | ✓ FlatList | ✓ LazyColumn |
| Memory management | ✗ None | ✓ ViewModel cleanup |
| Build optimization | ✗ None | ✓ ProGuard + shrink |

---

## 11. TESTING

### iOS Tests

**Location:** `mobile-app/__tests__/`

**Files:**
- `App.test.tsx` (1 file, ~15 lines)

**Content:**
```typescript
import React from 'react';
import renderer from 'react-test-renderer';
import App from '../App';

it('renders correctly', () => {
  const tree = renderer.create(<App />).toJSON();
  expect(tree).toBeTruthy();
});
```

**Framework:** Jest + react-test-renderer

**Coverage:** <5% (far below 87% requirement)

### Android Tests

**Unit Tests (`app/src/test/`):**

| File | Lines | Description |
|------|-------|-------------|
| `HomeViewModelTest.kt` | 87 | Home screen state management |
| `PlayerViewModelTest.kt` | 95 | Player controls and states |
| `ChannelRepositoryTest.kt` | 65 | Channel data fetching |
| `ContentRepositoryTest.kt` | 70 | Content data fetching |

**Instrumentation Tests (`app/src/androidTest/`):**

| File | Lines | Description |
|------|-------|-------------|
| `HomeScreenTest.kt` | 55 | Home screen UI |
| `PlayerScreenTest.kt` | 60 | Player screen UI |
| `NavigationTest.kt` | 75 | Navigation flows |

**Frameworks:**
- JUnit 4
- MockK 1.13.13 (mocking)
- Turbine 1.2.0 (Flow testing)
- Coroutines Test
- Compose UI Test
- Espresso

**Example:**
```kotlin
// HomeViewModelTest.kt
@Test
fun `loadHomeData updates state to Success when repository returns data`() = runTest {
    // Given
    val featured = listOf(ContentDto(...))
    val live = listOf(ChannelDto(...))
    coEvery { homeRepository.getFeaturedContent() } returns featured
    coEvery { homeRepository.getLiveChannels() } returns live

    // When
    val viewModel = HomeViewModel(homeRepository)

    // Then
    viewModel.uiState.test {
        assertThat(awaitItem()).isInstanceOf(HomeUiState.Loading::class.java)
        val success = awaitItem() as HomeUiState.Success
        assertThat(success.featured).isEqualTo(featured)
        assertThat(success.liveChannels).isEqualTo(live)
    }
}
```

**Coverage:** ~25-35% (better than iOS but still below 87% requirement)

### Comparison

| Metric | iOS | Android |
|--------|-----|---------|
| Unit test files | 1 | 4 |
| UI test files | 0 | 3 |
| Total test files | **1** | **7** |
| Test LOC | ~15 | ~500+ |
| Frameworks | Jest | JUnit, MockK, Turbine, Espresso, Compose Test |
| Coverage | **<5%** | **~25-35%** |
| Meets 87% requirement | ❌ NO | ❌ NO |

**Both platforms fail the 87% coverage requirement**, but Android is significantly further along with 7x more test files.

---

## 12. CODE QUALITY

### iOS Code Issues

**1. Excessive `any` Types:**
```typescript
// stores/useContentStore.ts
export const useContentStore = create((set) => ({
  featuredContent: [],        // type: any[]
  liveChannels: [],           // type: any[]
  trending: [],               // type: any[]
  categories: [],             // type: any[]
  // ...
}))

// HomeScreen.tsx
const [content, setContent] = useState([])  // type: any[]
const [channels, setChannels] = useState([]) // type: any[]
```

**Files with `any` types:**
- `stores/useContentStore.ts`
- `stores/usePlayerStore.ts`
- `screens/HomeScreen.tsx`
- `screens/LiveTVScreen.tsx`
- `screens/VODScreen.tsx`
- `screens/RadioScreen.tsx`
- `screens/SearchScreen.tsx`
- `screens/ChannelDetailScreen.tsx`
- `screens/ContentDetailScreen.tsx`
- `components/EPGGrid.tsx`

**2. Dead Event Handlers:**
```typescript
// PodcastScreen.tsx
<Pressable onPress={() => {}}>  {/* Does nothing */}
  <Text>{podcast.title}</Text>
</Pressable>

// AudiobookScreen.tsx
<Pressable onPress={() => {}}>  {/* Does nothing */}
  <Text>{audiobook.title}</Text>
</Pressable>
```

**3. Missing Error Handling:**
```typescript
// HomeScreen.tsx
useEffect(() => {
  fetchFeaturedContent()  // No try/catch, no error state
}, [])

// ChannelDetailScreen.tsx
const loadSchedule = async () => {
  const data = await api.get(`/channels/${id}/schedule`)  // No error handling
  setSchedule(data)
}
```

**Files without error handling:**
- `HomeScreen.tsx`
- `ChannelDetailScreen.tsx`
- `ContentDetailScreen.tsx`
- `EPGScreen.tsx`

**4. No Glass UI Components:**
```typescript
// LoginScreen.tsx
<TextInput           {/* Should use GlassTextField */}
  style={{
    backgroundColor: '#1a1a1a',
    color: '#fff',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
  }}
/>

<Pressable           {/* Should use GlassButton */}
  style={{
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 10,
  }}
>
  <Text style={{ color: '#fff' }}>Login</Text>
</Pressable>
```

**5. Hardcoded Colors:**
```typescript
// Every StyleSheet.create has hardcoded colors
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0A0A0A',  // Should use theme
  },
  text: {
    color: '#FFFFFF',            // Should use theme
  },
  card: {
    backgroundColor: '#1a1a1a',  // Should use theme
    borderColor: '#333',         // Should use theme
  },
})
```

**6. MiniPlayer Icon Hack:**
```typescript
// components/MiniPlayer.tsx
<Text style={styles.playButton}>
  {isPlaying ? 'II' : '>'}  {/* Should use @olorin/icons */}
</Text>
```

### Android Code Quality

**Architecture:**
- ✓ Clean MVVM separation
- ✓ Dependency injection (Hilt)
- ✓ Typed data classes
- ✓ Sealed classes for states
- ✓ Proper error handling

**Minor Issues:**

**1. `android.util.Log` Usage:**
```kotlin
// util/Logger.kt
object Logger {
    fun d(tag: String, message: String) {
        android.util.Log.d(tag, message)  // Should use Timber
    }
}
```

**Recommendation:** Use Timber with custom tree for structured logging.

**2. Hardcoded String:**
```kotlin
// auth/RegisterViewModel.kt
if (password != confirmPassword) {
    _uiState.value = RegisterUiState.Error("Passwords do not match")  // Should be string resource
}
```

### Comparison

| Aspect | iOS | Android |
|--------|-----|---------|
| Architecture | Flat (poor) | Clean MVVM (excellent) |
| Type safety | `any` everywhere | Full type safety |
| Error handling | Missing in most files | Comprehensive |
| UI components | Raw elements | Glass UI library |
| Color management | Hardcoded | Theme system |
| Logging | None | Logger utility |
| Code organization | ~22 files | ~100+ files |
| CLAUDE.md compliance | ❌ Multiple violations | ✓ Compliant |

---

## 13. CONSOLIDATED GAP SUMMARY

### Features MISSING from iOS (exist in Android)

| # | Feature | Android File(s) | Priority | LOC Est. |
|---|---------|-----------------|----------|----------|
| 1 | Register screen | `auth/RegisterScreen.kt`, `RegisterViewModel.kt` | HIGH | 150 |
| 2 | Forgot Password screen | `auth/ForgotPasswordScreen.kt` | HIGH | 120 |
| 3 | Beta 500 Credits screen | `beta500/Beta500Screen.kt`, `Beta500ViewModel.kt` | HIGH | 180 |
| 4 | Podcast Detail screen | `podcast/PodcastDetailScreen.kt` | HIGH | 140 |
| 5 | Podcast Player screen | `podcast/PodcastPlayerScreen.kt` | HIGH | 200 |
| 6 | Audiobook Detail screen | `audiobook/AudiobookDetailScreen.kt` | HIGH | 140 |
| 7 | Audiobook Player screen | `audiobook/AudiobookPlayerScreen.kt` | HIGH | 200 |
| 8 | Downloads screen | `downloads/DownloadsScreen.kt`, `DownloadsViewModel.kt` | MEDIUM | 160 |
| 9 | Favorites screen | `favorites/FavoritesScreen.kt`, `FavoritesViewModel.kt` | MEDIUM | 150 |
| 10 | Interactive Subtitles screen | `subtitles/InteractiveSubtitlesScreen.kt` | LOW | 100 |
| 11 | Widget Gallery screen | `widgets/WidgetGalleryScreen.kt` | LOW | 80 |
| 12 | Background media service | `player/BayitPlayerService.kt` | HIGH | 150 |
| 13 | Home screen widgets | `widget/NowPlayingWidget.kt`, `widget/EPGWidget.kt` | MEDIUM | 200 |
| 14 | Deep linking | AndroidManifest intent-filters | MEDIUM | 50 |
| 15 | Network monitoring | `util/NetworkMonitor.kt` | MEDIUM | 60 |
| 16 | Local database | `data/local/BayitDatabase.kt`, 3 DAOs, 3 entities | HIGH | 400 |
| 17 | Glass UI library | `ui/components/Glass*.kt` (9 files) | HIGH | 500 |
| 18 | Loading/Error/Empty states | `LoadingIndicator.kt`, `ErrorView.kt`, `EmptyStateView.kt` | HIGH | 125 |
| 19 | Seek slider in player | `PlayerControls.kt` Slider | MEDIUM | 40 |
| 20 | Playback speed control | `BayitPlayerManager.setPlaybackSpeed()` | MEDIUM | 60 |
| 21 | Image caching config | `util/ImageLoader.kt` | MEDIUM | 50 |
| 22 | RTL layout helper | `util/LocaleHelper.kt` | MEDIUM | 45 |
| 23 | Podcasts tab in nav | `BottomNavBar.kt` | MEDIUM | 20 |
| 24 | EPG time bar | `epg/EPGTimeBar.kt` | LOW | 70 |
| 25 | Structured logging | `util/Logger.kt` | MEDIUM | 40 |
| 26 | Date formatting | `util/DateFormatter.kt` | LOW | 30 |
| 27 | Typed API DTOs | `data/remote/dto/*.kt` (9 files) | HIGH | 400 |
| 28 | 6 API endpoints | Podcast detail, episode, audiobook detail, beta500, favorites | HIGH | 80 |

**Total Estimated LOC to Achieve Parity:** ~3,740 lines

### Features MISSING from Android (exist in iOS)

| # | Feature | iOS File | Priority | Notes |
|---|---------|----------|----------|-------|
| 1 | Streaming URL builder | `services/streaming.ts` | LOW | Simple utility, Android handles in repository layer |

**Total:** 1 minor utility (~30 LOC)

---

## 14. RECOMMENDED ACTION PLAN

### Phase 1: Critical Architecture (HIGH PRIORITY)
**Goal:** Fix CLAUDE.md violations and establish foundation

| Task | Description | Files | Est. Hours |
|------|-------------|-------|------------|
| 1.1 | Create Glass UI library | 9 components (GlassCard, GlassButton, etc.) | 16h |
| 1.2 | Add state components | LoadingIndicator, ErrorView, EmptyStateView | 4h |
| 1.3 | Create TypeScript interfaces | API response types, store types | 6h |
| 1.4 | Add error handling | try/catch in all screens | 4h |
| 1.5 | Replace `any` types | Type all stores and screens | 6h |
| 1.6 | Create theme system | Colors, typography constants | 3h |

**Subtotal:** 39 hours (~1 week)

### Phase 2: Missing Screens (HIGH PRIORITY)
**Goal:** Achieve screen parity with Android

| Task | Description | Files | Est. Hours |
|------|-------------|-------|------------|
| 2.1 | Register screen | Screen + route | 4h |
| 2.2 | Forgot Password screen | Screen + route | 3h |
| 2.3 | Podcast Detail screen | Screen + route | 5h |
| 2.4 | Podcast Player screen | Screen with speed controls | 8h |
| 2.5 | Audiobook Detail screen | Screen + route | 5h |
| 2.6 | Audiobook Player screen | Screen with chapters, speed, timer | 8h |
| 2.7 | Beta 500 Credits screen | Screen + route | 5h |
| 2.8 | Favorites screen | Screen + CRUD logic | 6h |
| 2.9 | Downloads screen | Screen + offline management | 8h |

**Subtotal:** 52 hours (~1.5 weeks)

### Phase 3: Missing Infrastructure (HIGH PRIORITY)
**Goal:** Background audio, persistence, optimization

| Task | Description | Files | Est. Hours |
|------|-------------|-------|------------|
| 3.1 | Initialize track player | Setup service for background audio | 8h |
| 3.2 | Add local persistence | AsyncStorage or MMKV for offline data | 6h |
| 3.3 | RTL layout helper | I18nManager configuration | 2h |
| 3.4 | Podcasts navigation tab | Add to TabNavigator | 1h |
| 3.5 | Network monitoring hook | Connectivity listener | 3h |
| 3.6 | Image caching | Configure react-native-fast-image or similar | 4h |
| 3.7 | Player seek slider | Replace buttons with slider | 3h |
| 3.8 | Playback speed control | Add speed picker UI | 3h |
| 3.9 | Typed API DTOs | Create 9 DTO interfaces | 4h |

**Subtotal:** 34 hours (~1 week)

### Phase 4: Platform Features (MEDIUM PRIORITY)
**Goal:** iOS-specific enhancements

| Task | Description | Files | Est. Hours |
|------|-------------|-------|------------|
| 4.1 | Deep linking | URL schemes in Info.plist + handler | 4h |
| 4.2 | Push notifications | FCM setup + registration | 6h |
| 4.3 | WidgetKit evaluation | Research & prototype | 8h |
| 4.4 | Interactive Subtitles | Port Android screen | 4h |

**Subtotal:** 22 hours (~0.5 weeks)

### Phase 5: Testing (HIGH PRIORITY)
**Goal:** Reach 87% coverage on both platforms

| Task | Description | Files | Est. Hours |
|------|-------------|-------|------------|
| 5.1 | iOS screen tests | Test all 12+ screens | 16h |
| 5.2 | iOS store tests | Test all Zustand stores | 6h |
| 5.3 | iOS service tests | Test auth, api, streaming services | 6h |
| 5.4 | iOS component tests | Test all components | 8h |
| 5.5 | Android coverage expansion | Add tests to reach 87% | 12h |
| 5.6 | E2E tests (both) | Critical user flows | 16h |

**Subtotal:** 64 hours (~2 weeks)

### Total Effort Estimate
- **Phase 1-3 (Critical):** 125 hours (~3.5 weeks)
- **Phase 4-5 (Important):** 86 hours (~2.5 weeks)
- **Grand Total:** ~211 hours (~6 weeks with 1 developer)

---

## 15. PRIORITY MATRIX

### Critical (Must Fix)
1. ✓ Glass UI component library
2. ✓ Remove all `any` types
3. ✓ Add error handling everywhere
4. ✓ Background audio service (track-player)
5. ✓ Register & Forgot Password screens
6. ✓ Podcast/Audiobook detail + player screens
7. ✓ Beta 500 Credits screen
8. ✓ Typed API DTOs
9. ✓ Test coverage to 87%

### High Priority
10. ✓ Local database/persistence
11. ✓ Favorites & Downloads screens
12. ✓ Image caching
13. ✓ Seek slider + playback speed
14. ✓ RTL layout support

### Medium Priority
15. ✓ Deep linking
16. ✓ Network monitoring
17. ✓ Podcasts navigation tab
18. ✓ Home screen widgets

### Low Priority
19. ✓ Interactive Subtitles screen
20. ✓ Widget Gallery screen
21. ✓ EPG time bar component
22. ✓ Date formatting utility

---

## APPENDIX A: File Statistics

### iOS
- **Total Source Files:** 22
- **Total LOC:** ~8,000
- **Screens:** 12
- **Components:** 6
- **Stores:** 3
- **Services:** 3
- **Test Files:** 1

### Android
- **Total Source Files:** 100+
- **Total LOC:** ~15,000
- **Screens:** 25 (18 packages with ViewModels)
- **Components:** 11
- **Repositories:** 12
- **DTOs:** 9
- **DAOs:** 3
- **Widgets:** 2
- **Test Files:** 7

---

## APPENDIX B: Technology Stack

### iOS
| Category | Technology | Version |
|----------|-----------|---------|
| Framework | React Native | 0.73 |
| Language | TypeScript | 5.x |
| Navigation | React Navigation | 6.x |
| State | Zustand | 4.x |
| Auth | @react-native-firebase/auth | 19.0 |
| Video | react-native-video | 6.0 |
| Audio | react-native-track-player | 4.0 (unused) |
| HTTP | Axios | 1.x |
| i18n | react-i18next | 13.x |
| Testing | Jest + react-test-renderer | Latest |

### Android
| Category | Technology | Version |
|----------|-----------|---------|
| Framework | Jetpack Compose | 1.6.2 |
| Language | Kotlin | 1.9.22 |
| Navigation | Compose Navigation | 2.7.7 |
| DI | Hilt | 2.51 |
| Auth | Firebase Auth KTX | 33.7.0 (BOM) |
| Player | Media3 ExoPlayer | 1.5.1 |
| HTTP | Retrofit + OkHttp | 2.11.0 + 4.12.0 |
| Image | Coil | 2.7.0 |
| Database | Room | 2.6.1 |
| i18n | Android Resources | Native |
| Testing | JUnit 4 + MockK + Espresso | Latest |

---

**Document Status:** Complete
**Next Steps:** Proceed to Implementation Plan
**Estimated Total Effort:** ~211 hours (~6 weeks with 1 developer)
**Agent ID:** a1fd7cc (resume with this ID for follow-up questions)
