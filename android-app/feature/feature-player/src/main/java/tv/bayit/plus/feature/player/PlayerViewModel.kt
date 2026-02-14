package tv.bayit.plus.feature.player

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.media3.exoplayer.ExoPlayer
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.ContentRepository
import tv.bayit.plus.core.data.repository.MediaRepository
import tv.bayit.plus.core.media.BayitMediaPlayer
import tv.bayit.plus.core.media.PlayerState
import tv.bayit.plus.core.model.ContentDetail
import tv.bayit.plus.core.model.MediaPlayback
import javax.inject.Inject

/**
 * ViewModel managing media playback state for the Player screen.
 *
 * Coordinates between [MediaRepository] (stream URL resolution),
 * [ContentRepository] (metadata), and [BayitMediaPlayer] (ExoPlayer).
 * Exposes a [PlayerUiState] for the Compose UI and a [PlayerState]
 * flow for transport-level state (playing, paused, buffering, etc.).
 */
@HiltViewModel
class PlayerViewModel @Inject constructor(
    private val mediaRepository: MediaRepository,
    private val contentRepository: ContentRepository,
    private val mediaPlayer: BayitMediaPlayer,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<PlayerUiState>(PlayerUiState.Loading)
    val uiState: StateFlow<PlayerUiState> = _uiState.asStateFlow()

    val playerState: StateFlow<PlayerState> = mediaPlayer.playerState

    private var currentContentId: String? = null
    private var currentContentType: String? = null

    init {
        mediaPlayer.initialize()
    }

    fun loadContent(contentId: String, contentType: String) {
        if (currentContentId == contentId) return
        currentContentId = contentId
        currentContentType = contentType

        viewModelScope.launch {
            logger.debug("Loading content for playback", mapOf(
                "contentId" to contentId,
                "contentType" to contentType,
            ))

            val metadata = resolveMetadata(contentId)

            when (val urlResult = mediaRepository.getPlaybackUrl(contentId)) {
                is BayitResult.Success -> {
                    val playback = MediaPlayback(
                        streamUrl = urlResult.data,
                        contentId = contentId,
                        title = metadata?.title,
                        isLive = contentType == "live",
                    )
                    mediaPlayer.loadMedia(playback)
                    _uiState.value = PlayerUiState.Ready(
                        contentId = contentId,
                        title = metadata?.title.orEmpty(),
                        description = metadata?.description,
                        exoPlayer = mediaPlayer.getPlayer(),
                    )
                    logger.info("Playback started", mapOf("contentId" to contentId))
                }
                is BayitResult.Error -> {
                    val errorMsg = urlResult.message ?: urlResult.exception.message.orEmpty()
                    logger.error("Playback load failed", urlResult.exception, mapOf(
                        "contentId" to contentId,
                    ))
                    _uiState.value = PlayerUiState.Error(errorMsg)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun togglePlayPause() {
        when (playerState.value) {
            is PlayerState.Playing -> mediaPlayer.pause()
            is PlayerState.Paused -> mediaPlayer.play()
            is PlayerState.Ended -> {
                mediaPlayer.seekTo(0L)
                mediaPlayer.play()
            }
            else -> Unit
        }
    }

    fun seekTo(positionMs: Long) {
        mediaPlayer.seekTo(positionMs)
    }

    fun saveProgress() {
        val contentId = currentContentId ?: return
        val position = mediaPlayer.getCurrentPosition()
        if (position <= 0L) return

        viewModelScope.launch {
            mediaRepository.reportProgress(contentId, position)
            logger.debug("Progress saved", mapOf(
                "contentId" to contentId,
                "positionMs" to position.toString(),
            ))
        }
    }

    fun release() {
        saveProgress()
    }

    override fun onCleared() {
        saveProgress()
        mediaPlayer.release()
        super.onCleared()
    }

    private suspend fun resolveMetadata(contentId: String): ContentDetail? =
        when (val result = contentRepository.getContentById(contentId)) {
            is BayitResult.Success -> result.data as? ContentDetail
            else -> null
        }
}

/**
 * UI state for the Player screen, pattern-matched in the Compose layer.
 */
sealed interface PlayerUiState {
    data object Loading : PlayerUiState

    data class Ready(
        val contentId: String,
        val title: String,
        val description: String?,
        val exoPlayer: ExoPlayer?,
    ) : PlayerUiState

    data class Error(val message: String) : PlayerUiState
}
