package tv.bayit.plus.feature.player.live

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import tv.bayit.plus.core.network.NetworkConfig
import tv.bayit.plus.core.network.websocket.ChannelType
import tv.bayit.plus.core.network.websocket.WebSocketManager
import javax.inject.Inject
import javax.inject.Singleton

@Serializable
private data class LiveDubbingMessage(
    val type: String,
    val audioUrl: String? = null,
    val transcript: String? = null,
    val originalText: String? = null,
    val timestamp: Long? = null
)

/**
 * Manages live dubbing WebSocket connection and state
 */
@Singleton
class LiveDubbingManager @Inject constructor(
    webSocketManager: WebSocketManager,
    networkConfig: NetworkConfig
) : LiveFeatureManager<LiveDubbingUiState>(
    webSocketManager,
    networkConfig,
    ChannelType.LIVE_DUBBING
) {
    override fun createInitialState() = LiveDubbingUiState()

    override fun buildWebSocketUrl(channelId: String, targetLanguage: String): String {
        return LiveAIConfig.buildDubbingWebSocketUrl(
            baseWsUrl = networkConfig.webSocketBaseUrl,
            channelId = channelId,
            targetLang = targetLanguage
        )
    }

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
                errorMessage = errorMessage
            )
        }
    }

    override fun handleMessage(text: String, scope: CoroutineScope) {
        try {
            val msg = json.decodeFromString<LiveDubbingMessage>(text)
            when (msg.type) {
                "audio_chunk" -> {
                    scope.launch {
                        updateState {
                            it.copy(
                                audioUrl = msg.audioUrl,
                                transcriptText = msg.transcript.orEmpty(),
                                showOverlay = true
                            )
                        }
                    }
                    scheduleOverlayDismiss(scope)
                }
                "connected" -> {
                    // Connection acknowledged
                }
                "error" -> {
                    scope.launch {
                        updateState {
                            it.copy(errorMessage = msg.transcript ?: "player.ai.errors.serviceError")
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
