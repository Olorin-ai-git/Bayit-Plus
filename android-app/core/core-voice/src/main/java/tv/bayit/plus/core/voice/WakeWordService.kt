package tv.bayit.plus.core.voice

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import tv.bayit.plus.core.common.logging.BayitLogger
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.min

/** Configuration for wake word detection: sensitivity (0-1), cooldown, and phrase. */
data class WakeWordConfig(
    val sensitivity: Float = DEFAULT_SENSITIVITY,
    val cooldownMs: Long = DEFAULT_COOLDOWN_MS,
    val wakePhrase: String = DEFAULT_WAKE_PHRASE,
)

/**
 * Background wake word detection service ("Hey Bayit").
 *
 * Uses Android [SpeechRecognizer] in continuous mode, checking partial results
 * for fuzzy matches against the wake phrase. Restarts recognition automatically
 * after each session ends and enforces a cooldown between detections.
 * Android port of iOS WakeWordService.swift.
 */
@Singleton
class WakeWordService @Inject constructor(
    @ApplicationContext private val context: Context,
    private val logger: BayitLogger,
) {
    private val mainHandler = Handler(Looper.getMainLooper())
    private var recognizer: SpeechRecognizer? = null
    private var config = WakeWordConfig()
    private var lastDetectionTimestamp = 0L

    private val _isActive = MutableStateFlow(false)
    val isActive: StateFlow<Boolean> = _isActive.asStateFlow()

    private val _detections = MutableSharedFlow<Long>(extraBufferCapacity = 1)
    val detections: SharedFlow<Long> = _detections.asSharedFlow()

    fun start(config: WakeWordConfig) {
        if (_isActive.value) return
        if (!SpeechRecognizer.isRecognitionAvailable(context)) {
            logger.error("SpeechRecognizer not available on this device")
            return
        }
        this.config = config.copy(
            sensitivity = config.sensitivity.coerceIn(0f, 1f),
            wakePhrase = config.wakePhrase.lowercase().trim(),
        )
        _isActive.value = true
        lastDetectionTimestamp = 0L
        logger.info(
            "Wake word service starting",
            mapOf("wakePhrase" to this.config.wakePhrase, "sensitivity" to this.config.sensitivity.toString()),
        )
        mainHandler.post { startRecognitionSession() }
    }

    fun stop() {
        if (!_isActive.value) return
        _isActive.value = false
        mainHandler.post { destroyRecognizer() }
        logger.info("Wake word service stopped")
    }

    private fun startRecognitionSession() {
        if (!_isActive.value) return
        destroyRecognizer()
        val sr = SpeechRecognizer.createSpeechRecognizer(context)
        recognizer = sr
        sr.setRecognitionListener(createListener())
        sr.startListening(buildRecognizerIntent())
        logger.debug("Recognition session started")
    }

    private fun buildRecognizerIntent(): Intent =
        Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-US")
        }

    private fun createListener() = object : RecognitionListener {
        override fun onReadyForSpeech(params: Bundle?) = Unit
        override fun onBeginningOfSpeech() = Unit
        override fun onRmsChanged(rmsdB: Float) = Unit
        override fun onBufferReceived(buffer: ByteArray?) = Unit
        override fun onEndOfSpeech() = Unit
        override fun onEvent(eventType: Int, params: Bundle?) = Unit

        override fun onPartialResults(partialResults: Bundle?) {
            partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                ?.forEach { evaluateTranscript(it) }
        }

        override fun onResults(results: Bundle?) {
            results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                ?.forEach { evaluateTranscript(it) }
            scheduleRestart()
        }

        override fun onError(error: Int) {
            if (!_isActive.value) return
            logger.warning(
                "Recognition error, restarting",
                mapOf("errorCode" to error.toString(), "kind" to mapErrorCode(error)),
            )
            scheduleRestart()
        }
    }

    private fun evaluateTranscript(rawTranscript: String) {
        val transcript = rawTranscript.lowercase().trim()
        if (transcript.isEmpty()) return
        if (WAKE_VARIANTS.any { fuzzyContains(transcript, it, config.sensitivity) }) {
            handleDetection()
        }
    }

    private fun handleDetection() {
        val now = System.currentTimeMillis()
        if (now - lastDetectionTimestamp < config.cooldownMs) return
        lastDetectionTimestamp = now
        _detections.tryEmit(now)
        logger.info("Wake word detected", mapOf("timestamp" to now.toString()))
    }

    private fun scheduleRestart() {
        if (!_isActive.value) return
        mainHandler.postDelayed({ startRecognitionSession() }, RESTART_DELAY_MS)
    }

    private fun destroyRecognizer() {
        recognizer?.apply { stopListening(); destroy() }
        recognizer = null
    }

    private fun mapErrorCode(error: Int): String = when (error) {
        SpeechRecognizer.ERROR_AUDIO -> "AUDIO"
        SpeechRecognizer.ERROR_CLIENT -> "CLIENT"
        SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "PERMISSIONS"
        SpeechRecognizer.ERROR_NETWORK -> "NETWORK"
        SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "NETWORK_TIMEOUT"
        SpeechRecognizer.ERROR_NO_MATCH -> "NO_MATCH"
        SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "BUSY"
        SpeechRecognizer.ERROR_SERVER -> "SERVER"
        SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "SPEECH_TIMEOUT"
        else -> "UNKNOWN"
    }

    companion object {
        private const val DEFAULT_SENSITIVITY = 0.5f
        private const val DEFAULT_COOLDOWN_MS = 3000L
        private const val DEFAULT_WAKE_PHRASE = "hey bayit"
        private const val RESTART_DELAY_MS = 500L
        private val WAKE_VARIANTS = listOf("hey bayit", "hey bayit plus", "\u05d4\u05d9 \u05d1\u05d9\u05ea")

        /** Fuzzy substring match using sliding-window edit distance. */
        internal fun fuzzyContains(haystack: String, needle: String, sensitivity: Float): Boolean {
            if (haystack.contains(needle)) return true
            if (sensitivity <= 0f) return false
            val maxDist = (needle.length * sensitivity).toInt().coerceAtLeast(1)
            if (needle.length > haystack.length) return editDistance(haystack, needle) <= maxDist
            for (i in 0..haystack.length - needle.length) {
                if (editDistance(haystack.substring(i, i + needle.length), needle) <= maxDist) return true
            }
            return false
        }

        private fun editDistance(a: String, b: String): Int {
            val n = b.length
            var prev = IntArray(n + 1) { it }
            var curr = IntArray(n + 1)
            for (i in 1..a.length) {
                curr[0] = i
                for (j in 1..n) {
                    val cost = if (a[i - 1] == b[j - 1]) 0 else 1
                    curr[j] = min(min(prev[j] + 1, curr[j - 1] + 1), prev[j - 1] + cost)
                }
                val tmp = prev; prev = curr; curr = tmp
            }
            return prev[n]
        }
    }
}
