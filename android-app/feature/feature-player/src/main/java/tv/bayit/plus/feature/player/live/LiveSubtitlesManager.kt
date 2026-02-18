package tv.bayit.plus.feature.player.live

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import tv.bayit.plus.core.model.LiveSubtitleEnvelope
import tv.bayit.plus.core.model.WebSocketPongMessage
import tv.bayit.plus.core.network.NetworkConfig
import tv.bayit.plus.core.network.websocket.ChannelType
import tv.bayit.plus.core.network.websocket.WebSocketManager
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages live subtitle WebSocket connection and state.
 *
 * Parses backend messages:
 * - "connected"         -> connection confirmed with language info
 * - "final_subtitle"    -> complete translated cue (nested data)
 * - "partial_subtitle"  -> in-progress cue (nested data)
 * - "ping"              -> server heartbeat, respond with pong
 * - "quota_exceeded"    -> usage limit reached
 * - "error"             -> recoverable/non-recoverable error
 */
@Singleton
class LiveSubtitlesManager @Inject constructor(
    webSocketManager: WebSocketManager,
    networkConfig: NetworkConfig,
) : LiveFeatureManager<LiveSubtitleUiState>(
    webSocketManager,
    networkConfig,
    ChannelType.LIVE_SUBTITLES,
) {
    override fun createInitialState() = LiveSubtitleUiState()

    override fun buildWebSocketUrl(
        channelId: String,
        targetLanguage: String,
    ): String = LiveAIConfig.buildSubtitlesWebSocketUrl(
        baseWsUrl = networkConfig.webSocketBaseUrl,
        channelId = channelId,
        sourceLang = "he",
        targetLang = targetLanguage,
    )

    override fun isEnabled(state: LiveSubtitleUiState) = state.isEnabled

    override fun isConnecting(state: LiveSubtitleUiState) = state.isConnecting

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

    override fun handleMessage(text: String, scope: CoroutineScope) {
        try {
            val envelope = json.decodeFromString<LiveSubtitleEnvelope>(text)
            when (envelope.type) {
                "final_subtitle" -> {
                    val cue = envelope.data ?: return
                    scope.launch {
                        updateState {
                            it.copy(
                                translatedText = cue.text.orEmpty(),
                                originalText = cue.originalText.orEmpty(),
                                confidence = cue.confidence,
                                showOverlay = true,
                            )
                        }
                    }
                    scheduleCueDismiss(scope)
                }

                "partial_subtitle" -> {
                    val cue = envelope.data ?: return
                    scope.launch {
                        updateState {
                            it.copy(
                                translatedText = cue.text.orEmpty(),
                                originalText = cue.originalText.orEmpty(),
                                confidence = cue.confidence,
                                showOverlay = true,
                            )
                        }
                    }
                }

                "connected" -> {
                    scope.launch {
                        updateState {
                            it.copy(
                                sourceLang = envelope.sourceLang,
                                targetLang = envelope.targetLang,
                            )
                        }
                    }
                }

                "ping" -> {
                    val pong = json.encodeToString(
                        WebSocketPongMessage.serializer(),
                        WebSocketPongMessage(
                            timestamp = envelope.timestamp ?: 0.0,
                        ),
                    )
                    sendMessage(pong)
                }

                "quota_exceeded" -> {
                    scope.launch {
                        updateState {
                            it.copy(
                                isQuotaExceeded = true,
                                isEnabled = false,
                                errorMessage = "player.ai.errors.quotaExceeded",
                            )
                        }
                        stop()
                    }
                }

                "error" -> {
                    scope.launch {
                        updateState {
                            it.copy(
                                errorMessage = envelope.message
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

    private fun scheduleCueDismiss(scope: CoroutineScope) {
        autoDismissJob?.cancel()
        autoDismissJob = scope.launch {
            delay(LiveAIConfig.SUBTITLE_DISMISS_DURATION_MS)
            updateState { it.copy(showOverlay = false) }
        }
    }
}
