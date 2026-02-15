package tv.bayit.plus.feature.social.conversation

import androidx.lifecycle.SavedStateHandle
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
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.DirectMessageRepository
import tv.bayit.plus.core.model.DirectMessage
import tv.bayit.plus.core.network.NetworkConfiguration
import tv.bayit.plus.core.network.websocket.ChannelType
import tv.bayit.plus.core.network.websocket.WebSocketConnection
import tv.bayit.plus.core.network.websocket.WebSocketManager
import javax.inject.Inject

@HiltViewModel
class ConversationViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val directMessageRepository: DirectMessageRepository,
    private val webSocketManager: WebSocketManager,
    private val networkConfig: NetworkConfiguration,
    private val logger: BayitLogger,
) : ViewModel() {

    private val friendId: String = checkNotNull(savedStateHandle["friendId"])

    private val _uiState = MutableStateFlow<ConversationUiState>(ConversationUiState.Loading)
    val uiState: StateFlow<ConversationUiState> = _uiState.asStateFlow()

    private val _messageInput = MutableStateFlow("")
    val messageInput: StateFlow<String> = _messageInput.asStateFlow()

    private var wsConnection: WebSocketConnection? = null

    init {
        loadMessages()
        connectWebSocket()
    }

    fun updateMessageInput(text: String) {
        _messageInput.value = text
    }

    fun sendMessage() {
        val text = _messageInput.value.trim()
        if (text.isBlank()) return
        _messageInput.value = ""
        viewModelScope.launch {
            logger.debug("Sending message", mapOf("friendId" to friendId))
            when (val result = directMessageRepository.sendMessage(friendId, text)) {
                is BayitResult.Success -> loadMessages()
                is BayitResult.Error -> logger.error("Send message failed", result.exception)
                is BayitResult.Loading -> Unit
            }
        }
    }

    private fun loadMessages() {
        viewModelScope.launch {
            logger.debug("Loading messages", mapOf("friendId" to friendId))
            when (val result = directMessageRepository.getMessages(friendId, null)) {
                is BayitResult.Success -> {
                    val messages = result.data.filterIsInstance<DirectMessage>()
                    logger.info(
                        "Messages loaded",
                        mapOf("count" to messages.size.toString()),
                    )
                    _uiState.value = ConversationUiState.Success(messages)
                }
                is BayitResult.Error -> {
                    logger.error("Messages load failed", result.exception)
                    _uiState.value = ConversationUiState.Error(
                        result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
            directMessageRepository.markAsRead(friendId)
        }
    }

    private fun connectWebSocket() {
        viewModelScope.launch {
            val wsUrl = "${networkConfig.webSocketBaseUrl}/ws/messages/$friendId"
            logger.debug("Connecting to message WebSocket", mapOf("url" to wsUrl))
            try {
                val connection = webSocketManager.connect(wsUrl, ChannelType.DIRECT_MESSAGES)
                wsConnection = connection
                connection.messages
                    .onEach { raw -> handleIncomingMessage(raw) }
                    .launchIn(viewModelScope)
            } catch (e: Exception) {
                logger.error("WebSocket connection failed", e)
            }
        }
    }

    private fun handleIncomingMessage(raw: String) {
        try {
            val json = Json.parseToJsonElement(raw).jsonObject
            val type = json["type"]?.jsonPrimitive?.content
            if (type == "message") {
                loadMessages()
            }
        } catch (e: Exception) {
            logger.error("Failed to parse WebSocket message", e)
        }
    }

    override fun onCleared() {
        super.onCleared()
        wsConnection?.let { webSocketManager.disconnect(it.id) }
    }
}

sealed interface ConversationUiState {
    data object Loading : ConversationUiState
    data class Success(val messages: List<DirectMessage>) : ConversationUiState
    data class Error(val message: String) : ConversationUiState
}
