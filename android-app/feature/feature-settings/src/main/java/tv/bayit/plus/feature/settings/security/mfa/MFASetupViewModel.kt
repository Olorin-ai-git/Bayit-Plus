package tv.bayit.plus.feature.settings.security.mfa

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
class MFASetupViewModel @Inject constructor(
    private val securityRepository: SecurityRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<MFASetupUiState>(MFASetupUiState.Loading)
    val uiState: StateFlow<MFASetupUiState> = _uiState.asStateFlow()

    private val _verificationCode = MutableStateFlow("")
    val verificationCode: StateFlow<String> = _verificationCode.asStateFlow()

    init {
        initializeMFASetup()
    }

    fun updateVerificationCode(code: String) {
        _verificationCode.value = code
    }

    fun verifyAndEnable() {
        viewModelScope.launch {
            val current = _uiState.value as? MFASetupUiState.QRCodeReady ?: return@launch
            _uiState.value = current.copy(isVerifying = true)
            logger.debug("Verifying MFA code")
            when (val result = securityRepository.enableMFA(_verificationCode.value)) {
                is BayitResult.Success -> {
                    logger.info("MFA enabled successfully")
                    _uiState.value = MFASetupUiState.Success
                }
                is BayitResult.Error -> {
                    logger.error("MFA verification failed", result.exception)
                    _uiState.value = current.copy(isVerifying = false, error = result.message ?: result.exception.message)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun retry() {
        _uiState.value = MFASetupUiState.Loading
        initializeMFASetup()
    }

    private fun initializeMFASetup() {
        viewModelScope.launch {
            logger.debug("Initializing MFA setup")
            when (val result = securityRepository.initializeMFA()) {
                is BayitResult.Success -> {
                    val (qrCodeUrl, secret) = result.data as Pair<String, String>
                    logger.info("MFA setup initialized")
                    _uiState.value = MFASetupUiState.QRCodeReady(qrCodeUrl, secret, false, null)
                }
                is BayitResult.Error -> {
                    logger.error("MFA initialization failed", result.exception)
                    _uiState.value = MFASetupUiState.Error(result.message ?: result.exception.message.orEmpty())
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface MFASetupUiState {
    data object Loading : MFASetupUiState
    data class QRCodeReady(val qrCodeUrl: String, val secret: String, val isVerifying: Boolean, val error: String?) : MFASetupUiState
    data object Success : MFASetupUiState
    data class Error(val message: String) : MFASetupUiState
}
