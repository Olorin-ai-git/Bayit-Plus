package tv.bayit.plus.feature.settings.security.passkey

import androidx.lifecycle.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.PasskeyRepository
import javax.inject.Inject

@HiltViewModel
class PasskeyManagementViewModel @Inject constructor(private val passkeyRepository: PasskeyRepository, private val logger: BayitLogger) : ViewModel() {
    private val _uiState = MutableStateFlow<PasskeyManagementUiState>(PasskeyManagementUiState.Loading)
    val uiState = _uiState.asStateFlow()

    init { loadPasskeys() }

    fun addPasskey() {
        viewModelScope.launch {
            logger.debug("Adding new passkey")
            when (val result = passkeyRepository.beginRegistration()) {
                is BayitResult.Success -> { logger.info("Passkey added"); loadPasskeys() }
                is BayitResult.Error -> logger.error("Passkey registration failed", result.exception)
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun deletePasskey(passkeyId: String) {
        viewModelScope.launch {
            logger.debug("Deleting passkey", mapOf("passkeyId" to passkeyId))
            when (val result = passkeyRepository.removePasskey(passkeyId)) {
                is BayitResult.Success -> { logger.info("Passkey deleted"); loadPasskeys() }
                is BayitResult.Error -> logger.error("Passkey deletion failed", result.exception)
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun retry() { _uiState.value = PasskeyManagementUiState.Loading; loadPasskeys() }

    private fun loadPasskeys() {
        viewModelScope.launch {
            logger.debug("Loading passkeys")
            when (val result = passkeyRepository.getRegisteredPasskeys()) {
                is BayitResult.Success -> { logger.info("Passkeys loaded", mapOf("count" to result.data.size.toString())); _uiState.value = PasskeyManagementUiState.Success(result.data) }
                is BayitResult.Error -> { logger.error("Passkeys load failed", result.exception); _uiState.value = PasskeyManagementUiState.Error(result.message ?: result.exception.message.orEmpty()) }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface PasskeyManagementUiState {
    data object Loading : PasskeyManagementUiState
    data class Success(val passkeys: List<Any>) : PasskeyManagementUiState
    data class Error(val message: String) : PasskeyManagementUiState
}
