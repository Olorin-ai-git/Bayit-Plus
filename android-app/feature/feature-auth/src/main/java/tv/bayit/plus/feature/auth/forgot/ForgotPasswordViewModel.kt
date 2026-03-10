package tv.bayit.plus.feature.auth.forgot

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.auth.OlorinAuthService
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.common.i18n.BayitStringProvider
import tv.bayit.plus.core.common.result.BayitResult
import javax.inject.Inject

@HiltViewModel
class ForgotPasswordViewModel @Inject constructor(
    private val olorinAuthService: OlorinAuthService,
    private val logger: BayitLogger,
    private val stringProvider: BayitStringProvider,
) : ViewModel() {

    private val _uiState = MutableStateFlow<ForgotPasswordUiState>(
        ForgotPasswordUiState.Idle(email = ""),
    )
    val uiState: StateFlow<ForgotPasswordUiState> = _uiState.asStateFlow()

    fun updateEmail(email: String) {
        val current = _uiState.value
        if (current is ForgotPasswordUiState.Idle) {
            _uiState.value = current.copy(email = email)
        } else if (current is ForgotPasswordUiState.Error) {
            _uiState.value = ForgotPasswordUiState.Idle(email = email)
        }
    }

    fun sendResetLink() {
        val email = when (val current = _uiState.value) {
            is ForgotPasswordUiState.Idle -> current.email
            is ForgotPasswordUiState.Error -> current.previousEmail
            else -> return
        }

        if (email.isBlank()) {
            _uiState.value = ForgotPasswordUiState.Error(
                message = stringProvider.string("login.errors.emailRequired"),
                previousEmail = email,
            )
            return
        }

        if (!EMAIL_PATTERN.matches(email)) {
            _uiState.value = ForgotPasswordUiState.Error(
                message = stringProvider.string("auth.error.emailInvalid"),
                previousEmail = email,
            )
            return
        }

        viewModelScope.launch {
            _uiState.value = ForgotPasswordUiState.Loading

            when (val result = olorinAuthService.requestPasswordReset(email)) {
                is BayitResult.Success -> {
                    logger.info(
                        "Password reset email sent",
                        mapOf("email" to email),
                    )
                    _uiState.value = ForgotPasswordUiState.Success
                }

                is BayitResult.Failure -> {
                    logger.error(
                        "Password reset failed",
                        error = result.error.cause,
                        metadata = mapOf("email" to email),
                    )
                    _uiState.value = ForgotPasswordUiState.Error(
                        message = result.error.message,
                        previousEmail = email,
                    )
                }
            }
        }
    }

    fun dismissError() {
        val current = _uiState.value
        if (current is ForgotPasswordUiState.Error) {
            _uiState.value = ForgotPasswordUiState.Idle(email = current.previousEmail)
        }
    }

    companion object {
        private val EMAIL_PATTERN = Regex(
            "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$",
        )
    }
}

sealed interface ForgotPasswordUiState {
    data class Idle(val email: String) : ForgotPasswordUiState
    data object Loading : ForgotPasswordUiState
    data object Success : ForgotPasswordUiState
    data class Error(
        val message: String,
        val previousEmail: String,
    ) : ForgotPasswordUiState
}
