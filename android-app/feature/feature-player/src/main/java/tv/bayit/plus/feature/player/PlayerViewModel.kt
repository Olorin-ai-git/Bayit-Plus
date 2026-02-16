package tv.bayit.plus.feature.player

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.common.time.TimeProvider
import tv.bayit.plus.core.data.repository.MediaRepository
import tv.bayit.plus.core.data.repository.SubtitleRepository
import tv.bayit.plus.core.media.BayitMediaPlayer
import tv.bayit.plus.core.media.PlayerState
import tv.bayit.plus.core.model.MediaPlayback
import tv.bayit.plus.feature.player.chapters.ChapterMarker
import tv.bayit.plus.feature.player.live.LiveAICoordinator
import javax.inject.Inject

@HiltViewModel
class PlayerViewModel @Inject constructor(
    private val mediaRepository: MediaRepository,
    private val subtitleRepository: SubtitleRepository,
    private val contentResolver: PlayerContentResolver,
    private val mediaPlayer: BayitMediaPlayer,
    private val liveAICoordinator: LiveAICoordinator,
    private val timeProvider: TimeProvider,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<PlayerUiState>(PlayerUiState.Loading)
    val uiState: StateFlow<PlayerUiState> = _uiState.asStateFlow()
    val playerState: StateFlow<PlayerState> = mediaPlayer.playerState
    private val _isControlsVisible = MutableStateFlow(true)
    val isControlsVisible: StateFlow<Boolean> = _isControlsVisible.asStateFlow()
    private val _playbackPositionMs = MutableStateFlow(0L)
    val playbackPositionMs: StateFlow<Long> = _playbackPositionMs.asStateFlow()
    private val _totalDurationMs = MutableStateFlow(0L)
    val totalDurationMs: StateFlow<Long> = _totalDurationMs.asStateFlow()
    private val _extendedState = MutableStateFlow(PlayerExtendedState())
    val extendedState: StateFlow<PlayerExtendedState> = _extendedState.asStateFlow()

    val subtitleState = liveAICoordinator.subtitleState
    val dubbingState = liveAICoordinator.dubbingState
    val triviaState = liveAICoordinator.triviaState
    val triviaProgress = liveAICoordinator.triviaProgress
    val aiPanelState = liveAICoordinator.panelState

    private var currentContentId: String? = null
    private var currentContentType: String? = null
    private var controlsHideJob: Job? = null
    private var positionPollingJob: Job? = null

    init { mediaPlayer.initialize(); startPositionPolling() }

    fun loadContent(contentId: String, contentType: String) {
        if (currentContentId == contentId) return
        currentContentId = contentId
        currentContentType = contentType
        viewModelScope.launch {
            logger.debug("Loading content", mapOf("contentId" to contentId, "contentType" to contentType))
            val isLive = contentResolver.isLiveContent(contentType)
            val streamResult = contentResolver.resolveStreamUrl(contentId, contentType)
            val metadata = contentResolver.resolveMetadata(contentId, contentType)
            when (streamResult) {
                is BayitResult.Success -> {
                    mediaPlayer.loadMedia(MediaPlayback(
                        streamUrl = streamResult.data, contentId = contentId,
                        title = metadata.first, isLive = isLive,
                    ))
                    _uiState.value = PlayerUiState.Ready(
                        contentId = contentId, title = metadata.first,
                        description = metadata.second, exoPlayer = mediaPlayer.getPlayer(),
                        isLiveContent = isLive, channelId = if (isLive) contentId else null,
                    )
                    scheduleControlsHide()
                    if (!isLive) loadAvailableSubtitles(contentId)
                    logger.info("Playback started", mapOf("contentId" to contentId))
                }
                is BayitResult.Error -> {
                    logger.error("Playback load failed", streamResult.exception, mapOf("contentId" to contentId))
                    _uiState.value = PlayerUiState.Error(
                        streamResult.message ?: streamResult.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun toggleControls() {
        _isControlsVisible.value = !_isControlsVisible.value
        if (_isControlsVisible.value) scheduleControlsHide()
    }

    fun togglePlayPause() = when (playerState.value) {
        is PlayerState.Playing -> mediaPlayer.pause()
        is PlayerState.Paused -> mediaPlayer.play()
        is PlayerState.Ended -> { mediaPlayer.seekTo(0L); mediaPlayer.play() }
        else -> Unit
    }

    fun seekToFraction(fraction: Float) {
        val duration = mediaPlayer.getDuration()
        if (duration > 0) mediaPlayer.seekTo((fraction * duration).toLong())
    }

    fun saveProgress() {
        val contentId = currentContentId ?: return
        val position = mediaPlayer.getCurrentPosition()
        if (position <= 0L) return
        viewModelScope.launch {
            mediaRepository.reportProgress(contentId, position)
            logger.debug("Progress saved", mapOf("contentId" to contentId, "positionMs" to position.toString()))
        }
    }

    fun release() { saveProgress() }

    fun toggleRecording() {
        val current = _extendedState.value
        val meta = mapOf("contentId" to currentContentId.orEmpty())
        _extendedState.value = if (current.isRecording) {
            logger.info("Recording stopped", meta)
            current.copy(isRecording = false, recordingStartTimeMs = null)
        } else {
            logger.info("Recording started", meta)
            current.copy(isRecording = true, recordingStartTimeMs = timeProvider.currentTimeMillis())
        }
    }

    fun setInPictureInPicture(inPip: Boolean) { _extendedState.value = _extendedState.value.copy(isInPictureInPicture = inPip) }
    fun setChapters(chapters: List<ChapterMarker>) { _extendedState.value = _extendedState.value.copy(chapters = chapters) }

    fun setPlaybackSpeed(speed: Float) {
        mediaPlayer.setPlaybackSpeed(speed)
        _extendedState.value = _extendedState.value.copy(playbackSpeed = speed)
    }

    fun setQuality(maxHeight: Int?) {
        mediaPlayer.setQuality(maxHeight)
        _extendedState.value = _extendedState.value.copy(selectedQualityHeight = maxHeight)
    }

    private fun loadAvailableSubtitles(contentId: String) {
        viewModelScope.launch {
            when (val result = subtitleRepository.getAvailableSubtitles(contentId)) {
                is BayitResult.Success -> {
                    val languages = result.data.map { it.language }.distinct()
                    _extendedState.value = _extendedState.value.copy(availableSubtitleLanguages = languages)
                    logger.debug("Loaded available subtitles", mapOf("languages" to languages.joinToString()))
                }
                is BayitResult.Error -> logger.error("Failed to load subtitles", result.exception)
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun selectSubtitleLanguage(languageCode: String) {
        _extendedState.value = _extendedState.value.copy(
            selectedSubtitleLanguage = languageCode,
            isSubtitlesEnabled = true,
        )
        logger.debug("Selected subtitle language", mapOf("language" to languageCode))
    }

    fun toggleSubtitles() {
        val current = _extendedState.value.isSubtitlesEnabled
        _extendedState.value = _extendedState.value.copy(isSubtitlesEnabled = !current)
        logger.debug("Toggled subtitles", mapOf("enabled" to (!current).toString()))
    }

    private val channelId get() = (_uiState.value as? PlayerUiState.Ready)?.channelId
    fun toggleAIPanel() = liveAICoordinator.togglePanel()
    fun toggleLiveSubtitles() = channelId?.let { viewModelScope.launch { liveAICoordinator.toggleSubtitles(it, viewModelScope) } }
    fun toggleLiveDubbing() = channelId?.let { viewModelScope.launch { liveAICoordinator.toggleDubbing(it, viewModelScope) } }
    fun toggleLiveTrivia() = channelId?.let { viewModelScope.launch { liveAICoordinator.toggleTrivia(it, viewModelScope) } }
    fun selectAILanguage(lang: String) = channelId?.let { viewModelScope.launch { liveAICoordinator.selectLanguage(lang, it, viewModelScope) } }
    fun dismissTriviaFact() = viewModelScope.launch { liveAICoordinator.dismissTrivia() }
    fun requestTriviaFollowUp() = liveAICoordinator.requestTriviaFollowUp()

    override fun onCleared() {
        saveProgress()
        viewModelScope.launch { liveAICoordinator.cleanupAll() }
        positionPollingJob?.cancel()
        mediaPlayer.release()
        super.onCleared()
    }

    private fun startPositionPolling() {
        positionPollingJob = viewModelScope.launch {
            while (isActive) {
                val pos = mediaPlayer.getCurrentPosition()
                _playbackPositionMs.value = pos
                _totalDurationMs.value = mediaPlayer.getDuration()
                updateCurrentChapter(pos)
                delay(POSITION_POLL_INTERVAL_MS)
            }
        }
    }

    private fun updateCurrentChapter(positionMs: Long) {
        val chapters = _extendedState.value.chapters
        if (chapters.isEmpty()) return
        val idx = chapters.indexOfLast { it.startTimeMs <= positionMs }
        if (idx != _extendedState.value.currentChapterIndex) {
            _extendedState.value = _extendedState.value.copy(currentChapterIndex = idx)
        }
    }

    private fun scheduleControlsHide() {
        controlsHideJob?.cancel()
        controlsHideJob = viewModelScope.launch { delay(CONTROLS_HIDE_DELAY_MS); _isControlsVisible.value = false }
    }

    companion object {
        private const val CONTROLS_HIDE_DELAY_MS = 4000L
        private const val POSITION_POLL_INTERVAL_MS = 250L
    }
}
