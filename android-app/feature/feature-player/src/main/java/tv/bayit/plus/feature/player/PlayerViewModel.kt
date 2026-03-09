package tv.bayit.plus.feature.player

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import tv.bayit.plus.core.cast.CastSessionManager
import tv.bayit.plus.core.cast.MediaPlayerCastBridge
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.MediaRepository
import tv.bayit.plus.core.media.BayitMediaPlayer
import tv.bayit.plus.core.media.PlayerState
import tv.bayit.plus.core.media.SleepTimerManager
import tv.bayit.plus.core.model.MediaPlayback
import tv.bayit.plus.feature.onboarding.TooltipManager
import tv.bayit.plus.feature.player.live.LiveAICoordinator
import tv.bayit.plus.feature.player.trivia.VodTriviaManager
import javax.inject.Inject

@HiltViewModel
class PlayerViewModel @Inject constructor(
    private val mediaRepository: MediaRepository,
    private val contentResolver: PlayerContentResolver,
    internal val mediaPlayer: BayitMediaPlayer,
    internal val liveAICoordinator: LiveAICoordinator,
    internal val vodTriviaManager: VodTriviaManager,
    internal val sleepTimerManager: SleepTimerManager,
    internal val subtitleDelegate: PlayerSubtitleDelegate,
    internal val featuresDelegate: PlayerFeaturesDelegate,
    private val castSessionManager: CastSessionManager,
    private val castBridge: MediaPlayerCastBridge,
    internal val tooltipManager: TooltipManager,
    internal val byocSubtitleEnricher: BYOCSubtitleEnricher,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<PlayerUiState>(PlayerUiState.Loading)
    val uiState: StateFlow<PlayerUiState> = _uiState.asStateFlow()
    val playerState: StateFlow<PlayerState> = mediaPlayer.playerState
    internal val _isControlsVisible = MutableStateFlow(true)
    val isControlsVisible: StateFlow<Boolean> = _isControlsVisible.asStateFlow()
    private val _playbackPositionMs = MutableStateFlow(0L)
    val playbackPositionMs: StateFlow<Long> = _playbackPositionMs.asStateFlow()
    private val _totalDurationMs = MutableStateFlow(0L)
    val totalDurationMs: StateFlow<Long> = _totalDurationMs.asStateFlow()
    internal val _extendedState = MutableStateFlow(PlayerExtendedState())
    val extendedState: StateFlow<PlayerExtendedState> = _extendedState.asStateFlow()

    val subtitleState = liveAICoordinator.subtitleState
    val dubbingState = liveAICoordinator.dubbingState
    val triviaState = liveAICoordinator.triviaState
    val triviaProgress = liveAICoordinator.triviaProgress
    val aiPanelState = liveAICoordinator.panelState

    internal var currentContentId: String? = null
    internal var currentContentType: String? = null
    private var controlsHideJob: Job? = null
    private var positionPollingJob: Job? = null
    private var progressSaveJob: Job? = null

    init {
        mediaPlayer.initialize()
        castSessionManager.initialize()
        castBridge.attach(mediaPlayer, viewModelScope)
        startPositionPolling()
        observeAuxState()
        observeCastState()
    }

    fun loadContent(contentId: String, contentType: String, resumePositionMs: Long = 0L) {
        if (currentContentId == contentId) return
        currentContentId = contentId
        currentContentType = contentType
        _extendedState.update { it.copy(showOmriOverlay = false, hasTriggeredOmriOverlay = false) }
        featuresDelegate.checkSpecialUser(viewModelScope) { t -> _extendedState.update(t) }
        viewModelScope.launch {
            logger.debug("Loading content", mapOf("contentId" to contentId, "contentType" to contentType))
            val isLive = contentResolver.isLiveContent(contentType)
            val streamDeferred = async { contentResolver.resolveStreamUrl(contentId, contentType) }
            val metadataDeferred = async { contentResolver.resolveMetadata(contentId, contentType) }
            val streamResult = streamDeferred.await()
            val metadata = metadataDeferred.await()
            when (streamResult) {
                is BayitResult.Success -> {
                    mediaPlayer.loadMedia(MediaPlayback(streamUrl = streamResult.data, contentId = contentId, title = metadata.first, isLive = isLive))
                    if (resumePositionMs > 0L) mediaPlayer.seekTo(resumePositionMs)
                    _uiState.value = PlayerUiState.Ready(contentId = contentId, title = metadata.first, description = metadata.second, exoPlayer = mediaPlayer.getPlayer(), isLiveContent = isLive, channelId = if (isLive) contentId else null)
                    scheduleControlsHide()
                    if (!isLive) {
                        subtitleDelegate.loadAvailableSubtitles(contentId, viewModelScope) { t -> _extendedState.update(t) }
                        vodTriviaManager.loadFacts(contentId, _extendedState.value.vodTriviaLanguage, viewModelScope)
                        featuresDelegate.loadAvatarInfo(viewModelScope) { t -> _extendedState.update(t) }
                        featuresDelegate.loadInteractiveMoments(contentId, viewModelScope) { t -> _extendedState.update(t) }
                        if (contentType == PlayerContentResolver.CONTENT_TYPE_BYOC) {
                            byocSubtitleEnricher.enrichSubtitles(
                                contentId = contentId,
                                contentTitle = metadata.first,
                                scope = viewModelScope,
                                onSubtitleAdded = { event ->
                                    _extendedState.update {
                                        it.copy(subtitleBannerMessage = "Added ${event.languageName} subtitles to ${event.contentTitle}")
                                    }
                                },
                                onLanguagesUpdated = { langs ->
                                    _extendedState.update { it.copy(availableSubtitleLanguages = langs) }
                                },
                                onBackendContentId = { backendId ->
                                    _extendedState.update { it.copy(byocBackendContentId = backendId) }
                                    subtitleDelegate.loadAvailableSubtitles(backendId, viewModelScope) { t -> _extendedState.update(t) }
                                },
                            )
                        }
                    }
                    castBridge.updateContent(contentId, metadata.first)
                    logger.info("Playback started", mapOf("contentId" to contentId))
                    startPeriodicProgressSave()
                }
                is BayitResult.Error -> {
                    logger.error("Playback load failed", streamResult.exception, mapOf("contentId" to contentId))
                    _uiState.value = PlayerUiState.Error(streamResult.message ?: streamResult.exception.message.orEmpty())
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun saveProgress() {
        val contentId = currentContentId ?: return
        val contentType = currentContentType ?: return
        val position = mediaPlayer.getCurrentPosition()
        val duration = mediaPlayer.getDuration()
        if (position <= 0L || duration <= 0L) return
        viewModelScope.launch { mediaRepository.reportProgress(contentId, contentType, position, duration) }
    }

    fun release() { progressSaveJob?.cancel(); saveProgress() }

    fun onCastClick() {
        val state = castSessionManager.sessionState.value
        when {
            state.isConnected -> castSessionManager.endSession()
            state.isAvailable -> castSessionManager.presentDevicePicker()
        }
    }

    override fun onCleared() {
        progressSaveJob?.cancel()
        saveProgress()
        castBridge.detach()
        viewModelScope.launch { liveAICoordinator.cleanupAll() }
        sleepTimerManager.cancel()
        vodTriviaManager.cleanup()
        positionPollingJob?.cancel()
        mediaPlayer.release()
        super.onCleared()
    }

    internal fun scheduleControlsHide() {
        controlsHideJob?.cancel()
        controlsHideJob = viewModelScope.launch { delay(CONTROLS_HIDE_DELAY_MS); _isControlsVisible.value = false }
    }

    private fun observeCastState() {
        viewModelScope.launch {
            castSessionManager.sessionState.collect { state ->
                _extendedState.update {
                    it.copy(
                        isCastAvailable = state.isAvailable,
                        isCastConnected = state.isConnected,
                    )
                }
            }
        }
    }

    private fun observeAuxState() {
        viewModelScope.launch { vodTriviaManager.activeFact.collect { _extendedState.update { s -> s.copy(vodTriviaFact = it) } } }
        viewModelScope.launch { vodTriviaManager.isEnabled.collect { _extendedState.update { s -> s.copy(isVodTriviaEnabled = it) } } }
        viewModelScope.launch { vodTriviaManager.language.collect { _extendedState.update { s -> s.copy(vodTriviaLanguage = it) } } }
        viewModelScope.launch { sleepTimerManager.isActive.collect { _extendedState.update { s -> s.copy(isSleepTimerActive = it) } } }
        viewModelScope.launch { sleepTimerManager.remainingSeconds.collect { _extendedState.update { s -> s.copy(sleepTimerRemainingSeconds = it) } } }
        viewModelScope.launch { sleepTimerManager.durationMinutes.collect { _extendedState.update { s -> s.copy(sleepTimerDurationMinutes = it) } } }
    }

    private fun startPositionPolling() {
        positionPollingJob = viewModelScope.launch {
            while (isActive) {
                val pos = mediaPlayer.getCurrentPosition()
                _playbackPositionMs.value = pos
                _totalDurationMs.value = mediaPlayer.getDuration()
                updateCurrentChapter(pos)
                _extendedState.update { subtitleDelegate.updateActiveCue(pos, it) }
                val isLive = (_uiState.value as? PlayerUiState.Ready)?.isLiveContent == true
                if (!isLive) {
                    vodTriviaManager.updatePlaybackPosition(pos, this)
                    val ext = _extendedState.value
                    if (ext.isSpecialUser && !ext.hasTriggeredOmriOverlay && playerState.value is PlayerState.Playing) {
                        _extendedState.update { it.copy(showOmriOverlay = true, hasTriggeredOmriOverlay = true) }
                    }
                    val moment = featuresDelegate.checkMomentAtPosition(pos, ext)
                    if (moment != null && ext.activeMoment == null) {
                        _extendedState.update {
                            it.copy(
                                activeMoment = moment,
                                triggeredMomentTimestamps = it.triggeredMomentTimestamps + moment.timestamp,
                            )
                        }
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
        if (idx != _extendedState.value.currentChapterIndex) _extendedState.update { it.copy(currentChapterIndex = idx) }
    }

    private fun startPeriodicProgressSave() {
        progressSaveJob?.cancel()
        progressSaveJob = viewModelScope.launch { while (isActive) { delay(PROGRESS_SAVE_INTERVAL_MS); saveProgress() } }
    }

    companion object {
        internal const val SKIP_INTERVAL_MS = 30_000L
        private const val CONTROLS_HIDE_DELAY_MS = 4000L
        private const val POSITION_POLL_INTERVAL_MS = 250L
        private const val PROGRESS_SAVE_INTERVAL_MS = 15_000L
    }
}
