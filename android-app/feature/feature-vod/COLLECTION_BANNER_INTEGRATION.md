# Collection Banner Integration Guide - Android

This guide explains how to integrate the rotating collection banner into the Android VOD screen.

## Files Created

- ✅ `/feature-vod/src/main/java/tv/bayit/plus/feature/vod/components/CollectionBanner.kt`

## Integration Steps

### 1. Update ContentRepository

Add method to fetch collection recommendations:

```kotlin
// In: core/data/src/main/java/tv/bayit/plus/core/data/repository/ContentRepository.kt

interface ContentRepository {
    // ... existing methods ...

    /**
     * Fetch all published collections with weighted random ordering
     */
    suspend fun getCollectionRecommendations(): Result<List<Collection>>
}
```

### 2. Implement in ContentRepositoryImpl

```kotlin
// In: core/data/src/main/java/tv/bayit/plus/core/data/repository/ContentRepositoryImpl.kt

override suspend fun getCollectionRecommendations(): Result<List<Collection>> {
    return try {
        val response = apiClient.get<List<CollectionDto>>(
            "/content/collections/recommendations"
        )
        Result.success(response.map { it.toCollection() })
    } catch (e: Exception) {
        Result.failure(e)
    }
}
```

### 3. Update VodUiState

Add collections to the UI state:

```kotlin
// In: feature/feature-vod/src/main/java/tv/bayit/plus/feature/vod/VodUiState.kt

sealed interface VodUiState {
    data object Loading : VodUiState

    data class Success(
        val contentItems: List<ContentItem>,
        val categories: List<Category>,
        val selectedCategoryId: String?,
        val isRefreshing: Boolean,
        val isLoadingContent: Boolean,
        val collections: List<Collection> = emptyList(), // ADD THIS
    ) : VodUiState

    data class Error(val message: String) : VodUiState
}
```

### 4. Update VodViewModel

Load collections when initializing:

```kotlin
// In: feature/feature-vod/src/main/java/tv/bayit/plus/feature/vod/VodViewModel.kt

@HiltViewModel
class VodViewModel @Inject constructor(
    private val contentRepository: ContentRepository,
    // ... other dependencies
) : ViewModel() {

    init {
        loadCategories()
        loadContent()
        loadCollections() // ADD THIS
    }

    private fun loadCollections() {
        viewModelScope.launch {
            contentRepository.getCollectionRecommendations()
                .onSuccess { collections ->
                    _uiState.update { currentState ->
                        if (currentState is VodUiState.Success) {
                            currentState.copy(collections = collections)
                        } else {
                            currentState
                        }
                    }
                }
                .onFailure { error ->
                    // Silently fail - banner is optional
                    logger.error("Failed to load collection recommendations", error)
                }
        }
    }

    // ... rest of ViewModel
}
```

### 5. Update VodScreen

Add the banner to the Composable:

```kotlin
// In: feature/feature-vod/src/main/java/tv/bayit/plus/feature/vod/VodScreen.kt

import tv.bayit.plus.feature.vod.components.CollectionBanner

@Composable
internal fun VodScreen(
    uiState: VodUiState,
    onContentClick: (ContentItem) -> Unit,
    onCategorySelected: (String) -> Unit,
    onRefresh: () -> Unit,
    onCollectionClick: (String) -> Unit, // ADD THIS PARAMETER
    modifier: Modifier = Modifier,
) {
    when (uiState) {
        is VodUiState.Loading -> GlassLoadingIndicator(modifier = modifier)
        is VodUiState.Success -> {
            PullToRefreshBox(
                isRefreshing = uiState.isRefreshing,
                onRefresh = onRefresh,
                modifier = modifier,
            ) {
                Column(modifier = Modifier.fillMaxSize()) {
                    if (uiState.categories.isNotEmpty()) {
                        VodCategoryTabRow(
                            categories = uiState.categories,
                            selectedCategoryId = uiState.selectedCategoryId,
                            onCategorySelected = onCategorySelected,
                        )
                    }

                    // ADD COLLECTION BANNER HERE
                    if (uiState.collections.isNotEmpty()) {
                        CollectionBanner(
                            collections = uiState.collections,
                            onCollectionClick = onCollectionClick,
                            currentLanguage = getCurrentLanguage(), // Get from LocalizationManager
                            autoRotate = true,
                            rotationIntervalMs = 5000L
                        )
                    }

                    // Rest of the UI (loading, content grid, etc.)
                    if (uiState.isLoadingContent) {
                        // ... loading state
                    } else {
                        LazyVerticalGrid(
                            // ... content grid
                        ) {
                            // ... grid items
                        }
                    }
                }
            }
        }
        is VodUiState.Error -> VodErrorSection(
            message = uiState.message,
            onRetry = onRefresh,
            modifier = modifier,
        )
    }
}
```

### 6. Update VodRoute

Add navigation handler:

```kotlin
@Composable
fun VodRoute(
    onNavigateToContent: (String, String) -> Unit,
    onNavigateToCollection: (String) -> Unit, // ADD THIS PARAMETER
    modifier: Modifier = Modifier,
    viewModel: VodViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    VodScreen(
        uiState = uiState,
        onContentClick = { item ->
            val type = item.type ?: if (item.isSeries == true) "series" else "movie"
            onNavigateToContent(item.id, type)
        },
        onCategorySelected = viewModel::selectCategory,
        onRefresh = viewModel::refresh,
        onCollectionClick = onNavigateToCollection, // ADD THIS
        modifier = modifier,
    )
}
```

### 7. Update Navigation

Ensure collection navigation is wired up in your NavGraph:

```kotlin
// In your navigation setup
composable(VodDestination.route) {
    VodRoute(
        onNavigateToContent = { id, type -> /* ... */ },
        onNavigateToCollection = { collectionId ->
            navController.navigate("collection/$collectionId")
        }
    )
}
```

## Dependencies

Ensure you have these dependencies in `build.gradle.kts`:

```kotlin
dependencies {
    implementation("io.coil-kt:coil-compose:2.5.0") // For AsyncImage
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    implementation("androidx.compose.animation:animation:1.6.0")
    // ... other dependencies
}
```

## Testing

1. **Build the project** to ensure no compilation errors
2. **Run on emulator/device** to verify:
   - Collections load from `/content/collections/recommendations`
   - Banner rotates every 5 seconds
   - Fade transitions are smooth
   - Clicking navigates to collection detail
   - Pagination dots update correctly

## Backend Endpoint

The banner fetches data from:
```
GET /api/v1/content/collections/recommendations
```

Response format:
```json
[
  {
    "id": "string",
    "title": "string",
    "title_en": "string",
    "thumbnail": "string",
    "backdrop": "string",
    "promo_text": "string",
    "promo_text_en": "string",
    "promo_text_es": "string",
    // ... other language fields
    "available_movies": 0,
    "total_movies": 0
  }
]
```

## Performance Notes

- Collections are cached server-side for 30 minutes
- Rotation uses Compose's Animatable for smooth 60fps animations
- Images are loaded lazily with Coil
- Rotation pauses when user interacts

## Troubleshooting

**Banner not showing:**
- Check backend is running and endpoint returns data
- Verify `collections` list in UI state is populated
- Check logs for API errors

**Rotation not working:**
- Ensure `autoRotate = true` is passed
- Check that collections list has > 1 item
- Verify coroutines are not cancelled

**Images not loading:**
- Verify Coil is added as dependency
- Check image URLs are valid HTTPS
- Test with Android emulator network permissions
