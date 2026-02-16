package tv.bayit.plus.core.media

import android.app.Activity
import android.app.PictureInPictureParams
import android.content.Context
import android.os.Build
import android.util.Rational
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.hls.HlsMediaSource
import androidx.media3.exoplayer.source.MediaSource
import androidx.media3.exoplayer.source.ProgressiveMediaSource
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.model.MediaPlayback
import tv.bayit.plus.core.model.QualityVariant
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
            addListener(createPlayerStateListener(
                stateFlow = _playerState,
                getPlayWhenReady = { exoPlayer?.playWhenReady == true },
                logger = logger,
            ))
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

        val mediaItem = MediaItem.Builder().setUri(mediaPlayback.streamUrl).build()
        val dataSourceFactory = DefaultHttpDataSource.Factory()

        // Detect stream type based on URL extension
        val isHls = mediaPlayback.streamUrl.contains(".m3u8", ignoreCase = true) ||
                    mediaPlayback.streamUrl.contains("/hls/", ignoreCase = true)

        val mediaSource: MediaSource = if (isHls) {
            // HLS stream (live TV, HLS VOD)
            HlsMediaSource.Factory(dataSourceFactory).createMediaSource(mediaItem)
        } else {
            // Direct file (MP4, MKV, WebM, etc.)
            ProgressiveMediaSource.Factory(dataSourceFactory).createMediaSource(mediaItem)
        }

        logger.debug("Media source created", mapOf(
            "isHls" to isHls.toString(),
            "url" to mediaPlayback.streamUrl,
        ))

        player.setMediaSource(mediaSource)
        player.prepare()
        mediaPlayback.startPosition?.let { player.seekTo(it) }

        logger.info("Media loaded", buildMap {
            put("component", "BayitMediaPlayer")
            put("contentId", mediaPlayback.contentId.orEmpty())
            put("isLive", mediaPlayback.isLive.toString())
            mediaPlayback.startPosition?.let { put("startPosition", it.toString()) }
        })
    }

    fun play() { exoPlayer?.play() }
    fun pause() { exoPlayer?.pause() }
    fun seekTo(positionMs: Long) { exoPlayer?.seekTo(positionMs) }

    /** Sets playback speed (e.g. 0.5f, 1.0f, 1.5f, 2.0f). */
    fun setPlaybackSpeed(speed: Float) {
        val clamped = speed.coerceIn(SPEED_MIN, SPEED_MAX)
        exoPlayer?.setPlaybackSpeed(clamped)
        logger.debug("Playback speed changed", mapOf("speed" to clamped.toString()))
    }

    /** Returns the current playback speed. */
    fun getPlaybackSpeed(): Float = exoPlayer?.playbackParameters?.speed ?: 1.0f

    /** Returns available video quality variants from the current HLS manifest. */
    fun getAvailableQualities(): List<QualityVariant> {
        val player = exoPlayer ?: return emptyList()
        return player.currentTracks.groups
            .filter { it.type == C.TRACK_TYPE_VIDEO }
            .flatMap { group ->
                (0 until group.length).mapNotNull { index ->
                    val height = group.getTrackFormat(index).height.takeIf { it > 0 }
                        ?: return@mapNotNull null
                    QualityVariant(quality = "${height}p", resolutionHeight = height)
                }
            }
            .distinctBy { it.resolutionHeight }
            .sortedByDescending { it.resolutionHeight ?: 0 }
    }

    /** Constrains video to [maxHeight] resolution. Pass `null` for auto. */
    fun setQuality(maxHeight: Int?) {
        val player = exoPlayer ?: return
        player.trackSelectionParameters = if (maxHeight != null) {
            player.trackSelectionParameters.buildUpon()
                .setMaxVideoSize(Int.MAX_VALUE, maxHeight).build()
        } else {
            player.trackSelectionParameters.buildUpon()
                .clearVideoSizeConstraints().build()
        }
        logger.debug("Quality changed", mapOf("maxHeight" to (maxHeight?.toString() ?: "auto")))
    }

    /** Enters Picture-in-Picture mode. Returns `true` on success. */
    fun enterPictureInPicture(activity: Activity): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return false
        return try {
            val params = PictureInPictureParams.Builder()
                .setAspectRatio(Rational(PIP_ASPECT_W, PIP_ASPECT_H)).build()
            activity.enterPictureInPictureMode(params)
            logger.info("Entered PiP mode", mapOf("component" to "BayitMediaPlayer"))
            true
        } catch (e: Exception) {
            logger.error("PiP entry failed", e, mapOf("component" to "BayitMediaPlayer"))
            false
        }
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
}

private const val SPEED_MIN = 0.25f
private const val SPEED_MAX = 3.0f
private const val PIP_ASPECT_W = 16
private const val PIP_ASPECT_H = 9
