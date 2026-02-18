package tv.bayit.plus.feature.player.live

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.Json
import timber.log.Timber
import tv.bayit.plus.core.network.NetworkConfig
import tv.bayit.plus.core.network.websocket.ChannelType
import tv.bayit.plus.core.network.websocket.ConnectionState
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
    protected val webSocketManager: WebSocketManager,
    protected val networkConfig: NetworkConfig,
    private val channelType: ChannelType
) {
    private val _state: MutableStateFlow<S> = MutableStateFlow(createInitialState())
    val state: StateFlow<S> = _state.asStateFlow()

    private var connection: WebSocketConnection? = null
    private var connectionJob: Job? = null
    private var messageJob: Job? = null
    protected var autoDismissJob: Job? = null

    private val mutex = Mutex()

    protected val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
    }

    private var reconnectAttempts = 0
    private val maxReconnectAttempts = 5

    private val messageCount = AtomicInteger(0)
    private val rateLimitWindowStart = AtomicLong(System.currentTimeMillis())

    companion object {
        private const val MAX_MESSAGE_SIZE_BYTES = 102_400
        private const val MAX_MESSAGES_PER_SECOND = 100
        private const val RATE_LIMIT_WINDOW_MS = 1_000L
    }

    /**
     * Create the initial empty state for this feature
     */
    protected abstract fun createInitialState(): S

    /**
     * Build the WebSocket URL for this feature
     */
    protected abstract fun buildWebSocketUrl(channelId: String, targetLanguage: String): String

    /**
     * Handle incoming WebSocket message
     */
    protected abstract fun handleMessage(text: String, scope: CoroutineScope)

    /**
     * Update the state (thread-safe)
     */
    protected suspend fun updateState(update: (S) -> S) {
        mutex.withLock {
            _state.value = update(_state.value)
        }
    }

    /**
     * Get current state value (thread-safe)
     */
    protected suspend fun getCurrentState(): S {
        return mutex.withLock { _state.value }
    }

    /**
     * Check if feature is currently enabled
     */
    protected abstract fun isEnabled(state: S): Boolean

    /**
     * Check if feature is currently connecting
     */
    protected abstract fun isConnecting(state: S): Boolean

    /**
     * Update state to connecting
     */
    protected abstract suspend fun setConnecting(isConnecting: Boolean)

    /**
     * Update state to enabled/disabled
     */
    protected abstract suspend fun setEnabled(isEnabled: Boolean, errorMessage: String? = null)

    /**
     * Start the live feature for a channel
     */
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

    /**
     * Send a message through the active WebSocket connection.
     * Returns false if no connection is active.
     */
    fun sendMessage(message: String): Boolean {
        return connection?.send(message) ?: false
    }

    /**
     * Stop the live feature and disconnect
     */
    open suspend fun stop() {
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

    private fun observeConnection(scope: CoroutineScope) {
        val conn = connection ?: return

        connectionJob = conn.state
            .onEach { state ->
                when (state) {
                    ConnectionState.CONNECTING -> {
                        setConnecting(true)
                    }
                    ConnectionState.CONNECTED -> {
                        setEnabled(isEnabled = true, errorMessage = null)
                        reconnectAttempts = 0
                    }
                    ConnectionState.FAILED, ConnectionState.CLOSED -> {
                        handleDisconnection(scope)
                    }
                    ConnectionState.CLOSING -> {
                        // Connection is being closed intentionally
                    }
                }
            }
            .launchIn(scope)
    }

    private fun observeMessages(scope: CoroutineScope) {
        val conn = connection ?: return

        messageJob = conn.messages
            .onEach { text ->
                if (validateMessage(text, scope)) {
                    handleMessage(text, scope)
                }
            }
            .launchIn(scope)
    }

    private fun validateMessage(text: String, scope: CoroutineScope): Boolean {
        if (!checkMessageSize(text, scope)) {
            return false
        }

        if (!checkRateLimit(scope)) {
            return false
        }

        return true
    }

    private fun checkMessageSize(text: String, scope: CoroutineScope): Boolean {
        val sizeBytes = text.toByteArray(Charsets.UTF_8).size
        if (sizeBytes > MAX_MESSAGE_SIZE_BYTES) {
            Timber.w(
                "WebSocket message exceeds size limit: %d bytes (max %d) for channel type %s",
                sizeBytes,
                MAX_MESSAGE_SIZE_BYTES,
                channelType.name
            )
            scope.launch {
                setEnabled(
                    isEnabled = false,
                    errorMessage = "player.ai.errors.messageSizeLimitExceeded"
                )
            }
            scope.launch {
                stop()
            }
            return false
        }
        return true
    }

    private fun checkRateLimit(scope: CoroutineScope): Boolean {
        val now = System.currentTimeMillis()
        val windowStart = rateLimitWindowStart.get()

        if (now - windowStart > RATE_LIMIT_WINDOW_MS) {
            rateLimitWindowStart.set(now)
            messageCount.set(1)
            return true
        }

        val count = messageCount.incrementAndGet()
        if (count > MAX_MESSAGES_PER_SECOND) {
            Timber.w(
                "WebSocket rate limit exceeded: %d messages/second (max %d) for channel type %s",
                count,
                MAX_MESSAGES_PER_SECOND,
                channelType.name
            )
            scope.launch {
                setEnabled(
                    isEnabled = false,
                    errorMessage = "player.ai.errors.rateLimitExceeded"
                )
            }
            return false
        }

        return true
    }

    private suspend fun handleDisconnection(scope: CoroutineScope) {
        if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++
            setEnabled(isEnabled = false, errorMessage = "player.ai.errors.reconnecting")

            mutex.withLock {
                connection?.let { conn ->
                    webSocketManager.reconnect(conn.id)
                }
            }
        } else {
            setEnabled(isEnabled = false, errorMessage = "player.ai.errors.reconnectFailed")
        }
    }
}
