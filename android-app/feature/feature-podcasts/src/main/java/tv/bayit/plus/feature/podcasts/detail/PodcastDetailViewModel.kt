package tv.bayit.plus.feature.podcasts.detail

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.PodcastRepository
import tv.bayit.plus.core.model.PodcastDetail
import tv.bayit.plus.core.model.PodcastEpisodeItem
import javax.inject.Inject

/**
 * ViewModel for the Podcast Detail screen.
 *
 * Loads podcast metadata via [PodcastRepository.getPodcast] and
 * episode list via [PodcastRepository.getEpisodes].
 * Manages subscribe/unsubscribe state toggling.
 * Exposes [PodcastDetailUiState] for pattern matching in the Compose layer.
 */
@HiltViewModel
class PodcastDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val podcastRepository: PodcastRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val showId: String = checkNotNull(savedStateHandle["showId"])

    private val _uiState = MutableStateFlow<PodcastDetailUiState>(PodcastDetailUiState.Loading)
    val uiState: StateFlow<PodcastDetailUiState> = _uiState.asStateFlow()

    init {
        loadPodcastDetail()
    }

    fun retry() {
        _uiState.value = PodcastDetailUiState.Loading
        loadPodcastDetail()
    }

    fun toggleSubscription() {
        val current = _uiState.value as? PodcastDetailUiState.Success ?: return
        val wasSubscribed = current.isSubscribed

        _uiState.value = current.copy(isSubscribed = !wasSubscribed)

        viewModelScope.launch {
            logger.debug("Toggling podcast subscription", mapOf(
                "showId" to showId,
                "unsubscribing" to wasSubscribed.toString(),
            ))

            val result = if (wasSubscribed) {
                podcastRepository.unsubscribe(showId)
            } else {
                podcastRepository.subscribe(showId)
            }

            when (result) {
                is BayitResult.Success -> {
                    logger.info("Podcast subscription toggled", mapOf(
                        "showId" to showId,
                        "subscribed" to (!wasSubscribed).toString(),
                    ))
                }
                is BayitResult.Error -> {
                    logger.error("Podcast subscription toggle failed", result.exception, mapOf(
                        "showId" to showId,
                    ))
                    val state = _uiState.value as? PodcastDetailUiState.Success ?: return@launch
                    _uiState.value = state.copy(isSubscribed = wasSubscribed)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    private fun loadPodcastDetail() {
        viewModelScope.launch {
            logger.debug("Loading podcast detail", mapOf("showId" to showId))

            when (val result = podcastRepository.getPodcast(showId)) {
                is BayitResult.Success -> {
                    val detail = result.data as? PodcastDetail
                    if (detail == null) {
                        _uiState.value = PodcastDetailUiState.Error("Podcast not found")
                        return@launch
                    }
                    logger.info("Podcast detail loaded", mapOf(
                        "showId" to showId,
                        "title" to detail.title.orEmpty(),
                    ))
                    _uiState.value = PodcastDetailUiState.Success(
                        showId = detail.id,
                        title = detail.title.orEmpty(),
                        author = detail.author,
                        description = detail.description,
                        cover = detail.cover,
                        category = detail.category,
                        episodeCount = detail.episodeCount,
                        episodes = detail.episodes.orEmpty(),
                        isSubscribed = false,
                        isLoadingEpisodes = detail.episodes.isNullOrEmpty(),
                    )
                    if (detail.episodes.isNullOrEmpty()) {
                        loadEpisodes()
                    }
                }
                is BayitResult.Error -> {
                    logger.error("Podcast detail load failed", result.exception, mapOf(
                        "showId" to showId,
                    ))
                    _uiState.value = PodcastDetailUiState.Error(
                        result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    private fun loadEpisodes() {
        viewModelScope.launch {
            logger.debug("Loading podcast episodes", mapOf("showId" to showId))

            when (val result = podcastRepository.getEpisodes(showId)) {
                is BayitResult.Success -> {
                    @Suppress("UNCHECKED_CAST")
                    val episodes = (result.data as List<Any>).filterIsInstance<PodcastEpisodeItem>()
                    logger.info("Podcast episodes loaded", mapOf(
                        "showId" to showId,
                        "episodeCount" to episodes.size.toString(),
                    ))
                    val current = _uiState.value as? PodcastDetailUiState.Success ?: return@launch
                    _uiState.value = current.copy(
                        episodes = episodes,
                        isLoadingEpisodes = false,
                    )
                }
                is BayitResult.Error -> {
                    logger.error("Podcast episodes load failed", result.exception, mapOf(
                        "showId" to showId,
                    ))
                    val current = _uiState.value as? PodcastDetailUiState.Success ?: return@launch
                    _uiState.value = current.copy(isLoadingEpisodes = false)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface PodcastDetailUiState {
    data object Loading : PodcastDetailUiState

    data class Success(
        val showId: String,
        val title: String,
        val author: String?,
        val description: String?,
        val cover: String?,
        val category: String?,
        val episodeCount: Int?,
        val episodes: List<PodcastEpisodeItem>,
        val isSubscribed: Boolean,
        val isLoadingEpisodes: Boolean,
    ) : PodcastDetailUiState

    data class Error(val message: String) : PodcastDetailUiState
}
