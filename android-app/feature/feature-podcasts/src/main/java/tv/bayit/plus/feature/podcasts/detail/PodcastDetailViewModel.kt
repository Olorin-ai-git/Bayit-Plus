package tv.bayit.plus.feature.podcasts.detail

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.i18n.BayitStringProvider
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.PodcastRepository
import tv.bayit.plus.core.media.AudioPlaybackManager
import tv.bayit.plus.core.model.PodcastEpisodeItem
import tv.bayit.plus.core.media.AudioPlaybackState
import tv.bayit.plus.core.media.SleepTimerManager
import javax.inject.Inject

@HiltViewModel
class PodcastDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    internal val podcastRepository: PodcastRepository,
    private val audioPlaybackManager: AudioPlaybackManager,
    private val sleepTimerManager: SleepTimerManager,
    internal val stringProvider: BayitStringProvider,
    internal val logger: BayitLogger,
) : ViewModel() {

    internal val showId: String = checkNotNull(savedStateHandle["showId"])

    internal val _uiState = MutableStateFlow<PodcastDetailUiState>(PodcastDetailUiState.Loading)
    val uiState: StateFlow<PodcastDetailUiState> = _uiState.asStateFlow()

    val audioState: StateFlow<AudioPlaybackState> = audioPlaybackManager.state

    private val _sleepTimerState = MutableStateFlow(PodcastSleepTimerState())
    val sleepTimerState: StateFlow<PodcastSleepTimerState> = _sleepTimerState.asStateFlow()

    init {
        audioPlaybackManager.attachScope(viewModelScope)
        loadPodcastDetail()
        observeSleepTimerState()
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

    fun startSleepTimer(minutes: Int) {
        val originalVolume = audioPlaybackManager.getVolume()
        sleepTimerManager.start(
            durationMinutes = minutes,
            scope = viewModelScope,
            onFadeOut = { volume -> audioPlaybackManager.setVolume(volume) },
            onComplete = {
                audioPlaybackManager.togglePlayPause()
                audioPlaybackManager.setVolume(originalVolume)
            },
        )
    }

    fun extendSleepTimer(minutes: Int) = sleepTimerManager.extend(minutes)

    fun cancelSleepTimer() = sleepTimerManager.cancel()

    override fun onCleared() {
        sleepTimerManager.cancel()
        super.onCleared()
    }

    private fun observeSleepTimerState() {
        viewModelScope.launch {
            sleepTimerManager.isActive.collect { active ->
                _sleepTimerState.value = _sleepTimerState.value.copy(isActive = active)
            }
        }
        viewModelScope.launch {
            sleepTimerManager.remainingSeconds.collect { secs ->
                _sleepTimerState.value = _sleepTimerState.value.copy(remainingSeconds = secs)
            }
        }
        viewModelScope.launch {
            sleepTimerManager.durationMinutes.collect { dur ->
                _sleepTimerState.value = _sleepTimerState.value.copy(durationMinutes = dur)
            }
        }
    }

    // loadPodcastDetail and loadEpisodes are in PodcastDetailViewModel+Loading.kt
}
