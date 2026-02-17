package tv.bayit.plus.feature.player.dialogue

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Inject

/** ViewModel for single-character avatar dialogue during VOD playback. */
@HiltViewModel
class AvatarDialogueViewModel @Inject constructor(
    private val vodInteractionApi: VODInteractionApi,
    private val apiClient: BayitApiClient,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _availableCharacters = MutableStateFlow<List<ContentCharacter>>(emptyList())
    val availableCharacters: StateFlow<List<ContentCharacter>> = _availableCharacters.asStateFlow()

    private val _selectedCharacter = MutableStateFlow<ContentCharacter?>(null)
    val selectedCharacter: StateFlow<ContentCharacter?> = _selectedCharacter.asStateFlow()

    private val _sessionId = MutableStateFlow<String?>(null)
    val sessionId: StateFlow<String?> = _sessionId.asStateFlow()

    private val _exchanges = MutableStateFlow<List<DialogueExchange>>(emptyList())
    val exchanges: StateFlow<List<DialogueExchange>> = _exchanges.asStateFlow()

    private val _isSending = MutableStateFlow(false)
    val isSending: StateFlow<Boolean> = _isSending.asStateFlow()

    private val _isActive = MutableStateFlow(false)
    val isActive: StateFlow<Boolean> = _isActive.asStateFlow()

    private val _avatarPlacement = MutableStateFlow<AvatarPlacement?>(null)
    val avatarPlacement: StateFlow<AvatarPlacement?> = _avatarPlacement.asStateFlow()

    fun updateAvatarPlacement(placement: AvatarPlacement?) {
        _avatarPlacement.value = placement
    }

    fun loadCharacters(contentId: String) {
        viewModelScope.launch {
            try {
                val characters = apiClient.safeApiCall {
                    vodInteractionApi.getInteractiveCharacters(contentId)
                }
                _availableCharacters.value = characters
                logger.info(
                    "Loaded interactive characters",
                    mapOf(
                        "contentId" to contentId,
                        "count" to characters.size.toString(),
                    ),
                )
            } catch (e: Exception) {
                logger.error(
                    "Failed to load interactive characters",
                    error = e,
                    metadata = mapOf("contentId" to contentId),
                )
                _availableCharacters.value = emptyList()
            }
        }
    }

    fun startSession(
        contentId: String,
        profileId: String,
        avatarId: String,
        characterName: String,
        timestamp: Double,
    ) {
        viewModelScope.launch {
            try {
                val character = _availableCharacters.value.firstOrNull { it.name == characterName }
                _selectedCharacter.value = character

                val response = apiClient.safeApiCall {
                    vodInteractionApi.startFreeSession(
                        StartFreeSessionRequest(
                            contentId = contentId,
                            profileId = profileId,
                            avatarId = avatarId,
                            characterName = characterName,
                            currentTimestamp = timestamp,
                        ),
                    )
                }

                _sessionId.value = response.sessionId
                _isActive.value = true
                _exchanges.value = emptyList()

                logger.info(
                    "Dialogue session started",
                    mapOf(
                        "sessionId" to response.sessionId,
                        "contentId" to contentId,
                        "character" to characterName,
                    ),
                )
            } catch (e: Exception) {
                logger.error(
                    "Failed to start dialogue session",
                    error = e,
                    metadata = mapOf(
                        "contentId" to contentId,
                        "character" to characterName,
                    ),
                )
                _isActive.value = false
            }
        }
    }

    fun sendMessage(text: String) {
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

    fun endSession() {
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

    override fun onCleared() {
        val activeSessionId = _sessionId.value
        if (_isActive.value && activeSessionId != null) {
            logger.info("ViewModel cleared with active session", mapOf("sessionId" to activeSessionId))
        }
        super.onCleared()
    }
}
