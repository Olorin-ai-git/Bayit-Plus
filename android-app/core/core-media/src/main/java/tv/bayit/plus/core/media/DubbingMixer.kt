package tv.bayit.plus.core.media

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import tv.bayit.plus.core.common.logging.BayitLogger
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Audio mixer for live dubbing track overlay.
 *
 * Manages a secondary [MediaPlayer] instance for playing dubbing audio
 * alongside the main ExoPlayer stream. Supports volume control, ducking
 * of the original audio, and sequential audio segment playback.
 */
@Singleton
class DubbingMixer @Inject constructor(
    @ApplicationContext private val context: Context,
    private val logger: BayitLogger,
) {
    private var dubbingPlayer: MediaPlayer? = null
    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager

    private val _isPlaying = MutableStateFlow(false)
    val isPlaying: StateFlow<Boolean> = _isPlaying

    private val _dubbingVolume = MutableStateFlow(0.8f)
    val dubbingVolume: StateFlow<Float> = _dubbingVolume

    /**
     * Plays a dubbing audio segment from the given URL.
     *
     * Any currently playing segment is stopped before the new one starts.
     * The original stream volume is ducked while dubbing plays.
     */
    fun playDubbingSegment(audioUrl: String) {
        if (!audioUrl.startsWith("https://")) {
            logger.warning(
                "Rejected non-HTTPS dubbing URL",
                mapOf("scheme" to audioUrl.substringBefore("://")),
            )
            return
        }
        stopCurrentSegment()

        try {
            dubbingPlayer = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .build(),
                )
                setDataSource(audioUrl)
                val vol = _dubbingVolume.value
                setVolume(vol, vol)
                setOnPreparedListener { mp ->
                    mp.start()
                    _isPlaying.value = true
                    logger.debug("Dubbing segment started", mapOf("url" to audioUrl))
                }
                setOnCompletionListener {
                    _isPlaying.value = false
                    logger.debug("Dubbing segment completed")
                }
                setOnErrorListener { _, what, extra ->
                    _isPlaying.value = false
                    logger.error(
                        "Dubbing playback error",
                        metadata = mapOf(
                            "what" to what.toString(),
                            "extra" to extra.toString(),
                        ),
                    )
                    true
                }
                prepareAsync()
            }
        } catch (e: Exception) {
            logger.error("Failed to init dubbing player", e)
        }
    }

    fun setVolume(volume: Float) {
        val clamped = volume.coerceIn(0f, 1f)
        _dubbingVolume.value = clamped
        dubbingPlayer?.setVolume(clamped, clamped)
    }

    fun stopCurrentSegment() {
        dubbingPlayer?.let { player ->
            if (player.isPlaying) player.stop()
            player.release()
        }
        dubbingPlayer = null
        _isPlaying.value = false
    }

    fun release() {
        stopCurrentSegment()
        logger.info("DubbingMixer released")
    }
}
