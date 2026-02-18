package tv.bayit.plus.core.media

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.common.time.TimeProvider
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages a sleep timer that counts down and triggers a volume fade-out
 * before pausing playback. Uses absolute wall-clock timestamps so the
 * countdown survives app backgrounding on Android.
 */
@Singleton
class SleepTimerManager @Inject constructor(
    private val timeProvider: TimeProvider,
    private val logger: BayitLogger,
) {
    private val _isActive = MutableStateFlow(false)
    val isActive: StateFlow<Boolean> = _isActive.asStateFlow()

    private val _remainingSeconds = MutableStateFlow(0)
    val remainingSeconds: StateFlow<Int> = _remainingSeconds.asStateFlow()

    private val _durationMinutes = MutableStateFlow<Int?>(null)
    val durationMinutes: StateFlow<Int?> = _durationMinutes.asStateFlow()

    private var targetTimestampMs: Long = 0L
    private var countdownJob: Job? = null
    private var fadeJob: Job? = null

    fun start(
        durationMinutes: Int,
        scope: CoroutineScope,
        onFadeOut: suspend (Float) -> Unit,
        onComplete: () -> Unit,
    ) {
        cancel()
        val clamped = durationMinutes.coerceIn(TIMER_MIN_MINUTES, TIMER_MAX_MINUTES)
        targetTimestampMs = timeProvider.currentTimeMillis() + clamped * 60_000L
        _durationMinutes.value = clamped
        _remainingSeconds.value = clamped * 60
        _isActive.value = true

        logger.info("Sleep timer started", mapOf("durationMinutes" to clamped.toString()))

        countdownJob = scope.launch {
            while (isActive) {
                val now = timeProvider.currentTimeMillis()
                val remaining = ((targetTimestampMs - now) / 1000L).coerceAtLeast(0L).toInt()
                _remainingSeconds.value = remaining

                if (remaining <= 0) {
                    _isActive.value = false
                    _durationMinutes.value = null
                    startFadeOut(scope, onFadeOut, onComplete)
                    break
                }
                delay(COUNTDOWN_INTERVAL_MS)
            }
        }
    }

    fun extend(additionalMinutes: Int) {
        if (!_isActive.value) return
        val extensionMs = additionalMinutes * 60_000L
        targetTimestampMs += extensionMs
        val now = timeProvider.currentTimeMillis()
        _remainingSeconds.value = ((targetTimestampMs - now) / 1000L).coerceAtLeast(0L).toInt()

        logger.info("Sleep timer extended", mapOf("additionalMinutes" to additionalMinutes.toString()))
    }

    fun cancel() {
        countdownJob?.cancel()
        countdownJob = null
        fadeJob?.cancel()
        fadeJob = null
        _isActive.value = false
        _remainingSeconds.value = 0
        _durationMinutes.value = null
        targetTimestampMs = 0L
    }

    private fun startFadeOut(
        scope: CoroutineScope,
        onFadeOut: suspend (Float) -> Unit,
        onComplete: () -> Unit,
    ) {
        fadeJob = scope.launch {
            logger.debug("Sleep timer fade-out starting")
            for (step in 1..FADE_STEPS) {
                val volume = 1f - (step.toFloat() / FADE_STEPS)
                onFadeOut(volume.coerceAtLeast(0f))
                delay(FADE_STEP_MS)
            }
            onFadeOut(0f)
            onComplete()
            logger.info("Sleep timer completed, playback paused")
        }
    }

    companion object {
        const val TIMER_STEP_MINUTES = 5
        const val TIMER_MIN_MINUTES = 5
        const val TIMER_MAX_MINUTES = 60
        private const val FADE_DURATION_MS = 5000L
        private const val FADE_STEP_MS = 200L
        private const val FADE_STEPS = (FADE_DURATION_MS / FADE_STEP_MS).toInt()
        private const val COUNTDOWN_INTERVAL_MS = 1000L
    }
}
