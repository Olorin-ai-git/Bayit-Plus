package tv.bayit.plus.core.network.websocket

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import tv.bayit.plus.core.common.logging.BayitLogger
import java.util.concurrent.atomic.AtomicInteger

class WebSocketConnection(
    val id: String,
    val url: String,
    val channelType: ChannelType,
    private val logger: BayitLogger,
) {
    var webSocket: WebSocket? = null
    val reconnectAttempt = AtomicInteger(0)

    private val _messages = MutableSharedFlow<String>(extraBufferCapacity = 64)
    val messages: SharedFlow<String> = _messages

    private val _state = MutableSharedFlow<ConnectionState>(replay = 1, extraBufferCapacity = 1)
    val state: SharedFlow<ConnectionState> = _state

    /** Pending auth token to send as first message once connection opens. */
    @Volatile
    var pendingAuthToken: String? = null

    val listener = object : WebSocketListener() {
        override fun onOpen(webSocket: WebSocket, response: Response) {
            reconnectAttempt.set(0)
            pendingAuthToken?.let { token ->
                val authMsg = """{"type":"authenticate","token":"$token"}"""
                webSocket.send(authMsg)
                pendingAuthToken = null
                logger.debug("WebSocket auth message sent", mapOf("connectionId" to id))
            }
            _state.tryEmit(ConnectionState.CONNECTED)
            logger.debug("WebSocket open", mapOf("connectionId" to id))
        }

        override fun onMessage(webSocket: WebSocket, text: String) {
            _messages.tryEmit(text)
        }

        override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
            _state.tryEmit(ConnectionState.CLOSING)
            webSocket.close(code, reason)
        }

        override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
            _state.tryEmit(ConnectionState.CLOSED)
            logger.debug(
                "WebSocket closed",
                mapOf("connectionId" to id, "code" to code.toString()),
            )
        }

        override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
            _state.tryEmit(ConnectionState.FAILED)
            logger.error("WebSocket failure", t, mapOf("connectionId" to id))
        }
    }

    fun send(message: String): Boolean = webSocket?.send(message) ?: false

    fun sendPing() {
        send("{\"type\":\"ping\"}")
    }

    fun close() {
        webSocket?.close(1000, "Client disconnect")
        _state.tryEmit(ConnectionState.CLOSED)
    }
}

enum class ConnectionState {
    CONNECTING,
    CONNECTED,
    CLOSING,
    CLOSED,
    FAILED,
}
