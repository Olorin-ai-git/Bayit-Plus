package tv.bayit.plus.feature.voice.chatbot

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.ChatRepository
import tv.bayit.plus.core.voice.SpeechRecognitionService
import tv.bayit.plus.core.voice.TTSService
import javax.inject.Inject

@HiltViewModel
class ChatbotViewModel @Inject constructor(
    private val chatRepository: ChatRepository,
    private val speechService: SpeechRecognitionService,
    private val ttsService: TTSService,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<ChatbotUiState>(ChatbotUiState.Loading)
    val uiState: StateFlow<ChatbotUiState> = _uiState.asStateFlow()

    private val _messageInput = MutableStateFlow("")
    val messageInput: StateFlow<String> = _messageInput.asStateFlow()

    private val _isSending = MutableStateFlow(false)
    val isSending: StateFlow<Boolean> = _isSending.asStateFlow()

    private val _isListening = MutableStateFlow(false)
    val isListening: StateFlow<Boolean> = _isListening.asStateFlow()

    val isSpeaking: StateFlow<Boolean> = ttsService.isSpeaking

    private var recognitionStop: (() -> Unit)? = null
    private var recognitionJob: Job? = null

    init {
        loadActiveChannelAndMessages()
    }

    fun updateMessageInput(text: String) {
        _messageInput.value = text
    }

    fun toggleVoiceInput(language: String) {
        if (_isListening.value) stopVoiceInput() else startVoiceInput(language)
    }

    private fun startVoiceInput(language: String) {
        try {
            val (flow, stop) = speechService.startRecognition(language)
            recognitionStop = stop
            _isListening.value = true
            recognitionJob = viewModelScope.launch {
                flow.collect { result ->
                    _messageInput.value = result.transcription
                    if (result.isFinal) {
                        _isListening.value = false
                        sendMessage()
                    }
                }
            }
        } catch (e: Exception) {
            _isListening.value = false
            logger.error("Voice input failed", e)
        }
    }

    private fun stopVoiceInput() {
        recognitionStop?.invoke()
        recognitionStop = null
        recognitionJob?.cancel()
        recognitionJob = null
        _isListening.value = false
    }

    fun stopTts() {
        ttsService.stop()
    }

    fun sendMessage() {
        val text = _messageInput.value.trim()
        if (text.isBlank()) return
        val currentState = _uiState.value
        if (currentState !is ChatbotUiState.Ready) return

        _messageInput.value = ""
        _isSending.value = true

        viewModelScope.launch {
            logger.debug("Sending chatbot message", mapOf("channelId" to currentState.channelId))
            when (val result = chatRepository.sendMessage(currentState.channelId, text)) {
                is BayitResult.Success -> {
                    logger.info("Chatbot message sent", mapOf("channelId" to currentState.channelId))
                    loadMessages(currentState.channelId)
                }
                is BayitResult.Error -> {
                    logger.error("Send chatbot message failed", result.exception)
                    _uiState.value = currentState.copy(
                        errorMessage = result.message ?: result.exception.message,
                    )
                }
                is BayitResult.Loading -> Unit
            }
            _isSending.value = false
        }
    }

    fun dismissError() {
        val current = _uiState.value
        if (current is ChatbotUiState.Ready) {
            _uiState.value = current.copy(errorMessage = null)
        }
    }

    fun retry() {
        loadActiveChannelAndMessages()
    }

    private fun loadActiveChannelAndMessages() {
        _uiState.value = ChatbotUiState.Loading
        viewModelScope.launch {
            logger.debug("Loading active chatbot channels")
            when (val result = chatRepository.getActiveChannels()) {
                is BayitResult.Success -> {
                    val channels = result.data
                    if (channels.isEmpty()) {
                        _uiState.value = ChatbotUiState.Error("No active AI channels available")
                        return@launch
                    }
                    val channelId = extractChannelId(channels.first())
                    logger.info("Active channel found", mapOf("channelId" to channelId))
                    loadMessages(channelId)
                }
                is BayitResult.Error -> {
                    logger.error("Failed to load channels", result.exception)
                    _uiState.value = ChatbotUiState.Error(
                        result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    private suspend fun loadMessages(channelId: String) {
        logger.debug("Loading messages", mapOf("channelId" to channelId))
        when (val result = chatRepository.getChannelMessages(channelId, null)) {
            is BayitResult.Success -> {
                val messages = result.data.map { item ->
                    ChatMessage.fromApiResponse(item)
                }
                logger.info("Messages loaded", mapOf("count" to messages.size.toString()))
                _uiState.value = ChatbotUiState.Ready(
                    channelId = channelId,
                    messages = messages,
                )
                speakLatestAiResponse(messages)
            }
            is BayitResult.Error -> {
                logger.error("Failed to load messages", result.exception)
                _uiState.value = ChatbotUiState.Error(
                    result.message ?: result.exception.message.orEmpty(),
                )
            }
            is BayitResult.Loading -> Unit
        }
    }

    private fun speakLatestAiResponse(messages: List<ChatMessage>) {
        val lastAiMessage = messages.lastOrNull { it.isAi } ?: return
        if (lastAiMessage.content.isNotBlank()) {
            ttsService.speak(lastAiMessage.content, "he")
        }
    }

    private fun extractChannelId(channel: Any): String {
        val map = channel as? Map<*, *>
        return map?.get("id")?.toString() ?: channel.toString()
    }

    override fun onCleared() {
        super.onCleared()
        stopVoiceInput()
        ttsService.stop()
    }
}

sealed interface ChatbotUiState {
    data object Loading : ChatbotUiState
    data class Ready(
        val channelId: String,
        val messages: List<ChatMessage> = emptyList(),
        val errorMessage: String? = null,
    ) : ChatbotUiState
    data class Error(val message: String) : ChatbotUiState
}

data class ChatMessage(
    val id: String,
    val senderId: String,
    val senderName: String,
    val content: String,
    val timestamp: String,
    val isAi: Boolean,
) {
    companion object {
        fun fromApiResponse(item: Any): ChatMessage {
            val map = item as? Map<*, *>
            val senderId = map?.get("sender_id")?.toString().orEmpty()
            return ChatMessage(
                id = map?.get("id")?.toString().orEmpty(),
                senderId = senderId,
                senderName = map?.get("sender_name")?.toString() ?: "AI Assistant",
                content = map?.get("content")?.toString().orEmpty(),
                timestamp = map?.get("timestamp")?.toString().orEmpty(),
                isAi = senderId == "ai" || senderId == "assistant" || senderId == "system",
            )
        }
    }
}
