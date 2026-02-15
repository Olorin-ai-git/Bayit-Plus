package tv.bayit.plus.ui.viewmodel.zehani

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.data.repository.ZehAniRepository
import javax.inject.Inject

sealed class ZehAniHubUiState {
    object Loading : ZehAniHubUiState()
    data class Success(val hasAvatar: Boolean) : ZehAniHubUiState()
    data class Error(val message: String) : ZehAniHubUiState()
}

@HiltViewModel
class ZehAniHubViewModel @Inject constructor(
    private val repository: ZehAniRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<ZehAniHubUiState>(ZehAniHubUiState.Loading)
    val uiState: StateFlow<ZehAniHubUiState> = _uiState.asStateFlow()

    fun checkAvatarStatus(profileId: String) {
        viewModelScope.launch {
            _uiState.value = ZehAniHubUiState.Loading

            // Check if user has an avatar by trying to fetch consent status
            repository.getBiometricConsentStatus(profileId).collect { result ->
                result.fold(
                    onSuccess = { status ->
                        val hasConsent = status.consents.any { it.active }
                        _uiState.value = ZehAniHubUiState.Success(hasConsent)
                    },
                    onFailure = { error ->
                        _uiState.value = ZehAniHubUiState.Error(
                            error.message ?: "Failed to load avatar status"
                        )
                    }
                )
            }
        }
    }
}
