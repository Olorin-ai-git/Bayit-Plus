package tv.bayit.plus.feature.settings.household

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.HouseholdRepository
import javax.inject.Inject

@HiltViewModel
class HouseholdViewModel @Inject constructor(
    private val householdRepository: HouseholdRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<HouseholdUiState>(HouseholdUiState.Loading)
    val uiState: StateFlow<HouseholdUiState> = _uiState.asStateFlow()

    init {
        loadHousehold()
    }

    private fun loadHousehold() {
        viewModelScope.launch {
            logger.debug("Loading household members")
            when (val result = householdRepository.getMembers()) {
                is BayitResult.Success -> {
                    _uiState.value = HouseholdUiState.Success(
                        members = result.data,
                        inviteEmail = "",
                        isProcessing = false,
                    )
                    logger.info("Household loaded", mapOf("memberCount" to result.data.size.toString()))
                }
                is BayitResult.Error -> {
                    logger.error("Failed to load household", result.exception)
                    _uiState.value = HouseholdUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun updateInviteEmail(email: String) {
        val current = _uiState.value as? HouseholdUiState.Success ?: return
        _uiState.value = current.copy(inviteEmail = email)
    }

    fun inviteMember() {
        val current = _uiState.value as? HouseholdUiState.Success ?: return
        if (current.inviteEmail.isBlank()) return
        _uiState.value = current.copy(isProcessing = true)

        viewModelScope.launch {
            logger.debug("Inviting member", mapOf("email" to current.inviteEmail))
            when (householdRepository.inviteMember(current.inviteEmail)) {
                is BayitResult.Success -> {
                    logger.info("Member invited", mapOf("email" to current.inviteEmail))
                    _uiState.value = current.copy(inviteEmail = "", isProcessing = false)
                    loadHousehold()
                }
                is BayitResult.Error -> {
                    _uiState.value = current.copy(isProcessing = false)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun removeMember(memberId: String) {
        val current = _uiState.value as? HouseholdUiState.Success ?: return
        _uiState.value = current.copy(isProcessing = true)

        viewModelScope.launch {
            logger.debug("Removing member", mapOf("memberId" to memberId))
            when (householdRepository.removeMember(memberId)) {
                is BayitResult.Success -> {
                    logger.info("Member removed", mapOf("memberId" to memberId))
                    loadHousehold()
                }
                is BayitResult.Error -> {
                    _uiState.value = current.copy(isProcessing = false)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun retry() {
        _uiState.value = HouseholdUiState.Loading
        loadHousehold()
    }
}

sealed interface HouseholdUiState {
    data object Loading : HouseholdUiState

    data class Success(
        val members: List<Any>,
        val inviteEmail: String,
        val isProcessing: Boolean,
    ) : HouseholdUiState

    data class Error(val message: String) : HouseholdUiState
}
