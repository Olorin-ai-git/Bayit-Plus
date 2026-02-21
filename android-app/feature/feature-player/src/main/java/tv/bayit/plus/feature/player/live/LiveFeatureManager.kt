package tv.bayit.plus.feature.player.live

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.Json
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.network.NetworkConfig
import tv.bayit.plus.core.network.websocket.ChannelType
import tv.bayit.plus.core.network.websocket.WebSocketConnection
import tv.bayit.plus.core.network.websocket.WebSocketManager
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong

/**
 * Base class for all live AI feature managers.
 * Handles WebSocket lifecycle, connection management, and message processing.
 *
 * @param S State type for this feature
 */
abstract class LiveFeatureManager<S>(
    internal val webSocketManager: WebSocketManager,
    protected val networkConfig: NetworkConfig,
    internal val channelType: ChannelType,
    internal val logger: BayitLogger,
) {
    private val _state: MutableStateFlow<S> = MutableStateFlow(createInitialState())
    val state: StateFlow<S> = _state.asStateFlow()

    internal var connection: WebSocketConnection? = null
    internal var connectionJob: Job? = null
    internal var messageJob: Job? = null
    internal var autoDismissJob: Job? = null

    internal val mutex = Mutex()

    internal val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
    }

    internal var reconnectAttempts = 0
    internal val maxReconnectAttempts = 5

    internal val messageCount = AtomicInteger(0)
    internal val rateLimitWindowStart = AtomicLong(System.currentTimeMillis())

    internal companion object {
        const val MAX_MESSAGE_SIZE_BYTES = 102_400
        const val MAX_MESSAGES_PER_SECOND = 100
        const val RATE_LIMIT_WINDOW_MS = 1_000L
    }

    protected abstract fun createInitialState(): S
    protected abstract fun buildWebSocketUrl(channelId: String, targetLanguage: String): String
    internal abstract fun handleMessage(text: String, scope: CoroutineScope)

    internal suspend fun updateState(update: (S) -> S) {
        mutex.withLock {
            _state.value = update(_state.value)
        }
    }

    protected suspend fun getCurrentState(): S {
        return mutex.withLock { _state.value }
    }

    protected abstract fun isEnabled(state: S): Boolean
    protected abstract fun isConnecting(state: S): Boolean
    internal abstract suspend fun setConnecting(isConnecting: Boolean)
    internal abstract suspend fun setEnabled(isEnabled: Boolean, errorMessage: String? = null)

    suspend fun start(channelId: String, targetLanguage: String, scope: CoroutineScope) {
        val currentState = getCurrentState()
        if (isEnabled(currentState) || isConnecting(currentState)) {
            return
        }

        setConnecting(true)
        reconnectAttempts = 0

        val wsUrl = buildWebSocketUrl(channelId, targetLanguage)

        try {
            mutex.withLock {
                connection = webSocketManager.connect(wsUrl, channelType)
            }
            observeConnection(scope)
            observeMessages(scope)
        } catch (e: Exception) {
            setEnabled(isEnabled = false, errorMessage = e.message ?: "player.ai.errors.connectionFailed")
        }
    }

    fun sendMessage(message: String): Boolean {
        return connection?.send(message) ?: false
    }

    open internal suspend fun stop() {
        mutex.withLock {
            connectionJob?.cancel()
            messageJob?.cancel()
            autoDismissJob?.cancel()

            connection?.let { conn ->
                webSocketManager.disconnect(conn.id)
            }
            connection = null

            _state.value = createInitialState()
            reconnectAttempts = 0
        }
    }
}
