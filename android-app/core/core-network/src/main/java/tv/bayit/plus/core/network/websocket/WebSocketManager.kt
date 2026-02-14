package tv.bayit.plus.core.network.websocket

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import timber.log.Timber
import tv.bayit.plus.core.network.AuthTokenProvider
import tv.bayit.plus.core.network.NetworkConfig
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
    private val config: NetworkConfig,
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
        val connection = WebSocketConnection(connectionId, url, channelType)

        val request = Request.Builder().url(url).build()
        val webSocket = okHttpClient.newWebSocket(request, connection.listener)
        connection.webSocket = webSocket

        if (token != null) {
            val authMessage = buildJsonObject {
                put("type", "auth")
                put("token", token)
            }.toString()
            webSocket.send(authMessage)
        }

        connections[connectionId] = connection
        startPingIfNeeded()

        Timber.i(
            "WebSocket connected: %s (type=%s, active=%d)",
            connectionId,
            channelType.name,
            connections.size,
        )
        return connection
    }

    fun disconnect(connectionId: String) {
        val connection = connections.remove(connectionId)
        connection?.close()
        Timber.i(
            "WebSocket disconnected: %s (remaining=%d)",
            connectionId,
            connections.size,
        )
        stopPingIfIdle()
    }

    fun disconnectAll() {
        connections.values.forEach { it.close() }
        connections.clear()
        stopPingIfIdle()
        Timber.i("All WebSocket connections disconnected")
    }

    private fun startPingIfNeeded() {
        if (pingJob != null || connections.isEmpty()) return
        pingJob = scope.launch {
            while (connections.isNotEmpty()) {
                delay(config.webSocketPingInterval)
                connections.values.forEach { conn ->
                    conn.sendPing()
                }
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
            val delay = min(
                config.retryBaseDelay * 2.0.pow(attempt - 1).toLong(),
                30_000L,
            )
            Timber.d(
                "Reconnecting %s (attempt %d, delay %dms)",
                connectionId,
                attempt,
                delay,
            )
            delay(delay)
            try {
                disconnect(connectionId)
                connect(connection.url, connection.channelType)
            } catch (e: Exception) {
                Timber.e(e, "Reconnection failed for %s", connectionId)
            }
        }
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
}
