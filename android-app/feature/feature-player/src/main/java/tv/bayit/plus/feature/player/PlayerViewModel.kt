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
import tv.bayit.plus.core.data.repository.UserRepository
import tv.bayit.plus.core.model.ProfileResponse
import tv.bayit.plus.core.media.BayitMediaPlayer
import tv.bayit.plus.core.media.PlayerState
import tv.bayit.plus.core.model.MediaPlayback
import tv.bayit.plus.feature.player.chapters.ChapterMarker
import tv.bayit.plus.feature.player.live.LiveAICoordinator
import tv.bayit.plus.feature.player.trivia.VodTriviaManager
import javax.inject.Inject

@HiltViewModel
class PlayerViewModel @Inject constructor(
    private val mediaRepository: MediaRepository,
    private val subtitleRepository: SubtitleRepository,
    private val contentResolver: PlayerContentResolver,
    private val mediaPlayer: BayitMediaPlayer,
    private val liveAICoordinator: LiveAICoordinator,
    private val vodTriviaManager: VodTriviaManager,
    private val userRepository: UserRepository,
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
    private var progressSaveJob: Job? = null

    init {
        mediaPlayer.initialize()
        startPositionPolling()
        observeVodTriviaState()
    }

    fun loadContent(contentId: String, contentType: String) {
        if (currentContentId == contentId) return
        currentContentId = contentId
        currentContentType = contentType
        _extendedState.value = _extendedState.value.copy(
            showOmriOverlay = false,
            hasTriggeredOmriOverlay = false,
        )
        viewModelScope.launch { checkSpecialUser() }
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
                    if (!isLive) {
                        loadAvailableSubtitles(contentId)
                        vodTriviaManager.loadFacts(contentId, _extendedState.value.vodTriviaLanguage, viewModelScope)
                    }
                    logger.info("Playback started", mapOf("contentId" to contentId))
                    startPeriodicProgressSave()
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
        val contentType = currentContentType ?: return
        val position = mediaPlayer.getCurrentPosition()
        val duration = mediaPlayer.getDuration()
        if (position <= 0L || duration <= 0L) return
        viewModelScope.launch {
            mediaRepository.reportProgress(contentId, contentType, position, duration)
            logger.debug("Progress saved", mapOf("contentId" to contentId, "positionMs" to position.toString()))
        }
    }

    fun release() {
        progressSaveJob?.cancel()
        saveProgress()
    }

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
        loadSubtitleTrack(languageCode)
    }

    private fun loadSubtitleTrack(languageCode: String) {
        val contentId = currentContentId ?: return
        viewModelScope.launch {
            when (val result = subtitleRepository.fetchCues(
                contentId = contentId,
                language = languageCode,
                hebrewMode = null,
                englishMode = null
            )) {
                is BayitResult.Success -> {
                    _extendedState.value = _extendedState.value.copy(
                        loadedSubtitleCues = result.data.cues ?: emptyList()
                    )
                    logger.debug("Loaded subtitle cues", mapOf(
                        "language" to languageCode,
                        "cueCount" to (result.data.cues?.size ?: 0).toString()
                    ))
                }
                is BayitResult.Error -> {
                    logger.error("Failed to load subtitle cues", result.exception)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun toggleSubtitles() {
        val current = _extendedState.value.isSubtitlesEnabled
        _extendedState.value = _extendedState.value.copy(isSubtitlesEnabled = !current)
        logger.debug("Toggled subtitles", mapOf("enabled" to (!current).toString()))
    }

    fun toggleSplitSubtitleMode() {
        val current = _extendedState.value.isSplitSubtitleMode
        _extendedState.value = _extendedState.value.copy(isSplitSubtitleMode = !current)
        logger.debug("Toggled split subtitle mode", mapOf("enabled" to (!current).toString()))
    }

    fun selectPrimarySubtitleLanguage(languageCode: String) {
        _extendedState.value = _extendedState.value.copy(
            primarySubtitleLanguage = languageCode,
            isSplitSubtitleMode = true,
            isSubtitlesEnabled = true,
        )
        logger.debug("Selected primary subtitle language", mapOf("language" to languageCode))
        loadPrimarySubtitleTrack(languageCode)
    }

    fun selectSecondarySubtitleLanguage(languageCode: String) {
        _extendedState.value = _extendedState.value.copy(
            secondarySubtitleLanguage = languageCode,
            isSplitSubtitleMode = true,
            isSubtitlesEnabled = true,
        )
        logger.debug("Selected secondary subtitle language", mapOf("language" to languageCode))
        loadSecondarySubtitleTrack(languageCode)
    }

    private fun loadPrimarySubtitleTrack(languageCode: String) {
        val contentId = currentContentId ?: return
        viewModelScope.launch {
            when (val result = subtitleRepository.fetchCues(
                contentId = contentId,
                language = languageCode,
                hebrewMode = null,
                englishMode = null
            )) {
                is BayitResult.Success -> {
                    _extendedState.value = _extendedState.value.copy(
                        primarySubtitleCues = result.data.cues ?: emptyList()
                    )
                    logger.debug("Loaded primary subtitle cues", mapOf(
                        "language" to languageCode,
                        "cueCount" to (result.data.cues?.size ?: 0).toString()
                    ))
                }
                is BayitResult.Error -> logger.error("Failed to load primary subtitle cues", result.exception)
                is BayitResult.Loading -> Unit
            }
        }
    }

    private fun loadSecondarySubtitleTrack(languageCode: String) {
        val contentId = currentContentId ?: return
        viewModelScope.launch {
            when (val result = subtitleRepository.fetchCues(
                contentId = contentId,
                language = languageCode,
                hebrewMode = null,
                englishMode = null
            )) {
                is BayitResult.Success -> {
                    _extendedState.value = _extendedState.value.copy(
                        secondarySubtitleCues = result.data.cues ?: emptyList()
                    )
                    logger.debug("Loaded secondary subtitle cues", mapOf(
                        "language" to languageCode,
                        "cueCount" to (result.data.cues?.size ?: 0).toString()
                    ))
                }
                is BayitResult.Error -> logger.error("Failed to load secondary subtitle cues", result.exception)
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun selectSplitSubtitleLayout(layout: tv.bayit.plus.core.model.SplitSubtitleLayout) {
        _extendedState.value = _extendedState.value.copy(splitSubtitleLayout = layout)
        logger.debug("Selected split subtitle layout", mapOf("layout" to layout.name))
    }

    fun fetchExternalSubtitles() {
        val contentId = currentContentId ?: return
        viewModelScope.launch {
            _extendedState.value = _extendedState.value.copy(isLoadingExternalSubtitles = true)
            when (val result = subtitleRepository.fetchExternalSubtitles(contentId)) {
                is BayitResult.Success -> {
                    _extendedState.value = _extendedState.value.copy(
                        externalSubtitleTracks = result.data.tracks,
                        isLoadingExternalSubtitles = false,
                    )
                    logger.info("Fetched external subtitles", mapOf(
                        "count" to result.data.tracks.size.toString(),
                        "provider" to (result.data.provider ?: "unknown"),
                    ))
                }
                is BayitResult.Error -> {
                    _extendedState.value = _extendedState.value.copy(isLoadingExternalSubtitles = false)
                    logger.error("Failed to fetch external subtitles", result.exception)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun selectExternalSubtitle(track: tv.bayit.plus.core.model.ImportedTrack) {
        _extendedState.value = _extendedState.value.copy(
            selectedSubtitleLanguage = track.language,
            isSubtitlesEnabled = true,
        )
        logger.info("Selected external subtitle", mapOf(
            "language" to track.language,
            "provider" to (track.provider ?: "unknown"),
        ))
    }

    private val channelId get() = (_uiState.value as? PlayerUiState.Ready)?.channelId
    fun toggleAIPanel() = liveAICoordinator.togglePanel()
    fun toggleLiveSubtitles() = channelId?.let { viewModelScope.launch { liveAICoordinator.toggleSubtitles(it, viewModelScope) } }
    fun toggleLiveDubbing() = channelId?.let { viewModelScope.launch { liveAICoordinator.toggleDubbing(it, viewModelScope) } }
    fun toggleLiveTrivia() = channelId?.let { viewModelScope.launch { liveAICoordinator.toggleTrivia(it, viewModelScope) } }
    fun selectAILanguage(lang: String) = channelId?.let { viewModelScope.launch { liveAICoordinator.selectLanguage(lang, it, viewModelScope) } }
    fun dismissTriviaFact() = viewModelScope.launch { liveAICoordinator.dismissTrivia() }
    fun requestTriviaFollowUp() = liveAICoordinator.requestTriviaFollowUp()

    fun toggleVodTrivia() = vodTriviaManager.toggleEnabled()
    fun dismissVodTrivia() = vodTriviaManager.dismissFact()
    fun requestVodTriviaFollowUp() = vodTriviaManager.requestFollowUp(viewModelScope)

    fun hideOmriOverlay() {
        _extendedState.value = _extendedState.value.copy(showOmriOverlay = false)
    }

    private suspend fun checkSpecialUser() {
        val result = userRepository.getCurrentUser()
        if (result is BayitResult.Success) {
            val email = (result.data as? ProfileResponse)?.email
            _extendedState.value = _extendedState.value.copy(
                isSpecialUser = email in SPECIAL_USER_EMAILS,
            )
        }
    }

    override fun onCleared() {
        progressSaveJob?.cancel()
        saveProgress()
        viewModelScope.launch { liveAICoordinator.cleanupAll() }
        vodTriviaManager.cleanup()
        positionPollingJob?.cancel()
        mediaPlayer.release()
        super.onCleared()
    }

    private fun observeVodTriviaState() {
        viewModelScope.launch {
            vodTriviaManager.activeFact.collect { fact ->
                _extendedState.value = _extendedState.value.copy(vodTriviaFact = fact)
            }
        }
        viewModelScope.launch {
            vodTriviaManager.isEnabled.collect { enabled ->
                _extendedState.value = _extendedState.value.copy(isVodTriviaEnabled = enabled)
            }
        }
        viewModelScope.launch {
            vodTriviaManager.language.collect { lang ->
                _extendedState.value = _extendedState.value.copy(vodTriviaLanguage = lang)
            }
        }
    }

    private fun startPositionPolling() {
        positionPollingJob = viewModelScope.launch {
            while (isActive) {
                val pos = mediaPlayer.getCurrentPosition()
                _playbackPositionMs.value = pos
                _totalDurationMs.value = mediaPlayer.getDuration()
                updateCurrentChapter(pos)
                updateActiveCue(pos)
                val isLive = (_uiState.value as? PlayerUiState.Ready)?.isLiveContent == true
                if (!isLive) {
                    vodTriviaManager.updatePlaybackPosition(pos, this)
                    val ext = _extendedState.value
                    if (ext.isSpecialUser && !ext.hasTriggeredOmriOverlay
                        && playerState.value is PlayerState.Playing
                    ) {
                        _extendedState.value = ext.copy(
                            showOmriOverlay = true,
                            hasTriggeredOmriOverlay = true,
                        )
                    }
                }
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

    private fun updateActiveCue(positionMs: Long) {
        if (!_extendedState.value.isSubtitlesEnabled) {
            if (_extendedState.value.activeCue != null || _extendedState.value.activePrimaryCue != null || _extendedState.value.activeSecondaryCue != null) {
                _extendedState.value = _extendedState.value.copy(
                    activeCue = null,
                    activePrimaryCue = null,
                    activeSecondaryCue = null
                )
            }
            return
        }

        val positionSeconds = positionMs / 1000.0

        if (_extendedState.value.isSplitSubtitleMode) {
            // Split mode: update both primary and secondary cues
            val primaryCue = findCueAtPosition(_extendedState.value.primarySubtitleCues, positionSeconds)
            val secondaryCue = findCueAtPosition(_extendedState.value.secondarySubtitleCues, positionSeconds)

            if (primaryCue != _extendedState.value.activePrimaryCue || secondaryCue != _extendedState.value.activeSecondaryCue) {
                _extendedState.value = _extendedState.value.copy(
                    activePrimaryCue = primaryCue,
                    activeSecondaryCue = secondaryCue
                )
            }
        } else {
            // Regular mode: single subtitle track
            val activeCue = findCueAtPosition(_extendedState.value.loadedSubtitleCues, positionSeconds)

            if (activeCue != _extendedState.value.activeCue) {
                _extendedState.value = _extendedState.value.copy(activeCue = activeCue)
            }
        }
    }

    private fun findCueAtPosition(cues: List<tv.bayit.plus.core.model.SubtitleCue>, positionSeconds: Double): tv.bayit.plus.core.model.SubtitleCue? {
        return cues.firstOrNull { cue ->
            val start = cue.startTime ?: return@firstOrNull false
            val end = cue.endTime ?: return@firstOrNull false
            positionSeconds >= start && positionSeconds <= end
        }
    }

    private fun scheduleControlsHide() {
        controlsHideJob?.cancel()
        controlsHideJob = viewModelScope.launch { delay(CONTROLS_HIDE_DELAY_MS); _isControlsVisible.value = false }
    }

    private fun startPeriodicProgressSave() {
        progressSaveJob?.cancel()
        progressSaveJob = viewModelScope.launch {
            while (isActive) {
                delay(PROGRESS_SAVE_INTERVAL_MS)
                saveProgress()
            }
        }
    }

    companion object {
        private const val CONTROLS_HIDE_DELAY_MS = 4000L
        private const val POSITION_POLL_INTERVAL_MS = 250L
        private const val PROGRESS_SAVE_INTERVAL_MS = 15_000L
        private val SPECIAL_USER_EMAILS = setOf("oklainert@gmail.com", "admin@olorin.ai")
    }
}
