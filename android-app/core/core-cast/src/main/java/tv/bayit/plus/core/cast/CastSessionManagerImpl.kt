package tv.bayit.plus.core.cast

import android.content.Context
import com.google.android.gms.cast.MediaInfo
import com.google.android.gms.cast.MediaLoadRequestData
import com.google.android.gms.cast.MediaMetadata
import com.google.android.gms.cast.MediaTrack
import com.google.android.gms.cast.framework.CastContext
import com.google.android.gms.cast.framework.CastSession
import com.google.android.gms.cast.framework.SessionManager
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import tv.bayit.plus.core.cast.models.CastDeviceInfo
import tv.bayit.plus.core.cast.models.CastMedia
import tv.bayit.plus.core.cast.models.CastPlaybackState
import tv.bayit.plus.core.cast.models.CastSessionState
import tv.bayit.plus.core.common.CastReceiverAppId
import tv.bayit.plus.core.common.logging.BayitLogger
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CastSessionManagerImpl @Inject constructor(
    @ApplicationContext private val context: Context,
    @CastReceiverAppId private val receiverAppId: String,
    private val logger: BayitLogger,
) : CastSessionManager {

    private val _sessionState = MutableStateFlow(CastSessionState.NO_DEVICES_AVAILABLE)
    override val sessionState: StateFlow<CastSessionState> = _sessionState.asStateFlow()

    private val _deviceInfo = MutableStateFlow<CastDeviceInfo?>(null)
    override val deviceInfo: StateFlow<CastDeviceInfo?> = _deviceInfo.asStateFlow()

    private var castContext: CastContext? = null
    private var sessionDelegate: CastSessionDelegate? = null

    override fun initialize() {
        if (castContext != null) return

        if (receiverAppId.isBlank()) {
            logger.warning("Cast receiver app ID is blank, cast disabled")
            return
        }

        BayitCastOptionsProvider.configure(context, receiverAppId)

        try {
            val ctx = CastContext.getSharedInstance(context)
            castContext = ctx

            val delegate = CastSessionDelegate(
                onSessionStarted = ::handleSessionStarted,
                onSessionEnded = ::handleSessionEnded,
                onSessionFailed = ::handleSessionFailed,
            )
            ctx.sessionManager.addSessionManagerListener(delegate, CastSession::class.java)
            sessionDelegate = delegate

            val hasDevices = ctx.castState != com.google.android.gms.cast.framework.CastState.NO_DEVICES_AVAILABLE
            _sessionState.value = if (hasDevices) CastSessionState.NOT_CONNECTED else CastSessionState.NO_DEVICES_AVAILABLE

            ctx.addCastStateListener { castState ->
                handleCastStateChanged(castState)
            }

            logger.info("Cast framework initialized")
        } catch (e: Exception) {
            logger.error("Failed to initialize cast framework", error = e)
        }
    }

    override fun presentDevicePicker() {
        // On Android, device picking is handled by MediaRouteButton in the UI.
        // This method serves as a programmatic trigger for ending/toggling sessions.
        val ctx = castContext ?: return
        if (!_sessionState.value.isAvailable) {
            logger.warning("No cast devices available")
            return
        }
        logger.info("Device picker requested — use MediaRouteButton in UI")
    }

    override fun endSession() {
        val ctx = castContext ?: return
        if (!_sessionState.value.isConnected) return
        logger.info("Ending cast session")
        _sessionState.value = CastSessionState.DISCONNECTING
        ctx.sessionManager.endCurrentSession(true)
    }

    override suspend fun loadMedia(media: CastMedia) {
        val session = castContext?.sessionManager?.currentCastSession ?: return
        val remoteClient = session.remoteMediaClient ?: return

        val metadata = MediaMetadata(MediaMetadata.MEDIA_TYPE_GENERIC).apply {
            putString(MediaMetadata.KEY_TITLE, media.title)
        }

        val tracks = media.subtitleTracks.mapIndexed { index, track ->
            MediaTrack.Builder(index.toLong() + 1, MediaTrack.TYPE_TEXT)
                .setSubtype(MediaTrack.SUBTYPE_SUBTITLES)
                .setName(track.name ?: track.language)
                .setLanguage(track.language)
                .setContentId(track.url)
                .setContentType("text/vtt")
                .build()
        }

        val mediaInfo = MediaInfo.Builder(media.streamUrl)
            .setContentType(media.contentType)
            .setStreamType(MediaInfo.STREAM_TYPE_BUFFERED)
            .setMetadata(metadata)
            .setMediaTracks(tracks)
            .build()

        val request = MediaLoadRequestData.Builder()
            .setMediaInfo(mediaInfo)
            .setAutoplay(true)
            .build()

        remoteClient.load(request)
        logger.info("Media loaded to cast device", mapOf("contentId" to media.contentId))
    }

    override suspend fun syncPlaybackState(state: CastPlaybackState) {
        val session = castContext?.sessionManager?.currentCastSession ?: return
        val remoteClient = session.remoteMediaClient ?: return

        if (state.isPlaying) remoteClient.play() else remoteClient.pause()

        val castPosition = remoteClient.approximateStreamPosition
        val positionMs = state.currentTime
        if (kotlin.math.abs(castPosition - positionMs) > SEEK_THRESHOLD_MS) {
            remoteClient.seek(positionMs)
        }

        remoteClient.setStreamVolume(state.volume.toDouble())
    }

    private fun handleCastStateChanged(castState: Int) {
        val hasDevices = castState != com.google.android.gms.cast.framework.CastState.NO_DEVICES_AVAILABLE
        val current = _sessionState.value
        when {
            hasDevices && current == CastSessionState.NO_DEVICES_AVAILABLE ->
                _sessionState.value = CastSessionState.NOT_CONNECTED
            !hasDevices && current == CastSessionState.NOT_CONNECTED ->
                _sessionState.value = CastSessionState.NO_DEVICES_AVAILABLE
        }
    }

    internal fun handleSessionStarted(session: CastSession) {
        _sessionState.value = CastSessionState.CONNECTED
        _deviceInfo.value = CastDeviceInfo(
            deviceName = session.castDevice?.friendlyName ?: "Chromecast",
            modelName = session.castDevice?.modelName,
            deviceId = session.castDevice?.deviceId ?: "",
        )
        logger.info("Cast session started", mapOf("device" to (session.castDevice?.friendlyName ?: "")))
    }

    internal fun handleSessionEnded() {
        _sessionState.value = CastSessionState.NOT_CONNECTED
        _deviceInfo.value = null
        logger.info("Cast session ended")
    }

    internal fun handleSessionFailed(error: Int) {
        _sessionState.value = CastSessionState.NOT_CONNECTED
        logger.error("Cast session failed", metadata = mapOf("errorCode" to error.toString()))
    }

    companion object {
        private const val SEEK_THRESHOLD_MS = 2000L
    }
}
