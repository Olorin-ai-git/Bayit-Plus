package tv.bayit.plus.ui.viewmodel.zehani

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.data.model.zehani.BiometricConsentStatus
import tv.bayit.plus.data.repository.ZehAniRepository
import javax.inject.Inject

data class BiometricConsentUiState(
    val isLoading: Boolean = true,
    val consentStatus: BiometricConsentStatus? = null,
    val isGranting: Boolean = false,
    val error: String? = null,
    val grantSuccess: Boolean = false
)

@HiltViewModel
class BiometricConsentViewModel @Inject constructor(
    private val repository: ZehAniRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(BiometricConsentUiState())
    val uiState: StateFlow<BiometricConsentUiState> = _uiState.asStateFlow()

    fun loadConsentStatus(profileId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            repository.getBiometricConsentStatus(profileId).collect { result ->
                result.fold(
                    onSuccess = { status ->
                        _uiState.value = _uiState.value.copy(
                            consentStatus = status,
                            isLoading = false
                        )
                    },
                    onFailure = { error ->
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            error = error.message ?: "Failed to load consent status"
                        )
                    }
                )
            }
        }
    }

    fun grantConsent(profileId: String, consentType: String, pin: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isGranting = true,
                error = null,
                grantSuccess = false
            )

            repository.grantBiometricConsent(profileId, consentType, pin).collect { result ->
                result.fold(
                    onSuccess = {
                        _uiState.value = _uiState.value.copy(
                            isGranting = false,
                            grantSuccess = true
                        )
                        // Reload consent status
                        loadConsentStatus(profileId)
                    },
                    onFailure = { error ->
                        _uiState.value = _uiState.value.copy(
                            isGranting = false,
                            error = error.message ?: "Failed to grant consent"
                        )
                    }
                )
            }
        }
    }

    fun clearGrantSuccess() {
        _uiState.value = _uiState.value.copy(grantSuccess = false)
    }

    fun hasConsent(consentType: String): Boolean {
        return _uiState.value.consentStatus?.consents?.any {
            it.consentType.name.lowercase() == consentType.lowercase() && it.active
        } ?: false
    }
}
