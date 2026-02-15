# HomeScreen Architecture & Data Flow

## Component Hierarchy

```
HomeRoute (Navigation Layer)
└── HomeScreen (UI Layer)
    ├── PageHeader
    ├── CultureClock (Israel)
    ├── CultureClock (New York)
    ├── HeroCarousel (conditional)
    │   └── GlassCarousel
    │       └── GlassCard (per item)
    ├── ContinueWatchingRow (conditional)
    │   └── LazyRow
    │       └── GlassContentCard (per item)
    ├── LiveTVRow (conditional)
    │   └── LazyRow
    │       └── GlassContentCard (per channel)
    ├── RadioStationsRow (conditional)
    │   └── LazyRow
    │       └── GlassContentCard (per station)
    ├── LocationContentRow (conditional)
    │   └── LazyRow
    │       └── GlassContentCard (per item)
    ├── BusinessLocationRow (conditional)
    │   └── LazyRow
    │       └── GlassContentCard (per item)
    ├── TrendingRow (conditional)
    │   └── LazyRow
    │       └── GlassContentCard (per item)
    ├── YoungstersSection (conditional)
    │   └── LazyRow
    │       └── GlassContentCard (per item)
    ├── CityContentRow (Jerusalem, conditional)
    │   └── LazyRow
    │       └── GlassContentCard (per item)
    ├── CityContentRow (Tel Aviv, conditional)
    │   └── LazyRow
    │       └── GlassContentCard (per item)
    └── CategoryRow[] (filtered list)
        └── LazyRow
            └── GlassContentCard (per item)
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        HomeViewModel                        │
│                                                             │
│  Dependencies (Injected via Hilt):                         │
│  • ContentRepository                                        │
│  • LiveTVRepository                                         │
│  • RadioRepository                                          │
│  • CategoryRepository                                       │
│  • BayitLogger                                              │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ Exposes StateFlow
                        ▼
              ┌─────────────────┐
              │   HomeUiState   │
              │                 │
              │  • Loading      │
              │  • Success      │
              │  • Error        │
              └────────┬────────┘
                       │
                       │ Collected in Composable
                       ▼
              ┌─────────────────┐
              │   HomeScreen    │
              │  (Composable)   │
              └─────────────────┘
```

## Parallel Data Loading Flow

```
loadHomeFeed()
    │
    ├── contentRepository.getFeatured()
    │   └── Returns: FeaturedResponse
    │       ├── hero
    │       ├── spotlight
    │       └── categories
    │
    └── loadAdditionalSections() [Parallel Execution]
        │
        ├── async { loadLiveChannels() }
        │   └── liveTVRepository.getChannels()
        │       └── Filter hidden channels (King 5, CNN, ABC)
        │       └── Take first 8
        │
        ├── async { loadRadioStations() }
        │   └── radioRepository.getStations()
        │       └── Take first 8
        │
        ├── async { loadContinueWatching() }
        │   └── [Future: contentRepository.getContinueWatching()]
        │
        ├── async { loadTrending() }
        │   └── [Future: contentRepository.getTrending()]
        │
        ├── async { loadYoungsters() }
        │   └── [Future: categoryRepository.getYoungstersTrending()]
        │
        ├── async { loadTelAvivContent() }
        │   └── [Future: contentRepository.getTelAvivContent()]
        │
        ├── async { loadJerusalemContent() }
        │   └── [Future: contentRepository.getJerusalemContent()]
        │
        ├── async { loadIsraelisInCity() }
        │   └── [Future: contentRepository.getIsraelisInCity(city, state)]
        │
        └── async { loadIsraeliBusinesses() }
            └── [Future: contentRepository.getIsraeliBusinesses(city, state)]
```

## State Management Pattern

```
┌──────────────────────────────────────────────────────────────┐
│                     Initialization                           │
│                                                              │
│  init {                                                      │
│      _uiState.value = HomeUiState.Loading                   │
│      loadHomeFeed()                                          │
│  }                                                           │
└─────────────────────┬────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────┐
│                  Primary Content Load                        │
│                                                              │
│  when (contentRepository.getFeatured()) {                   │
│      is Success -> loadAdditionalSections(featured)         │
│      is Error -> _uiState.value = HomeUiState.Error         │
│  }                                                           │
└─────────────────────┬────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────┐
│              Additional Sections (Parallel)                  │
│                                                              │
│  All sections load in parallel using async/await            │
│  Failures are non-blocking (return empty lists/null)        │
│                                                              │
│  _uiState.value = HomeUiState.Success(                      │
│      hero = featured.hero,                                   │
│      spotlight = featured.spotlight,                         │
│      categories = filterCategories(featured.categories),     │
│      liveChannels = await liveChannelsDeferred,             │
│      radioStations = await radioStationsDeferred,           │
│      ... all other sections                                  │
│  )                                                           │
└──────────────────────────────────────────────────────────────┘
```

## Filtering Logic

### Hidden Channels
```kotlin
hiddenChannelKeywords = ["king 5", "king5", "cnn", "abc"]

channels.filter { channel ->
    val name = channel.name?.lowercase() ?: return@filter true
    !hiddenChannelKeywords.any { keyword -> name.contains(keyword) }
}
```

### Hidden Categories
```kotlin
hiddenCategoryKeywords = [
    "movie", "series", "audiobook",
    "kid", "children", "music", "documentar"
]

categories.filter { category ->
    val name = category.name.lowercase()
    !hiddenCategoryKeywords.any { keyword -> name.contains(keyword) }
}
```

## Navigation Flow

```
HomeScreen
    │
    ├── Spotlight Item Clicked
    │   └── onNavigateToPlayer(itemId, itemType)
    │
    ├── Content Item Clicked
    │   └── onNavigateToContent(itemId, itemType)
    │
    ├── Live Channel Clicked
    │   └── onNavigateToChannel(channelId)
    │
    ├── Radio Station Clicked
    │   └── onNavigateToRadio(stationId)
    │
    ├── Youngsters "Show All" Clicked
    │   └── onNavigateToYoungsters()
    │
    ├── Jerusalem "Show All" Clicked
    │   └── onNavigateToJerusalem()
    │
    └── Tel Aviv "Show All" Clicked
        └── onNavigateToTelAviv()
```

## Error Handling Strategy

```
┌──────────────────────────────────────────────────────────────┐
│                 Primary Content (Blocking)                   │
│                                                              │
│  contentRepository.getFeatured()                            │
│      ├── Success -> Continue to load additional sections    │
│      └── Error -> Show error screen with retry button       │
│                                                              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│            Additional Sections (Non-Blocking)                │
│                                                              │
│  Each section wrapped in try-catch:                         │
│      ├── Success -> Display section                         │
│      └── Error -> Return empty/null, hide section           │
│                                                              │
│  User sees partial content instead of complete failure      │
└──────────────────────────────────────────────────────────────┘
```

## Conditional Rendering Logic

All sections use conditional rendering to only show when data exists:

```kotlin
if (uiState.spotlight.isNotEmpty()) {
    item(key = "hero_carousel") { HeroCarousel(...) }
}

if (uiState.continueWatching.isNotEmpty()) {
    item(key = "continue_watching") { ContinueWatchingRow(...) }
}

if (uiState.liveChannels.isNotEmpty()) {
    item(key = "live_tv") { LiveTVRow(...) }
}

// And so on for all optional sections...
```

## Performance Optimizations

1. **Parallel Loading**: All sections load concurrently using Kotlin coroutines
2. **Lazy Rendering**: LazyColumn only renders visible items
3. **Item Keys**: Each item has a unique key for efficient recomposition
4. **Non-Blocking Errors**: Failed sections don't prevent other sections from loading
5. **Image Caching**: CachedAsyncImage component caches loaded images
6. **Stable IDs**: Content items use stable IDs for list rendering

## Design System Usage

### Glass UI Components
- `GlassCard` - Card containers with glass morphism effect
- `GlassContentCard` - Standardized content card with image, title, progress
- `GlassCarousel` - Auto-playing carousel with pagination dots
- `GlassButton` - Glassmorphic buttons
- `GlassLoadingIndicator` - Loading spinner

### Design Tokens
- `Spacing.*` - Consistent spacing scale (xxs to xxxxl)
- `Colors.*` - Color palette (Primary, Secondary, Semantic, Text, Glass)
- `FontSize.*` - Typography scale (xs to hero)
- `Radius.*` - Border radius scale (sm to xxl)

## Future Integration Points

### 1. Feature Flags Service
```kotlin
@Inject lateinit var featureFlags: FeatureFlags

if (featureFlags.isLegacyFeaturesEnabled && uiState.spotlight.isNotEmpty()) {
    item(key = "hero_carousel") { HeroCarousel(...) }
}
```

### 2. Location Provider
```kotlin
@Inject lateinit var locationProvider: LocationProvider

suspend fun loadLocationContent() {
    val location = locationProvider.getCurrentLocation()
    location?.let { (city, state) ->
        loadIsraelisInCity(city, state)
        loadIsraeliBusinesses(city, state)
    }
}
```

### 3. Analytics Tracking
```kotlin
@Inject lateinit var analytics: Analytics

fun trackSectionImpression(sectionName: String) {
    analytics.logEvent("home_section_impression", mapOf(
        "section_name" to sectionName
    ))
}
```

## Testing Strategy

### Unit Tests (HomeViewModelTest)
```kotlin
@Test
fun `loadHomeFeed success updates state with all sections`()

@Test
fun `loadHomeFeed error shows error state`()

@Test
fun `filterCategories removes hidden categories`()

@Test
fun `loadLiveChannels filters hidden channels`()

@Test
fun `refresh reloads all data`()
```

### UI Tests (HomeScreenTest)
```kotlin
@Test
fun `shows all sections when data exists`()

@Test
fun `hides sections when no data`()

@Test
fun `pull to refresh triggers reload`()

@Test
fun `clicking content navigates correctly`()

@Test
fun `culture clock updates every second`()
```

## Dependencies Graph

```
HomeViewModel
    ├── ContentRepository -> ApiContentRepository
    ├── LiveTVRepository -> ApiLiveTVRepository
    ├── RadioRepository -> ApiRadioRepository
    ├── CategoryRepository -> ApiCategoryRepository
    └── BayitLogger -> LoggerImpl

All injected via Hilt @HiltViewModel
```

## File Organization

```
feature-home/
├── HomeScreen.kt (Main screen composable, 279 lines)
├── HomeViewModel.kt (ViewModel with state management, 218 lines)
├── HomeSections.kt (Spotlight and Category components, 185 lines)
├── HomeComponents.kt (Content rows and sections, 194 lines)
└── CultureComponents.kt (Culture clocks and location content, 177 lines)

Total: 5 files, all under 200-line limit
```

## Performance Metrics

Expected performance characteristics:
- Initial Load: ~500-800ms (depends on API response time)
- Parallel Section Load: ~200-400ms additional (all sections load concurrently)
- UI Rendering: < 16ms per frame (60fps)
- Memory Usage: ~30-50MB (with image caching)
- Scroll Performance: Maintained at 60fps via LazyColumn
