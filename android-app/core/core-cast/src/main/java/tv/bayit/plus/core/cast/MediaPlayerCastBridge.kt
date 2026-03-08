package tv.bayit.plus.core.cast

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import tv.bayit.plus.core.cast.models.CastMedia
import tv.bayit.plus.core.cast.models.CastPlaybackState
import tv.bayit.plus.core.cast.models.CastSessionState
import tv.bayit.plus.core.cast.models.CastSubtitleTrack
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.media.BayitMediaPlayer
import tv.bayit.plus.core.media.PlayerState
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MediaPlayerCastBridge @Inject constructor(
    private val castSessionManager: CastSessionManager,
    private val logger: BayitLogger,
) {
    private var syncJob: Job? = null
    private var observeJob: Job? = null
    private var lastSyncTimeMs: Long = 0L
    private var attachedPlayer: BayitMediaPlayer? = null
    private var currentContentId: String? = null
    private var currentTitle: String? = null

    fun isCastingNow(): Boolean = castSessionManager.sessionState.value.isConnected

    fun attach(player: BayitMediaPlayer, scope: CoroutineScope) {
        detach()
        attachedPlayer = player
        observeJob = scope.launch {
            castSessionManager.sessionState.collect { state ->
                handleStateChange(state, scope)
            }
        }
    }

    fun detach() {
        syncJob?.cancel()
        observeJob?.cancel()
        syncJob = null
        observeJob = null
        attachedPlayer = null
    }

    fun updateContent(contentId: String, title: String) {
        currentContentId = contentId
        currentTitle = title
    }

    fun updateContent(
        contentId: String,
        title: String,
        streamUrl: String,
        contentType: String,
        subtitleTracks: List<CastSubtitleTrack>,
        scope: CoroutineScope,
    ) {
        currentContentId = contentId
        currentTitle = title
        if (castSessionManager.sessionState.value.isConnected) {
            scope.launch {
                loadMediaToCast(streamUrl, contentType, subtitleTracks)
            }
        }
    }

    private fun handleStateChange(state: CastSessionState, scope: CoroutineScope) {
        when {
            state.isConnected -> {
                logger.info("Cast connected, starting sync")
                startPeriodicSync(scope)
            }
            else -> {
                syncJob?.cancel()
                syncJob = null
            }
        }
    }

    private fun startPeriodicSync(scope: CoroutineScope) {
        syncJob?.cancel()
        syncJob = scope.launch {
            while (isActive) {
                syncPlaybackState()
                delay(SYNC_INTERVAL_MS)
            }
        }
    }

    private suspend fun syncPlaybackState() {
        val player = attachedPlayer ?: return
        val positionMs = player.getCurrentPosition()
        val timeDiff = kotlin.math.abs(positionMs - lastSyncTimeMs)
        if (timeDiff < SYNC_THRESHOLD_MS) return

        val isPlaying = player.playerState.value is PlayerState.Playing
        val playbackState = CastPlaybackState(
            currentTime = positionMs,
            isPlaying = isPlaying,
            volume = 1.0f,
        )
        try {
            castSessionManager.syncPlaybackState(playbackState)
            lastSyncTimeMs = positionMs
        } catch (e: Exception) {
            logger.error("Failed to sync playback to cast", error = e)
        }
    }

    private suspend fun loadMediaToCast(
        streamUrl: String,
        contentType: String,
        subtitleTracks: List<CastSubtitleTrack>,
    ) {
        val media = CastMedia(
            contentId = currentContentId ?: streamUrl,
            title = currentTitle ?: "",
            streamUrl = streamUrl,
            posterUrl = null,
            duration = attachedPlayer?.getDuration(),
            subtitleTracks = subtitleTracks,
            contentType = contentType,
        )
        try {
            castSessionManager.loadMedia(media)
            logger.info("Media loaded to cast via bridge", mapOf("contentId" to media.contentId))
        } catch (e: Exception) {
            logger.error("Failed to load media to cast", error = e)
        }
    }

    companion object {
        private const val SYNC_INTERVAL_MS = 5000L
        private const val SYNC_THRESHOLD_MS = 1000L
    }
}
