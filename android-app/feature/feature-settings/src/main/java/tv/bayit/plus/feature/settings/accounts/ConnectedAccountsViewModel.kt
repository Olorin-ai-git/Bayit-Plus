package tv.bayit.plus.feature.settings.accounts

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.UserRepository
import tv.bayit.plus.core.model.ProfileResponse
import javax.inject.Inject

@HiltViewModel
class ConnectedAccountsViewModel @Inject constructor(
    private val userRepository: UserRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<ConnectedAccountsUiState>(ConnectedAccountsUiState.Loading)
    val uiState: StateFlow<ConnectedAccountsUiState> = _uiState.asStateFlow()

    init {
        loadConnectedAccounts()
    }

    private fun loadConnectedAccounts() {
        viewModelScope.launch {
            logger.debug("Loading connected accounts")
            when (val result = userRepository.getCurrentUser()) {
                is BayitResult.Success -> {
                    val profile = result.data as? ProfileResponse
                    val provider = profile?.authProvider.orEmpty()
                    _uiState.value = ConnectedAccountsUiState.Success(
                        googleConnected = provider.contains("google", ignoreCase = true),
                        appleConnected = provider.contains("apple", ignoreCase = true),
                        facebookConnected = provider.contains("facebook", ignoreCase = true),
                        emailVerified = profile?.emailVerified == true,
                        isProcessing = false,
                    )
                    logger.info("Connected accounts loaded", mapOf("provider" to provider))
                }
                is BayitResult.Error -> {
                    logger.error("Failed to load connected accounts", result.exception)
                    _uiState.value = ConnectedAccountsUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun linkGoogle() {
        val current = _uiState.value as? ConnectedAccountsUiState.Success ?: return
        _uiState.value = current.copy(isProcessing = true)
        logger.info("Google account linking requested")
        _uiState.value = current.copy(isProcessing = false)
    }

    fun linkApple() {
        val current = _uiState.value as? ConnectedAccountsUiState.Success ?: return
        _uiState.value = current.copy(isProcessing = true)
        logger.info("Apple account linking requested")
        _uiState.value = current.copy(isProcessing = false)
    }

    fun linkFacebook() {
        val current = _uiState.value as? ConnectedAccountsUiState.Success ?: return
        _uiState.value = current.copy(isProcessing = true)
        logger.info("Facebook account linking requested")
        _uiState.value = current.copy(isProcessing = false)
    }

    fun retry() {
        _uiState.value = ConnectedAccountsUiState.Loading
        loadConnectedAccounts()
    }
}

sealed interface ConnectedAccountsUiState {
    data object Loading : ConnectedAccountsUiState

    data class Success(
        val googleConnected: Boolean,
        val appleConnected: Boolean,
        val facebookConnected: Boolean,
        val emailVerified: Boolean,
        val isProcessing: Boolean,
    ) : ConnectedAccountsUiState

    data class Error(val message: String) : ConnectedAccountsUiState
}
