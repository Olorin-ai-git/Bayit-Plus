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
import tv.bayit.plus.core.data.repository.LiveDubbingRepository
import tv.bayit.plus.core.network.NetworkConfig
import tv.bayit.plus.core.network.websocket.ChannelType
import tv.bayit.plus.core.network.websocket.ConnectionState
import tv.bayit.plus.core.network.websocket.WebSocketConnection
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
    private val webSocketManager: WebSocketManager,
    private val networkConfig: NetworkConfig,
    private val dubbingRepository: LiveDubbingRepository
) {
    private val _state = MutableStateFlow(LiveDubbingUiState())
    val state: StateFlow<LiveDubbingUiState> = _state.asStateFlow()

    private var connection: WebSocketConnection? = null
    private var connectionJob: Job? = null
    private var messageJob: Job? = null
    private var autoDismissJob: Job? = null

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
    }

    /**
     * Start live dubbing for a channel
     */
    suspend fun start(channelId: String, targetLanguage: String, scope: CoroutineScope) {
        if (_state.value.isEnabled || _state.value.isConnecting) {
            return
        }

        _state.value = LiveDubbingUiState(isConnecting = true)

        val wsUrl = LiveAIConfig.buildDubbingWebSocketUrl(
            baseWsUrl = networkConfig.webSocketBaseUrl,
            channelId = channelId,
            targetLang = targetLanguage
        )

        try {
            connection = webSocketManager.connect(wsUrl, ChannelType.LIVE_DUBBING)
            observeConnection(scope)
            observeMessages(scope)
        } catch (e: Exception) {
            _state.value = LiveDubbingUiState(
                errorMessage = e.message ?: "Failed to connect to dubbing service"
            )
        }
    }

    /**
     * Stop live dubbing and disconnect
     */
    fun stop() {
        connectionJob?.cancel()
        messageJob?.cancel()
        autoDismissJob?.cancel()
        connection?.close()
        connection = null
        _state.value = LiveDubbingUiState()
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
            val msg = json.decodeFromString<LiveDubbingMessage>(text)
            when (msg.type) {
                "audio_chunk" -> {
                    _state.value = _state.value.copy(
                        audioUrl = msg.audioUrl,
                        transcriptText = msg.transcript.orEmpty(),
                        showOverlay = true
                    )
                    scheduleOverlayDismiss(scope)
                }
                "connected" -> {
                    // Connection acknowledged
                }
                "error" -> {
                    _state.value = _state.value.copy(
                        errorMessage = msg.transcript ?: "Dubbing service error"
                    )
                }
            }
        } catch (e: Exception) {
            _state.value = _state.value.copy(
                errorMessage = "Failed to parse dubbing message"
            )
        }
    }

    private fun scheduleOverlayDismiss(scope: CoroutineScope) {
        autoDismissJob?.cancel()
        autoDismissJob = scope.launch {
            delay(LiveAIConfig.DUBBING_OVERLAY_DISMISS_DURATION_MS)
            _state.value = _state.value.copy(showOverlay = false)
        }
    }
}
