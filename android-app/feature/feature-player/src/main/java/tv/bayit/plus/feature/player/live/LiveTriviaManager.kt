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
import kotlinx.serialization.json.Json
import tv.bayit.plus.core.model.TriviaFact
import tv.bayit.plus.core.network.NetworkConfig
import tv.bayit.plus.core.network.websocket.ChannelType
import tv.bayit.plus.core.network.websocket.ConnectionState
import tv.bayit.plus.core.network.websocket.WebSocketConnection
import tv.bayit.plus.core.network.websocket.WebSocketManager
import javax.inject.Inject
import javax.inject.Singleton

/** Manages live trivia WebSocket connection and state. */
@Singleton
class LiveTriviaManager @Inject constructor(
    private val webSocketManager: WebSocketManager,
    private val networkConfig: NetworkConfig,
) {
    private val _state = MutableStateFlow(LiveTriviaUiState())
    val state: StateFlow<LiveTriviaUiState> = _state.asStateFlow()

    private val _progressFraction = MutableStateFlow(0f)
    val progressFraction: StateFlow<Float> = _progressFraction.asStateFlow()

    private var connection: WebSocketConnection? = null
    private var connectionJob: Job? = null
    private var messageJob: Job? = null
    private var autoDismissJob: Job? = null
    private var progressJob: Job? = null
    private val shownFactIds = mutableSetOf<String>()

    private val json = Json { ignoreUnknownKeys = true; isLenient = true }

    /** Start live trivia for a channel. */
    suspend fun start(channelId: String, targetLanguage: String, scope: CoroutineScope) {
        if (_state.value.isEnabled || _state.value.isConnecting) return

        _state.value = LiveTriviaUiState(isConnecting = true)
        val wsUrl = LiveAIConfig.buildTriviaWebSocketUrl(
            baseWsUrl = networkConfig.webSocketBaseUrl,
            channelId = channelId,
            targetLang = targetLanguage,
        )

        try {
            connection = webSocketManager.connect(wsUrl, ChannelType.LIVE_TRIVIA)
            observeConnection(scope)
            observeMessages(scope)
        } catch (e: Exception) {
            _state.value = LiveTriviaUiState(
                errorMessage = e.message ?: "Failed to connect to trivia service",
            )
        }
    }

    /** Stop live trivia and disconnect. */
    fun stop() {
        connectionJob?.cancel()
        messageJob?.cancel()
        autoDismissJob?.cancel()
        progressJob?.cancel()
        connection?.close()
        connection = null
        shownFactIds.clear()
        _state.value = LiveTriviaUiState()
        _progressFraction.value = 0f
    }

    /** Dismiss the current trivia fact. */
    fun dismissFact() {
        autoDismissJob?.cancel()
        progressJob?.cancel()
        _state.value = _state.value.copy(activeFact = null)
        _progressFraction.value = 0f
    }

    /** Request a follow-up fact for the current topic. */
    fun requestFollowUp() {
        val currentFact = _state.value.activeFact ?: return
        connection?.send("{\"type\":\"request_followup\",\"factId\":\"${currentFact.id}\"}")
    }

    private fun observeConnection(scope: CoroutineScope) {
        val conn = connection ?: return
        connectionJob = conn.state.onEach { state ->
            when (state) {
                ConnectionState.CONNECTED -> _state.value = _state.value.copy(
                    isEnabled = true, isConnecting = false, errorMessage = null,
                )
                ConnectionState.FAILED -> _state.value = _state.value.copy(
                    isEnabled = false, isConnecting = false, errorMessage = "Connection failed",
                )
                else -> {}
            }
        }.launchIn(scope)
    }

    private fun observeMessages(scope: CoroutineScope) {
        val conn = connection ?: return
        messageJob = conn.messages.onEach { handleMessage(it, scope) }.launchIn(scope)
    }

    private fun handleMessage(text: String, scope: CoroutineScope) {
        try {
            val msg = json.decodeFromString<TriviaMessageWrapper>(text)
            when (msg.type) {
                "trivia_fact" -> {
                    val fact = msg.fact ?: return
                    if (fact.id in shownFactIds) return
                    shownFactIds.add(fact.id)
                    showFact(fact, scope)
                }
                "error" -> _state.value = _state.value.copy(
                    errorMessage = msg.message ?: "Trivia service error",
                )
                else -> {} // "connected" acknowledgment and other types
            }
        } catch (_: Exception) {
            _state.value = _state.value.copy(errorMessage = "Failed to parse trivia message")
        }
    }

    private fun showFact(fact: TriviaFact, scope: CoroutineScope) {
        _state.value = _state.value.copy(activeFact = fact)
        _progressFraction.value = 0f
        val durationSec = fact.displayDuration ?: LiveAIConfig.TRIVIA_DEFAULT_DISPLAY_DURATION_SEC
        startProgressAnimation(durationSec, scope)
        scheduleAutoDismiss(durationSec * 1000L, scope)
    }

    private fun startProgressAnimation(durationSec: Int, scope: CoroutineScope) {
        progressJob?.cancel()
        progressJob = scope.launch {
            val steps = durationSec * 10
            repeat(steps) { step ->
                _progressFraction.value = (step + 1) / steps.toFloat()
                delay(LiveAIConfig.PROGRESS_UPDATE_INTERVAL_MS)
            }
        }
    }

    private fun scheduleAutoDismiss(durationMs: Long, scope: CoroutineScope) {
        autoDismissJob?.cancel()
        autoDismissJob = scope.launch { delay(durationMs); dismissFact() }
    }
}
