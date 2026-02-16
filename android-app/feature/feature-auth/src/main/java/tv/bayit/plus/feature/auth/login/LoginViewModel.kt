package tv.bayit.plus.feature.auth.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.auth.OlorinAuthService
import tv.bayit.plus.core.auth.SecureStorageService
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.common.result.BayitResult
import javax.inject.Inject

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val olorinAuthService: OlorinAuthService,
    private val secureStorage: SecureStorageService,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<LoginUiState>(
        LoginUiState.Input(email = "", password = ""),
    )
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    fun updateEmail(email: String) {
        val current = _uiState.value
        if (current is LoginUiState.Input) {
            _uiState.value = current.copy(email = email)
        }
    }

    fun updatePassword(password: String) {
        val current = _uiState.value
        if (current is LoginUiState.Input) {
            _uiState.value = current.copy(password = password)
        }
    }

    fun loginWithEmail() {
        val current = _uiState.value as? LoginUiState.Input ?: return

        if (current.email.isBlank() || current.password.isBlank()) {
            _uiState.value = LoginUiState.Error(
                message = "Email and password are required",
                previousEmail = current.email,
                previousPassword = current.password,
            )
            return
        }

        viewModelScope.launch {
            _uiState.value = LoginUiState.Loading

            when (val result = olorinAuthService.loginWithEmail(
                email = current.email,
                password = current.password,
            )) {
                is BayitResult.Success -> {
                    // Store tokens in secure storage
                    secureStorage.saveAccessToken(result.data.accessToken)
                    result.data.refreshToken?.let { refreshToken ->
                        secureStorage.saveRefreshToken(refreshToken)
                    }

                    logger.info(
                        "Login successful via Olorin Auth",
                        mapOf(
                            "user_id" to result.data.user.id,
                            "email" to result.data.user.email,
                            "requires_payment" to result.data.requiresPayment.toString(),
                        ),
                    )
                    _uiState.value = LoginUiState.Success(
                        requiresPayment = result.data.requiresPayment,
                    )
                }

                is BayitResult.Failure -> {
                    logger.error(
                        "Login failed",
                        error = result.error.cause,
                        metadata = mapOf("email" to current.email),
                    )
                    _uiState.value = LoginUiState.Error(
                        message = result.error.message,
                        previousEmail = current.email,
                        previousPassword = current.password,
                    )
                }
            }
        }
    }

    fun loginWithGoogle(idToken: String) {
        // Handle empty token (sign-in was cancelled or failed)
        if (idToken.isBlank()) {
            _uiState.value = LoginUiState.Error(
                message = "Google Sign-In was cancelled or failed. Please try again.",
                previousEmail = "",
                previousPassword = "",
            )
            return
        }

        viewModelScope.launch {
            _uiState.value = LoginUiState.Loading

            when (val result = firebaseAuthService.signInWithGoogle(idToken)) {
                is BayitResult.Success -> {
                    logger.info(
                        "Google login successful",
                        mapOf("uid" to result.data.uid),
                    )
                    _uiState.value = LoginUiState.Success
                }

                is BayitResult.Failure -> {
                    logger.error(
                        "Google login failed",
                        error = result.error.cause,
                    )
                    _uiState.value = LoginUiState.Error(
                        message = result.error.message,
                        previousEmail = "",
                        previousPassword = "",
                    )
                }
            }
        }
    }

    fun dismissError() {
        val current = _uiState.value
        if (current is LoginUiState.Error) {
            _uiState.value = LoginUiState.Input(
                email = current.previousEmail,
                password = current.previousPassword,
            )
        }
    }
}

sealed interface LoginUiState {
    data class Input(
        val email: String,
        val password: String,
    ) : LoginUiState

    data object Loading : LoginUiState

    data class Error(
        val message: String,
        val previousEmail: String,
        val previousPassword: String,
    ) : LoginUiState

    data class Success(
        val requiresPayment: Boolean = false,
    ) : LoginUiState
}
