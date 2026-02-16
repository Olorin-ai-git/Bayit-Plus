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
private data class LiveSubtitleMessage(
    val type: String,
    val text: String? = null,
    val translatedText: String? = null,
    val timestamp: Long? = null
)

/**
 * Manages live subtitle WebSocket connection and state
 */
@Singleton
class LiveSubtitlesManager @Inject constructor(
    webSocketManager: WebSocketManager,
    networkConfig: NetworkConfig
) : LiveFeatureManager<LiveSubtitleUiState>(
    webSocketManager,
    networkConfig,
    ChannelType.LIVE_SUBTITLES
) {
    override fun createInitialState() = LiveSubtitleUiState()

    override fun buildWebSocketUrl(channelId: String, targetLanguage: String): String {
        return LiveAIConfig.buildSubtitlesWebSocketUrl(
            baseWsUrl = networkConfig.webSocketBaseUrl,
            channelId = channelId,
            sourceLang = "he",
            targetLang = targetLanguage
        )
    }

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
                errorMessage = errorMessage
            )
        }
    }

    override fun handleMessage(text: String, scope: CoroutineScope) {
        try {
            val msg = json.decodeFromString<LiveSubtitleMessage>(text)
            when (msg.type) {
                "final_subtitle" -> {
                    scope.launch {
                        updateState {
                            it.copy(
                                translatedText = msg.translatedText.orEmpty(),
                                originalText = msg.text.orEmpty(),
                                showOverlay = true
                            )
                        }
                    }
                    scheduleCueDismiss(scope)
                }
                "partial_subtitle" -> {
                    scope.launch {
                        updateState {
                            it.copy(
                                translatedText = msg.translatedText.orEmpty(),
                                originalText = msg.text.orEmpty(),
                                showOverlay = true
                            )
                        }
                    }
                }
                "connected" -> {
                    // Connection acknowledged
                }
                "quota_exceeded" -> {
                    scope.launch {
                        updateState {
                            it.copy(
                                isQuotaExceeded = true,
                                isEnabled = false,
                                errorMessage = "player.ai.errors.quotaExceeded"
                            )
                        }
                        stop()
                    }
                }
                "error" -> {
                    scope.launch {
                        updateState {
                            it.copy(errorMessage = msg.text ?: "player.ai.errors.serviceError")
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
