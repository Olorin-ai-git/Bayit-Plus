package tv.bayit.plus.feature.podcasts

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
import tv.bayit.plus.core.media.AudioPlaybackManager
import tv.bayit.plus.core.model.PodcastDetail
import tv.bayit.plus.core.model.PodcastShow
import javax.inject.Inject

@HiltViewModel
class PodcastsViewModel @Inject constructor(
    private val podcastRepository: PodcastRepository,
    private val audioPlaybackManager: AudioPlaybackManager,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<PodcastsUiState>(PodcastsUiState.Loading)
    val uiState: StateFlow<PodcastsUiState> = _uiState.asStateFlow()

    init {
        audioPlaybackManager.attachScope(viewModelScope)
        loadPodcasts()
    }

    fun playLatestEpisode(showId: String) {
        viewModelScope.launch {
            logger.debug("Playing latest episode", mapOf("showId" to showId))

            when (val result = podcastRepository.getPodcast(showId)) {
                is BayitResult.Success -> {
                    val detail = result.data as? PodcastDetail ?: return@launch
                    val audioUrl = detail.latestEpisode?.audioUrl
                        ?: detail.episodes?.firstOrNull()?.audioUrl
                        ?: return@launch

                    audioPlaybackManager.playDirectUrl(
                        url = audioUrl,
                        title = detail.title,
                        subtitle = detail.author,
                        artworkUrl = detail.cover,
                        contentId = showId,
                    )
                }
                is BayitResult.Error -> {
                    logger.error("Failed to fetch podcast for playback", result.exception, mapOf(
                        "showId" to showId,
                    ))
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun refresh() {
        val currentState = _uiState.value
        if (currentState is PodcastsUiState.Success) {
            _uiState.value = currentState.copy(isRefreshing = true)
        }
        loadPodcasts()
    }

    fun toggleSubscription(showId: String) {
        val currentState = _uiState.value
        if (currentState !is PodcastsUiState.Success) return

        val show = currentState.shows.firstOrNull { it.id == showId } ?: return
        val isCurrentlySubscribed = show.isSubscribed == true

        viewModelScope.launch {
            logger.debug(
                "Toggling podcast subscription",
                mapOf("showId" to showId, "unsubscribing" to isCurrentlySubscribed.toString()),
            )

            val result = if (isCurrentlySubscribed) {
                podcastRepository.unsubscribe(showId)
            } else {
                podcastRepository.subscribe(showId)
            }

            when (result) {
                is BayitResult.Success -> {
                    val updatedShows = currentState.shows.map { existingShow ->
                        if (existingShow.id == showId) {
                            existingShow.copy(isSubscribed = !isCurrentlySubscribed)
                        } else {
                            existingShow
                        }
                    }
                    _uiState.value = currentState.copy(shows = updatedShows)
                    logger.info(
                        "Podcast subscription toggled",
                        mapOf("showId" to showId, "subscribed" to (!isCurrentlySubscribed).toString()),
                    )
                }
                is BayitResult.Error -> {
                    logger.error(
                        "Podcast subscription toggle failed",
                        result.exception,
                        mapOf("showId" to showId, "errorMessage" to result.message.orEmpty()),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    private fun loadPodcasts() {
        viewModelScope.launch {
            logger.debug("Loading podcasts")

            when (val result = podcastRepository.getPodcasts()) {
                is BayitResult.Success -> {
                    @Suppress("UNCHECKED_CAST")
                    val shows = (result.data as List<Any>).filterIsInstance<PodcastShow>()

                    logger.info(
                        "Podcasts loaded",
                        mapOf("showCount" to shows.size.toString()),
                    )

                    _uiState.value = PodcastsUiState.Success(
                        shows = shows,
                        isRefreshing = false,
                    )
                }
                is BayitResult.Error -> {
                    logger.error(
                        "Podcasts load failed",
                        result.exception,
                        mapOf("errorMessage" to result.message.orEmpty()),
                    )
                    _uiState.value = PodcastsUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface PodcastsUiState {
    data object Loading : PodcastsUiState

    data class Success(
        val shows: List<PodcastShow>,
        val isRefreshing: Boolean = false,
    ) : PodcastsUiState

    data class Error(
        val message: String,
    ) : PodcastsUiState
}
