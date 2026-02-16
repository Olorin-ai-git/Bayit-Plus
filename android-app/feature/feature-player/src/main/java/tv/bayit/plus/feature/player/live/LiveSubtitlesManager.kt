package tv.bayit.plus.feature.player.live

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import tv.bayit.plus.core.network.NetworkConfig
import tv.bayit.plus.core.network.websocket.ChannelType
import tv.bayit.plus.core.network.websocket.ConnectionState
import tv.bayit.plus.core.network.websocket.WebSocketConnection
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
    private val webSocketManager: WebSocketManager,
    private val networkConfig: NetworkConfig
) {
    private val _state = MutableStateFlow(LiveSubtitleUiState())
    val state: StateFlow<LiveSubtitleUiState> = _state.asStateFlow()

    private var connection: WebSocketConnection? = null
    private var connectionJob: Job? = null
    private var messageJob: Job? = null
    private var autoDismissJob: Job? = null

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
    }

    /**
     * Start live subtitles for a channel
     */
    suspend fun start(channelId: String, targetLanguage: String, scope: CoroutineScope) {
        if (_state.value.isEnabled || _state.value.isConnecting) {
            return
        }

        _state.value = LiveSubtitleUiState(isConnecting = true)

        val wsUrl = LiveAIConfig.buildSubtitlesWebSocketUrl(
            baseWsUrl = networkConfig.webSocketBaseUrl,
            channelId = channelId,
            targetLang = targetLanguage
        )

        try {
            connection = webSocketManager.connect(wsUrl, ChannelType.LIVE_SUBTITLES)
            observeConnection(scope)
            observeMessages(scope)
        } catch (e: Exception) {
            _state.value = LiveSubtitleUiState(
                errorMessage = e.message ?: "Failed to connect to subtitle service"
            )
        }
    }

    /**
     * Stop live subtitles and disconnect
     */
    fun stop() {
        connectionJob?.cancel()
        messageJob?.cancel()
        autoDismissJob?.cancel()
        connection?.close()
        connection = null
        _state.value = LiveSubtitleUiState()
    }

    private fun observeConnection(scope: CoroutineScope) {
        val conn = connection ?: return

        connectionJob = conn.state
            .onEach { state ->
                when (state) {
                    ConnectionState.CONNECTED -> {
                        _state.value = _state.value.copy(
                            isEnabled = true,
                            isConnecting = false,
                            errorMessage = null
                        )
                    }
                    ConnectionState.FAILED -> {
                        _state.value = _state.value.copy(
                            isEnabled = false,
                            isConnecting = false,
                            errorMessage = "Connection failed"
                        )
                    }
                    else -> {}
                }
            }
            .launchIn(scope)
    }

    private fun observeMessages(scope: CoroutineScope) {
        val conn = connection ?: return

        messageJob = conn.messages
            .onEach { text ->
                handleMessage(text, scope)
            }
            .launchIn(scope)
    }

    private fun handleMessage(text: String, scope: CoroutineScope) {
        try {
            val msg = json.decodeFromString<LiveSubtitleMessage>(text)
            when (msg.type) {
                "final_subtitle" -> {
                    _state.value = _state.value.copy(
                        translatedText = msg.translatedText.orEmpty(),
                        originalText = msg.text.orEmpty(),
                        showOverlay = true
                    )
                    scheduleCueDismiss(scope)
                }
                "partial_subtitle" -> {
                    _state.value = _state.value.copy(
                        translatedText = msg.translatedText.orEmpty(),
                        originalText = msg.text.orEmpty(),
                        showOverlay = true
                    )
                }
                "connected" -> {
                    // Connection acknowledged
                }
                "quota_exceeded" -> {
                    _state.value = _state.value.copy(
                        isQuotaExceeded = true,
                        isEnabled = false,
                        errorMessage = "Subtitle quota exceeded"
                    )
                    stop()
                }
                "error" -> {
                    _state.value = _state.value.copy(
                        errorMessage = msg.text ?: "Subtitle service error"
                    )
                }
            }
        } catch (e: Exception) {
            _state.value = _state.value.copy(
                errorMessage = "Failed to parse subtitle message"
            )
        }
    }

    private fun scheduleCueDismiss(scope: CoroutineScope) {
        autoDismissJob?.cancel()
        autoDismissJob = scope.launch {
            delay(LiveAIConfig.SUBTITLE_DISMISS_DURATION_MS)
            _state.value = _state.value.copy(showOverlay = false)
        }
    }
}
