package tv.bayit.plus.feature.player.live

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import tv.bayit.plus.core.model.TriviaFact

internal fun LiveTriviaManager.showFact(fact: TriviaFact, scope: CoroutineScope) {
    scope.launch {
        updateState { it.copy(activeFact = fact) }
    }
    _progressFraction.value = 0f

    val displayDuration = fact.displayDuration ?: LiveAIConfig.TRIVIA_DEFAULT_DISPLAY_DURATION_SEC
    startProgressAnimation(displayDuration, scope)
    scheduleAutoDismiss(displayDuration * 1000L, scope)
}

internal fun LiveTriviaManager.startProgressAnimation(durationSec: Int, scope: CoroutineScope) {
    progressJob?.cancel()
    progressJob = scope.launch {
        val steps = (durationSec * 10)
        repeat(steps) { step ->
            _progressFraction.value = (step + 1) / steps.toFloat()
            delay(LiveAIConfig.PROGRESS_UPDATE_INTERVAL_MS)
        }
    }
}

internal fun LiveTriviaManager.scheduleAutoDismiss(durationMs: Long, scope: CoroutineScope) {
    autoDismissJob?.cancel()
    autoDismissJob = scope.launch {
        delay(durationMs)
        dismissFact()
    }
}
