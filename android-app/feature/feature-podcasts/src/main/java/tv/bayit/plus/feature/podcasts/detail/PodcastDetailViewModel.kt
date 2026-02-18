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
import tv.bayit.plus.core.media.AudioPlaybackManager
import tv.bayit.plus.core.media.AudioPlaybackState
import tv.bayit.plus.core.model.PodcastDetail
import tv.bayit.plus.core.model.PodcastEpisodeItem
import javax.inject.Inject

@HiltViewModel
class PodcastDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val podcastRepository: PodcastRepository,
    private val audioPlaybackManager: AudioPlaybackManager,
    private val logger: BayitLogger,
) : ViewModel() {

    private val showId: String = checkNotNull(savedStateHandle["showId"])

    private val _uiState = MutableStateFlow<PodcastDetailUiState>(PodcastDetailUiState.Loading)
    val uiState: StateFlow<PodcastDetailUiState> = _uiState.asStateFlow()

    val audioState: StateFlow<AudioPlaybackState> = audioPlaybackManager.state

    init {
        audioPlaybackManager.attachScope(viewModelScope)
        loadPodcastDetail()
    }

    fun retry() {
        _uiState.value = PodcastDetailUiState.Loading
        loadPodcastDetail()
    }

    fun refresh() {
        val current = _uiState.value as? PodcastDetailUiState.Success ?: return
        _uiState.value = current.copy(isRefreshing = true)
        loadPodcastDetail()
    }

    fun toggleLatestPlayback() {
        val current = _uiState.value as? PodcastDetailUiState.Success ?: return
        val state = audioPlaybackManager.state.value
        if (state.isActive && state.contentId == current.showId) {
            audioPlaybackManager.togglePlayPause()
        } else {
            val audioUrl = current.episodes.firstOrNull()?.audioUrl ?: return
            audioPlaybackManager.playDirectUrl(
                url = audioUrl,
                title = current.title,
                subtitle = current.author,
                artworkUrl = current.cover,
                contentId = current.showId,
            )
        }
    }

    fun toggleEpisodePlayback(episode: PodcastEpisodeItem) {
        val current = _uiState.value as? PodcastDetailUiState.Success ?: return
        val state = audioPlaybackManager.state.value
        if (state.isActive && state.contentId == episode.id) {
            audioPlaybackManager.togglePlayPause()
        } else {
            val audioUrl = episode.audioUrl ?: return
            audioPlaybackManager.playDirectUrl(
                url = audioUrl,
                title = episode.title,
                subtitle = current.author,
                artworkUrl = episode.thumbnail ?: current.cover,
                contentId = episode.id,
            )
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
