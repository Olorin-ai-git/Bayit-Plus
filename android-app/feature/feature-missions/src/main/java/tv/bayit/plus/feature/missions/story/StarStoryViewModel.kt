package tv.bayit.plus.feature.missions.story

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.StarStoryRepository
import tv.bayit.plus.core.model.StarStory
import javax.inject.Inject

@HiltViewModel
class StarStoryViewModel @Inject constructor(
    private val starStoryRepository: StarStoryRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<StarStoryUiState>(StarStoryUiState.Loading)
    val uiState: StateFlow<StarStoryUiState> = _uiState.asStateFlow()

    init {
        loadStories()
    }

    fun refresh() {
        val currentState = _uiState.value
        if (currentState is StarStoryUiState.Success) {
            _uiState.value = currentState.copy(isRefreshing = true)
        }
        loadStories()
    }

    fun markAsViewed(storyId: String) {
        viewModelScope.launch {
            logger.debug("Marking story as viewed", mapOf("storyId" to storyId))

            when (val result = starStoryRepository.markAsViewed(storyId)) {
                is BayitResult.Success -> {
                    logger.info("Story marked as viewed", mapOf("storyId" to storyId))
                }
                is BayitResult.Error -> {
                    logger.error(
                        "Failed to mark story as viewed",
                        result.exception,
                        mapOf("storyId" to storyId),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun reactToStory(storyId: String, reaction: String) {
        viewModelScope.launch {
            logger.debug(
                "Reacting to story",
                mapOf("storyId" to storyId, "reaction" to reaction),
            )

            when (val result = starStoryRepository.reactToStory(storyId, reaction)) {
                is BayitResult.Success -> {
                    logger.info(
                        "Reaction sent",
                        mapOf("storyId" to storyId, "reaction" to reaction),
                    )
                }
                is BayitResult.Error -> {
                    logger.error(
                        "Reaction failed",
                        result.exception,
                        mapOf("storyId" to storyId, "reaction" to reaction),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun retry() {
        _uiState.value = StarStoryUiState.Loading
        loadStories()
    }

    private fun loadStories() {
        viewModelScope.launch {
            logger.debug("Loading star stories")

            when (val result = starStoryRepository.getStarStories()) {
                is BayitResult.Success -> {
                    @Suppress("UNCHECKED_CAST")
                    val stories = (result.data as List<Any>).filterIsInstance<StarStory>()

                    val profiles = when (val profilesResult = starStoryRepository.getStarProfiles()) {
                        is BayitResult.Success -> profilesResult.data as List<Any>
                        else -> emptyList()
                    }

                    logger.info(
                        "Star stories loaded",
                        mapOf(
                            "storyCount" to stories.size.toString(),
                            "profileCount" to profiles.size.toString(),
                        ),
                    )

                    _uiState.value = StarStoryUiState.Success(
                        stories = stories,
                        starProfiles = profiles,
                        isRefreshing = false,
                    )
                }
                is BayitResult.Error -> {
                    logger.error(
                        "Star stories load failed",
                        result.exception,
                        mapOf("errorMessage" to result.message.orEmpty()),
                    )
                    _uiState.value = StarStoryUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface StarStoryUiState {
    data object Loading : StarStoryUiState

    data class Success(
        val stories: List<StarStory>,
        val starProfiles: List<Any>,
        val isRefreshing: Boolean = false,
    ) : StarStoryUiState

    data class Error(val message: String) : StarStoryUiState
}
