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
import tv.bayit.plus.feature.player.dialogue.ContentCharacter
import tv.bayit.plus.feature.player.dialogue.VODInteractionApi
import tv.bayit.plus.feature.player.live.LiveAICoordinator
import tv.bayit.plus.core.media.SleepTimerManager
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
    private val sleepTimerManager: SleepTimerManager,
    private val userRepository: UserRepository,
    private val timeProvider: TimeProvider,
    private val logger: BayitLogger,
    private val vodInteractionApi: VODInteractionApi,
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
        observeSleepTimerState()
    }

    fun loadContent(contentId: String, contentType: String, resumePositionMs: Long = 0L) {
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
                    if (resumePositionMs > 0L) {
                        mediaPlayer.seekTo(resumePositionMs)
                        logger.debug("Resuming from position", mapOf("positionMs" to resumePositionMs.toString()))
                    }
                    _uiState.value = PlayerUiState.Ready(
                        contentId = contentId, title = metadata.first,
                        description = metadata.second, exoPlayer = mediaPlayer.getPlayer(),
                        isLiveContent = isLive, channelId = if (isLive) contentId else null,
                    )
                    scheduleControlsHide()
                    if (!isLive) {
                        loadAvailableSubtitles(contentId)
                        vodTriviaManager.loadFacts(contentId, _extendedState.value.vodTriviaLanguage, viewModelScope)
                        loadInteractiveMoments(contentId)
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

    fun seekBackward() = mediaPlayer.seekTo(
        (mediaPlayer.getCurrentPosition() - SKIP_INTERVAL_MS).coerceAtLeast(0L)
    )

    fun seekForward() {
        val duration = mediaPlayer.getDuration()
        val target = mediaPlayer.getCurrentPosition() + SKIP_INTERVAL_MS
        mediaPlayer.seekTo(if (duration > 0) target.coerceAtMost(duration) else target)
    }

    fun restartContent() = mediaPlayer.seekTo(0L)

    fun setVolume(volume: Float) {
        mediaPlayer.setVolume(volume)
        _extendedState.value = _extendedState.value.copy(volume = volume)
    }

    fun startSleepTimer(minutes: Int) {
        val originalVolume = _extendedState.value.volume
        sleepTimerManager.start(
            durationMinutes = minutes,
            scope = viewModelScope,
            onFadeOut = { volume -> mediaPlayer.setVolume(volume) },
            onComplete = {
                mediaPlayer.pause()
                mediaPlayer.setVolume(originalVolume)
                _extendedState.value = _extendedState.value.copy(volume = originalVolume)
            },
        )
    }

    fun extendSleepTimer(minutes: Int) = sleepTimerManager.extend(minutes)

    fun cancelSleepTimer() = sleepTimerManager.cancel()

    private fun loadInteractiveMoments(contentId: String) {
        viewModelScope.launch {
            val moments = runCatching { vodInteractionApi.getInteractiveMoments(contentId) }
                .getOrElse { emptyList() }
            _extendedState.value = _extendedState.value.copy(interactiveMoments = moments)
            logger.debug("Loaded interactive moments", mapOf("contentId" to contentId, "count" to moments.size.toString()))
        }
    }

    fun navigateToPreviousInteraction() {
        val posSeconds = mediaPlayer.getCurrentPosition() / 1000.0
        val moments = _extendedState.value.interactiveMoments.sortedBy { it.timestamp }
        val target = moments.lastOrNull { it.timestamp < posSeconds - INTERACTION_REWIND_THRESHOLD_S }?.timestamp ?: return
        mediaPlayer.seekTo(((target - INTERACTION_SEEK_OFFSET_S).coerceAtLeast(0.0) * 1000).toLong())
        logger.debug("Navigated to previous interaction", mapOf("targetTimestamp" to target.toString()))
    }

    fun navigateToNextInteraction() {
        val posSeconds = mediaPlayer.getCurrentPosition() / 1000.0
        val moments = _extendedState.value.interactiveMoments.sortedBy { it.timestamp }
        val target = moments.firstOrNull { it.timestamp > posSeconds }?.timestamp ?: return
        mediaPlayer.seekTo(((target - INTERACTION_SEEK_OFFSET_S).coerceAtLeast(0.0) * 1000).toLong())
        logger.debug("Navigated to next interaction", mapOf("targetTimestamp" to target.toString()))
    }

    fun startVodInteraction() {
        val contentId = currentContentId ?: return
        viewModelScope.launch {
            // Verify the user has a ready Creatify avatar before showing the sheet.
            // Using "any" as the sentinel avatarId tells the backend to return the
            // current user's active persona — mirroring the iOS implementation.
            val avatarStatus = runCatching { vodInteractionApi.getAvatarStatus("any") }
                .getOrNull()

            if (avatarStatus == null || avatarStatus.status != "ready" || avatarStatus.avatarImageUrl == null) {
                logger.info(
                    "Avatar not ready, skipping VOD interaction",
                    mapOf(
                        "contentId" to contentId,
                        "avatarStatus" to (avatarStatus?.status ?: "null"),
                    ),
                )
                return@launch
            }

            val characters = runCatching { vodInteractionApi.getInteractiveCharacters(contentId) }
                .getOrElse { emptyList<ContentCharacter>() }
            mediaPlayer.pause()
            _extendedState.value = _extendedState.value.copy(
                vodInteractionCharacters = characters,
                showVodInteractionSheet = true,
                avatarId = avatarStatus.avatarId,
                avatarImageUrl = avatarStatus.avatarImageUrl,
            )
            logger.debug(
                "Started VOD interaction",
                mapOf("contentId" to contentId, "characters" to characters.size.toString()),
            )
        }
    }

    fun dismissVodInteractionSheet() {
        _extendedState.value = _extendedState.value.copy(showVodInteractionSheet = false)
        mediaPlayer.play()
    }

    fun hideOmriOverlay() {
        _extendedState.value = _extendedState.value.copy(showOmriOverlay = false)
    }

    fun toggleFullscreen() {
        val current = _extendedState.value.isFullscreen
        _extendedState.value = _extendedState.value.copy(isFullscreen = !current)
        logger.debug("Toggled fullscreen", mapOf("isFullscreen" to (!current).toString()))
    }

    fun setFullscreen(fullscreen: Boolean) {
        if (_extendedState.value.isFullscreen != fullscreen) {
            _extendedState.value = _extendedState.value.copy(isFullscreen = fullscreen)
            logger.debug("Set fullscreen", mapOf("isFullscreen" to fullscreen.toString()))
        }
    }

    private suspend fun checkSpecialUser() {
        val result = userRepository.getCurrentUser()
        if (result is BayitResult.Success) {
            val profile = result.data as? ProfileResponse
            _extendedState.value = _extendedState.value.copy(
                isSpecialUser = profile?.email in SPECIAL_USER_EMAILS,
                profileId = profile?.id,
            )
        }
    }

    override fun onCleared() {
        progressSaveJob?.cancel()
        saveProgress()
        viewModelScope.launch { liveAICoordinator.cleanupAll() }
        sleepTimerManager.cancel()
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

    private fun observeSleepTimerState() {
        viewModelScope.launch {
            sleepTimerManager.isActive.collect { active ->
                _extendedState.value = _extendedState.value.copy(isSleepTimerActive = active)
            }
        }
        viewModelScope.launch {
            sleepTimerManager.remainingSeconds.collect { remaining ->
                _extendedState.value = _extendedState.value.copy(sleepTimerRemainingSeconds = remaining)
            }
        }
        viewModelScope.launch {
            sleepTimerManager.durationMinutes.collect { duration ->
                _extendedState.value = _extendedState.value.copy(sleepTimerDurationMinutes = duration)
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
        private const val SKIP_INTERVAL_MS = 30_000L
        private const val INTERACTION_REWIND_THRESHOLD_S = 3.0
        private const val INTERACTION_SEEK_OFFSET_S = 5.0
    }
}
