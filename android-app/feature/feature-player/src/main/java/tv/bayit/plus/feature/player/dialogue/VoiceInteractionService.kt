package tv.bayit.plus.feature.player.dialogue

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString.Companion.toByteString
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.feature.player.di.ApplicationScope
import java.io.ByteArrayOutputStream
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Voice interaction service for VOD avatar dialogue via WebSocket.
 * Captures PCM audio (16-bit, 16kHz, mono) with [AudioRecord] and streams
 * binary frames to the backend voice interaction endpoint. Incoming messages
 * drive observable [StateFlow] properties for UI binding.
 */
@Singleton
class VoiceInteractionService @Inject constructor(
    private val okHttpClient: OkHttpClient,
    private val json: Json,
    private val logger: BayitLogger,
    @ApplicationScope private val appScope: CoroutineScope,
) {
    private val _isConnected = MutableStateFlow(false)
    val isConnected: StateFlow<Boolean> = _isConnected.asStateFlow()
    private val _isRecording = MutableStateFlow(false)
    val isRecording: StateFlow<Boolean> = _isRecording.asStateFlow()
    private val _isProcessing = MutableStateFlow(false)
    val isProcessing: StateFlow<Boolean> = _isProcessing.asStateFlow()
    private val _processingStage = MutableStateFlow<String?>(null)
    val processingStage: StateFlow<String?> = _processingStage.asStateFlow()
    private val _lastTranscript = MutableStateFlow<String?>(null)
    val lastTranscript: StateFlow<String?> = _lastTranscript.asStateFlow()
    private val _connectionError = MutableStateFlow<String?>(null)
    val connectionError: StateFlow<String?> = _connectionError.asStateFlow()

    private var webSocket: WebSocket? = null
    private var audioRecord: AudioRecord? = null
    private var recordingJob: Job? = null
    fun connect(sessionId: String, token: String, baseUrl: String) {
        val wsUrl = baseUrl.replace("https://", "wss://").replace("http://", "ws://")
        val request = Request.Builder()
            .url("$wsUrl/api/v1/ws/vod-interaction/$sessionId")
            .build()
        webSocket = okHttpClient.newWebSocket(request, createListener(token))
        _connectionError.value = null
        logger.info("Voice WS connecting", mapOf("sessionId" to sessionId))
    }

    fun disconnect() {
        stopRecording()
        webSocket?.close(NORMAL_CLOSURE_CODE, CLOSE_REASON_CLIENT)
        webSocket = null
        _isConnected.value = false
        _isProcessing.value = false
        _processingStage.value = null
        logger.info("Voice WS disconnected")
    }
    @Suppress("MissingPermission")
    fun startRecording() {
        if (_isRecording.value) return
        val bufferSize = AudioRecord.getMinBufferSize(
            SAMPLE_RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT,
        )
        if (bufferSize == AudioRecord.ERROR || bufferSize == AudioRecord.ERROR_BAD_VALUE) {
            logger.error("Invalid AudioRecord buffer size", metadata = mapOf("size" to bufferSize.toString()))
            return
        }
        val recorder = AudioRecord(
            MediaRecorder.AudioSource.MIC, SAMPLE_RATE,
            AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT, bufferSize,
        )
        if (recorder.state != AudioRecord.STATE_INITIALIZED) {
            logger.error("AudioRecord failed to initialize")
            recorder.release()
            return
        }
        audioRecord = recorder
        recorder.startRecording()
        _isRecording.value = true
        recordingJob = appScope.launch(Dispatchers.IO) {
            val readBuffer = ByteArray(bufferSize)
            val accumulated = ByteArrayOutputStream()
            while (isActive && _isRecording.value) {
                val read = recorder.read(readBuffer, 0, readBuffer.size)
                if (read > 0) accumulated.write(readBuffer, 0, read)
            }
            val audioBytes = accumulated.toByteArray()
            if (audioBytes.isNotEmpty()) sendAudioData(audioBytes)
        }
        logger.info("Audio recording started")
    }

    fun stopRecording() {
        if (!_isRecording.value) return
        _isRecording.value = false
        recordingJob?.cancel(); recordingJob = null
        audioRecord?.stop(); audioRecord?.release(); audioRecord = null
        logger.info("Audio recording stopped")
    }
    fun sendTextFallback(text: String) {
        val message = buildJsonObject {
            put("type", "text_message")
            put("message", text)
        }
        webSocket?.send(message.toString())
    }
    private fun sendAudioData(data: ByteArray) {
        _isProcessing.value = true
        _processingStage.value = STAGE_TRANSCRIBING
        val sent = webSocket?.send(data.toByteString()) ?: false
        if (!sent) {
            logger.error("Failed to send audio data over WebSocket")
            _isProcessing.value = false
            _processingStage.value = null
        }
    }
    private fun createListener(token: String) = object : WebSocketListener() {
        override fun onOpen(ws: WebSocket, response: Response) {
            val authPayload = buildJsonObject {
                put("type", "authenticate")
                put("token", token)
            }
            ws.send(authPayload.toString())
            _isConnected.value = true
            _connectionError.value = null
            logger.info("Voice WS opened, auth sent")
        }

        override fun onMessage(ws: WebSocket, text: String) {
            handleIncomingMessage(text)
        }

        override fun onClosing(ws: WebSocket, code: Int, reason: String) {
            ws.close(code, reason)
        }

        override fun onClosed(ws: WebSocket, code: Int, reason: String) {
            _isConnected.value = false
            logger.info("Voice WS closed", mapOf("code" to code.toString()))
        }

        override fun onFailure(ws: WebSocket, t: Throwable, response: Response?) {
            _isConnected.value = false
            _connectionError.value = t.message
            logger.error("Voice WS failure", error = t)
        }
    }
    private fun handleIncomingMessage(text: String) {
        val parsed = try {
            json.decodeFromString<JsonObject>(text)
        } catch (e: Exception) {
            logger.error("Failed to parse WS message", error = e)
            return
        }
        val type = parsed["type"]?.jsonPrimitive?.content ?: return
        when (type) {
            "processing" ->
                _processingStage.value = parsed["stage"]?.jsonPrimitive?.content
            "voice_result", "text_result" -> {
                _isProcessing.value = false
                _processingStage.value = null
                _lastTranscript.value = parsed["transcript"]?.jsonPrimitive?.content
                    ?: parsed["character_text"]?.jsonPrimitive?.content
            }
            "error" -> {
                _isProcessing.value = false
                _processingStage.value = null
                _connectionError.value = parsed["message"]?.jsonPrimitive?.content
            }
            "session_ended", "session_completed" -> disconnect()
        }
    }
}

private const val SAMPLE_RATE = 16_000
private const val NORMAL_CLOSURE_CODE = 1000
private const val CLOSE_REASON_CLIENT = "Client disconnect"
private const val STAGE_TRANSCRIBING = "transcribing"
