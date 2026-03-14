package tv.bayit.plus.feature.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.OwnerMode
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.download.BayitDownloadManager
import tv.bayit.plus.core.data.repository.BetaCreditsRepository
import tv.bayit.plus.core.model.DownloadStatus
import tv.bayit.plus.core.data.repository.CategoryRepository
import tv.bayit.plus.core.data.repository.ContentRepository
import tv.bayit.plus.core.data.repository.LiveTVRepository
import tv.bayit.plus.core.data.repository.LocationRepository
import tv.bayit.plus.core.data.repository.RadioRepository
import tv.bayit.plus.core.data.repository.ShabbatRepository
import tv.bayit.plus.core.data.repository.SubscriptionRepository
import tv.bayit.plus.core.location.LocationManager
import tv.bayit.plus.core.location.wasPermissionRequested
import tv.bayit.plus.core.byoc.BYOCSourceManager
import tv.bayit.plus.core.model.FeaturedResponse
import tv.bayit.plus.feature.onboarding.TourDataStore
import javax.inject.Inject

@HiltViewModel
class HomeViewModel @Inject constructor(
    internal val contentRepository: ContentRepository,
    internal val liveTVRepository: LiveTVRepository,
    internal val radioRepository: RadioRepository,
    internal val categoryRepository: CategoryRepository,
    internal val shabbatRepository: ShabbatRepository,
    internal val locationRepository: LocationRepository,
    internal val locationManager: LocationManager,
    internal val sourceManager: BYOCSourceManager,
    internal val tourDataStore: TourDataStore,
    internal val subscriptionRepository: SubscriptionRepository,
    internal val betaCreditsRepository: BetaCreditsRepository,
    internal val downloadManager: BayitDownloadManager,
    internal val logger: BayitLogger,
    @OwnerMode internal val ownerMode: Boolean,
) : ViewModel() {

    private val _uiState = MutableStateFlow<HomeUiState>(HomeUiState.Loading)
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    internal val hiddenChannelKeywords = listOf("king 5", "king5", "cnn", "abc")

    init {
        loadHomeFeed()
        observeDownloads()
    }

    private fun observeDownloads() {
        viewModelScope.launch {
            downloadManager.downloads.collect { downloads ->
                val completedIds = downloads
                    .filter { it.status == DownloadStatus.COMPLETED }
                    .map { it.contentId }
                    .toSet()
                updateState { copy(downloadedContentIds = completedIds) }
            }
        }
    }

    fun refresh() {
        loadHomeFeed()
    }

    private fun loadHomeFeed() {
        val isRefresh = _uiState.value is HomeUiState.Success

        if (!isRefresh) {
            _uiState.value = HomeUiState.Success()
        } else {
            updateState { copy(isRefreshing = true) }
        }

        logger.debug("Loading home feed")

        launchSection {
            when (val result = contentRepository.getFeatured()) {
                is BayitResult.Success -> {
                    val featured = result.data as? FeaturedResponse
                    if (featured != null) {
                        logger.info(
                            "Home feed featured loaded",
                            mapOf(
                                "spotlightCount" to featured.spotlight.size.toString(),
                                "categoriesCount" to featured.categories.size.toString(),
                            ),
                        )
                        updateState {
                            copy(
                                hero = if (ownerMode) featured.hero else null,
                                spotlight = if (ownerMode) featured.spotlight else filterSpotlight(featured.spotlight),
                                categories = filterCategories(featured.categories),
                                isRefreshing = false,
                            )
                        }
                    } else {
                        logger.error("Home feed featured: invalid data format", null, emptyMap())
                        updateState { copy(isRefreshing = false) }
                    }
                }
                is BayitResult.Error -> {
                    logger.error(
                        "Home feed featured load failed",
                        result.exception,
                        mapOf("errorMessage" to result.message.orEmpty()),
                    )
                    updateState { copy(isRefreshing = false) }
                }
                is BayitResult.Loading -> Unit
            }
        }

        launchSection { loadLiveChannels().let { data -> updateState { copy(liveChannels = data) } } }
        launchSection { loadRadioStations().let { data -> updateState { copy(radioStations = data) } } }
        launchSection { loadContinueWatching().let { data -> updateState { copy(continueWatching = filterWatchHistory(data)) } } }
        launchSection { loadFeaturedCollections().let { data -> updateState { copy(featuredCollections = data) } } }
        launchSection { loadTrending().let { data -> updateState { copy(trendingContent = filterTrending(data)) } } }
        launchSection { loadYoungsters().let { data -> updateState { copy(youngstersTrending = filterSectionContent(data)) } } }
        launchSection { loadTelAvivContent().let { data -> updateState { copy(telAvivContent = data) } } }
        launchSection { loadJerusalemContent().let { data -> updateState { copy(jerusalemContent = data) } } }
        launchSection { loadShabbatInfo().let { data -> updateState { copy(shabbatInfo = data) } } }
        launchSection { loadBYOCState() }
        launchSection { loadCreditBadgeData() }

        if (locationManager.hasLocationPermission()) {
            launchSection { loadIsraelisInCity().let { data -> updateState { copy(israelisInCity = data) } } }
            launchSection { loadIsraeliBusinesses().let { data -> updateState { copy(israeliBusinesses = data) } } }
        } else {
            val previouslyDenied = locationManager.wasPermissionRequested()
            updateState { copy(locationPermissionNeeded = true, locationPermissionPreviouslyDenied = previouslyDenied) }
        }
    }

    internal fun launchSection(block: suspend () -> Unit) {
        viewModelScope.launch { block() }
    }

    internal fun updateState(transform: HomeUiState.Success.() -> HomeUiState.Success) {
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

    private suspend fun loadCreditBadgeData() {
        val subResult = subscriptionRepository.getCurrentSubscription()
        val isPlus = subResult is BayitResult.Success

        when (val creditResult = betaCreditsRepository.getBalance()) {
            is BayitResult.Success -> {
                val balance = creditResult.data
                updateState {
                    copy(
                        remainingCredits = balance,
                        totalCredits = BETA_CREDITS_TOTAL,
                        isPlusSubscriber = isPlus,
                    )
                }
            }
            is BayitResult.Error -> {
                logger.error(
                    "Failed to load credit balance for badge",
                    creditResult.exception,
                    emptyMap(),
                )
                updateState { copy(isPlusSubscriber = isPlus) }
            }
            is BayitResult.Loading -> Unit
        }
    }

    internal fun handleError(message: String) {
        logger.error("Home feed error", null, mapOf("message" to message))
        _uiState.value = HomeUiState.Error(message = message)
    }

    companion object {
        /** Beta 500 program total credit allocation per user. */
        internal const val BETA_CREDITS_TOTAL = 500
    }
}
