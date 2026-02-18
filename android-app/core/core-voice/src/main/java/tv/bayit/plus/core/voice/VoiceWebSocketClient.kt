package tv.bayit.plus.core.voice

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.network.NetworkConfiguration
import javax.inject.Inject
import javax.inject.Singleton

/** OkHttp WebSocket client for the streaming voice pipeline. Port of iOS VoiceWebSocketClient. */
@Singleton
class VoiceWebSocketClient @Inject constructor(
    private val okHttpClient: OkHttpClient,
    private val json: Json,
    private val networkConfig: NetworkConfiguration,
    private val logger: BayitLogger,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val mutex = Mutex()
    private var webSocket: WebSocket? = null
    private var pingJob: Job? = null
    private val _messages = MutableSharedFlow<VoiceWSIncoming>(extraBufferCapacity = 64)
    val messages: SharedFlow<VoiceWSIncoming> = _messages
    private val _isConnected = MutableStateFlow(false)
    val isConnected: StateFlow<Boolean> = _isConnected

    private val listener = object : WebSocketListener() {
        override fun onOpen(ws: WebSocket, response: Response) {
            _isConnected.value = true
            logger.info("Voice WebSocket connected", mapOf("code" to "${response.code}"))
            startPingLoop()
        }
        override fun onMessage(ws: WebSocket, text: String) { parseAndEmit(text) }
        override fun onClosing(ws: WebSocket, code: Int, reason: String) { ws.close(code, reason) }
        override fun onClosed(ws: WebSocket, code: Int, reason: String) {
            _isConnected.value = false
            logger.info("Voice WebSocket closed", mapOf("code" to "$code"))
        }
        override fun onFailure(ws: WebSocket, t: Throwable, response: Response?) {
            _isConnected.value = false
            logger.error("Voice WebSocket failure", t, mapOf("response" to "${response?.code}"))
            _messages.tryEmit(VoiceWSIncoming.Error(t.message ?: "Connection failure"))
        }
    }

    suspend fun connect(url: String, token: String, language: String) {
        mutex.withLock {
            closeInternal()
            val request = Request.Builder()
                .url(url)
                .header("Authorization", "Bearer $token")
                .header("Accept-Language", language)
                .build()
            webSocket = okHttpClient.newWebSocket(request, listener)
            logger.info("Voice WebSocket connecting", mapOf("url" to url, "lang" to language))
        }
    }

    suspend fun sendAudio(base64Data: String) = sendJson("""{"type":"audio","data":"$base64Data"}""")
    suspend fun sendCommit() = sendJson("""{"type":"commit"}""")
    suspend fun sendCancel() = sendJson("""{"type":"cancel"}""")

    suspend fun close() { mutex.withLock { closeInternal() } }

    private fun closeInternal() {
        pingJob?.cancel()
        pingJob = null
        webSocket?.close(NORMAL_CLOSURE_CODE, NORMAL_CLOSURE_REASON)
        webSocket = null
        _isConnected.value = false
    }

    private suspend fun sendJson(text: String) {
        mutex.withLock {
            if (webSocket?.send(text) != true) {
                logger.warning("Voice WebSocket send failed: not connected")
            }
        }
    }

    private fun startPingLoop() {
        pingJob?.cancel()
        pingJob = scope.launch {
            val intervalMs = networkConfig.webSocketPingIntervalDuration.inWholeMilliseconds
            while (_isConnected.value) {
                delay(intervalMs)
                if (_isConnected.value) mutex.withLock { webSocket?.send("""{"type":"ping"}""") }
            }
        }
    }

    private fun parseAndEmit(text: String) {
        val obj = runCatching { json.parseToJsonElement(text).jsonObject }.getOrNull()
        if (obj == null) { logger.warning("Invalid WebSocket message format"); return }
        val type = obj["type"]?.jsonPrimitive?.contentOrNull
        if (type == null) { logger.warning("WebSocket message missing type field"); return }
        routeMessage(type, obj)?.let { _messages.tryEmit(it) }
    }

    private fun routeMessage(type: String, obj: JsonObject): VoiceWSIncoming? = when (type) {
        "transcript_partial" -> strVal(obj, "text")?.let { VoiceWSIncoming.TranscriptPartial(it) }
        "transcript_final" -> strVal(obj, "text")?.let { VoiceWSIncoming.TranscriptFinal(it) }
        "llm_chunk" -> strVal(obj, "text")?.let { VoiceWSIncoming.LlmChunk(it) }
        "tts_audio" -> decodeBase64Val(obj, "data")?.let { VoiceWSIncoming.TtsAudio(it) }
        "intent_action" -> parseIntentAction(obj)
        "complete" -> VoiceWSIncoming.Complete(strVal(obj, "conversation_id"))
        "cancelled" -> VoiceWSIncoming.Cancelled
        "error" -> VoiceWSIncoming.Error(strVal(obj, "message") ?: "Unknown server error")
        "pong" -> VoiceWSIncoming.Pong
        else -> { logger.warning("Unknown WebSocket message type", mapOf("type" to type)); null }
    }

    private fun parseIntentAction(obj: JsonObject): VoiceWSIncoming.IntentAction? {
        val intentStr = strVal(obj, "intent") ?: return null
        val text = strVal(obj, "text") ?: return null
        val actionObj = obj["action"]?.jsonObject ?: return null
        val actionType = actionObj["type"]?.jsonPrimitive?.contentOrNull ?: return null
        val intent = runCatching { json.decodeFromString<VoiceIntentType>("\"$intentStr\"") }
            .getOrDefault(VoiceIntentType.UNKNOWN)
        val gesture = obj["gesture"]?.jsonObject?.let { g ->
            val name = g["gesture"]?.jsonPrimitive?.contentOrNull ?: return@let null
            GestureState(gesture = name, duration = g["duration"]?.jsonPrimitive?.intOrNull)
        }
        return VoiceWSIncoming.IntentAction(
            intent = intent, text = text,
            action = VoiceAction(type = actionType, payload = actionObj["payload"]?.jsonObject),
            confidence = obj["confidence"]?.jsonPrimitive?.doubleOrNull, gesture = gesture,
        )
    }

    private fun strVal(obj: JsonObject, key: String): String? =
        obj[key]?.jsonPrimitive?.contentOrNull

    private fun decodeBase64Val(obj: JsonObject, key: String): ByteArray? {
        val b64 = strVal(obj, key) ?: return null
        return runCatching { android.util.Base64.decode(b64, android.util.Base64.DEFAULT) }.getOrNull()
    }

    companion object {
        private const val NORMAL_CLOSURE_CODE = 1000
        private const val NORMAL_CLOSURE_REASON = "Client disconnect"
    }
}
