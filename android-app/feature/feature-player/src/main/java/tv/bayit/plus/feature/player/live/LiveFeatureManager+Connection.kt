package tv.bayit.plus.feature.player.live

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.sync.withLock
import tv.bayit.plus.core.network.websocket.ConnectionState

internal fun <S> LiveFeatureManager<S>.observeConnection(scope: CoroutineScope) {
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

internal fun <S> LiveFeatureManager<S>.observeMessages(scope: CoroutineScope) {
    val conn = connection ?: return

    messageJob = conn.messages
        .onEach { text ->
            if (validateMessage(text, scope)) {
                handleMessage(text, scope)
            }
        }
        .launchIn(scope)
}

internal suspend fun <S> LiveFeatureManager<S>.handleDisconnection(scope: CoroutineScope) {
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
