package tv.bayit.plus.core.media

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.model.MediaPlayback
import javax.inject.Inject
import javax.inject.Singleton

private const val POSITION_POLL_INTERVAL_MS = 500L
private const val SKIP_BACKWARD_MS = 15_000L
private const val SKIP_FORWARD_MS = 30_000L

/**
 * Singleton service wrapping [BayitMediaPlayer] for audio-only playback
 * (podcasts, audiobooks). Exposes a reactive [state] flow consumed by
 * the mini-player bar and podcast screens.
 *
 * Call [attachScope] from a ViewModel to bind the position-polling lifecycle.
 * When the full-screen player loads new content on the same [BayitMediaPlayer],
 * a mismatched-content transition is detected and [state] resets to inactive.
 */
@Singleton
class AudioPlaybackManager @Inject constructor(
    private val player: BayitMediaPlayer,
    private val logger: BayitLogger,
) {

    private val _state = MutableStateFlow(AudioPlaybackState())
    val state: StateFlow<AudioPlaybackState> = _state.asStateFlow()

    private var activeContentId: String? = null
    private var pollingJob: Job? = null
    private var stateObserverJob: Job? = null
    private var scope: CoroutineScope? = null

    /** Binds to a CoroutineScope (typically viewModelScope) for polling. */
    fun attachScope(coroutineScope: CoroutineScope) {
        scope = coroutineScope
    }

    /**
     * Initialises the player, loads the given direct URL, and starts playback.
     * Previous audio session (if any) is stopped first.
     */
    fun playDirectUrl(
        url: String,
        title: String?,
        subtitle: String?,
        artworkUrl: String?,
        contentId: String?,
    ) {
        val currentScope = scope ?: run {
            logger.warning(
                "playDirectUrl called before attachScope",
                mapOf("component" to "AudioPlaybackManager"),
            )
            return
        }

        stopInternal()

        activeContentId = contentId
        _state.value = AudioPlaybackState(
            isActive = true,
            isLoading = true,
            title = title,
            subtitle = subtitle,
            artworkUrl = artworkUrl,
            contentId = contentId,
        )

        player.initialize()
        player.loadMedia(
            MediaPlayback(
                streamUrl = url,
                contentId = contentId,
                title = title,
                subtitle = subtitle,
                artworkUrl = artworkUrl,
            ),
        )
        player.play()

        startStateObserver(currentScope)
        startPositionPolling(currentScope)

        logger.info("Audio playback started", mapOf(
            "component" to "AudioPlaybackManager",
            "contentId" to contentId.orEmpty(),
            "title" to title.orEmpty(),
        ))
    }

    fun togglePlayPause() {
        val current = _state.value
        if (!current.isActive) return

        if (current.isPlaying) {
            player.pause()
        } else {
            player.play()
        }
    }

    fun skipBackward() {
        if (!_state.value.isActive) return
        val target = (player.getCurrentPosition() - SKIP_BACKWARD_MS).coerceAtLeast(0L)
        player.seekTo(target)
    }

    fun skipForward() {
        if (!_state.value.isActive) return
        val duration = player.getDuration()
        val target = (player.getCurrentPosition() + SKIP_FORWARD_MS).let { pos ->
            if (duration > 0) pos.coerceAtMost(duration) else pos
        }
        player.seekTo(target)
    }

    fun stop() {
        stopInternal()
        logger.info("Audio playback stopped by user", mapOf(
            "component" to "AudioPlaybackManager",
        ))
    }

    fun setVolume(volume: Float) { player.setVolume(volume) }
    fun getVolume(): Float = player.getVolume()

    private fun stopInternal() {
        pollingJob?.cancel()
        pollingJob = null
        stateObserverJob?.cancel()
        stateObserverJob = null
        activeContentId = null

        if (_state.value.isActive) {
            player.release()
        }
        _state.value = AudioPlaybackState()
    }

    private fun startStateObserver(coroutineScope: CoroutineScope) {
        stateObserverJob?.cancel()
        stateObserverJob = coroutineScope.launch {
            player.playerState.collect { playerState ->
                val current = _state.value
                if (!current.isActive) return@collect

                _state.value = when (playerState) {
                    is PlayerState.Playing -> current.copy(
                        isPlaying = true,
                        isLoading = false,
                    )
                    is PlayerState.Paused -> current.copy(
                        isPlaying = false,
                        isLoading = false,
                    )
                    is PlayerState.Buffering -> current.copy(isLoading = true)
                    is PlayerState.Idle -> {
                        if (activeContentId != null) {
                            current.copy(isActive = false)
                        } else {
                            current
                        }
                    }
                    is PlayerState.Ended -> current.copy(
                        isPlaying = false,
                        isLoading = false,
                    )
                    is PlayerState.Error -> {
                        logger.error(
                            "Audio playback error",
                            null,
                            mapOf(
                                "component" to "AudioPlaybackManager",
                                "message" to playerState.message,
                            ),
                        )
                        current.copy(
                            isPlaying = false,
                            isLoading = false,
                        )
                    }
                }
            }
        }
    }

    private fun startPositionPolling(coroutineScope: CoroutineScope) {
        pollingJob?.cancel()
        pollingJob = coroutineScope.launch {
            while (true) {
                delay(POSITION_POLL_INTERVAL_MS)
                val current = _state.value
                if (!current.isActive) break
                _state.value = current.copy(
                    currentPositionMs = player.getCurrentPosition(),
                    durationMs = player.getDuration(),
                )
            }
        }
    }
}
