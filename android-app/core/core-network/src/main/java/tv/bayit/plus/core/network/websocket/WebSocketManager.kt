package tv.bayit.plus.core.network.websocket

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.network.AuthTokenProvider
import tv.bayit.plus.core.network.NetworkConfiguration
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.min
import kotlin.math.pow

@Singleton
class WebSocketManager @Inject constructor(
    private val okHttpClient: OkHttpClient,
    private val authTokenProvider: AuthTokenProvider,
    private val config: NetworkConfiguration,
    private val logger: BayitLogger,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val connections = ConcurrentHashMap<String, WebSocketConnection>()
    private var pingJob: Job? = null

    val activeConnectionCount: Int get() = connections.size

    suspend fun connect(url: String, channelType: ChannelType): WebSocketConnection {
        if (connections.size >= config.webSocketMaxConnections) {
            throw IllegalStateException(
                "Max concurrent WebSocket connections reached: ${config.webSocketMaxConnections}"
            )
        }

        val connectionId = UUID.randomUUID().toString()
        val token = authTokenProvider.getToken()
        val connection = WebSocketConnection(connectionId, url, channelType, logger)

        if (token != null) {
            connection.pendingAuthToken = token
        }

        val requestBuilder = Request.Builder().url(url)
        if (token != null) {
            requestBuilder.header("Authorization", "Bearer $token")
        }
        val webSocket = okHttpClient.newWebSocket(requestBuilder.build(), connection.listener)
        connection.webSocket = webSocket

        connections[connectionId] = connection
        startPingIfNeeded()

        logger.info(
            "WebSocket connected",
            mapOf(
                "connectionId" to connectionId,
                "type" to channelType.name,
                "active" to connections.size.toString(),
            ),
        )
        return connection
    }

    fun disconnect(connectionId: String) {
        val connection = connections.remove(connectionId)
        connection?.close()
        logger.info(
            "WebSocket disconnected",
            mapOf("connectionId" to connectionId, "remaining" to connections.size.toString()),
        )
        stopPingIfIdle()
    }

    fun disconnectAll() {
        connections.values.forEach { it.close() }
        connections.clear()
        stopPingIfIdle()
        logger.info("All WebSocket connections disconnected")
    }

    private fun startPingIfNeeded() {
        if (pingJob != null || connections.isEmpty()) return
        val pingIntervalMs = config.webSocketPingIntervalDuration.inWholeMilliseconds
        pingJob = scope.launch {
            while (connections.isNotEmpty()) {
                delay(pingIntervalMs)
                connections.values.forEach { it.sendPing() }
            }
        }
    }

    private fun stopPingIfIdle() {
        if (connections.isEmpty()) {
            pingJob?.cancel()
            pingJob = null
        }
    }

    fun reconnect(connectionId: String) {
        val connection = connections[connectionId] ?: return
        scope.launch {
            val attempt = connection.reconnectAttempt.incrementAndGet()
            val baseDelayMs = config.webSocketReconnectBaseDelay.inWholeMilliseconds
            val delayMs = min(baseDelayMs * 2.0.pow(attempt - 1).toLong(), MAX_RECONNECT_DELAY_MS)
            logger.debug(
                "Reconnecting WebSocket",
                mapOf(
                    "connectionId" to connectionId,
                    "attempt" to attempt.toString(),
                    "delayMs" to delayMs.toString(),
                ),
            )
            delay(delayMs)
            try {
                disconnect(connectionId)
                connect(connection.url, connection.channelType)
            } catch (e: Exception) {
                logger.error("WebSocket reconnection failed", e, mapOf("connectionId" to connectionId))
            }
        }
    }

    companion object {
        private const val MAX_RECONNECT_DELAY_MS = 30_000L
    }
}

enum class ChannelType {
    LIVE_DUBBING,
    LIVE_SUBTITLES,
    LIVE_TRIVIA,
    CHESS,
    DIRECT_MESSAGES,
    CHANNEL_CHAT,
    V2V,
    TALKBACK,
    SHARED_INTERACTION,
}
