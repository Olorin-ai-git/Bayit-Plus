package tv.bayit.plus.feature.settings.security.phone

import androidx.lifecycle.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.SecurityRepository
import javax.inject.Inject

@HiltViewModel
class PhoneVerificationViewModel @Inject constructor(private val securityRepository: SecurityRepository, private val logger: BayitLogger) : ViewModel() {
    private val _uiState = MutableStateFlow<PhoneVerificationUiState>(PhoneVerificationUiState.EnterPhone)
    val uiState = _uiState.asStateFlow()
    private val _phoneNumber = MutableStateFlow("")
    val phoneNumber = _phoneNumber.asStateFlow()
    private val _verificationCode = MutableStateFlow("")
    val verificationCode = _verificationCode.asStateFlow()

    fun updatePhoneNumber(phone: String) { _phoneNumber.value = phone }
    fun updateVerificationCode(code: String) { _verificationCode.value = code }

    fun sendCode() {
        viewModelScope.launch {
            _uiState.value = PhoneVerificationUiState.SendingCode
            logger.debug("Sending verification code", mapOf("phone" to _phoneNumber.value))
            when (val result = securityRepository.sendPhoneVerificationCode(_phoneNumber.value)) {
                is BayitResult.Success -> { logger.info("Verification code sent"); _uiState.value = PhoneVerificationUiState.EnterCode }
                is BayitResult.Error -> { logger.error("Send code failed", result.exception); _uiState.value = PhoneVerificationUiState.Error(result.message ?: result.exception.message.orEmpty()) }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun verifyCode() {
        viewModelScope.launch {
            _uiState.value = PhoneVerificationUiState.Verifying
            logger.debug("Verifying phone code")
            when (val result = securityRepository.verifyPhoneCode(_phoneNumber.value, _verificationCode.value)) {
                is BayitResult.Success -> { logger.info("Phone verified"); _uiState.value = PhoneVerificationUiState.Success }
                is BayitResult.Error -> { logger.error("Verification failed", result.exception); _uiState.value = PhoneVerificationUiState.Error(result.message ?: result.exception.message.orEmpty()) }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun retry() { _uiState.value = PhoneVerificationUiState.EnterPhone }
}

sealed interface PhoneVerificationUiState {
    data object EnterPhone : PhoneVerificationUiState
    data object SendingCode : PhoneVerificationUiState
    data object EnterCode : PhoneVerificationUiState
    data object Verifying : PhoneVerificationUiState
    data object Success : PhoneVerificationUiState
    data class Error(val message: String) : PhoneVerificationUiState
}
