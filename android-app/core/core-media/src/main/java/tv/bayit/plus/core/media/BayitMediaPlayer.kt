package tv.bayit.plus.core.media

import android.content.Context
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.hls.HlsMediaSource
import androidx.media3.exoplayer.source.MediaSource
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.model.MediaPlayback
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Central ExoPlayer wrapper for Bayit+ Android.
 *
 * Manages a single [ExoPlayer] instance, exposes reactive [playerState]
 * and [playbackPosition] flows, and accepts [MediaPlayback] descriptors
 * that decouple callers from raw stream URLs.
 */
@Singleton
class BayitMediaPlayer @Inject constructor(
    @ApplicationContext private val context: Context,
    private val logger: BayitLogger,
) {

    private var exoPlayer: ExoPlayer? = null

    private val _playerState = MutableStateFlow<PlayerState>(PlayerState.Idle)
    val playerState: StateFlow<PlayerState> = _playerState

    private val _playbackPosition = MutableStateFlow(0L)
    val playbackPosition: StateFlow<Long> = _playbackPosition

    /** Builds the underlying [ExoPlayer] if not already initialised. */
    fun initialize() {
        if (exoPlayer != null) return

        exoPlayer = ExoPlayer.Builder(context).build().apply {
            addListener(createPlayerListener())
        }
        logger.info("ExoPlayer initialised", mapOf("component" to "BayitMediaPlayer"))
    }

    /**
     * Prepares an HLS media source from the given [mediaPlayback] descriptor.
     *
     * If [MediaPlayback.startPosition] is set the player seeks to that offset
     * immediately after preparation so callers can implement resume-from-position.
     */
    fun loadMedia(mediaPlayback: MediaPlayback) {
        val player = exoPlayer ?: run {
            logger.warning(
                "loadMedia called before initialise",
                mapOf("component" to "BayitMediaPlayer"),
            )
            return
        }

        val mediaItem = MediaItem.Builder()
            .setUri(mediaPlayback.streamUrl)
            .build()

        val dataSourceFactory = DefaultHttpDataSource.Factory()
        val mediaSource: MediaSource = HlsMediaSource.Factory(dataSourceFactory)
            .createMediaSource(mediaItem)

        player.setMediaSource(mediaSource)
        player.prepare()

        mediaPlayback.startPosition?.let { position ->
            player.seekTo(position)
        }

        logger.info(
            "Media loaded",
            buildMap {
                put("component", "BayitMediaPlayer")
                put("contentId", mediaPlayback.contentId.orEmpty())
                put("isLive", mediaPlayback.isLive.toString())
                mediaPlayback.startPosition?.let { put("startPosition", it.toString()) }
            },
        )
    }

    fun play() {
        exoPlayer?.play()
    }

    fun pause() {
        exoPlayer?.pause()
    }

    fun seekTo(positionMs: Long) {
        exoPlayer?.seekTo(positionMs)
    }

    /** Releases the player and resets state to [PlayerState.Idle]. */
    fun release() {
        exoPlayer?.release()
        exoPlayer = null
        _playerState.value = PlayerState.Idle
        logger.info("ExoPlayer released", mapOf("component" to "BayitMediaPlayer"))
    }

    /** Returns the underlying [ExoPlayer] for attaching to a PlayerView. */
    fun getPlayer(): ExoPlayer? = exoPlayer

    fun getCurrentPosition(): Long = exoPlayer?.currentPosition ?: 0L

    fun getDuration(): Long = exoPlayer?.duration ?: 0L

    // ------------------------------------------------------------------
    // Internal
    // ------------------------------------------------------------------

    private fun createPlayerListener(): Player.Listener = object : Player.Listener {

        override fun onPlaybackStateChanged(state: Int) {
            _playerState.value = when (state) {
                Player.STATE_IDLE -> PlayerState.Idle
                Player.STATE_BUFFERING -> PlayerState.Buffering
                Player.STATE_READY -> {
                    if (exoPlayer?.playWhenReady == true) PlayerState.Playing
                    else PlayerState.Paused
                }
                Player.STATE_ENDED -> PlayerState.Ended
                else -> PlayerState.Idle
            }
        }

        override fun onIsPlayingChanged(isPlaying: Boolean) {
            if (isPlaying) {
                _playerState.value = PlayerState.Playing
            }
        }

        override fun onPlayerError(error: PlaybackException) {
            val message = error.message ?: "Unknown playback error"
            _playerState.value = PlayerState.Error(message)
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
}

/** Observable playback state emitted by [BayitMediaPlayer.playerState]. */
sealed interface PlayerState {
    data object Idle : PlayerState
    data object Buffering : PlayerState
    data object Playing : PlayerState
    data object Paused : PlayerState
    data object Ended : PlayerState
    data class Error(val message: String) : PlayerState
}
