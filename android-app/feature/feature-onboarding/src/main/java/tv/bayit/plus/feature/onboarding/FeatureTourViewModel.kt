package tv.bayit.plus.feature.onboarding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Inject

private const val PLATFORM = "android"
private const val TOUR_VERSION = 1

@HiltViewModel
class FeatureTourViewModel @Inject constructor(
    private val tourDataStore: TourDataStore,
    private val apiClient: BayitApiClient,
    private val logger: BayitLogger,
) : ViewModel() {

    private val api: OnboardingTourApi = apiClient.createService()

    val cards: List<FeatureCard> = buildFeatureCards()

    private val _currentIndex = MutableStateFlow(0)
    val currentIndex: StateFlow<Int> = _currentIndex.asStateFlow()

    private val _completionStatus = MutableStateFlow("not_started")
    val completionStatus: StateFlow<String> = _completionStatus.asStateFlow()

    private val _demoCardsTapped = MutableStateFlow<Set<String>>(emptySet())
    val demoCardsTapped: StateFlow<Set<String>> = _demoCardsTapped.asStateFlow()

    private val _showPersonalization = MutableStateFlow(false)
    val showPersonalization: StateFlow<Boolean> = _showPersonalization.asStateFlow()

    val shouldShowTour: Boolean
        get() = _completionStatus.value == "not_started" || _completionStatus.value == "in_progress"

    init {
        loadLocalState()
    }

    fun startTour() {
        viewModelScope.launch {
            _completionStatus.value = "in_progress"
            _currentIndex.value = 0
            tourDataStore.setInProgress()
            tourDataStore.saveIndex(0)
            syncStateToServer(cardViewed = cards.firstOrNull()?.featureKey)
            logger.info("Feature tour started")
        }
    }

    fun advanceToNextCard() {
        viewModelScope.launch {
            val nextIndex = _currentIndex.value + 1
            if (nextIndex >= cards.size) return@launch
            _currentIndex.value = nextIndex
            tourDataStore.saveIndex(nextIndex)
            val card = cards[nextIndex]
            tourDataStore.markCardViewed(card.featureKey)
            syncStateToServer(
                currentCardIndex = nextIndex,
                cardViewed = card.featureKey,
            )
            logger.debug("Tour advanced to card", mapOf("index" to nextIndex.toString()))
        }
    }

    fun goToPreviousCard() {
        viewModelScope.launch {
            val prevIndex = (_currentIndex.value - 1).coerceAtLeast(0)
            _currentIndex.value = prevIndex
            tourDataStore.saveIndex(prevIndex)
            logger.debug("Tour went back to card", mapOf("index" to prevIndex.toString()))
        }
    }

    fun onDemoTapped(featureKey: String) {
        viewModelScope.launch {
            _demoCardsTapped.value = _demoCardsTapped.value + featureKey
            tourDataStore.markDemoTapped(featureKey)
            syncStateToServer(demoTapped = featureKey)
            logger.debug("Demo tapped", mapOf("featureKey" to featureKey))
        }
    }

    fun setPageIndex(index: Int) {
        viewModelScope.launch {
            _currentIndex.value = index
            tourDataStore.saveIndex(index)
            val card = cards.getOrNull(index) ?: return@launch
            tourDataStore.markCardViewed(card.featureKey)
            syncStateToServer(currentCardIndex = index, cardViewed = card.featureKey)
        }
    }

    fun skipTour() {
        viewModelScope.launch {
            _completionStatus.value = "skipped"
            tourDataStore.setSkipped()
            val lastCard = cards.getOrNull(_currentIndex.value)?.featureKey
            runCatching {
                apiClient.safeApiCall {
                    api.skipTour(SkipTourRequest(platform = PLATFORM, lastCardViewed = lastCard))
                }
            }.onFailure { e -> logger.error("Failed to sync tour skip", error = e) }
            logger.info("Feature tour skipped")
        }
    }

    fun showPersonalizationStep() {
        _showPersonalization.value = true
    }

    fun completeTourWithPreferences(
        languages: Set<String>,
        genres: Set<String>,
        hasChildren: Boolean,
    ) {
        viewModelScope.launch {
            _completionStatus.value = "completed"
            tourDataStore.setCompleted()
            val preferences = buildMap {
                put("content_languages", languages.joinToString(","))
                put("genres", genres.joinToString(","))
                put("has_children", hasChildren.toString())
            }
            runCatching {
                apiClient.safeApiCall {
                    api.completeTour(
                        CompleteTourRequest(
                            platform = PLATFORM,
                            tourVersion = TOUR_VERSION,
                            preferences = preferences,
                        ),
                    )
                }
            }.onFailure { e -> logger.error("Failed to sync tour completion", error = e) }
            logger.info("Feature tour completed with preferences")
        }
    }

    fun finalizeTour() {
        viewModelScope.launch {
            _completionStatus.value = "completed"
            tourDataStore.setCompleted()
            runCatching {
                apiClient.safeApiCall {
                    api.completeTour(CompleteTourRequest(platform = PLATFORM, tourVersion = TOUR_VERSION))
                }
            }.onFailure { e -> logger.error("Failed to sync tour completion", error = e) }
            logger.info("Feature tour completed")
        }
    }

    private fun loadLocalState() {
        viewModelScope.launch {
            val state = tourDataStore.load()
            _currentIndex.value = state.currentCardIndex
            _completionStatus.value = state.completionStatus
            _demoCardsTapped.value = state.demoCardsTapped
            logger.debug("Tour local state loaded", mapOf("status" to state.completionStatus))
        }
    }

    private suspend fun syncStateToServer(
        currentCardIndex: Int? = null,
        cardViewed: String? = null,
        demoTapped: String? = null,
    ) {
        runCatching {
            apiClient.safeApiCall {
                api.updateTourState(
                    UpdateTourStateRequest(
                        platform = PLATFORM,
                        currentCardIndex = currentCardIndex,
                        cardViewed = cardViewed,
                        demoTapped = demoTapped,
                    ),
                )
            }
        }.onFailure { e ->
            logger.error("Failed to sync tour state to server", error = e)
        }
    }
}
