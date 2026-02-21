package tv.bayit.plus.feature.player.live

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.model.DubbedAudioSegment
import tv.bayit.plus.core.model.DubbingConnectionInfo
import tv.bayit.plus.core.model.DubbingLatencyReport
import tv.bayit.plus.core.model.LiveDubbingEnvelope
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.network.NetworkConfig
import tv.bayit.plus.core.network.websocket.ChannelType
import tv.bayit.plus.core.network.websocket.WebSocketManager
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages live dubbing WebSocket connection and state.
 *
 * Parses backend messages:
 * - "connected"       -> session info (voice, sync delay)
 * - "dubbed_audio"    -> base64 audio + transcript (nested data)
 * - "latency_report"  -> STT/translation/TTS timing breakdown
 * - "buffer_status"   -> playback buffer info (continuous flow)
 * - "error"           -> recoverable/non-recoverable error
 */
@Singleton
class LiveDubbingManager @Inject constructor(
    webSocketManager: WebSocketManager,
    networkConfig: NetworkConfig,
    logger: BayitLogger,
) : LiveFeatureManager<LiveDubbingUiState>(
    webSocketManager,
    networkConfig,
    ChannelType.LIVE_DUBBING,
    logger,
) {
    private val _latencyReport = MutableStateFlow<DubbingLatencyReport?>(null)
    val latencyReport: StateFlow<DubbingLatencyReport?> = _latencyReport.asStateFlow()

    private val _connectionInfo = MutableStateFlow<DubbingConnectionInfo?>(null)
    val connectionInfo: StateFlow<DubbingConnectionInfo?> = _connectionInfo.asStateFlow()

    /** Callback invoked when a dubbed audio segment arrives. */
    var onAudioSegmentReceived: ((DubbedAudioSegment) -> Unit)? = null

    override fun createInitialState() = LiveDubbingUiState()

    override fun buildWebSocketUrl(
        channelId: String,
        targetLanguage: String,
    ): String = LiveAIConfig.buildDubbingWebSocketUrl(
        baseWsUrl = networkConfig.webSocketBaseUrl,
        channelId = channelId,
        targetLang = targetLanguage,
    )

    override fun isEnabled(state: LiveDubbingUiState) = state.isEnabled

    override fun isConnecting(state: LiveDubbingUiState) = state.isConnecting

    override suspend fun setConnecting(isConnecting: Boolean) {
        updateState { it.copy(isConnecting = isConnecting) }
    }

    override suspend fun setEnabled(isEnabled: Boolean, errorMessage: String?) {
        updateState {
            it.copy(
                isEnabled = isEnabled,
                isConnecting = false,
                errorMessage = errorMessage,
            )
        }
    }

    override suspend fun stop() {
        _latencyReport.value = null
        _connectionInfo.value = null
        super.stop()
    }

    override fun handleMessage(text: String, scope: CoroutineScope) {
        try {
            val envelope = json.decodeFromString<LiveDubbingEnvelope>(text)
            when (envelope.type) {
                "dubbed_audio" -> {
                    val segment = envelope.data ?: return
                    onAudioSegmentReceived?.invoke(segment)
                    scope.launch {
                        updateState {
                            it.copy(
                                transcriptText = segment.translatedText.orEmpty(),
                                originalText = segment.originalText.orEmpty(),
                                latencyMs = segment.latencyMs,
                                showOverlay = true,
                            )
                        }
                    }
                    scheduleOverlayDismiss(scope)
                }

                "connected" -> {
                    _connectionInfo.value = DubbingConnectionInfo(
                        sessionId = envelope.sessionId,
                        sourceLang = envelope.sourceLang,
                        targetLang = envelope.targetLang,
                        voiceId = envelope.voiceId,
                        syncDelayMs = envelope.syncDelayMs,
                    )
                }

                "latency_report" -> {
                    _latencyReport.value = DubbingLatencyReport(
                        avgSttMs = envelope.avgSttMs,
                        avgTranslationMs = envelope.avgTranslationMs,
                        avgTtsMs = envelope.avgTtsMs,
                        avgTotalMs = envelope.avgTotalMs,
                        segmentsProcessed = envelope.segmentsProcessed,
                    )
                    scope.launch {
                        updateState {
                            it.copy(
                                avgLatencyMs = envelope.avgTotalMs?.toLong(),
                            )
                        }
                    }
                }

                "buffer_status" -> {
                    scope.launch {
                        updateState {
                            it.copy(
                                bufferedSegments = envelope.bufferedSegments,
                                estimatedLatencyMs = envelope.estimatedLatencyMs,
                            )
                        }
                    }
                }

                "error" -> {
                    scope.launch {
                        updateState {
                            it.copy(
                                errorMessage = envelope.error
                                    ?: "player.ai.errors.serviceError",
                            )
                        }
                    }
                }
            }
        } catch (e: Exception) {
            scope.launch {
                updateState {
                    it.copy(errorMessage = "player.ai.errors.parseError")
                }
            }
        }
    }

    private fun scheduleOverlayDismiss(scope: CoroutineScope) {
        autoDismissJob?.cancel()
        autoDismissJob = scope.launch {
            delay(LiveAIConfig.DUBBING_OVERLAY_DISMISS_DURATION_MS)
            updateState { it.copy(showOverlay = false) }
        }
    }
}
