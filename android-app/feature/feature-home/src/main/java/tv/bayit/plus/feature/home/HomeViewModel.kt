package tv.bayit.plus.feature.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.CategoryRepository
import tv.bayit.plus.core.data.repository.ContentRepository
import tv.bayit.plus.core.data.repository.LiveTVRepository
import tv.bayit.plus.core.data.repository.RadioRepository
import tv.bayit.plus.core.model.CityContentResponse
import tv.bayit.plus.core.model.CollectionDetail
import tv.bayit.plus.core.model.CultureTrendingItem
import tv.bayit.plus.core.model.FeaturedResponse
import tv.bayit.plus.core.model.IsraeliBusinessesResponse
import tv.bayit.plus.core.model.IsraelisInCityResponse
import tv.bayit.plus.core.model.LiveChannelItem
import tv.bayit.plus.core.model.RadioStationItem
import tv.bayit.plus.core.model.SectionContentItem
import tv.bayit.plus.core.model.WatchHistoryItem
import javax.inject.Inject

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val contentRepository: ContentRepository,
    private val liveTVRepository: LiveTVRepository,
    private val radioRepository: RadioRepository,
    private val categoryRepository: CategoryRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<HomeUiState>(HomeUiState.Loading)
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    private val hiddenChannelKeywords = listOf("king 5", "king5", "cnn", "abc")
    private val hiddenCategoryKeywords = listOf(
        "movie", "series", "audiobook", "kid", "children", "music", "documentar"
    )

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

    private suspend fun loadAdditionalSections(featured: FeaturedResponse) {
        val liveChannelsDeferred = viewModelScope.async { loadLiveChannels() }
        val radioStationsDeferred = viewModelScope.async { loadRadioStations() }
        val continueWatchingDeferred = viewModelScope.async { loadContinueWatching() }
        val collectionsDeferred = viewModelScope.async { loadFeaturedCollections() }
        val trendingDeferred = viewModelScope.async { loadTrending() }
        val youngstersDeferred = viewModelScope.async { loadYoungsters() }
        val telAvivDeferred = viewModelScope.async { loadTelAvivContent() }
        val jerusalemDeferred = viewModelScope.async { loadJerusalemContent() }
        val israelisDeferred = viewModelScope.async { loadIsraelisInCity() }
        val businessesDeferred = viewModelScope.async { loadIsraeliBusinesses() }

        val liveChannels = liveChannelsDeferred.await()
        val radioStations = radioStationsDeferred.await()
        val continueWatching = continueWatchingDeferred.await()
        val featuredCollections = collectionsDeferred.await()
        val trending = trendingDeferred.await()
        val youngsters = youngstersDeferred.await()
        val telAviv = telAvivDeferred.await()
        val jerusalem = jerusalemDeferred.await()
        val israelisInCity = israelisDeferred.await()
        val israeliBusinesses = businessesDeferred.await()

        logger.info(
            "Home feed loaded",
            mapOf(
                "spotlightCount" to featured.spotlight.size.toString(),
                "categoriesCount" to featured.categories.size.toString(),
                "liveChannelsCount" to liveChannels.size.toString(),
                "radioStationsCount" to radioStations.size.toString(),
            ),
        )

        _uiState.value = HomeUiState.Success(
            hero = featured.hero,
            spotlight = featured.spotlight,
            categories = filterCategories(featured.categories),
            liveChannels = liveChannels,
            radioStations = radioStations,
            continueWatching = continueWatching,
            featuredCollections = featuredCollections,
            trendingContent = trending,
            youngstersTrending = youngsters,
            telAvivContent = telAviv,
            jerusalemContent = jerusalem,
            israelisInCity = israelisInCity,
            israeliBusinesses = israeliBusinesses,
            isRefreshing = false,
        )
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
        return emptyList()
    }

    private suspend fun loadTrending(): List<CultureTrendingItem> {
        return emptyList()
    }

    private suspend fun loadYoungsters(): List<SectionContentItem> {
        return emptyList()
    }

    private suspend fun loadTelAvivContent(): CityContentResponse? {
        return null
    }

    private suspend fun loadJerusalemContent(): CityContentResponse? {
        return null
    }

    private suspend fun loadIsraelisInCity(): IsraelisInCityResponse? {
        return null
    }

    private suspend fun loadIsraeliBusinesses(): IsraeliBusinessesResponse? {
        return null
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
        val isRefreshing: Boolean = false,
    ) : HomeUiState

    data class Error(
        val message: String,
    ) : HomeUiState
}
