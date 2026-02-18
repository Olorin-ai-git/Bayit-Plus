package tv.bayit.plus.core.media

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.media.MediaPlayer
import android.util.Base64
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.logging.BayitLogger
import java.io.File
import java.io.FileOutputStream
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Audio mixer for live dubbing track overlay.
 *
 * Manages playback of dubbed audio segments alongside the main ExoPlayer
 * stream. Supports both URL-based and base64-encoded audio data from the
 * WebSocket. Provides volume control for the dubbing overlay and tracks
 * playback state.
 */
@Singleton
class DubbingMixer @Inject constructor(
    @ApplicationContext private val context: Context,
    private val logger: BayitLogger,
) {
    private var dubbingPlayer: MediaPlayer? = null
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var playbackJob: Job? = null

    private val _isPlaying = MutableStateFlow(false)
    val isPlaying: StateFlow<Boolean> = _isPlaying

    private val _dubbingVolume = MutableStateFlow(0.8f)
    val dubbingVolume: StateFlow<Float> = _dubbingVolume

    private val _originalVolume = MutableStateFlow(0.3f)
    val originalVolume: StateFlow<Float> = _originalVolume

    /** Callback invoked to adjust the main player volume for ducking. */
    var onOriginalVolumeChange: ((Float) -> Unit)? = null

    /**
     * Plays a dubbed audio segment from base64-encoded data.
     *
     * Decodes the base64 string, writes to a temp file, and plays via
     * MediaPlayer. Any currently playing segment is stopped first.
     */
    fun playBase64Segment(base64Data: String) {
        stopCurrentSegment()

        playbackJob = scope.launch {
            try {
                val audioBytes = Base64.decode(base64Data, Base64.DEFAULT)
                val tempFile = File.createTempFile("dubbing_", ".mp3", context.cacheDir)
                FileOutputStream(tempFile).use { it.write(audioBytes) }

                val player = MediaPlayer().apply {
                    setAudioAttributes(
                        AudioAttributes.Builder()
                            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                            .setUsage(AudioAttributes.USAGE_MEDIA)
                            .build(),
                    )
                    setDataSource(tempFile.absolutePath)
                    val vol = _dubbingVolume.value
                    setVolume(vol, vol)
                    setOnPreparedListener { mp ->
                        mp.start()
                        _isPlaying.value = true
                        onOriginalVolumeChange?.invoke(_originalVolume.value)
                        logger.debug(
                            "Dubbing base64 segment started",
                            mapOf("sizeBytes" to audioBytes.size.toString()),
                        )
                    }
                    setOnCompletionListener {
                        _isPlaying.value = false
                        tempFile.delete()
                    }
                    setOnErrorListener { _, what, extra ->
                        _isPlaying.value = false
                        tempFile.delete()
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
                dubbingPlayer = player
            } catch (e: Exception) {
                logger.error("Failed to play base64 dubbing segment", e)
            }
        }
    }

    /**
     * Plays a dubbing audio segment from the given URL.
     *
     * Any currently playing segment is stopped before the new one starts.
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
                    onOriginalVolumeChange?.invoke(_originalVolume.value)
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

    fun setDubbingVolume(volume: Float) {
        val clamped = volume.coerceIn(0f, 1f)
        _dubbingVolume.value = clamped
        dubbingPlayer?.setVolume(clamped, clamped)
    }

    fun setOriginalVolume(volume: Float) {
        val clamped = volume.coerceIn(0f, 1f)
        _originalVolume.value = clamped
        onOriginalVolumeChange?.invoke(clamped)
    }

    @Deprecated("Use setDubbingVolume", ReplaceWith("setDubbingVolume(volume)"))
    fun setVolume(volume: Float) = setDubbingVolume(volume)

    fun stopCurrentSegment() {
        playbackJob?.cancel()
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
