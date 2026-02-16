package tv.bayit.plus.feature.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.auth.OlorinAuthService
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.UserRepository
import tv.bayit.plus.core.model.ProfileResponse
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val userRepository: UserRepository,
    private val olorinAuthService: OlorinAuthService,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<SettingsUiState>(SettingsUiState.Loading)
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    init {
        loadUserInfo()
    }

    private fun loadUserInfo() {
        viewModelScope.launch {
            logger.debug("Loading user info for settings")
            when (val result = userRepository.getCurrentUser()) {
                is BayitResult.Success -> {
                    val profile = result.data as? ProfileResponse
                    _uiState.value = SettingsUiState.Success(
                        displayName = profile?.displayName.orEmpty(),
                        email = profile?.email.orEmpty(),
                        avatarUrl = profile?.avatar,
                    )
                    logger.info("Settings user info loaded")
                }
                is BayitResult.Error -> {
                    logger.error(
                        "Failed to load user info for settings",
                        result.exception,
                        mapOf("errorMessage" to result.message.orEmpty()),
                    )
                    _uiState.value = SettingsUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun retry() {
        _uiState.value = SettingsUiState.Loading
        loadUserInfo()
    }

    fun logout() {
        logger.info("User initiated logout from settings")
        olorinAuthService.signOut()
    }
}

sealed interface SettingsUiState {
    data object Loading : SettingsUiState

    data class Success(
        val displayName: String,
        val email: String,
        val avatarUrl: String?,
    ) : SettingsUiState

    data class Error(
        val message: String,
    ) : SettingsUiState
}
