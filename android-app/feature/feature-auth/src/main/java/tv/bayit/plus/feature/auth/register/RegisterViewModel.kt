package tv.bayit.plus.feature.auth.register

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
class RegisterViewModel @Inject constructor(
    private val olorinAuthService: OlorinAuthService,
    private val logger: BayitLogger,
    private val stringProvider: BayitStringProvider,
) : ViewModel() {

    private val _uiState = MutableStateFlow<RegisterUiState>(
        RegisterUiState.Input(),
    )
    val uiState: StateFlow<RegisterUiState> = _uiState.asStateFlow()

    fun updateName(name: String) {
        val current = _uiState.value as? RegisterUiState.Input ?: return
        _uiState.value = current.copy(name = name)
    }

    fun updateEmail(email: String) {
        val current = _uiState.value as? RegisterUiState.Input ?: return
        _uiState.value = current.copy(email = email)
    }

    fun updatePassword(password: String) {
        val current = _uiState.value as? RegisterUiState.Input ?: return
        _uiState.value = current.copy(
            password = password,
            passwordStrength = computePasswordStrength(password),
        )
    }

    fun updateConfirmPassword(confirmPassword: String) {
        val current = _uiState.value as? RegisterUiState.Input ?: return
        _uiState.value = current.copy(confirmPassword = confirmPassword)
    }

    fun register() {
        val current = _uiState.value as? RegisterUiState.Input ?: return
        val validationError = validateFields(current)
        if (validationError != null) {
            _uiState.value = current.copy(fieldError = validationError)
            return
        }

        viewModelScope.launch {
            _uiState.value = RegisterUiState.Loading
            when (val result = olorinAuthService.registerWithEmail(
                email = current.email,
                password = current.password,
                name = current.name,
            )) {
                is BayitResult.Success -> {
                    olorinAuthService.storeAuthTokens(result.data)
                    logger.info(
                        "Registration successful via Olorin Auth",
                        mapOf(
                            "user_id" to result.data.user.id,
                            "email" to result.data.user.email,
                            "requires_payment" to result.data.requiresPayment.toString(),
                        ),
                    )
                    _uiState.value = RegisterUiState.Success(
                        requiresPayment = result.data.requiresPayment,
                    )
                }

                is BayitResult.Failure -> {
                    logger.error(
                        "Registration failed",
                        error = result.error.cause,
                        metadata = mapOf("email" to current.email),
                    )
                    _uiState.value = RegisterUiState.Error(
                        message = result.error.message,
                        previousInput = current,
                    )
                }
            }
        }
    }

    fun dismissError() {
        val current = _uiState.value
        if (current is RegisterUiState.Error) {
            _uiState.value = current.previousInput
        }
    }

    private fun validateFields(input: RegisterUiState.Input): FieldError? {
        if (input.name.isBlank()) {
            return FieldError(field = "name", message = stringProvider.string("auth.register.errors.nameRequired"))
        }
        if (input.email.isBlank()) {
            return FieldError(field = "email", message = stringProvider.string("login.errors.emailRequired"))
        }
        if (!EMAIL_PATTERN.matches(input.email)) {
            return FieldError(field = "email", message = stringProvider.string("auth.error.emailInvalid"))
        }
        if (input.password.length < MIN_PASSWORD_LENGTH) {
            return FieldError(
                field = "password",
                message = stringProvider.string(
                    "auth.register.errors.passwordMinLength",
                    mapOf("count" to MIN_PASSWORD_LENGTH.toString()),
                ),
            )
        }
        if (input.password != input.confirmPassword) {
            return FieldError(field = "confirmPassword", message = stringProvider.string("auth.register.errors.passwordMismatch"))
        }
        return null
    }

    companion object {
        private const val MIN_PASSWORD_LENGTH = 8
        private val EMAIL_PATTERN = Regex(
            "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$",
        )

        internal fun computePasswordStrength(password: String): PasswordStrength {
            if (password.length < MIN_PASSWORD_LENGTH) return PasswordStrength.WEAK
            var score = 0
            if (password.any { it.isUpperCase() }) score++
            if (password.any { it.isLowerCase() }) score++
            if (password.any { it.isDigit() }) score++
            if (password.any { !it.isLetterOrDigit() }) score++
            if (password.length >= 12) score++
            return when {
                score >= 4 -> PasswordStrength.STRONG
                score >= 2 -> PasswordStrength.MEDIUM
                else -> PasswordStrength.WEAK
            }
        }
    }
}

enum class PasswordStrength { WEAK, MEDIUM, STRONG }

data class FieldError(val field: String, val message: String)

sealed interface RegisterUiState {
    data class Input(
        val name: String = "",
        val email: String = "",
        val password: String = "",
        val confirmPassword: String = "",
        val passwordStrength: PasswordStrength = PasswordStrength.WEAK,
        val fieldError: FieldError? = null,
    ) : RegisterUiState

    data object Loading : RegisterUiState

    data class Error(
        val message: String,
        val previousInput: Input,
    ) : RegisterUiState

    data class Success(
        val requiresPayment: Boolean = false,
    ) : RegisterUiState
}
