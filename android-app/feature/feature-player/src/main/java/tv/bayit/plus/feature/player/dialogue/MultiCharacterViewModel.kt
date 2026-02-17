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

/**
 * ViewModel for multi-character dialogue interactions (WS3).
 *
 * Manages available characters in the scene, tracks the currently addressed
 * character, and sends multi-character messages. Each response can include
 * reactions from other characters in the scene.
 */
@HiltViewModel
class MultiCharacterViewModel @Inject constructor(
    private val vodInteractionApi: VODInteractionApi,
    private val apiClient: BayitApiClient,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _characters = MutableStateFlow<List<CharacterProfile>>(emptyList())
    val characters: StateFlow<List<CharacterProfile>> = _characters.asStateFlow()

    private val _addressedCharacter = MutableStateFlow<CharacterProfile?>(null)
    val addressedCharacter: StateFlow<CharacterProfile?> = _addressedCharacter.asStateFlow()

    private val _exchanges = MutableStateFlow<List<DialogueExchangeItem>>(emptyList())
    val exchanges: StateFlow<List<DialogueExchangeItem>> = _exchanges.asStateFlow()

    private val _isSending = MutableStateFlow(false)
    val isSending: StateFlow<Boolean> = _isSending.asStateFlow()

    private val _isActive = MutableStateFlow(false)
    val isActive: StateFlow<Boolean> = _isActive.asStateFlow()

    fun setCharacters(profiles: List<CharacterProfile>) {
        _characters.value = profiles
        if (profiles.isNotEmpty() && _addressedCharacter.value == null) {
            _addressedCharacter.value = profiles.first()
        }
    }

    fun selectCharacter(profile: CharacterProfile) {
        _addressedCharacter.value = profile
        logger.debug(
            "Multi-character addressed character changed",
            mapOf("character" to profile.name),
        )
    }

    fun activate() {
        _isActive.value = true
        _exchanges.value = emptyList()
    }

    fun deactivate() {
        _isActive.value = false
        _exchanges.value = emptyList()
        _addressedCharacter.value = null
    }

    fun sendMultiMessage(sessionId: String, text: String) {
        val addressed = _addressedCharacter.value ?: return
        if (text.isBlank()) return

        _isSending.value = true
        viewModelScope.launch {
            try {
                val response = apiClient.safeApiCall {
                    vodInteractionApi.sendMultiMessage(
                        sessionId = sessionId,
                        request = MultiMessageRequest(
                            message = text,
                            addressedCharacter = addressed.name,
                        ),
                    )
                }

                val userItem = DialogueExchangeItem(
                    speaker = SPEAKER_USER,
                    messageText = text,
                    characterName = addressed.name,
                )

                val responseItems = response.exchanges.map { exchange ->
                    DialogueExchangeItem(
                        speaker = exchange.speaker,
                        messageText = exchange.messageText,
                        characterName = exchange.characterName,
                        audioUrl = exchange.audioUrl,
                        animatedVideoUrl = exchange.animatedVideoUrl,
                        reactionTo = exchange.reactionTo,
                    )
                }

                _exchanges.value = _exchanges.value + userItem + responseItems

                logger.info(
                    "Multi-character exchange completed",
                    mapOf(
                        "sessionId" to sessionId,
                        "addressed" to addressed.name,
                        "responseCount" to response.exchanges.size.toString(),
                    ),
                )
            } catch (e: Exception) {
                logger.error(
                    "Failed to send multi-character message",
                    error = e,
                    metadata = mapOf(
                        "sessionId" to sessionId,
                        "addressed" to addressed.name,
                    ),
                )
            } finally {
                _isSending.value = false
            }
        }
    }
}
