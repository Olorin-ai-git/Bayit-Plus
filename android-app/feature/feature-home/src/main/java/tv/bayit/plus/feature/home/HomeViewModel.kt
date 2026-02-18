package tv.bayit.plus.feature.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.CategoryRepository
import tv.bayit.plus.core.data.repository.ContentRepository
import tv.bayit.plus.core.data.repository.LiveTVRepository
import tv.bayit.plus.core.data.repository.LocationRepository
import tv.bayit.plus.core.data.repository.RadioRepository
import tv.bayit.plus.core.data.repository.ShabbatRepository
import tv.bayit.plus.core.location.LocationManager
import tv.bayit.plus.core.model.CityContentResponse
import tv.bayit.plus.core.model.CollectionDetail
import tv.bayit.plus.core.model.CultureTrendingItem
import tv.bayit.plus.core.model.FeaturedResponse
import tv.bayit.plus.core.model.IsraeliBusinessesResponse
import tv.bayit.plus.core.model.IsraelisInCityResponse
import tv.bayit.plus.core.model.LiveChannelItem
import tv.bayit.plus.core.model.RadioStationItem
import tv.bayit.plus.core.model.SectionContentItem
import tv.bayit.plus.core.model.ShabbatInfo
import tv.bayit.plus.core.model.WatchHistoryItem
import javax.inject.Inject

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val contentRepository: ContentRepository,
    private val liveTVRepository: LiveTVRepository,
    private val radioRepository: RadioRepository,
    private val categoryRepository: CategoryRepository,
    private val shabbatRepository: ShabbatRepository,
    private val locationRepository: LocationRepository,
    private val locationManager: LocationManager,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<HomeUiState>(HomeUiState.Loading)
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    private val hiddenChannelKeywords = listOf("king 5", "king5", "cnn", "abc")
    private val hiddenCategoryKeywords = emptyList<String>()

    init {
        loadHomeFeed()
    }

    fun refresh() {
        val currentState = _uiState.value
        if (currentState is HomeUiState.Success) {
            _uiState.value = currentState.copy(isRefreshing = true)
        }
        loadHomeFeed()
    }

    private fun loadHomeFeed() {
        viewModelScope.launch {
            logger.debug("Loading home feed")

            when (val featuredResult = contentRepository.getFeatured()) {
                is BayitResult.Success -> {
                    val featured = featuredResult.data as? FeaturedResponse
                    if (featured != null) {
                        loadAdditionalSections(featured)
                    } else {
                        handleError("Invalid featured data format")
                    }
                }
                is BayitResult.Error -> {
                    logger.error(
                        "Home feed load failed",
                        featuredResult.exception,
                        mapOf("errorMessage" to featuredResult.message.orEmpty()),
                    )
                    _uiState.value = HomeUiState.Error(
                        message = featuredResult.message
                            ?: featuredResult.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    private fun loadAdditionalSections(featured: FeaturedResponse) {
        // Show featured content immediately so the user sees the home screen fast
        _uiState.value = HomeUiState.Success(
            hero = featured.hero,
            spotlight = featured.spotlight,
            categories = filterCategories(featured.categories),
            isRefreshing = false,
        )

        logger.info(
            "Home feed featured loaded",
            mapOf(
                "spotlightCount" to featured.spotlight.size.toString(),
                "categoriesCount" to featured.categories.size.toString(),
            ),
        )

        // Load remaining sections in parallel, updating UI as each completes
        launchSection { loadLiveChannels().let { data -> updateState { copy(liveChannels = data) } } }
        launchSection { loadRadioStations().let { data -> updateState { copy(radioStations = data) } } }
        launchSection { loadContinueWatching().let { data -> updateState { copy(continueWatching = data) } } }
        launchSection { loadFeaturedCollections().let { data -> updateState { copy(featuredCollections = data) } } }
        launchSection { loadTrending().let { data -> updateState { copy(trendingContent = data) } } }
        launchSection { loadYoungsters().let { data -> updateState { copy(youngstersTrending = data) } } }
        launchSection { loadTelAvivContent().let { data -> updateState { copy(telAvivContent = data) } } }
        launchSection { loadJerusalemContent().let { data -> updateState { copy(jerusalemContent = data) } } }
        launchSection { loadIsraelisInCity().let { data -> updateState { copy(israelisInCity = data) } } }
        launchSection { loadIsraeliBusinesses().let { data -> updateState { copy(israeliBusinesses = data) } } }
        launchSection { loadShabbatInfo().let { data -> updateState { copy(shabbatInfo = data) } } }
    }

    private fun launchSection(block: suspend () -> Unit) {
        viewModelScope.launch { block() }
    }

    private fun updateState(transform: HomeUiState.Success.() -> HomeUiState.Success) {
        val current = _uiState.value
        if (current is HomeUiState.Success) {
            _uiState.value = current.transform()
        }
    }

    fun dismissShabbatBanner() {
        val currentState = _uiState.value
        if (currentState is HomeUiState.Success) {
            _uiState.value = currentState.copy(isShabbatBannerDismissed = true)
        }
    }

    private suspend fun loadFeaturedCollections(): List<CollectionDetail> {
        return try {
            when (val result = contentRepository.getCollectionRecommendations()) {
                is BayitResult.Success -> result.data
                else -> emptyList()
            }
        } catch (e: Exception) {
            logger.debug("Failed to load collection recommendations (non-blocking)", mapOf("error" to e.message.orEmpty()))
            emptyList()
        }
    }

    private suspend fun loadLiveChannels(): List<LiveChannelItem> {
        return try {
            when (val result = liveTVRepository.getChannels()) {
                is BayitResult.Success -> {
                    val channels = (result.data as? List<*>)?.filterIsInstance<LiveChannelItem>()
                        ?: emptyList()
                    channels.filter { channel ->
                        val name = channel.name?.lowercase() ?: return@filter true
                        !hiddenChannelKeywords.any { keyword -> name.contains(keyword) }
                    }.take(8)
                }
                else -> emptyList()
            }
        } catch (e: Exception) {
            logger.debug("Failed to load live channels (non-blocking)", mapOf("error" to e.message.orEmpty()))
            emptyList()
        }
    }

    private suspend fun loadRadioStations(): List<RadioStationItem> {
        return try {
            when (val result = radioRepository.getStations()) {
                is BayitResult.Success -> {
                    val stations = (result.data as? List<*>)?.filterIsInstance<RadioStationItem>()
                        ?: emptyList()
                    stations.take(8)
                }
                else -> emptyList()
            }
        } catch (e: Exception) {
            logger.debug("Failed to load radio stations (non-blocking)", mapOf("error" to e.message.orEmpty()))
            emptyList()
        }
    }

    private suspend fun loadContinueWatching(): List<WatchHistoryItem> {
        return try {
            when (val result = contentRepository.getContinueWatching()) {
                is BayitResult.Success -> {
                    (result.data as? List<*>)?.filterIsInstance<WatchHistoryItem>() ?: emptyList()
                }
                else -> emptyList()
            }
        } catch (e: Exception) {
            logger.debug("Failed to load continue watching (non-blocking)", mapOf("error" to e.message.orEmpty()))
            emptyList()
        }
    }

    private suspend fun loadTrending(): List<CultureTrendingItem> {
        return try {
            when (val result = contentRepository.getTrending()) {
                is BayitResult.Success -> {
                    (result.data as? List<*>)?.filterIsInstance<CultureTrendingItem>() ?: emptyList()
                }
                else -> emptyList()
            }
        } catch (e: Exception) {
            logger.debug("Failed to load trending (non-blocking)", mapOf("error" to e.message.orEmpty()))
            emptyList()
        }
    }

    private suspend fun loadYoungsters(): List<SectionContentItem> {
        return try {
            when (val result = contentRepository.getYoungstersTrending()) {
                is BayitResult.Success -> {
                    (result.data as? List<*>)?.filterIsInstance<SectionContentItem>() ?: emptyList()
                }
                else -> emptyList()
            }
        } catch (e: Exception) {
            logger.debug("Failed to load youngsters (non-blocking)", mapOf("error" to e.message.orEmpty()))
            emptyList()
        }
    }

    private suspend fun loadTelAvivContent(): CityContentResponse? {
        return try {
            when (val result = contentRepository.getTelAvivContent()) {
                is BayitResult.Success -> result.data as? CityContentResponse
                else -> null
            }
        } catch (e: Exception) {
            logger.debug("Failed to load Tel Aviv content (non-blocking)", mapOf("error" to e.message.orEmpty()))
            null
        }
    }

    private suspend fun loadJerusalemContent(): CityContentResponse? {
        return try {
            when (val result = contentRepository.getJerusalemContent()) {
                is BayitResult.Success -> result.data as? CityContentResponse
                else -> null
            }
        } catch (e: Exception) {
            logger.debug("Failed to load Jerusalem content (non-blocking)", mapOf("error" to e.message.orEmpty()))
            null
        }
    }

    private suspend fun loadIsraelisInCity(): IsraelisInCityResponse? {
        val userLocation = getUserLocation() ?: return null

        return try {
            when (val result = contentRepository.getIsraelisInCity(
                city = userLocation.city,
                state = userLocation.state,
                county = userLocation.county,
            )) {
                is BayitResult.Success -> result.data as? IsraelisInCityResponse
                else -> null
            }
        } catch (e: Exception) {
            logger.debug("Failed to load Israelis in city (non-blocking)", mapOf("error" to e.message.orEmpty()))
            null
        }
    }

    private suspend fun loadIsraeliBusinesses(): IsraeliBusinessesResponse? {
        val userLocation = getUserLocation() ?: return null

        return try {
            when (val result = contentRepository.getIsraeliBusinesses(
                city = userLocation.city,
                state = userLocation.state,
                county = userLocation.county,
            )) {
                is BayitResult.Success -> result.data as? IsraeliBusinessesResponse
                else -> null
            }
        } catch (e: Exception) {
            logger.debug("Failed to load Israeli businesses (non-blocking)", mapOf("error" to e.message.orEmpty()))
            null
        }
    }

    private suspend fun getUserLocation(): tv.bayit.plus.core.model.UserLocation? {
        locationManager.getCachedLocation()?.let { cached ->
            logger.debug("Using cached location", mapOf("city" to cached.city, "state" to cached.state))
            return cached
        }

        if (!locationManager.hasLocationPermission()) {
            logger.debug("Location permission not granted")
            return null
        }

        val deviceLocation = locationManager.getCurrentLocation() ?: run {
            logger.debug("Could not get device location")
            return null
        }

        val userLocation = locationManager.reverseGeocode(
            latitude = deviceLocation.latitude,
            longitude = deviceLocation.longitude,
        ) { lat, lon ->
            when (val result = locationRepository.reverseGeocode(lat, lon)) {
                is BayitResult.Success -> result.data
                else -> null
            }
        } ?: return null

        locationManager.cacheLocation(userLocation)

        return userLocation
    }

    private suspend fun loadShabbatInfo(): ShabbatInfo? {
        return try {
            when (val result = shabbatRepository.getShabbatTimes(32.0853, 34.7818)) {
                is BayitResult.Success -> result.data as? ShabbatInfo
                else -> null
            }
        } catch (e: Exception) {
            logger.debug("Failed to load Shabbat info (non-blocking)", mapOf("error" to e.message.orEmpty()))
            null
        }
    }

    private fun filterCategories(categories: List<tv.bayit.plus.core.model.ContentCategory>): List<tv.bayit.plus.core.model.ContentCategory> {
        return categories.filter { category ->
            val name = category.name.lowercase()
            !hiddenCategoryKeywords.any { keyword -> name.contains(keyword) }
        }
    }

    private fun handleError(message: String) {
        logger.error("Home feed error", null, mapOf("message" to message))
        _uiState.value = HomeUiState.Error(message = message)
    }
}

sealed interface HomeUiState {
    data object Loading : HomeUiState

    data class Success(
        val hero: tv.bayit.plus.core.model.HeroContent? = null,
        val spotlight: List<tv.bayit.plus.core.model.SpotlightItem> = emptyList(),
        val categories: List<tv.bayit.plus.core.model.ContentCategory> = emptyList(),
        val liveChannels: List<LiveChannelItem> = emptyList(),
        val radioStations: List<RadioStationItem> = emptyList(),
        val continueWatching: List<WatchHistoryItem> = emptyList(),
        val featuredCollections: List<CollectionDetail> = emptyList(),
        val trendingContent: List<CultureTrendingItem> = emptyList(),
        val youngstersTrending: List<SectionContentItem> = emptyList(),
        val telAvivContent: CityContentResponse? = null,
        val jerusalemContent: CityContentResponse? = null,
        val israelisInCity: IsraelisInCityResponse? = null,
        val israeliBusinesses: IsraeliBusinessesResponse? = null,
        val shabbatInfo: ShabbatInfo? = null,
        val isShabbatBannerDismissed: Boolean = false,
        val isRefreshing: Boolean = false,
    ) : HomeUiState

    data class Error(
        val message: String,
    ) : HomeUiState
}
