package tv.bayit.plus.core.media

import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import kotlinx.coroutines.flow.MutableStateFlow
import tv.bayit.plus.core.common.logging.BayitLogger

/** Observable playback state emitted by [BayitMediaPlayer.playerState]. */
sealed interface PlayerState {
    data object Idle : PlayerState
    data object Buffering : PlayerState
    data object Playing : PlayerState
    data object Paused : PlayerState
    data object Ended : PlayerState
    data class Error(val message: String) : PlayerState
}

/**
 * Creates an ExoPlayer [Player.Listener] that maps playback state
 * transitions into [PlayerState] emissions on the provided [stateFlow].
 */
internal fun createPlayerStateListener(
    stateFlow: MutableStateFlow<PlayerState>,
    getPlayWhenReady: () -> Boolean,
    logger: BayitLogger,
): Player.Listener = object : Player.Listener {

    override fun onPlaybackStateChanged(state: Int) {
        stateFlow.value = when (state) {
            Player.STATE_IDLE -> PlayerState.Idle
            Player.STATE_BUFFERING -> PlayerState.Buffering
            Player.STATE_READY -> {
                if (getPlayWhenReady()) PlayerState.Playing
                else PlayerState.Paused
            }
            Player.STATE_ENDED -> PlayerState.Ended
            else -> PlayerState.Idle
        }
    }

    override fun onIsPlayingChanged(isPlaying: Boolean) {
        if (isPlaying) {
            stateFlow.value = PlayerState.Playing
        } else if (!getPlayWhenReady()) {
            stateFlow.value = PlayerState.Paused
        }
    }

    override fun onPlayerError(error: PlaybackException) {
        val message = error.message ?: "Unknown playback error"
        stateFlow.value = PlayerState.Error(message)
        logger.error(
            "Playback error",
            error,
            mapOf(
                "component" to "BayitMediaPlayer",
                "errorCode" to error.errorCode.toString(),
            ),
        )
    }
}
