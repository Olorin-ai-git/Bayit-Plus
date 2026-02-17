package tv.bayit.plus.feature.player.dialogue

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonPrimitive
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.network.api.BayitApiClient
import tv.bayit.plus.core.network.websocket.ChannelType
import tv.bayit.plus.core.network.websocket.WebSocketConnection
import tv.bayit.plus.core.network.websocket.WebSocketManager
import javax.inject.Inject

/** ViewModel for shared interactive sessions within watch parties (WS4). */
@HiltViewModel
class SharedInteractionViewModel @Inject constructor(
    private val sharedApi: SharedInteractionApi,
    private val apiClient: BayitApiClient,
    private val webSocketManager: WebSocketManager,
    private val json: Json,
    private val logger: BayitLogger,
) : ViewModel() {
    private val _sessionId = MutableStateFlow<String?>(null)
    val sessionId: StateFlow<String?> = _sessionId.asStateFlow()
    private val _partyId = MutableStateFlow<String?>(null)
    val partyId: StateFlow<String?> = _partyId.asStateFlow()
    private val _isActive = MutableStateFlow(false)
    val isActive: StateFlow<Boolean> = _isActive.asStateFlow()
    private val _participants = MutableStateFlow<List<SharedParticipant>>(emptyList())
    val participants: StateFlow<List<SharedParticipant>> = _participants.asStateFlow()
    private val _currentTurnUserId = MutableStateFlow<String?>(null)
    val currentTurnUserId: StateFlow<String?> = _currentTurnUserId.asStateFlow()
    private val _turnCountdown = MutableStateFlow(0)
    val turnCountdown: StateFlow<Int> = _turnCountdown.asStateFlow()
    private val _exchanges = MutableStateFlow<List<DialogueExchangeItem>>(emptyList())
    val exchanges: StateFlow<List<DialogueExchangeItem>> = _exchanges.asStateFlow()
    private val _isSending = MutableStateFlow(false)
    val isSending: StateFlow<Boolean> = _isSending.asStateFlow()
    private val _characterName = MutableStateFlow<String?>(null)
    val characterName: StateFlow<String?> = _characterName.asStateFlow()
    private var countdownJob: Job? = null
    private var wsConnection: WebSocketConnection? = null

    fun startSharedSession(
        partyId: String,
        contentId: String,
        momentTimestamp: Double,
        characterName: String,
        profileId: String,
        avatarId: String,
        displayName: String,
    ) {
        viewModelScope.launch {
            try {
                val response = apiClient.safeApiCall {
                    sharedApi.startSharedInteraction(
                        partyId = partyId,
                        request = SharedStartRequest(
                            contentId = contentId,
                            momentTimestamp = momentTimestamp,
                            characterName = characterName,
                            profileId = profileId,
                            avatarId = avatarId,
                            displayName = displayName,
                        ),
                    )
                }
                _sessionId.value = response.sessionId
                _partyId.value = partyId
                _characterName.value = characterName
                _isActive.value = true
                _exchanges.value = emptyList()
                connectWebSocket(partyId, response.sessionId)
                logger.info(
                    "Shared session started",
                    mapOf("sessionId" to response.sessionId, "partyId" to partyId),
                )
            } catch (e: Exception) {
                logger.error("Failed to start shared session", error = e)
                _isActive.value = false
            }
        }
    }

    fun sendMessage(text: String, addressedCharacter: String? = null) {
        val sid = _sessionId.value ?: return
        val pid = _partyId.value ?: return
        if (text.isBlank()) return
        _isSending.value = true
        viewModelScope.launch {
            try {
                val response = apiClient.safeApiCall {
                    sharedApi.sendSharedMessage(
                        partyId = pid, sessionId = sid,
                        request = SharedMessageRequest(message = text, addressedCharacter = addressedCharacter),
                    )
                }
                val items = response.exchanges.map { ex ->
                    DialogueExchangeItem(
                        speaker = ex.speaker, messageText = ex.messageText,
                        characterName = ex.characterName, audioUrl = ex.audioUrl,
                        animatedVideoUrl = ex.animatedVideoUrl, participantName = ex.participantName,
                    )
                }
                _exchanges.value = _exchanges.value + items
                logger.debug("Shared message sent", mapOf("sessionId" to sid, "count" to items.size.toString()))
            } catch (e: Exception) {
                logger.error("Failed to send shared message", error = e, metadata = mapOf("sessionId" to sid))
            } finally {
                _isSending.value = false
            }
        }
    }

    fun endSession() {
        val sid = _sessionId.value ?: return
        val pid = _partyId.value ?: return
        viewModelScope.launch {
            try {
                apiClient.safeApiCall { sharedApi.endSharedInteraction(pid, sid) }
                logger.info("Shared session ended", mapOf("sessionId" to sid))
            } catch (e: Exception) {
                logger.error("Failed to end shared session", error = e)
            } finally { cleanup() }
        }
    }

    private fun connectWebSocket(partyId: String, sessionId: String) {
        viewModelScope.launch {
            try {
                val wsUrl = apiClient.retrofit.baseUrl().toString()
                    .replace("https://", "wss://").replace("http://", "ws://") +
                    "api/v1/ws/shared-interaction/$partyId/$sessionId"
                val conn = webSocketManager.connect(wsUrl, ChannelType.SHARED_INTERACTION)
                wsConnection = conn
                conn.messages.onEach { handleWsMessage(it) }.launchIn(viewModelScope)
            } catch (e: Exception) {
                logger.error("Failed to connect shared WS", error = e)
            }
        }
    }

    private fun handleWsMessage(text: String) {
        val parsed = try { json.decodeFromString<JsonObject>(text) } catch (e: Exception) {
            logger.error("Failed to parse shared WS message", error = e); return
        }
        when (parsed["type"]?.jsonPrimitive?.content) {
            "turn_change" -> {
                _currentTurnUserId.value = parsed["user_id"]?.jsonPrimitive?.content
                val duration = parsed["duration"]?.jsonPrimitive?.content?.toIntOrNull() ?: TURN_DURATION_SECONDS
                startCountdown(duration)
            }
            "session_ended" -> cleanup()
        }
    }

    private fun startCountdown(seconds: Int) {
        countdownJob?.cancel()
        _turnCountdown.value = seconds
        countdownJob = viewModelScope.launch {
            var remaining = seconds
            while (remaining > 0) { delay(COUNTDOWN_INTERVAL_MS); remaining--; _turnCountdown.value = remaining }
        }
    }

    private fun cleanup() {
        countdownJob?.cancel()
        wsConnection?.let { webSocketManager.disconnect(it.id) }
        wsConnection = null
        _sessionId.value = null
        _partyId.value = null
        _isActive.value = false
        _currentTurnUserId.value = null
        _turnCountdown.value = 0
        _exchanges.value = emptyList()
        _characterName.value = null
    }

    override fun onCleared() { cleanup(); super.onCleared() }
}

private const val TURN_DURATION_SECONDS = 30
private const val COUNTDOWN_INTERVAL_MS = 1000L
