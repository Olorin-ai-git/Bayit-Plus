package tv.bayit.plus.feature.player

import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.update
import tv.bayit.plus.core.media.PlayerState
import tv.bayit.plus.feature.player.PlayerViewModel.Companion.SKIP_INTERVAL_MS
import tv.bayit.plus.feature.player.chapters.ChapterMarker

// Transport controls
fun PlayerViewModel.toggleControls() {
    _isControlsVisible.value = !_isControlsVisible.value
    if (_isControlsVisible.value) scheduleControlsHide()
}

fun PlayerViewModel.togglePlayPause() = when (playerState.value) {
    is PlayerState.Playing -> mediaPlayer.pause()
    is PlayerState.Paused -> mediaPlayer.play()
    is PlayerState.Ended -> { mediaPlayer.seekTo(0L); mediaPlayer.play() }
    else -> Unit
}

fun PlayerViewModel.seekToFraction(fraction: Float) {
    val d = mediaPlayer.getDuration()
    if (d > 0) mediaPlayer.seekTo((fraction * d).toLong())
}

fun PlayerViewModel.seekBackward() =
    mediaPlayer.seekTo((mediaPlayer.getCurrentPosition() - SKIP_INTERVAL_MS).coerceAtLeast(0L))

fun PlayerViewModel.seekForward() {
    val d = mediaPlayer.getDuration()
    val t = mediaPlayer.getCurrentPosition() + SKIP_INTERVAL_MS
    mediaPlayer.seekTo(if (d > 0) t.coerceAtMost(d) else t)
}

fun PlayerViewModel.restartContent() = mediaPlayer.seekTo(0L)

// Playback settings
fun PlayerViewModel.setVolume(v: Float) { mediaPlayer.setVolume(v); _extendedState.update { it.copy(volume = v) } }
fun PlayerViewModel.setPlaybackSpeed(s: Float) { mediaPlayer.setPlaybackSpeed(s); _extendedState.update { it.copy(playbackSpeed = s) } }
fun PlayerViewModel.setQuality(h: Int?) { mediaPlayer.setQuality(h); _extendedState.update { it.copy(selectedQualityHeight = h) } }
fun PlayerViewModel.setChapters(chapters: List<ChapterMarker>) { _extendedState.update { it.copy(chapters = chapters) } }
fun PlayerViewModel.setInPictureInPicture(inPip: Boolean) { _extendedState.update { it.copy(isInPictureInPicture = inPip) } }
fun PlayerViewModel.toggleFullscreen() { _extendedState.update { it.copy(isFullscreen = !it.isFullscreen) } }
fun PlayerViewModel.setFullscreen(fs: Boolean) { if (_extendedState.value.isFullscreen != fs) _extendedState.update { it.copy(isFullscreen = fs) } }
fun PlayerViewModel.hideOmriOverlay() { _extendedState.update { it.copy(showOmriOverlay = false) } }

// Sleep timer
fun PlayerViewModel.startSleepTimer(minutes: Int) {
    val originalVolume = _extendedState.value.volume
    sleepTimerManager.start(
        durationMinutes = minutes,
        scope = viewModelScope,
        onFadeOut = { vol -> mediaPlayer.setVolume(vol) },
        onComplete = {
            mediaPlayer.pause()
            mediaPlayer.setVolume(originalVolume)
            _extendedState.update { it.copy(volume = originalVolume) }
        },
    )
}

fun PlayerViewModel.extendSleepTimer(minutes: Int) = sleepTimerManager.extend(minutes)
fun PlayerViewModel.cancelSleepTimer() = sleepTimerManager.cancel()

// VOD interaction features
fun PlayerViewModel.toggleRecording() =
    featuresDelegate.toggleRecording(_extendedState.value, currentContentId) { t -> _extendedState.update(t) }

fun PlayerViewModel.navigateToPreviousInteraction() =
    featuresDelegate.navigateToPreviousInteraction(mediaPlayer.getCurrentPosition(), _extendedState.value) { mediaPlayer.seekTo(it) }

fun PlayerViewModel.navigateToNextInteraction() =
    featuresDelegate.navigateToNextInteraction(mediaPlayer.getCurrentPosition(), _extendedState.value) { mediaPlayer.seekTo(it) }

fun PlayerViewModel.startVodInteraction() =
    currentContentId?.let { id ->
        featuresDelegate.startVodInteraction(id, viewModelScope, { mediaPlayer.pause() }) { t -> _extendedState.update(t) }
    }

fun PlayerViewModel.dismissVodInteractionSheet() {
    _extendedState.update { it.copy(showVodInteractionSheet = false) }
    mediaPlayer.play()
}
