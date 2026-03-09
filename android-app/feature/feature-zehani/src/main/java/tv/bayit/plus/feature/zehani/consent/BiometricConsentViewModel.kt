package tv.bayit.plus.feature.zehani.consent

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.ZehAniRepository
import tv.bayit.plus.core.model.zehani.BiometricConsentType
import tv.bayit.plus.core.model.zehani.ConsentStatus
import javax.inject.Inject

@HiltViewModel
class BiometricConsentViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val zehAniRepository: ZehAniRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val profileId: String = checkNotNull(savedStateHandle["profileId"])

    private val _uiState = MutableStateFlow<ConsentUiState>(ConsentUiState.Loading)
    val uiState: StateFlow<ConsentUiState> = _uiState.asStateFlow()

    private val _pinInput = MutableStateFlow("")
    val pinInput: StateFlow<String> = _pinInput.asStateFlow()

    init {
        loadConsentStatus()
    }

    fun updatePin(pin: String) {
        _pinInput.value = pin
    }

    fun grantConsent(consentType: String) {
        val pin = _pinInput.value
        if (pin.length < 4) {
            _uiState.value = ConsentUiState.Error("PIN must be at least 4 digits")
            return
        }

        viewModelScope.launch {
            logger.debug("Granting biometric consent", mapOf("type" to consentType))
            when (val result = zehAniRepository.grantBiometricConsent(profileId, consentType, pin)) {
                is BayitResult.Success -> {
                    logger.info("Biometric consent granted", mapOf("type" to consentType))
                    _pinInput.value = ""
                    loadConsentStatus()
                }
                is BayitResult.Error -> {
                    logger.error("Grant consent failed", result.exception)
                    _uiState.value = ConsentUiState.Error(
                        result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun retry() {
        _uiState.value = ConsentUiState.Loading
        loadConsentStatus()
    }

    private fun loadConsentStatus() {
        viewModelScope.launch {
            logger.debug("Loading biometric consent status")
            when (val result = zehAniRepository.checkBiometricConsent(profileId)) {
                is BayitResult.Success -> {
                    logger.info("Consent status loaded")
                    _uiState.value = ConsentUiState.Success(
                        consents = result.data.consents,
                    )
                }
                is BayitResult.Error -> {
                    logger.error("Consent status load failed", result.exception)
                    _uiState.value = ConsentUiState.Error(
                        result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface ConsentUiState {
    data object Loading : ConsentUiState
    data class Success(val consents: List<ConsentStatus>) : ConsentUiState
    data class Error(val message: String) : ConsentUiState
}

val CONSENT_TYPES = listOf(
    BiometricConsentType.MESH_GENERATION to "3D Mesh Generation",
    BiometricConsentType.VOICE_V2V to "Voice-to-Voice Transform",
    BiometricConsentType.VIDEO_SELFIE to "Video Selfie Capture",
    BiometricConsentType.HIGHLIGHT_SHARE to "Highlight Reel Sharing",
    BiometricConsentType.WHATSAPP_CONTACT to "WhatsApp Contact Sharing",
)
