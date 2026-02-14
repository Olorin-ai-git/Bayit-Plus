package tv.bayit.plus.feature.social.watchparty.active

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.MediaRepository
import tv.bayit.plus.core.data.repository.WatchPartyRepository
import tv.bayit.plus.core.model.Friend
import tv.bayit.plus.core.model.WatchParty
import javax.inject.Inject

@HiltViewModel
class ActivePartyViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val watchPartyRepository: WatchPartyRepository,
    private val mediaRepository: MediaRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val partyId: String = checkNotNull(savedStateHandle["partyId"])

    private val _uiState = MutableStateFlow<ActivePartyUiState>(ActivePartyUiState.Loading)
    val uiState: StateFlow<ActivePartyUiState> = _uiState.asStateFlow()

    private val _chatInput = MutableStateFlow("")
    val chatInput: StateFlow<String> = _chatInput.asStateFlow()

    init {
        loadPartyState()
    }

    fun updateChatInput(text: String) {
        _chatInput.value = text
    }

    fun syncPlayback(positionMs: Long, isPlaying: Boolean) {
        viewModelScope.launch {
            logger.debug(
                "Syncing playback",
                mapOf("partyId" to partyId, "positionMs" to positionMs.toString()),
            )
            when (val result = watchPartyRepository.syncPlayback(partyId, positionMs, isPlaying)) {
                is BayitResult.Success -> logger.debug("Playback synced")
                is BayitResult.Error -> logger.error("Playback sync failed", result.exception)
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun leaveParty() {
        viewModelScope.launch {
            logger.info("Leaving watch party", mapOf("partyId" to partyId))
            when (val result = watchPartyRepository.leaveParty(partyId)) {
                is BayitResult.Success -> _uiState.value = ActivePartyUiState.Left
                is BayitResult.Error -> logger.error("Leave party failed", result.exception)
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun refreshMembers() {
        viewModelScope.launch {
            when (val result = watchPartyRepository.getPartyMembers(partyId)) {
                is BayitResult.Success -> {
                    val members = result.data.filterIsInstance<Friend>()
                    val current = (_uiState.value as? ActivePartyUiState.Active)
                    if (current != null) {
                        _uiState.value = current.copy(participants = members)
                    }
                }
                is BayitResult.Error -> logger.error("Refresh members failed", result.exception)
                is BayitResult.Loading -> Unit
            }
        }
    }

    private fun loadPartyState() {
        viewModelScope.launch {
            logger.debug("Loading party state", mapOf("partyId" to partyId))
            when (val result = watchPartyRepository.getPartyState(partyId)) {
                is BayitResult.Success -> {
                    val party = result.data as? WatchParty
                    if (party != null) {
                        loadPlaybackUrl(party)
                    } else {
                        _uiState.value = ActivePartyUiState.Error("Unexpected response format")
                    }
                }
                is BayitResult.Error -> {
                    logger.error("Party state load failed", result.exception)
                    _uiState.value = ActivePartyUiState.Error(
                        result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    private suspend fun loadPlaybackUrl(party: WatchParty) {
        when (val urlResult = mediaRepository.getPlaybackUrl(party.contentId)) {
            is BayitResult.Success -> {
                logger.info("Party active", mapOf("partyId" to party.id))
                _uiState.value = ActivePartyUiState.Active(
                    party = party,
                    playbackUrl = urlResult.data,
                    participants = party.participants,
                )
            }
            is BayitResult.Error -> {
                logger.error("Playback URL load failed", urlResult.exception)
                _uiState.value = ActivePartyUiState.Error(
                    urlResult.message ?: urlResult.exception.message.orEmpty(),
                )
            }
            is BayitResult.Loading -> Unit
        }
    }
}

sealed interface ActivePartyUiState {
    data object Loading : ActivePartyUiState
    data object Left : ActivePartyUiState
    data class Active(
        val party: WatchParty,
        val playbackUrl: String,
        val participants: List<Friend>,
    ) : ActivePartyUiState
    data class Error(val message: String) : ActivePartyUiState
}
