package tv.bayit.plus.feature.profile.selection

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.ProfileRepository
import tv.bayit.plus.core.model.AccountProfile
import javax.inject.Inject

@HiltViewModel
class ProfileSelectionViewModel @Inject constructor(
    private val profileRepository: ProfileRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<ProfileSelectionUiState>(
        ProfileSelectionUiState.Loading,
    )
    val uiState: StateFlow<ProfileSelectionUiState> = _uiState.asStateFlow()

    init {
        loadProfiles()
    }

    fun loadProfiles() {
        viewModelScope.launch {
            _uiState.value = ProfileSelectionUiState.Loading

            when (val result = profileRepository.getProfiles()) {
                is BayitResult.Success -> {
                    logger.info(
                        "Profiles loaded",
                        mapOf("count" to result.data.size.toString()),
                    )
                    _uiState.value = ProfileSelectionUiState.Loaded(
                        profiles = result.data,
                    )
                }

                is BayitResult.Error -> {
                    logger.error(
                        "Failed to load profiles",
                        error = result.exception,
                    )
                    _uiState.value = ProfileSelectionUiState.Error(
                        message = result.message ?: "Failed to load profiles",
                    )
                }

                is BayitResult.Loading -> {
                    _uiState.value = ProfileSelectionUiState.Loading
                }
            }
        }
    }

    fun selectProfile(profileId: String) {
        val current = _uiState.value as? ProfileSelectionUiState.Loaded ?: return
        _uiState.value = current.copy(selectingProfileId = profileId)

        viewModelScope.launch {
            when (val result = profileRepository.selectProfile(profileId)) {
                is BayitResult.Success -> {
                    logger.info(
                        "Profile selected",
                        mapOf("profileId" to result.data.id),
                    )
                    _uiState.value = ProfileSelectionUiState.ProfileSelected(
                        profile = result.data,
                    )
                }

                is BayitResult.Error -> {
                    logger.error(
                        "Failed to select profile",
                        error = result.exception,
                        metadata = mapOf("profileId" to profileId),
                    )
                    _uiState.value = current.copy(
                        selectingProfileId = null,
                        errorMessage = result.message ?: "Failed to select profile",
                    )
                }

                is BayitResult.Loading -> Unit
            }
        }
    }

    fun dismissError() {
        val current = _uiState.value
        if (current is ProfileSelectionUiState.Loaded) {
            _uiState.value = current.copy(errorMessage = null)
        }
    }
}

sealed interface ProfileSelectionUiState {
    data object Loading : ProfileSelectionUiState

    data class Loaded(
        val profiles: List<AccountProfile>,
        val selectingProfileId: String? = null,
        val errorMessage: String? = null,
    ) : ProfileSelectionUiState

    data class Error(val message: String) : ProfileSelectionUiState

    data class ProfileSelected(val profile: AccountProfile) : ProfileSelectionUiState
}
