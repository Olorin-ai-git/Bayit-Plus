package tv.bayit.plus.feature.social.watchparty

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.WatchPartyRepository
import tv.bayit.plus.core.model.WatchParty
import javax.inject.Inject

@HiltViewModel
class WatchPartyViewModel @Inject constructor(
    private val watchPartyRepository: WatchPartyRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<WatchPartyUiState>(WatchPartyUiState.Idle)
    val uiState: StateFlow<WatchPartyUiState> = _uiState.asStateFlow()

    private val _joinCode = MutableStateFlow("")
    val joinCode: StateFlow<String> = _joinCode.asStateFlow()

    private val _mediaId = MutableStateFlow("")
    val mediaId: StateFlow<String> = _mediaId.asStateFlow()

    fun updateJoinCode(code: String) {
        _joinCode.value = code
    }

    fun updateMediaId(id: String) {
        _mediaId.value = id
    }

    fun createParty() {
        val currentMediaId = _mediaId.value
        if (currentMediaId.isBlank()) return
        viewModelScope.launch {
            _uiState.value = WatchPartyUiState.Creating
            logger.info("Creating watch party", mapOf("mediaId" to currentMediaId))
            when (val result = watchPartyRepository.createParty(currentMediaId)) {
                is BayitResult.Success -> {
                    val party = result.data as? WatchParty
                    if (party != null) {
                        logger.info("Watch party created", mapOf("partyId" to party.id))
                        _uiState.value = WatchPartyUiState.Created(party)
                    } else {
                        _uiState.value = WatchPartyUiState.Error("Unexpected response format")
                    }
                }
                is BayitResult.Error -> {
                    logger.error("Create party failed", result.exception)
                    _uiState.value = WatchPartyUiState.Error(
                        result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun joinParty() {
        val code = _joinCode.value
        if (code.isBlank()) return
        viewModelScope.launch {
            _uiState.value = WatchPartyUiState.Joining
            logger.info("Joining watch party", mapOf("code" to code))
            when (val result = watchPartyRepository.joinParty(code)) {
                is BayitResult.Success -> {
                    val party = result.data as? WatchParty
                    if (party != null) {
                        logger.info("Joined watch party", mapOf("partyId" to party.id))
                        _uiState.value = WatchPartyUiState.Joined(party)
                    } else {
                        _uiState.value = WatchPartyUiState.Error("Unexpected response format")
                    }
                }
                is BayitResult.Error -> {
                    logger.error("Join party failed", result.exception)
                    _uiState.value = WatchPartyUiState.Error(
                        result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface WatchPartyUiState {
    data object Idle : WatchPartyUiState
    data object Creating : WatchPartyUiState
    data object Joining : WatchPartyUiState
    data class Created(val party: WatchParty) : WatchPartyUiState
    data class Joined(val party: WatchParty) : WatchPartyUiState
    data class Error(val message: String) : WatchPartyUiState
}
