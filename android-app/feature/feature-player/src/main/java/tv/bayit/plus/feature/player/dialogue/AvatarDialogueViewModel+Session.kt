package tv.bayit.plus.feature.player.dialogue

import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch

/** Sends a free-form message to the active dialogue session and appends the exchange. */
fun AvatarDialogueViewModel.sendMessage(text: String) {
    val activeSessionId = _sessionId.value ?: return
    if (text.isBlank()) return

    _isSending.value = true
    viewModelScope.launch {
        try {
            val response = apiClient.safeApiCall {
                vodInteractionApi.sendMessage(
                    activeSessionId,
                    MessageRequest(message = text),
                )
            }

            val exchange = DialogueExchange(
                userMessage = text,
                characterReply = response.responseText,
                characterVideoUrl = response.animatedVideoUrl,
            )
            _exchanges.value = _exchanges.value + exchange

            logger.debug(
                "Dialogue exchange completed",
                mapOf(
                    "sessionId" to activeSessionId,
                    "hasVideo" to (response.animatedVideoUrl != null).toString(),
                ),
            )
        } catch (e: Exception) {
            logger.error(
                "Failed to send dialogue message",
                error = e,
                metadata = mapOf("sessionId" to activeSessionId),
            )
        } finally {
            _isSending.value = false
        }
    }
}

/** Ends the active dialogue session, completing it on the backend and clearing local state. */
fun AvatarDialogueViewModel.endSession() {
    val activeSessionId = _sessionId.value ?: return
    viewModelScope.launch {
        try {
            apiClient.safeApiCall {
                vodInteractionApi.completeSession(activeSessionId)
            }
            logger.info(
                "Dialogue session ended",
                mapOf("sessionId" to activeSessionId),
            )
        } catch (e: Exception) {
            logger.error(
                "Failed to end dialogue session",
                error = e,
                metadata = mapOf("sessionId" to activeSessionId),
            )
        } finally {
            _sessionId.value = null
            _isActive.value = false
            _selectedCharacter.value = null
            _exchanges.value = emptyList()
        }
    }
}
