# Phase 2: Repository Implementations + Auth (Weeks 2-3)

**Prerequisites:** Phase 1 complete ✅

---

## Task List

### 1. Repository Implementations (48 files)

Create implementation for each repository interface in `core/core-data/src/main/java/tv/bayit/plus/core/data/repository/impl/`:

**Pattern for each repository:**

```kotlin
package tv.bayit.plus.core.data.repository.impl

import retrofit2.http.*
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.result.runCatchingResult
import tv.bayit.plus.core.data.repository.ContentRepository
import tv.bayit.plus.core.network.BayitApiClient
import javax.inject.Inject
import javax.inject.Singleton

// Retrofit service interface
private interface ContentService {
    @GET("api/content/home")
    suspend fun getHomeFeed(): HomeFeedResponse

    @GET("api/content/{id}")
    suspend fun getContentById(@Path("id") id: String): ContentResponse
}

// Repository implementation
@Singleton
class ApiContentRepository @Inject constructor(
    private val client: BayitApiClient,
) : ContentRepository {

    private val service = client.createService<ContentService>()

    override suspend fun getHomeFeed(): BayitResult<HomeFeed> = runCatchingResult {
        service.getHomeFeed().toModel()
    }

    override suspend fun getContentById(id: String): BayitResult<Content> = runCatchingResult {
        service.getContentById(id).toModel()
    }
}
```

**Implementation order (prioritize by screen usage):**

| Priority | Repositories | For Screens |
|----------|-------------|-------------|
| **P0** | ContentRepository, UserRepository | Home, Profile |
| **P1** | LiveTVRepository, EPGRepository | LiveTV, EPG |
| **P2** | MediaRepository, SeriesRepository | Player, SeriesDetail |
| **P3** | RadioRepository, PodcastRepository | Radio, Podcasts |
| **P4** | SettingsRepository, SecurityRepository | Settings suite |
| **P5** | FriendsRepository, WatchPartyRepository, ChessRepository, DirectMessageRepository | Social features |
| **P6** | Remaining 30+ repositories | Specialized screens |

### 2. Auth Module Implementation

**Refactor existing Kotlin modules from `mobile-app/android/app/src/main/java/com/bayitplus/modules/`:**

#### BiometricAuthService.kt (strip RN bridge)

```kotlin
package tv.bayit.plus.core.auth

import android.content.Context
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.fragment.app.FragmentActivity
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class BiometricAuthService @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val _authState = MutableStateFlow(BiometricAuthState.IDLE)
    val authState: StateFlow<BiometricAuthState> = _authState

    suspend fun authenticate(activity: FragmentActivity): Result<Unit> {
        // Port logic from BiometricAuthModule.kt
        // Remove React Native bridge, use Kotlin coroutines
    }

    fun canAuthenticate(): BiometricCapability {
        // Port from BiometricAuthModule.canAuthenticate()
    }
}

enum class BiometricAuthState {
    IDLE, AUTHENTICATING, SUCCESS, FAILED, CANCELLED
}

data class BiometricCapability(
    val canAuthenticate: Boolean,
    val hasStrongBiometric: Boolean,
    val hasWeakBiometric: Boolean,
    val deviceSecure: Boolean,
)
```

**Files to create:**
- `core/core-auth/src/main/java/tv/bayit/plus/core/auth/BiometricAuthService.kt`
- `core/core-auth/src/main/java/tv/bayit/plus/core/auth/SecureStorageService.kt` (refactor SecureStorageModule.kt)
- `core/core-auth/src/main/java/tv/bayit/plus/core/auth/FirebaseAuthService.kt` (new)
- `core/core-auth/src/main/java/tv/bayit/plus/core/auth/PasskeyService.kt` (new)
- `core/core-auth/src/main/java/tv/bayit/plus/core/auth/AuthTokenProviderImpl.kt` (implements core-network interface)
- `core/core-auth/src/main/java/tv/bayit/plus/core/auth/di/AuthModule.kt` (Hilt bindings)

### 3. Database Setup (Room + DataStore)

**Room entities for offline caching:**

```kotlin
// core/core-database/src/main/java/tv/bayit/plus/core/database/BayitDatabase.kt
@Database(
    entities = [
        CachedContentEntity::class,
        CachedChannelEntity::class,
        DownloadedMediaEntity::class,
        WatchHistoryEntity::class,
        FavoriteEntity::class,
    ],
    version = 1,
)
abstract class BayitDatabase : RoomDatabase() {
    abstract fun contentDao(): ContentDao
    abstract fun channelDao(): ChannelDao
    abstract fun downloadDao(): DownloadDao
    abstract fun watchHistoryDao(): WatchHistoryDao
    abstract fun favoriteDao(): FavoriteDao
}
```

**DataStore for preferences:**

```kotlin
// core/core-database/src/main/java/tv/bayit/plus/core/database/UserPreferencesDataStore.kt
@Singleton
class UserPreferencesDataStore @Inject constructor(
    @ApplicationContext context: Context,
) {
    private val dataStore = context.dataStore

    val userPreferences: Flow<UserPreferences> = dataStore.data
        .map { preferences ->
            UserPreferences(
                language = preferences[LANGUAGE_KEY] ?: "en",
                subtitleLanguage = preferences[SUBTITLE_LANGUAGE_KEY],
                audioQuality = preferences[AUDIO_QUALITY_KEY] ?: "auto",
                autoPlay = preferences[AUTO_PLAY_KEY] ?: true,
            )
        }

    suspend fun updateLanguage(language: String) {
        dataStore.edit { it[LANGUAGE_KEY] = language }
    }
}
```

### 4. First Feature Module (Home Screen)

**Create `feature/feature-home/` implementation:**

```kotlin
// feature/feature-home/src/main/java/tv/bayit/plus/feature/home/HomeScreen.kt
@Composable
fun HomeRoute(
    onNavigateToPlayer: (String, String) -> Unit,
    viewModel: HomeViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    HomeScreen(
        uiState = uiState,
        onContentClick = { content ->
            onNavigateToPlayer(content.id, content.type.name)
        },
        onRefresh = viewModel::refresh,
    )
}

@Composable
private fun HomeScreen(
    uiState: HomeUiState,
    onContentClick: (Content) -> Unit,
    onRefresh: () -> Unit,
) {
    when (uiState) {
        is HomeUiState.Loading -> GlassLoadingIndicator()
        is HomeUiState.Success -> {
            LazyColumn {
                // Hero carousel
                item {
                    GlassHeroCarousel(
                        items = uiState.feed.hero,
                        onItemClick = onContentClick,
                    )
                }
                // Content shelves
                items(uiState.feed.shelves) { shelf ->
                    GlassContentShelf(
                        title = shelf.title,
                        items = shelf.items,
                        onItemClick = onContentClick,
                    )
                }
            }
        }
        is HomeUiState.Error -> {
            // Error state
        }
    }
}

// feature/feature-home/src/main/java/tv/bayit/plus/feature/home/HomeViewModel.kt
@HiltViewModel
class HomeViewModel @Inject constructor(
    private val contentRepository: ContentRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow<HomeUiState>(HomeUiState.Loading)
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        loadHomeFeed()
    }

    fun refresh() = loadHomeFeed()

    private fun loadHomeFeed() {
        viewModelScope.launch {
            _uiState.value = HomeUiState.Loading
            when (val result = contentRepository.getHomeFeed()) {
                is BayitResult.Success -> {
                    _uiState.value = HomeUiState.Success(result.data)
                }
                is BayitResult.Failure -> {
                    _uiState.value = HomeUiState.Error(result.error.message)
                }
            }
        }
    }
}

sealed interface HomeUiState {
    data object Loading : HomeUiState
    data class Success(val feed: HomeFeed) : HomeUiState
    data class Error(val message: String) : HomeUiState
}
```

**Update `app/navigation/BayitNavHost.kt`:**

```kotlin
import tv.bayit.plus.feature.home.HomeRoute

// Replace placeholder:
composable<Route.Home> {
    HomeRoute(
        onNavigateToPlayer = { contentId, contentType ->
            navController.navigate(Route.Player(contentId, contentType))
        }
    )
}
```

---

## Development Workflow for Phase 2

### Step 1: Implement One Repository

1. Read the corresponding iOS repository in `ios-app/BayitPlusApp/Repositories/`
2. Note the endpoint paths from backend at `backend/app/api/`
3. Create `Api*Repository.kt` in `core-data/repository/impl/`
4. Define Retrofit service interface with HTTP methods
5. Implement repository interface methods
6. Wrap responses in `runCatchingResult { }`
7. Update `RepositoryModule.kt` binding from interface to impl

### Step 2: Implement Auth

1. Create `FirebaseAuthService.kt` with email/password + Google Sign-In
2. Create `AuthTokenProviderImpl.kt` implementing `core-network` interface
3. Refactor `BiometricAuthModule.kt` → `BiometricAuthService.kt`
4. Refactor `SecureStorageModule.kt` → `SecureStorageService.kt`
5. Create `AuthModule.kt` with all bindings

### Step 3: Build First Screen

1. Implement `ApiContentRepository` + `ApiUserRepository`
2. Create `HomeScreen.kt` + `HomeViewModel.kt` in `feature-home/`
3. Update `BayitNavHost` to use `HomeRoute()` instead of placeholder
4. Test on emulator: deep link → home feed rendering

### Step 4: Verify Build

```bash
# Compile all modules
./gradlew build

# Run on emulator
./gradlew installDebug

# Run unit tests
./gradlew test

# Check test coverage
./gradlew jacocoTestReport
# Open: build/reports/jacoco/test/html/index.html
```

---

## Reference Files (iOS to Android Mapping)

| iOS File | Android Equivalent | Status |
|----------|-------------------|--------|
| `BayitPlusApp/App/RepositoryProvider.swift` | `app/di/RepositoryModule.kt` | ✅ Structure complete |
| `BayitPlusApp/Navigation/Route.swift` | `app/navigation/Route.kt` | ✅ Complete |
| `Packages/BayitNetworking/Sources/BayitNetworking/APIClient.swift` | `core-network/BayitApiClient.kt` + interceptors | ✅ Complete |
| `Packages/BayitNetworking/Sources/BayitNetworking/WebSocketManager.swift` | `core-network/websocket/WebSocketManager.kt` | ✅ Complete |
| `Packages/BayitDesignSystem/Sources/BayitDesignSystem/Tokens/DesignTokens.swift` | `designsystem/theme/DesignTokens.kt` | ✅ Complete |
| `BayitPlusApp/Repositories/*Repository.swift` | `core-data/repository/impl/Api*Repository.kt` | ⏳ Interfaces only |
| `BayitPlusApp/Models/*.swift` | `core-model/*.kt` | ✅ 19 files |
| `BayitPlusApp/Screens/*.swift` | `feature-*/src/main/java/*/Screen.kt` | ⏳ Not started |

---

## Common Patterns to Follow

### Repository Implementation

```kotlin
@Singleton
class ApiLiveTVRepository @Inject constructor(
    private val client: BayitApiClient,
) : LiveTVRepository {

    private val service = client.createService<LiveTVService>()

    override suspend fun getChannels(): BayitResult<List<LiveChannel>> = runCatchingResult {
        service.getChannels().map { it.toModel() }
    }
}

private interface LiveTVService {
    @GET("api/livetv/channels")
    suspend fun getChannels(): List<LiveChannelDto>
}
```

### ViewModel Pattern

```kotlin
@HiltViewModel
class SomeViewModel @Inject constructor(
    private val someRepository: SomeRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow<SomeUiState>(SomeUiState.Loading)
    val uiState: StateFlow<SomeUiState> = _uiState.asStateFlow()

    init {
        loadData()
    }

    private fun loadData() {
        viewModelScope.launch {
            _uiState.value = SomeUiState.Loading
            when (val result = someRepository.getData()) {
                is BayitResult.Success -> {
                    _uiState.value = SomeUiState.Success(result.data)
                }
                is BayitResult.Failure -> {
                    _uiState.value = SomeUiState.Error(result.error.message)
                }
            }
        }
    }
}

sealed interface SomeUiState {
    data object Loading : SomeUiState
    data class Success(val data: SomeData) : SomeUiState
    data class Error(val message: String) : SomeUiState
}
```

### Screen Pattern

```kotlin
@Composable
fun SomeRoute(
    onNavigateBack: () -> Unit,
    viewModel: SomeViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    SomeScreen(
        uiState = uiState,
        onAction = viewModel::handleAction,
        onNavigateBack = onNavigateBack,
    )
}

@Composable
private fun SomeScreen(
    uiState: SomeUiState,
    onAction: (SomeAction) -> Unit,
    onNavigateBack: () -> Unit,
) {
    Scaffold(
        topBar = {
            GlassTopBar(
                title = "Screen Title",
                navigationIcon = { BackButton(onClick = onNavigateBack) },
            )
        },
    ) { padding ->
        when (uiState) {
            is SomeUiState.Loading -> GlassLoadingIndicator()
            is SomeUiState.Success -> {
                // Render content
            }
            is SomeUiState.Error -> {
                // Error state with retry
            }
        }
    }
}
```

---

## Testing Requirements

### Unit Tests for Each Repository

```kotlin
class ApiContentRepositoryTest {
    private lateinit var mockWebServer: MockWebServer
    private lateinit var repository: ContentRepository

    @Before
    fun setup() {
        mockWebServer = MockWebServer()
        mockWebServer.start()
        // Create test BayitApiClient pointing to mockWebServer.url("/")
    }

    @Test
    fun `getHomeFeed returns success when API returns 200`() = runTest {
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody("""{"hero":[],"shelves":[]}""")
        )

        val result = repository.getHomeFeed()

        assertTrue(result is BayitResult.Success)
    }

    @After
    fun teardown() {
        mockWebServer.shutdown()
    }
}
```

### ViewModel Tests

```kotlin
@OptIn(ExperimentalCoroutinesApi::class)
class HomeViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private val mockContentRepository = mockk<ContentRepository>()
    private lateinit var viewModel: HomeViewModel

    @Test
    fun `uiState emits Success when repository returns data`() = runTest {
        coEvery { mockContentRepository.getHomeFeed() } returns
            BayitResult.Success(HomeFeed(emptyList(), emptyList()))

        viewModel = HomeViewModel(mockContentRepository)

        viewModel.uiState.test {
            assertEquals(HomeUiState.Loading, awaitItem())
            val success = awaitItem()
            assertTrue(success is HomeUiState.Success)
        }
    }
}
```

---

## Firebase Setup

1. **Download `google-services.json`** from Firebase Console
2. Place at: `android-app/app/google-services.json`
3. Enable Firebase Authentication in Firebase Console
4. Enable Google Sign-In provider
5. Add SHA-1 fingerprint for Google Sign-In:

```bash
# Debug keystore SHA-1
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

---

## Estimated Effort

| Task | Files | Est. Time |
|------|-------|-----------|
| Repository implementations (P0-P2) | 20 repos | 3-4 days |
| Auth module (Firebase + Biometric) | 6 files | 1-2 days |
| Database setup (Room + DataStore) | 8 files | 1 day |
| Home screen + ViewModel | 2 files | 1 day |
| Unit tests for P0-P2 repos | 20 test files | 2-3 days |
| **Total Phase 2** | **~56 files** | **8-11 days** |

---

## Success Criteria

- [ ] Top 20 repositories implemented and tested (87%+ coverage)
- [ ] Firebase Auth integrated (email/password + Google Sign-In)
- [ ] Biometric auth working on physical device
- [ ] Home screen renders hero + shelves from backend API
- [ ] Navigation from Home → Player works
- [ ] `./gradlew build` compiles without errors
- [ ] `./gradlew test` passes all unit tests
- [ ] App launches on emulator and shows home feed

**Phase 2 Target:** End of Week 3 (1 week remaining from 18-week timeline)
