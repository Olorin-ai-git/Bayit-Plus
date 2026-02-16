package tv.bayit.plus.feature.player.subtitles

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
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.model.LiveSubtitleMessage
import tv.bayit.plus.core.network.NetworkConfig
import java.net.URLEncoder
import tv.bayit.plus.core.network.websocket.ChannelType
import tv.bayit.plus.core.network.websocket.ConnectionState
import tv.bayit.plus.core.network.websocket.WebSocketConnection
import tv.bayit.plus.core.network.websocket.WebSocketManager
import javax.inject.Inject

/**
 * Manages WebSocket-based live subtitle translation for live content.
 *
 * Connects to the LIVE_SUBTITLES channel, processes incoming subtitle
 * segments, and exposes the current + previous messages for overlay display.
 */
@HiltViewModel
class LiveSubtitlesViewModel @Inject constructor(
    private val webSocketManager: WebSocketManager,
    private val networkConfig: NetworkConfig,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _isEnabled = MutableStateFlow(false)
    val isEnabled: StateFlow<Boolean> = _isEnabled.asStateFlow()

    private val _connectionState = MutableStateFlow(ConnectionState.CLOSED)
    val connectionState: StateFlow<ConnectionState> = _connectionState.asStateFlow()

    private val _currentSubtitle = MutableStateFlow<LiveSubtitleMessage?>(null)
    val currentSubtitle: StateFlow<LiveSubtitleMessage?> = _currentSubtitle.asStateFlow()

    private val _previousSubtitle = MutableStateFlow<LiveSubtitleMessage?>(null)
    val previousSubtitle: StateFlow<LiveSubtitleMessage?> = _previousSubtitle.asStateFlow()

    private val _targetLanguage = MutableStateFlow("en")
    val targetLanguage: StateFlow<String> = _targetLanguage.asStateFlow()

    private val _isSplitMode = MutableStateFlow(false)
    val isSplitMode: StateFlow<Boolean> = _isSplitMode.asStateFlow()

    private var connection: WebSocketConnection? = null
    private val json = Json { ignoreUnknownKeys = true }

    fun toggleLiveSubtitles(channelId: String) {
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

    fun toggleSplitMode() {
        _isSplitMode.value = !_isSplitMode.value
    }

    private fun connect(channelId: String) {
        viewModelScope.launch {
            val encodedChannel = URLEncoder.encode(channelId, "UTF-8")
            val encodedLang = URLEncoder.encode(_targetLanguage.value, "UTF-8")
            val url = "${networkConfig.webSocketBaseUrl}/ws/subtitles/$encodedChannel" +
                "?language=$encodedLang"

            logger.debug("Connecting live subtitles", mapOf(
                "channelId" to channelId,
                "targetLanguage" to _targetLanguage.value,
            ))

            try {
                val conn = webSocketManager.connect(url, ChannelType.LIVE_SUBTITLES)
                connection = conn
                _isEnabled.value = true

                conn.state.onEach { state ->
                    _connectionState.value = state
                }.launchIn(viewModelScope)

                conn.messages.onEach { raw ->
                    handleMessage(raw)
                }.launchIn(viewModelScope)
            } catch (e: Exception) {
                logger.error("Live subtitles connection failed", e)
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
        _currentSubtitle.value = null
        _previousSubtitle.value = null
        _connectionState.value = ConnectionState.CLOSED
    }

    private fun handleMessage(raw: String) {
        try {
            val message = json.decodeFromString<LiveSubtitleMessage>(raw)
            if (message.type == "subtitle" && message.isFinal) {
                _previousSubtitle.value = _currentSubtitle.value
                _currentSubtitle.value = message
            }
        } catch (e: Exception) {
            logger.error("Failed to parse live subtitle message", e)
        }
    }

    override fun onCleared() {
        disconnect()
        super.onCleared()
    }
}
