package tv.bayit.plus.feature.voice.chatbot

import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult

internal fun ChatbotViewModel.loadActiveChannelAndMessages() {
    updateUiState(ChatbotUiState.Loading)
    viewModelScope.launch {
        logger.debug("Loading active chatbot channels")
        when (val result = chatRepository.getActiveChannels()) {
            is BayitResult.Success -> {
                val channels = result.data
                if (channels.isEmpty()) {
                    updateUiState(ChatbotUiState.Error("No active AI channels available"))
                    return@launch
                }
                val channelId = extractChannelId(channels.first())
                logger.info("Active channel found", mapOf("channelId" to channelId))
                loadMessages(channelId)
            }
            is BayitResult.Error -> {
                logger.error("Failed to load channels", result.exception)
                updateUiState(ChatbotUiState.Error(
                    result.message ?: result.exception.message.orEmpty(),
                ))
            }
            is BayitResult.Loading -> Unit
        }
    }
}

internal suspend fun ChatbotViewModel.loadMessages(channelId: String) {
    logger.debug("Loading messages", mapOf("channelId" to channelId))
    when (val result = chatRepository.getChannelMessages(channelId, null)) {
        is BayitResult.Success -> {
            val messages = result.data.map { item ->
                ChatMessage.fromApiResponse(item)
            }
            logger.info("Messages loaded", mapOf("count" to messages.size.toString()))
            updateUiState(ChatbotUiState.Ready(
                channelId = channelId,
                messages = messages,
            ))
            speakLatestAiResponse(messages)
        }
        is BayitResult.Error -> {
            logger.error("Failed to load messages", result.exception)
            updateUiState(ChatbotUiState.Error(
                result.message ?: result.exception.message.orEmpty(),
            ))
        }
        is BayitResult.Loading -> Unit
    }
}

internal fun ChatbotViewModel.speakLatestAiResponse(messages: List<ChatMessage>) {
    val lastAiMessage = messages.lastOrNull { it.isAi } ?: return
    if (lastAiMessage.content.isNotBlank()) {
        ttsService.speak(lastAiMessage.content, "he")
    }
}

internal fun ChatbotViewModel.extractChannelId(channel: Any): String {
    val map = channel as? Map<*, *>
    return map?.get("id")?.toString() ?: channel.toString()
}
