package tv.bayit.plus.feature.settings.security

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.SecurityRepository
import javax.inject.Inject

@HiltViewModel
class SecurityViewModel @Inject constructor(
    private val securityRepository: SecurityRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<SecurityUiState>(SecurityUiState.Loading)
    val uiState: StateFlow<SecurityUiState> = _uiState.asStateFlow()

    init {
        loadSecurityInfo()
    }

    private fun loadSecurityInfo() {
        viewModelScope.launch {
            logger.debug("Loading security info")
            val sessionsResult = securityRepository.getActiveSessions()
            val historyResult = securityRepository.getLoginHistory()

            val sessions = when (sessionsResult) {
                is BayitResult.Success -> sessionsResult.data
                is BayitResult.Error -> {
                    logger.error("Failed to load sessions", sessionsResult.exception)
                    emptyList()
                }
                is BayitResult.Loading -> emptyList()
            }
            val history = when (historyResult) {
                is BayitResult.Success -> historyResult.data
                is BayitResult.Error -> {
                    logger.error("Failed to load login history", historyResult.exception)
                    emptyList()
                }
                is BayitResult.Loading -> emptyList()
            }

            if (sessionsResult is BayitResult.Error && historyResult is BayitResult.Error) {
                _uiState.value = SecurityUiState.Error(
                    message = sessionsResult.message ?: sessionsResult.exception.message.orEmpty(),
                )
            } else {
                _uiState.value = SecurityUiState.Success(
                    activeSessions = sessions,
                    loginHistory = history,
                    twoFactorEnabled = false,
                    isProcessing = false,
                )
                logger.info(
                    "Security info loaded",
                    mapOf(
                        "sessionCount" to sessions.size.toString(),
                        "historyCount" to history.size.toString(),
                    ),
                )
            }
        }
    }

    fun revokeSession(sessionId: String) {
        val current = _uiState.value as? SecurityUiState.Success ?: return
        _uiState.value = current.copy(isProcessing = true)

        viewModelScope.launch {
            logger.debug("Revoking session", mapOf("sessionId" to sessionId))
            when (securityRepository.revokeSession(sessionId)) {
                is BayitResult.Success -> {
                    logger.info("Session revoked", mapOf("sessionId" to sessionId))
                    loadSecurityInfo()
                }
                is BayitResult.Error -> {
                    _uiState.value = current.copy(isProcessing = false)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun toggleTwoFactor() {
        val current = _uiState.value as? SecurityUiState.Success ?: return
        _uiState.value = current.copy(isProcessing = true)

        viewModelScope.launch {
            if (current.twoFactorEnabled) {
                logger.debug("Disabling 2FA")
            } else {
                logger.debug("Enabling 2FA")
                when (securityRepository.enableTwoFactor()) {
                    is BayitResult.Success -> {
                        _uiState.value = current.copy(twoFactorEnabled = true, isProcessing = false)
                        logger.info("2FA enabled")
                    }
                    is BayitResult.Error -> {
                        _uiState.value = current.copy(isProcessing = false)
                    }
                    is BayitResult.Loading -> Unit
                }
            }
        }
    }

    fun retry() {
        _uiState.value = SecurityUiState.Loading
        loadSecurityInfo()
    }
}

sealed interface SecurityUiState {
    data object Loading : SecurityUiState

    data class Success(
        val activeSessions: List<Any>,
        val loginHistory: List<Any>,
        val twoFactorEnabled: Boolean,
        val isProcessing: Boolean,
    ) : SecurityUiState

    data class Error(val message: String) : SecurityUiState
}
