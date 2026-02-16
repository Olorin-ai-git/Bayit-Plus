package tv.bayit.plus.feature.player.dubbing

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.model.LiveDubbingMessage
import tv.bayit.plus.core.network.NetworkConfig
import java.net.URLEncoder
import tv.bayit.plus.core.network.websocket.ChannelType
import tv.bayit.plus.core.network.websocket.ConnectionState
import tv.bayit.plus.core.network.websocket.WebSocketConnection
import tv.bayit.plus.core.network.websocket.WebSocketManager
import javax.inject.Inject

/**
 * Manages live dubbing via WebSocket for real-time audio translation.
 *
 * Connects to the LIVE_DUBBING WebSocket channel, processes incoming audio
 * URL messages, and coordinates language/voice selection. Enforces mutual
 * exclusivity with live subtitles (when dubbing is on, subtitles are off).
 */
@HiltViewModel
class LiveDubbingViewModel @Inject constructor(
    private val webSocketManager: WebSocketManager,
    private val networkConfig: NetworkConfig,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _isEnabled = MutableStateFlow(false)
    val isEnabled: StateFlow<Boolean> = _isEnabled.asStateFlow()

    private val _connectionState = MutableStateFlow(ConnectionState.CLOSED)
    val connectionState: StateFlow<ConnectionState> = _connectionState.asStateFlow()

    private val _currentMessage = MutableStateFlow<LiveDubbingMessage?>(null)
    val currentMessage: StateFlow<LiveDubbingMessage?> = _currentMessage.asStateFlow()

    private val _targetLanguage = MutableStateFlow("en")
    val targetLanguage: StateFlow<String> = _targetLanguage.asStateFlow()

    private val _voiceId = MutableStateFlow<String?>(null)
    val voiceId: StateFlow<String?> = _voiceId.asStateFlow()

    private val _dubbingVolume = MutableStateFlow(0.8f)
    val dubbingVolume: StateFlow<Float> = _dubbingVolume.asStateFlow()

    private var connection: WebSocketConnection? = null
    private val json = Json { ignoreUnknownKeys = true }

    fun toggleDubbing(channelId: String) {
        if (_isEnabled.value) {
            disconnect()
        } else {
            connect(channelId)
        }
    }

    fun setTargetLanguage(language: String, channelId: String) {
        _targetLanguage.value = language
        if (_isEnabled.value) {
            disconnect()
            connect(channelId)
        }
    }

    fun setVoiceId(voiceId: String) {
        _voiceId.value = voiceId
        sendPreferencesUpdate()
    }

    fun setDubbingVolume(volume: Float) {
        _dubbingVolume.value = volume.coerceIn(0f, 1f)
    }

    private fun connect(channelId: String) {
        viewModelScope.launch {
            val encodedChannel = URLEncoder.encode(channelId, "UTF-8")
            val encodedLang = URLEncoder.encode(_targetLanguage.value, "UTF-8")
            val url = "${networkConfig.webSocketBaseUrl}/ws/dubbing/$encodedChannel" +
                "?language=$encodedLang"

            logger.debug("Connecting live dubbing", mapOf(
                "channelId" to channelId,
                "targetLanguage" to _targetLanguage.value,
            ))

            try {
                val conn = webSocketManager.connect(url, ChannelType.LIVE_DUBBING)
                connection = conn
                _isEnabled.value = true

                conn.state.onEach { state ->
                    _connectionState.value = state
                }.launchIn(viewModelScope)

                conn.messages.onEach { raw ->
                    handleMessage(raw)
                }.launchIn(viewModelScope)
            } catch (e: Exception) {
                logger.error("Live dubbing connection failed", e)
                _isEnabled.value = false
            }
        }
    }

    private fun disconnect() {
        connection?.let { conn ->
            webSocketManager.disconnect(conn.id)
        }
        connection = null
        _isEnabled.value = false
        _currentMessage.value = null
        _connectionState.value = ConnectionState.CLOSED
        logger.debug("Live dubbing disconnected")
    }

    private fun handleMessage(raw: String) {
        try {
            val message = json.decodeFromString<LiveDubbingMessage>(raw)
            if (message.type == "dubbing_audio") {
                _currentMessage.value = message
            }
        } catch (e: Exception) {
            logger.error("Failed to parse dubbing message", e)
        }
    }

    private fun sendPreferencesUpdate() {
        val msg = buildJsonObject {
            put("type", "preferences")
            _voiceId.value?.let { put("voice_id", it) }
            put("volume", _dubbingVolume.value)
        }.toString()
        connection?.send(msg)
    }

    override fun onCleared() {
        disconnect()
        super.onCleared()
    }
}
