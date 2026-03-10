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
    internal val vodInteractionApi: VODInteractionApi,
    internal val apiClient: BayitApiClient,
    internal val logger: BayitLogger,
) : ViewModel() {

    private val _availableCharacters = MutableStateFlow<List<ContentCharacter>>(emptyList())
    val availableCharacters: StateFlow<List<ContentCharacter>> = _availableCharacters.asStateFlow()

    internal val _selectedCharacter = MutableStateFlow<ContentCharacter?>(null)
    val selectedCharacter: StateFlow<ContentCharacter?> = _selectedCharacter.asStateFlow()

    internal val _sessionId = MutableStateFlow<String?>(null)
    val sessionId: StateFlow<String?> = _sessionId.asStateFlow()

    internal val _exchanges = MutableStateFlow<List<DialogueExchange>>(emptyList())
    val exchanges: StateFlow<List<DialogueExchange>> = _exchanges.asStateFlow()

    internal val _isSending = MutableStateFlow(false)
    val isSending: StateFlow<Boolean> = _isSending.asStateFlow()

    internal val _isActive = MutableStateFlow(false)
    val isActive: StateFlow<Boolean> = _isActive.asStateFlow()

    private val _avatarPlacement = MutableStateFlow<AvatarPlacement?>(null)
    val avatarPlacement: StateFlow<AvatarPlacement?> = _avatarPlacement.asStateFlow()

    internal val _pauseAskPhase = MutableStateFlow(PauseAskPhase.IDLE)
    val pauseAskPhase: StateFlow<PauseAskPhase> = _pauseAskPhase.asStateFlow()

    internal val _pauseAskResponse = MutableStateFlow<PauseAskResponse?>(null)
    val pauseAskResponse: StateFlow<PauseAskResponse?> = _pauseAskResponse.asStateFlow()

    private val _pauseAskError = MutableStateFlow<String?>(null)
    val pauseAskError: StateFlow<String?> = _pauseAskError.asStateFlow()

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
                    mapOf("contentId" to contentId, "count" to characters.size.toString()),
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
        character: ContentCharacter,
        timestamp: Double,
    ) {
        viewModelScope.launch {
            try {
                _selectedCharacter.value = character
                val response = apiClient.safeApiCall {
                    vodInteractionApi.startFreeSession(
                        StartFreeSessionRequest(
                            contentId = contentId,
                            profileId = profileId,
                            avatarId = avatarId,
                            characterName = character.name,
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
                        "character" to character.name,
                    ),
                )
            } catch (e: Exception) {
                logger.error(
                    "Failed to start dialogue session",
                    error = e,
                    metadata = mapOf("contentId" to contentId, "character" to character.name),
                )
                _isActive.value = false
                _selectedCharacter.value = null
            }
        }
    }

    fun sendPauseAskMessage(text: String, languageHint: String? = null) {
        val activeSessionId = _sessionId.value ?: return
        if (text.isBlank()) return

        _pauseAskError.value = null
        _pauseAskPhase.value = PauseAskPhase.POLISHING
        viewModelScope.launch {
            try {
                val response = apiClient.safeApiCall {
                    vodInteractionApi.sendPauseAsk(
                        activeSessionId,
                        PauseAskRequest(message = text, languageHint = languageHint),
                    )
                }
                _pauseAskResponse.value = response
                _pauseAskPhase.value = PauseAskPhase.USER_SPEAKING
                logger.debug(
                    "Pause-ask response received",
                    mapOf(
                        "sessionId" to activeSessionId,
                        "hasUserVideo" to response.userAnimatedVideoUrl.isNotEmpty().toString(),
                        "hasCharVideo" to response.characterAnimatedVideoUrl.isNotEmpty().toString(),
                    ),
                )
            } catch (e: Exception) {
                logger.error(
                    "Failed to send pause-ask message",
                    error = e,
                    metadata = mapOf("sessionId" to activeSessionId),
                )
                _pauseAskError.value = "player.pauseAsk.error.generic"
                _pauseAskPhase.value = PauseAskPhase.INPUT
            }
        }
    }

    fun advancePauseAskPhase(phase: PauseAskPhase) {
        _pauseAskPhase.value = phase
    }

    fun resetPauseAsk() {
        _pauseAskPhase.value = PauseAskPhase.IDLE
        _pauseAskResponse.value = null
        _pauseAskError.value = null
    }

    override fun onCleared() {
        val activeSessionId = _sessionId.value
        if (_isActive.value && activeSessionId != null) {
            logger.info("ViewModel cleared with active session", mapOf("sessionId" to activeSessionId))
        }
        super.onCleared()
    }
}
