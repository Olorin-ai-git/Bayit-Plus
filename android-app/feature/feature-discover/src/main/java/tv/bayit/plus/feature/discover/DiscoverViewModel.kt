package tv.bayit.plus.feature.discover

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.feature.discover.data.DiscoverRepository
import tv.bayit.plus.feature.discover.data.FeatureAvailabilityService
import tv.bayit.plus.feature.discover.data.FeatureConfigDto
import tv.bayit.plus.feature.discover.model.DiscoverCategory
import tv.bayit.plus.feature.discover.model.DiscoverFeature
import tv.bayit.plus.feature.discover.model.DiscoverFeatureCatalog
import tv.bayit.plus.feature.discover.model.FeatureAvailabilityState
import tv.bayit.plus.feature.discover.walkthrough.WalkthroughSession
import tv.bayit.plus.feature.discover.walkthrough.WalkthroughSessionManager
import javax.inject.Inject

@HiltViewModel
class DiscoverViewModel @Inject constructor(
    private val repository: DiscoverRepository,
    private val availabilityService: FeatureAvailabilityService,
    val walkthroughSessionManager: WalkthroughSessionManager,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow(DiscoverUiState())
    val uiState: StateFlow<DiscoverUiState> = _uiState.asStateFlow()

    init {
        loadDiscover()
    }

    fun loadDiscover() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            loadConfig()
            computeAvailability()
            _uiState.update { it.copy(isLoading = false) }
        }
    }

    fun selectFeature(feature: DiscoverFeature) {
        _uiState.update { it.copy(selectedFeature = feature) }
    }

    fun clearSelection() {
        _uiState.update { it.copy(selectedFeature = null) }
    }

    fun startWalkthrough(feature: DiscoverFeature): WalkthroughNavTarget? {
        val config = _uiState.value.configFor(feature.id)
        val session = WalkthroughSession.create(feature)
        walkthroughSessionManager.start(session)
        _uiState.update { it.copy(selectedFeature = null) }

        val walkthroughContentId = config?.walkthroughContentId
        val route = feature.deepLinkRoute

        return when {
            walkthroughContentId != null && route == "player" ->
                WalkthroughNavTarget.Player(walkthroughContentId, "movie")
            walkthroughContentId != null && route == "live_tv" ->
                WalkthroughNavTarget.Player(walkthroughContentId, "live")
            route == "zeh_ani" -> WalkthroughNavTarget.ZehAni
            route != null -> WalkthroughNavTarget.DeepLink(route, feature.id)
            else -> null
        }
    }

    fun recordWalkthroughComplete(featureId: String, steps: Int, skipped: Boolean) {
        viewModelScope.launch {
            repository.recordWalkthroughComplete(featureId, steps, skipped)
            logger.info(
                "walkthrough_complete",
                mapOf("feature_id" to featureId, "skipped" to skipped.toString()),
            )
        }
    }

    private suspend fun loadConfig() {
        when (val result = repository.fetchConfig()) {
            is BayitResult.Success -> {
                val configMap = result.data.features.associateBy { it.featureId }
                _uiState.update { it.copy(featureConfigs = configMap) }
            }
            is BayitResult.Error -> {
                logger.error("discover_config_failed", result.exception)
            }
            is BayitResult.Loading -> { /* no-op */ }
        }
    }

    private suspend fun computeAvailability() {
        val states = mutableMapOf<String, FeatureAvailabilityState>()
        for (feature in DiscoverFeatureCatalog.allFeatures) {
            states[feature.id] = availabilityService.checkAvailability(feature)
        }
        _uiState.update { it.copy(availabilityStates = states) }
    }
}

sealed class WalkthroughNavTarget {
    data class Player(val contentId: String, val contentType: String) : WalkthroughNavTarget()
    data object ZehAni : WalkthroughNavTarget()
    data class DeepLink(val route: String, val featureId: String) : WalkthroughNavTarget()
}

data class DiscoverUiState(
    val isLoading: Boolean = true,
    val categories: List<DiscoverCategory> = DiscoverFeatureCatalog.categoriesOrdered,
    val selectedFeature: DiscoverFeature? = null,
    val featureConfigs: Map<String, FeatureConfigDto> = emptyMap(),
    val availabilityStates: Map<String, FeatureAvailabilityState> = emptyMap(),
) {
    fun featuresForCategory(category: DiscoverCategory): List<DiscoverFeature> =
        DiscoverFeatureCatalog.features(category)

    fun availabilityFor(featureId: String): FeatureAvailabilityState =
        availabilityStates[featureId] ?: FeatureAvailabilityState.Ready

    fun configFor(featureId: String): FeatureConfigDto? =
        featureConfigs[featureId]
}
