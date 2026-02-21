package tv.bayit.plus.core.media

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

internal fun AudioPlaybackManager.startStateObserver(coroutineScope: CoroutineScope) {
    stateObserverJob?.cancel()
    stateObserverJob = coroutineScope.launch {
        player.playerState.collect { playerState ->
            val current = _state.value
            if (!current.isActive) return@collect

            _state.value = when (playerState) {
                is PlayerState.Playing -> current.copy(isPlaying = true, isLoading = false)
                is PlayerState.Paused -> current.copy(isPlaying = false, isLoading = false)
                is PlayerState.Buffering -> current.copy(isLoading = true)
                is PlayerState.Idle -> if (activeContentId != null) {
                    current.copy(isActive = false)
                } else {
                    current
                }
                is PlayerState.Ended -> current.copy(isPlaying = false, isLoading = false)
                is PlayerState.Error -> {
                    logger.error(
                        "Audio playback error",
                        null,
                        mapOf(
                            "component" to "AudioPlaybackManager",
                            "message" to playerState.message,
                        ),
                    )
                    current.copy(isPlaying = false, isLoading = false)
                }
            }
        }
    }
}

internal fun AudioPlaybackManager.startPositionPolling(coroutineScope: CoroutineScope) {
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
